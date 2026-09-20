import { Router } from "express";
import { ColumnModel } from "../models/Column.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const docs = await ColumnModel.find().lean();
    res.json(docs.map(({ _id, ...r }) => ({ id: _id, ...r })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const cols: Array<{ id: string; [k: string]: unknown }> = req.body;
    if (!Array.isArray(cols)) { res.status(400).json({ error: "Expected an array." }); return; }
    const ops = cols.map((c) => {
      const { id, ...fields } = c;
      return { updateOne: { filter: { _id: id }, update: { $set: { _id: id, ...fields } }, upsert: true } };
    });
    if (ops.length) await ColumnModel.bulkWrite(ops);
    await ColumnModel.deleteMany({ _id: { $nin: cols.map((c) => c.id) } });
    res.json({ ok: true, count: cols.length });
  } catch (err) { next(err); }
});

router.delete("/", async (_req, res, next) => {
  try { await ColumnModel.deleteMany({}); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
