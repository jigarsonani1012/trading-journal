import { Router } from "express";
import { MetaModel } from "../models/Meta.js";

const router = Router();

const SINGLETON_ID = "singleton";

// GET /api/meta
router.get("/", async (_req, res, next) => {
  try {
    const doc = await MetaModel.findById(SINGLETON_ID).lean();
    if (!doc) { res.json(null); return; }
    const { _id, ...rest } = doc as { _id: string; [k: string]: unknown };
    void _id;
    res.json(rest);
  } catch (err) { next(err); }
});

// POST /api/meta — upsert
router.post("/", async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    await MetaModel.findOneAndUpdate(
      { _id: SINGLETON_ID },
      { $set: { _id: SINGLETON_ID, ...body } },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/meta
router.delete("/", async (_req, res, next) => {
  try { await MetaModel.deleteOne({ _id: SINGLETON_ID }); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
