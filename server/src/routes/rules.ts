import { Router } from "express";
import { RuleModel } from "../models/Rule.js";

const router = Router();

// GET /api/rules
router.get("/", async (_req, res, next) => {
  try {
    const docs = await RuleModel.find().sort({ order: 1 }).lean();
    res.json(docs.map(({ _id, ...r }) => ({ id: _id, ...r })));
  } catch (err) { next(err); }
});

// POST /api/rules — bulk replace
router.post("/", async (req, res, next) => {
  try {
    const rules: Array<{ id: string; [k: string]: unknown }> = req.body;
    if (!Array.isArray(rules)) { res.status(400).json({ error: "Expected an array." }); return; }
    const ops = rules.map((r) => {
      const { id, ...fields } = r;
      return { updateOne: { filter: { _id: id }, update: { $set: { _id: id, ...fields } }, upsert: true } };
    });
    if (ops.length) await RuleModel.bulkWrite(ops);
    await RuleModel.deleteMany({ _id: { $nin: rules.map((r) => r.id) } });
    res.json({ ok: true, count: rules.length });
  } catch (err) { next(err); }
});

// DELETE /api/rules — clear all
router.delete("/", async (_req, res, next) => {
  try { await RuleModel.deleteMany({}); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
