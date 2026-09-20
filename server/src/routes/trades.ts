import { Router } from "express";
import { TradeModel } from "../models/Trade.js";

const router = Router();

// ── GET /api/trades — load all trades ────────────────────────────────────────
router.get("/", async (_req, res, next) => {
  try {
    const trades = await TradeModel.find().lean();
    // Remap _id → id for frontend compatibility
    const mapped = trades.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/trades — bulk replace (save all) ────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const trades: Array<{ id: string; [k: string]: unknown }> = req.body;
    if (!Array.isArray(trades)) {
      res.status(400).json({ error: "Expected an array of trades." });
      return;
    }
    // Upsert each trade using app-generated id as _id
    const ops = trades.map((t) => {
      const { id, ...fields } = t;
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: { _id: id, ...fields } },
          upsert: true,
        },
      };
    });
    if (ops.length) await TradeModel.bulkWrite(ops);

    // Remove trades that are no longer present in the payload
    const ids = trades.map((t) => t.id);
    await TradeModel.deleteMany({ _id: { $nin: ids } });

    res.json({ ok: true, count: trades.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/trades/one — add single trade ───────────────────────────────────
router.post("/one", async (req, res, next) => {
  try {
    const { id, ...fields } = req.body as { id: string; [k: string]: unknown };
    if (!id) { res.status(400).json({ error: "Trade id is required." }); return; }
    const trade = await TradeModel.findOneAndUpdate(
      { _id: id },
      { $set: { _id: id, ...fields } },
      { upsert: true, new: true, lean: true }
    );
    const { _id, ...rest } = trade as { _id: string; [k: string]: unknown };
    res.status(201).json({ id: _id, ...rest });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/trades/:id — update single trade ─────────────────────────────────
router.put("/:id", async (req, res, next) => {
  try {
    const { id, ...fields } = req.body as { id?: string; [k: string]: unknown };
    void id; // ignore body id, use param
    const updated = await TradeModel.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { ...fields, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );
    if (!updated) { res.status(404).json({ error: "Trade not found." }); return; }
    const { _id, ...rest } = updated as { _id: string; [k: string]: unknown };
    res.json({ id: _id, ...rest });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/trades/:id — delete single trade ──────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await TradeModel.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Trade not found." }); return; }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/trades — clear all ───────────────────────────────────────────
router.delete("/", async (_req, res, next) => {
  try {
    await TradeModel.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
