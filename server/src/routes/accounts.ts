import { Router } from "express";
import { AccountModel } from "../models/Account.js";
import { UserModel } from "../models/User.js";
import { TradeModel } from "../models/Trade.js";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// ── GET /api/accounts — list all accounts ─────────────────────────────────────
router.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const accounts = await AccountModel.find({ userId }).lean();

    if (accounts.length === 0) {
      // Ensure at least one default account exists
      const defaultAcc = await AccountModel.create({
        _id: genId("acc"),
        userId,
        name: "Primary Trading Account",
        currency: "USD",
        startingBalance: 25000,
        defaultRiskPercent: 1.0,
        color: "#3b82f6",
        isDefault: true,
      });
      return res.json([defaultAcc]);
    }

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/accounts — create a new account ─────────────────────────────────
router.post("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { name, broker, currency, startingBalance, defaultRiskPercent, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Account name is required." });
    }

    const account = await AccountModel.create({
      _id: genId("acc"),
      userId,
      name: name.trim(),
      broker: broker || "",
      currency: currency || "USD",
      startingBalance: Number(startingBalance) || 25000,
      defaultRiskPercent: Number(defaultRiskPercent) || 1.0,
      color: color || "#3b82f6",
      isDefault: false,
    });

    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/accounts/:id — update an account ─────────────────────────────────
router.put("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { id } = req.params;
    const { name, broker, currency, startingBalance, defaultRiskPercent, color, isDefault } = req.body;

    const account = await AccountModel.findOneAndUpdate(
      { _id: id, userId },
      {
        ...(name ? { name: name.trim() } : {}),
        ...(broker !== undefined ? { broker } : {}),
        ...(currency ? { currency } : {}),
        ...(startingBalance !== undefined ? { startingBalance: Number(startingBalance) } : {}),
        ...(defaultRiskPercent !== undefined ? { defaultRiskPercent: Number(defaultRiskPercent) } : {}),
        ...(color ? { color } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
      },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json(account);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/accounts/:id/select — set active account ────────────────────────
router.post("/:id/select", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { id } = req.params;

    const account = await AccountModel.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (req.userId) {
      await UserModel.findByIdAndUpdate(req.userId, { activeAccountId: id });
    }

    res.json({ ok: true, activeAccountId: id, account });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/accounts/:id — delete account & its trades ────────────────────
router.delete("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { id } = req.params;

    const count = await AccountModel.countDocuments({ userId });
    if (count <= 1) {
      return res.status(400).json({ error: "Cannot delete your only trading account." });
    }

    await AccountModel.findOneAndDelete({ _id: id, userId });
    await TradeModel.deleteMany({ accountId: id, userId });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
