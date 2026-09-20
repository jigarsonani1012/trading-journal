import { Router } from "express";
import { CashbookTransactionModel } from "../models/CashbookTransaction.js";
import { BudgetModel } from "../models/Budget.js";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// ── Default Categories ───────────────────────────────────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Prop Firm Fees",
  "Trading Software / Tools",
  "Data Feeds / Subscriptions",
  "Broker Commissions / Fees",
  "Hardware / Tech Setup",
  "Education / Courses",
  "Rent / Housing",
  "Food & Dining",
  "Utilities & Internet",
  "Travel & Commute",
  "Personal / Miscellaneous",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Trading Payout",
  "Salary / Primary Job",
  "Freelance / Side Hustle",
  "Investments & Dividends",
  "Business Income",
  "Gift / Other Income",
];

// ── GET /api/cashbook/transactions ───────────────────────────────────────────
router.get("/transactions", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const transactions = await CashbookTransactionModel.find({ userId }).sort({ date: -1, createdAt: -1 }).lean();
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cashbook/transactions ──────────────────────────────────────────
router.post("/transactions", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { type, amount, category, date, note, paymentMethod, linkedTradingAccountId } = req.body;

    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: "Type, amount, category, and date are required." });
    }

    const tx = await CashbookTransactionModel.create({
      _id: genId("tx"),
      userId,
      type,
      amount: Number(amount),
      category: category.trim(),
      date,
      note: note || "",
      paymentMethod: paymentMethod || "Bank Transfer",
      linkedTradingAccountId,
    });

    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/cashbook/transactions/:id ───────────────────────────────────────
router.put("/transactions/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { id } = req.params;
    const { type, amount, category, date, note, paymentMethod, linkedTradingAccountId } = req.body;

    const tx = await CashbookTransactionModel.findOneAndUpdate(
      { _id: id, userId },
      {
        ...(type ? { type } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(category ? { category: category.trim() } : {}),
        ...(date ? { date } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(linkedTradingAccountId !== undefined ? { linkedTradingAccountId } : {}),
      },
      { new: true }
    );

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    res.json(tx);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cashbook/transactions/:id ────────────────────────────────────
router.delete("/transactions/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { id } = req.params;

    const tx = await CashbookTransactionModel.findOneAndDelete({ _id: id, userId });
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cashbook/budgets ────────────────────────────────────────────────
router.get("/budgets", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const budgets = await BudgetModel.find({ userId }).lean();
    res.json(budgets);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cashbook/budgets ───────────────────────────────────────────────
router.post("/budgets", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const { category, monthlyLimit, monthYear } = req.body;

    if (!category || monthlyLimit === undefined) {
      return res.status(400).json({ error: "Category and monthlyLimit are required." });
    }

    const my = monthYear || new Date().toISOString().slice(0, 7);

    const budget = await BudgetModel.findOneAndUpdate(
      { userId, category: category.trim(), monthYear: my },
      {
        $set: {
          monthlyLimit: Number(monthlyLimit),
          createdAt: new Date().toISOString(),
        },
        $setOnInsert: { _id: genId("bgt") },
      },
      { upsert: true, new: true }
    );

    res.json(budget);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/cashbook/summary ────────────────────────────────────────────────
router.get("/summary", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId || "guest_default";
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const allTx = await CashbookTransactionModel.find({ userId }).lean();
    const budgets = await BudgetModel.find({ userId }).lean();

    let totalIncome = 0;
    let totalExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalPayouts = 0;

    const categorySpending: Record<string, number> = {};
    const monthlyCategorySpending: Record<string, number> = {};

    for (const tx of allTx) {
      const isThisMonth = tx.date.startsWith(currentMonth);

      if (tx.type === "income") {
        totalIncome += tx.amount;
        if (isThisMonth) monthlyIncome += tx.amount;
        if (tx.category === "Trading Payout") totalPayouts += tx.amount;
      } else {
        totalExpense += tx.amount;
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;

        if (isThisMonth) {
          monthlyExpense += tx.amount;
          monthlyCategorySpending[tx.category] = (monthlyCategorySpending[tx.category] || 0) + tx.amount;
        }
      }
    }

    res.json({
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      monthlyIncome,
      monthlyExpense,
      monthlyNet: monthlyIncome - monthlyExpense,
      totalPayouts,
      currentMonth,
      categorySpending,
      monthlyCategorySpending,
      budgets,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
