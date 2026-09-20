import { Router } from "express";
import { ViewModel } from "../models/View.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const docs = await ViewModel.find().lean();
    res.json(docs.map(({ _id, ...r }) => ({ id: _id, ...r })));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const views: Array<{ id: string; [k: string]: unknown }> = req.body;
    if (!Array.isArray(views)) { res.status(400).json({ error: "Expected an array." }); return; }
    const ops = views.map((v) => {
      const { id, ...fields } = v;
      return { updateOne: { filter: { _id: id }, update: { $set: { _id: id, ...fields } }, upsert: true } };
    });
    if (ops.length) await ViewModel.bulkWrite(ops);
    await ViewModel.deleteMany({ _id: { $nin: views.map((v) => v.id) } });
    res.json({ ok: true, count: views.length });
  } catch (err) { next(err); }
});

router.delete("/", async (_req, res, next) => {
  try { await ViewModel.deleteMany({}); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
