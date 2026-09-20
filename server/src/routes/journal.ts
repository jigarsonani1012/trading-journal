import { Router } from "express";
import { JournalModel } from "../models/Journal.js";

const router = Router();

// GET /api/journal
router.get("/", async (_req, res, next) => {
  try {
    const docs = await JournalModel.find().sort({ date: -1 }).lean();
    res.json(docs.map(({ _id, ...r }) => ({ id: _id, ...r })));
  } catch (err) { next(err); }
});

// POST /api/journal — bulk replace
router.post("/", async (req, res, next) => {
  try {
    const entries: Array<{ id: string; [k: string]: unknown }> = req.body;
    if (!Array.isArray(entries)) { res.status(400).json({ error: "Expected an array." }); return; }
    const ops = entries.map((e) => {
      const { id, ...fields } = e;
      return { updateOne: { filter: { _id: id }, update: { $set: { _id: id, ...fields } }, upsert: true } };
    });
    if (ops.length) await JournalModel.bulkWrite(ops);
    await JournalModel.deleteMany({ _id: { $nin: entries.map((e) => e.id) } });
    res.json({ ok: true, count: entries.length });
  } catch (err) { next(err); }
});

// DELETE /api/journal — clear all
router.delete("/", async (_req, res, next) => {
  try { await JournalModel.deleteMany({}); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
