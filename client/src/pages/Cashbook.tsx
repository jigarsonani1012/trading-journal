import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  DollarSign,
  Download,
  CheckCircle,
  AlertCircle,
  PiggyBank,
  Sparkles,
  Layers,
} from "lucide-react";
import { useStore } from "../store";
import { Panel, Button, Modal, Field, Input, Select, Badge, StatRow } from "../components/ui";
import { fmtMoney, fmtDate, fmtDateShort } from "../lib/format";
import type { CashbookTransaction, Budget } from "../types";

const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = [
  "Trading Payout",
  "Salary / Primary Job",
  "Freelance / Side Hustle",
  "Investments & Dividends",
  "Business Income",
  "Gift / Other Income",
];

export function Cashbook() {
  const {
    cashbookTransactions,
    budgets,
    cashbookSummary,
    addCashbookTransaction,
    updateCashbookTransaction,
    deleteCashbookTransaction,
    setBudget,
    accounts,
    toast,
    askConfirm,
  } = useStore();

  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Modal States
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<CashbookTransaction | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  // Form States for Transaction
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txNote, setTxNote] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState("Bank Transfer");
  const [txLinkedAccount, setTxLinkedAccount] = useState("");

  // Form States for Budget
  const [budgetCat, setBudgetCat] = useState(EXPENSE_CATEGORIES[0]);
  const [budgetLimit, setBudgetLimit] = useState("");

  const openAddModal = (type: "income" | "expense" = "expense") => {
    setEditingTx(null);
    setTxType(type);
    setTxAmount("");
    setTxCategory(type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setTxDate(new Date().toISOString().slice(0, 10));
    setTxNote("");
    setTxPaymentMethod("Bank Transfer");
    setTxLinkedAccount("");
    setTxModalOpen(true);
  };

  const openEditModal = (tx: CashbookTransaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxAmount(String(tx.amount));
    setTxCategory(tx.category);
    setTxDate(tx.date);
    setTxNote(tx.note || "");
    setTxPaymentMethod(tx.paymentMethod || "Bank Transfer");
    setTxLinkedAccount(tx.linkedTradingAccountId || "");
    setTxModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      toast("Please enter a valid positive amount.", "error");
      return;
    }

    try {
      if (editingTx) {
        await updateCashbookTransaction(editingTx._id, {
          type: txType,
          amount: amt,
          category: txCategory,
          date: txDate,
          note: txNote,
          paymentMethod: txPaymentMethod,
          linkedTradingAccountId: txLinkedAccount || undefined,
        });
        toast("Transaction updated.", "success");
      } else {
        await addCashbookTransaction({
          type: txType,
          amount: amt,
          category: txCategory,
          date: txDate,
          note: txNote,
          paymentMethod: txPaymentMethod,
          linkedTradingAccountId: txLinkedAccount || undefined,
        });
        toast(
          txType === "income"
            ? `Income of ${fmtMoney(amt)} logged successfully!`
            : `Expense of ${fmtMoney(amt)} logged.`,
          "success"
        );
      }
      setTxModalOpen(false);
    } catch (e: any) {
      toast(e.message || "Failed to save transaction.", "error");
    }
  };

  const handleDeleteTx = (tx: CashbookTransaction) => {
    askConfirm({
      title: "Delete this transaction?",
      body: `Are you sure you want to remove this ${tx.type} entry of ${fmtMoney(tx.amount)} (${tx.category})?`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteCashbookTransaction(tx._id);
          toast("Transaction deleted.", "success");
        } catch (e: any) {
          toast(e.message || "Failed to delete.", "error");
        }
      },
    });
  };

  const handleSaveBudget = async () => {
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      toast("Please enter a valid monthly limit amount.", "error");
      return;
    }

    try {
      await setBudget(budgetCat, limit, selectedMonth);
      toast(`Monthly budget of ${fmtMoney(limit)} set for "${budgetCat}".`, "success");
      setBudgetModalOpen(false);
      setBudgetLimit("");
    } catch (e: any) {
      toast(e.message || "Failed to save budget.", "error");
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return cashbookTransactions.filter((tx) => {
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (filterCategory !== "all" && tx.category !== filterCategory) return false;
      if (selectedMonth && !tx.date.startsWith(selectedMonth)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${tx.category} ${tx.note || ""} ${tx.paymentMethod || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cashbookTransactions, filterType, filterCategory, selectedMonth, searchQuery]);

  // Export CSV
  const exportCashbookCSV = () => {
    const headers = ["ID", "Type", "Amount", "Category", "Date", "PaymentMethod", "Note"];
    const rows = filteredTransactions.map((tx) => [
      tx._id,
      tx.type,
      tx.amount,
      `"${tx.category.replace(/"/g, '""')}"`,
      tx.date,
      `"${(tx.paymentMethod || "").replace(/"/g, '""')}"`,
      `"${(tx.note || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edgelog-cashbook-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Cashbook CSV exported.", "success");
  };

  const netMonthCashflow = useMemo(() => {
    const inc = filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { inc, exp, net: inc - exp };
  }, [filteredTransactions]);

  return (
    <div className="space-y-5 anim-fade">
      {/* ── TOP HERO CARDS: Income, Expenses & Net Cashflow ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Net Cashflow */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between text-fg-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cashflow</span>
            <Wallet size={16} className={netMonthCashflow.net >= 0 ? "text-pos" : "text-neg"} />
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-bold font-mono ${
                netMonthCashflow.net >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {fmtMoney(netMonthCashflow.net, { sign: true })}
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5">
              For {selectedMonth || "All Recorded Time"}
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between text-fg-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inflow / Income</span>
            <div className="w-6 h-6 rounded-full bg-pos/10 text-pos flex items-center justify-center">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-pos">
              {fmtMoney(netMonthCashflow.inc)}
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5">
              Trading Payouts & Incomes
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between text-fg-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outflow / Expenses</span>
            <div className="w-6 h-6 rounded-full bg-neg/10 text-neg flex items-center justify-center">
              <TrendingDown size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-neg">
              {fmtMoney(netMonthCashflow.exp)}
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5">
              Prop fees, Living & Tools
            </div>
          </div>
        </div>

        {/* Trading Payouts */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between text-fg-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Trading Payouts</span>
            <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <PiggyBank size={13} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-accent">
              {fmtMoney(cashbookSummary?.totalPayouts ?? 0)}
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5">
              Withdrawn from Trading Vaults
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR & QUICK LOGGERS ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddModal("expense")}
            className="flex items-center gap-1.5 text-xs font-semibold bg-neg hover:bg-neg/90 text-white"
          >
            <Plus size={13} /> Log Expense
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddModal("income")}
            className="flex items-center gap-1.5 text-xs font-semibold bg-pos hover:bg-pos/90 text-white"
          >
            <ArrowUpRight size={13} /> Log Income / Payout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBudgetModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <DollarSign size={13} /> Set Monthly Budget
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-surface-2 text-fg text-xs font-mono"
          />
          <Button variant="outline" size="sm" onClick={exportCashbookCSV} className="text-xs">
            <Download size={12} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── BUDGETS PROGRESS TRACKER ────────────────────────────────────────── */}
      {budgets.length > 0 && (
        <Panel
          title="Monthly Category Budgets"
          subtitle="Keep spending discipline across your trading tools, prop firm trials, and personal expenses."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {budgets.map((b) => {
              const spent = cashbookSummary?.monthlyCategorySpending[b.category] || 0;
              const percent = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
              const isOver = spent > b.monthlyLimit;

              return (
                <div
                  key={b._id}
                  className="p-3.5 rounded-lg border border-border bg-surface-2/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-fg truncate">{b.category}</span>
                      <Badge tone={isOver ? "neg" : percent >= 80 ? "warn" : "pos"}>
                        {percent}%
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-sm font-bold font-mono text-fg">{fmtMoney(spent)}</span>
                      <span className="text-[11px] text-fg-3 font-mono">
                        limit {fmtMoney(b.monthlyLimit)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? "bg-neg" : percent >= 80 ? "bg-warn" : "bg-accent"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── TRANSACTION LEDGER TABLE ────────────────────────────────────────── */}
      <Panel
        title={`Transactions Ledger (${filteredTransactions.length})`}
        subtitle="Complete record of all financial movements with category filtering."
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
              {(["all", "expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    filterType === t
                      ? "bg-surface text-fg shadow-sm border border-border"
                      : "text-fg-3 hover:text-fg"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="!w-auto !h-8 !py-0 !text-xs"
            >
              <option value="all">All Categories</option>
              {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <Input
            placeholder="Search notes, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-56 h-8 text-xs"
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block rounded-lg border border-border overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-fg-3 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Linked Portfolio</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-fg-3 text-xs">
                      No cashbook transactions found for the selected filters. Click "+ Log Expense" or "+ Log Income" to begin.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const linkedAcc = accounts.find((a) => a._id === tx.linkedTradingAccountId);
                    return (
                      <tr key={tx._id} className="hover:bg-surface-hover/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <Badge tone={tx.type === "income" ? "pos" : "neg"} className="font-semibold capitalize">
                            {tx.type === "income" ? <ArrowUpRight size={10} className="mr-0.5 inline" /> : <ArrowDownLeft size={10} className="mr-0.5 inline" />}
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-fg-2">{fmtDate(tx.date)}</td>
                        <td className="py-2.5 px-3 font-medium text-fg">{tx.category}</td>
                        <td
                          className={`py-2.5 px-3 font-mono font-semibold ${
                            tx.type === "income" ? "text-pos" : "text-neg"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {fmtMoney(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-fg-3">{tx.paymentMethod || "—"}</td>
                        <td className="py-2.5 px-3 text-fg-3">
                          {linkedAcc ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-surface-2 border border-border">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: linkedAcc.color || "#3b82f6" }}
                              />
                              <span className="truncate max-w-[100px]">{linkedAcc.name}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-fg-2 max-w-[200px] truncate">{tx.note || "—"}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(tx)}
                              className="p-1 rounded text-fg-3 hover:text-fg hover:bg-surface-2"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(tx)}
                              className="p-1 rounded text-fg-3 hover:text-neg hover:bg-neg/10"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List View (< 640px) */}
        <div className="sm:hidden space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-fg-3 text-xs bg-surface rounded-xl border border-border p-4">
              No transactions recorded for this period. Tap "+ Log Expense" or "+ Log Income" above.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const linkedAcc = accounts.find((a) => a._id === tx.linkedTradingAccountId);
              return (
                <div
                  key={tx._id}
                  className="p-3.5 rounded-xl border border-border bg-surface flex flex-col justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={tx.type === "income" ? "pos" : "neg"} className="font-semibold capitalize text-[10px]">
                          {tx.type === "income" ? <ArrowUpRight size={9} className="mr-0.5 inline" /> : <ArrowDownLeft size={9} className="mr-0.5 inline" />}
                          {tx.type}
                        </Badge>
                        <span className="font-semibold text-xs text-fg truncate">{tx.category}</span>
                      </div>
                      <div className="text-[11px] text-fg-3 font-mono mt-1">
                        {fmtDate(tx.date)} {tx.paymentMethod && `· ${tx.paymentMethod}`}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.type === "income" ? "text-pos" : "text-neg"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {fmtMoney(tx.amount)}
                      </div>
                    </div>
                  </div>

                  {tx.note && (
                    <div className="text-xs text-fg-2 bg-surface-2 p-2 rounded-lg border border-border/60">
                      {tx.note}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-fg-3">
                    <div>
                      {linkedAcc && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-fg-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: linkedAcc.color || "#3b82f6" }}
                          />
                          {linkedAcc.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1 px-2 rounded-md bg-surface-2 hover:bg-surface-hover text-fg-2 text-xs flex items-center gap-1"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTx(tx)}
                        className="p-1 px-2 rounded-md bg-neg/10 hover:bg-neg/20 text-neg text-xs flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {/* ── MODAL: ADD / EDIT TRANSACTION ──────────────────────────────────── */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={editingTx ? "Edit Transaction" : txType === "income" ? "Log Income / Trading Payout" : "Log Expense"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTxModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveTransaction}>
              {editingTx ? "Save Changes" : "Record Transaction"}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => {
                setTxType("expense");
                setTxCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                txType === "expense" ? "bg-neg text-white shadow-sm" : "text-fg-3 hover:text-fg"
              }`}
            >
              <ArrowDownLeft size={13} /> Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType("income");
                setTxCategory(INCOME_CATEGORIES[0]);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                txType === "income" ? "bg-pos text-white shadow-sm" : "text-fg-3 hover:text-fg"
              }`}
            >
              <ArrowUpRight size={13} /> Income / Payout
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" hint="Numeric value">
              <Input
                mono
                type="number"
                step="0.01"
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                required
              />
            </Field>

            <Field label="Date">
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                {(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Payment Method">
              <Select value={txPaymentMethod} onChange={(e) => setTxPaymentMethod(e.target.value)}>
                {["Bank Transfer", "Credit / Debit Card", "Crypto (USDT/BTC)", "PayPal / Stripe", "Cash"].map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </Select>
            </Field>
          </div>

          {/* Linked Trading Portfolio (Optional) */}
          <Field label="Linked Trading Portfolio (Optional)" hint="For trading payouts or account challenge deposits">
            <Select value={txLinkedAccount} onChange={(e) => setTxLinkedAccount(e.target.value)}>
              <option value="">— None (Personal / General) —</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes / Description">
            <Input
              placeholder="e.g. Apex evaluation fee 50k, TradingView annual renewal..."
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      {/* ── MODAL: SET BUDGET ──────────────────────────────────────────────── */}
      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="Set Category Monthly Budget"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveBudget}>
              Save Budget Limit
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Category">
            <Select value={budgetCat} onChange={(e) => setBudgetCat(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Monthly Budget Limit" hint="Maximum planned spend per month">
            <Input
              mono
              type="number"
              placeholder="500"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              required
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
