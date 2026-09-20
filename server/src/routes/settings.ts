import { Router } from "express";
import { SettingsModel } from "../models/Settings.js";

const router = Router();

const SINGLETON_ID = "singleton";

// GET /api/settings
router.get("/", async (_req, res, next) => {
  try {
    const doc = await SettingsModel.findById(SINGLETON_ID).lean();
    if (!doc) { res.json(null); return; }
    const { _id, ...rest } = doc as { _id: string; [k: string]: unknown };
    void _id;
    res.json(rest);
  } catch (err) { next(err); }
});

// POST /api/settings — upsert
router.post("/", async (req, res, next) => {
  try {
    const settings = req.body as Record<string, unknown>;
    await SettingsModel.findOneAndUpdate(
      { _id: SINGLETON_ID },
      { $set: { _id: SINGLETON_ID, ...settings } },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/settings — reset
router.delete("/", async (_req, res, next) => {
  try { await SettingsModel.deleteOne({ _id: SINGLETON_ID }); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
