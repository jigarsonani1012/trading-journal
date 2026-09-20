import { Router } from "express";
import Trade from "../models/Trade.js";
import Rule from "../models/Rule.js";
import Journal from "../models/Journal.js";
import Settings from "../models/Settings.js";
import Column from "../models/Column.js";
import View from "../models/View.js";
import Meta from "../models/Meta.js";

const router = Router();

// ── Full JSON export (all collections) ─────────────────────────────────────
router.get("/json", async (_req, res) => {
  try {
    const [trades, rules, journal, settings, columns, views] = await Promise.all([
      Trade.find().lean(),
      Rule.find().lean(),
      Journal.find().lean(),
      Settings.findOne().lean(),
      Column.find().lean(),
      View.find().lean(),
    ]);

    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      source: "EDGELOG MongoDB",
      trades,
      rules,
      journal,
      settings,
      columns,
      views,
    };

    const filename = `edgelog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.json(payload);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// ── CSV export (trades only) ────────────────────────────────────────────────
router.get("/csv", async (_req, res) => {
  try {
    const trades = await Trade.find().lean();

    const headers = [
      "id","entryTime","exitTime","symbol","market","side","quantity",
      "entryPrice","exitPrice","stopLoss","takeProfit","riskAmount","riskPercent",
      "plannedRR","grossPnL","fees","netPnL","rMultiple","holdingMinutes",
      "setup","strategy","timeframe","session","htfBias","marketCondition",
      "entryModel","exitModel","entryReason","exitReason","emotion","confidence",
      "mistake","grade","ruleStatus","notes","tags",
    ];

    const esc = (v: unknown) => {
      const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = trades.map((t: Record<string, unknown>) =>
      headers.map(h => esc(t[h])).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `edgelog-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(csv);
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Journal export (markdown) ───────────────────────────────────────────────
router.get("/journal", async (_req, res) => {
  try {
    const entries = await Journal.find().lean().sort({ date: 1 });

    const lines: string[] = [
      "# EDGELOG — Journal Export",
      `Exported: ${new Date().toLocaleString()}`,
      "",
    ];

    for (const e of entries as Record<string, unknown>[]) {
      lines.push(`## ${e.date} (${e.kind})`);
      if (e.kind === "daily") {
        const pre = e.pre as Record<string, unknown> | undefined;
        const post = e.post as Record<string, unknown> | undefined;
        if (pre?.plan) lines.push(`**Plan:** ${pre.plan}`);
        if (pre?.bias) lines.push(`**Bias:** ${pre.bias}`);
        if (post?.happened) lines.push(`**What happened:** ${post.happened}`);
        if (post?.learned) lines.push(`**Learned:** ${post.learned}`);
        if (post?.tomorrow) lines.push(`**Tomorrow:** ${post.tomorrow}`);
      } else if (e.kind === "note") {
        if (e.title) lines.push(`**${e.title}**`);
        if (e.body) lines.push(String(e.body));
      }
      lines.push("");
    }

    const filename = `edgelog-journal-${new Date().toISOString().slice(0, 10)}.md`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/markdown");
    res.send(lines.join("\n"));
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Full JSON import/restore ────────────────────────────────────────────────
router.post("/restore", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const results: Record<string, number> = {};

    // Restore trades
    if (Array.isArray(payload.trades) && payload.trades.length > 0) {
      await Trade.deleteMany({});
      const docs = payload.trades.map((t: Record<string, unknown>) => ({ ...t, _id: undefined }));
      await Trade.insertMany(docs, { ordered: false }).catch(() => {});
      results.trades = payload.trades.length;
    }

    // Restore rules
    if (Array.isArray(payload.rules) && payload.rules.length > 0) {
      await Rule.deleteMany({});
      const docs = payload.rules.map((r: Record<string, unknown>) => ({ ...r, _id: undefined }));
      await Rule.insertMany(docs, { ordered: false }).catch(() => {});
      results.rules = payload.rules.length;
    }

    // Restore journal
    if (Array.isArray(payload.journal) && payload.journal.length > 0) {
      await Journal.deleteMany({});
      const docs = payload.journal.map((j: Record<string, unknown>) => ({ ...j, _id: undefined }));
      await Journal.insertMany(docs, { ordered: false }).catch(() => {});
      results.journal = payload.journal.length;
    }

    // Restore settings
    if (payload.settings && typeof payload.settings === "object") {
      const { _id, __v, ...rest } = payload.settings as Record<string, unknown>;
      void _id; void __v;
      await Settings.findOneAndUpdate({}, rest, { upsert: true });
      results.settings = 1;
    }

    // Restore columns
    if (Array.isArray(payload.columns)) {
      await Column.deleteMany({});
      if (payload.columns.length > 0) {
        const docs = payload.columns.map((c: Record<string, unknown>) => ({ ...c, _id: undefined }));
        await Column.insertMany(docs, { ordered: false }).catch(() => {});
      }
      results.columns = payload.columns.length;
    }

    // Restore views
    if (Array.isArray(payload.views)) {
      await View.deleteMany({});
      if (payload.views.length > 0) {
        const docs = payload.views.map((v: Record<string, unknown>) => ({ ...v, _id: undefined }));
        await View.insertMany(docs, { ordered: false }).catch(() => {});
      }
      results.views = payload.views.length;
    }

    // Mark as seeded so app doesn't re-seed
    await Meta.findOneAndUpdate({}, { seeded: true }, { upsert: true });

    return res.json({ ok: true, restored: results });
  } catch (err: unknown) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── DB stats ────────────────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [trades, rules, journal, columns, views] = await Promise.all([
      Trade.countDocuments(),
      Rule.countDocuments(),
      Journal.countDocuments(),
      Column.countDocuments(),
      View.countDocuments(),
    ]);
    const lastTrade = await Trade.findOne().sort({ updatedAt: -1 }).lean();
    res.json({
      trades, rules, journal, columns, views,
      lastTradeAt: (lastTrade as Record<string, unknown> | null)?.updatedAt ?? null,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
