export type Side = "LONG" | "SHORT";
export type RuleStatus = "FOLLOWED" | "BROKEN";
export type Grade = "A" | "B" | "C" | "D" | "";

export interface RuleReview {
  ruleId: string;
  status: RuleStatus;
  why?: string;
  whatHappened?: string;
  lesson?: string;
  change?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  market: string;
  side: Side;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string; // ISO
  exitTime: string; // ISO
  stopLoss?: number;
  takeProfit?: number;
  riskAmount: number;
  riskPercent: number;
  plannedRR?: number;
  grossPnL: number;
  fees: number;
  netPnL: number;
  rMultiple: number;
  holdingMinutes: number;
  setup: string;
  strategy: string;
  timeframe: string;
  session: string;
  htfBias: "Bullish" | "Bearish" | "Neutral";
  marketCondition: string;
  entryModel?: string;
  exitModel?: string;
  entryReason?: string;
  exitReason?: string;
  emotion: string;
  confidence: number; // 1-5
  mistake?: string;
  grade: Grade;
  ruleStatus: RuleStatus;
  ruleReviews: RuleReview[];
  notes?: string;
  screenshots: string[];
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  order: number;
  name: string;
  description: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  active: boolean;
  createdAt: string;
}

export type ColumnType =
  | "text" | "number" | "currency" | "percent" | "date" | "datetime"
  | "dropdown" | "multiselect" | "checkbox" | "formula" | "rating";

export interface CustomColumn {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  formula?: string;
  visible: boolean;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: "daily" | "weekly" | "note";
  pre: { expectations: string; levels: string; bias: string; plan: string; rulesFocus: string; riskLimit: string };
  post: { happened: string; well: string; poorly: string; learned: string; changes: string };
  weekly?: { wins: string; problems: string; patterns: string; lessons: string; focus: string };
  title?: string;
  body?: string;
  updatedAt: string;
}

export interface Settings {
  theme: "dark" | "light";
  currency: string;
  defaultRiskPercent: number;
  dateFormat: "DD MMM YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "24h" | "12h";
  timezone: string;
  minSample: number;
  startingBalance: number;
  overviewSections: Record<string, boolean>;
  sidebarCollapsed: boolean;
}

export interface Filters {
  search: string;
  symbols: string[];
  sides: Side[];
  setups: string[];
  sessions: string[];
  timeframes: string[];
  ruleStatus: RuleStatus | "";
  outcome: "" | "win" | "loss" | "be";
  emotions: string[];
  conditions: string[];
  grades: string[];
  ruleId: string;
  rMin?: number;
  rMax?: number;
  pnlMin?: number;
  pnlMax?: number;
}

export interface SavedView {
  id: string;
  name: string;
  filters: Filters;
}

export type Period = "today" | "7d" | "30d" | "90d" | "ytd" | "all";

export const EMPTY_FILTERS: Filters = {
  search: "", symbols: [], sides: [], setups: [], sessions: [], timeframes: [],
  ruleStatus: "", outcome: "", emotions: [], conditions: [], grades: [], ruleId: "",
};

// ── Auth & Accounts ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  activeAccountId?: string;
}

export interface TradingAccount {
  _id: string;
  userId?: string;
  name: string;
  broker?: string;
  currency: "USD" | "INR" | "EUR" | "GBP";
  startingBalance: number;
  defaultRiskPercent: number;
  color: string;
  isDefault: boolean;
  createdAt?: string;
}

// ── Cashbook & Budget ───────────────────────────────────────────────────────
export interface CashbookTransaction {
  _id: string;
  userId?: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note?: string;
  paymentMethod?: string;
  linkedTradingAccountId?: string;
  createdAt?: string;
}

export interface Budget {
  _id: string;
  userId?: string;
  category: string;
  monthlyLimit: number;
  monthYear: string;
  createdAt?: string;
}

export interface CashbookSummary {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  totalPayouts: number;
  currentMonth: string;
  categorySpending: Record<string, number>;
  monthlyCategorySpending: Record<string, number>;
  budgets: Budget[];
}

