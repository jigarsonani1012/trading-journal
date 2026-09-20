import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Trade,
  Rule,
  JournalEntry,
  Settings,
  CustomColumn,
  SavedView,
  Filters,
  Period,
  User,
  TradingAccount,
  CashbookTransaction,
  Budget,
  CashbookSummary,
} from "./types";
import { EMPTY_FILTERS } from "./types";
import {
  repos,
  clearAll,
  authApi,
  accountsApi,
  cashbookApi,
  getStoredToken,
  setStoredToken,
} from "./lib/repository";
import { seedRules, seedTrades, seedJournal, seedColumns, STARTING_BALANCE } from "./lib/seed";
import { setCurrency, uid } from "./lib/format";
import { computeMetrics, evalFormula, tradeCtx } from "./lib/analytics";

export type Page = "overview" | "trades" | "rules" | "analytics" | "edge" | "journal" | "data" | "cashbook";
export type AppMode = "trading" | "cashbook";

export interface Toast {
  id: string;
  message: string;
  kind?: "info" | "success" | "error";
}

export interface Confirm {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  currency: "USD",
  defaultRiskPercent: 1,
  dateFormat: "DD MMM YYYY",
  timeFormat: "24h",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  minSample: 20,
  startingBalance: STARTING_BALANCE,
  overviewSections: {
    equity: true,
    process: true,
    recent: true,
    calendar: true,
    setups: true,
    sessions: true,
    risk: true,
    today: true,
  },
  sidebarCollapsed: false,
};

interface Store {
  ready: boolean;
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;

  // Auth & Accounts
  user: User | null;
  accounts: TradingAccount[];
  activeAccount: TradingAccount | null;
  isAllAccountsMode: boolean;
  toggleAllAccountsMode: (b: boolean) => void;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (payload: { credential?: string; email?: string; name?: string; googleId?: string }) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  createAccount: (data: Partial<TradingAccount>) => Promise<TradingAccount>;
  updateAccount: (id: string, data: Partial<TradingAccount>) => Promise<TradingAccount>;
  selectAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Cashbook
  cashbookTransactions: CashbookTransaction[];
  budgets: Budget[];
  cashbookSummary: CashbookSummary | null;
  addCashbookTransaction: (data: Omit<CashbookTransaction, "_id">) => Promise<void>;
  updateCashbookTransaction: (id: string, data: Partial<CashbookTransaction>) => Promise<void>;
  deleteCashbookTransaction: (id: string) => Promise<void>;
  setBudget: (category: string, monthlyLimit: number, monthYear?: string) => Promise<void>;
  loadCashbook: () => Promise<void>;

  // Trading Core
  trades: Trade[];
  rules: Rule[];
  journal: JournalEntry[];
  settings: Settings;
  columns: CustomColumn[];
  views: SavedView[];
  page: Page;
  setPage: (p: Page) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  filters: Filters;
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void;
  activeFilterCount: number;
  periodTrades: Trade[];
  filteredTrades: Trade[];
  balance: number;
  equity: number;
  addTrade: (t: Trade) => void;
  updateTrade: (t: Trade) => void;
  deleteTrades: (ids: string[]) => void;
  duplicateTrade: (id: string) => Trade;
  addRule: (r: Omit<Rule, "id" | "order" | "createdAt">) => Rule;
  updateRule: (r: Rule) => void;
  deleteRule: (id: string) => void;
  upsertJournal: (e: JournalEntry) => void;
  deleteJournal: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  addColumn: (c: Omit<CustomColumn, "id">) => void;
  updateColumn: (c: CustomColumn) => void;
  deleteColumn: (id: string) => void;
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  applyView: (id: string) => void;
  resetDemo: () => Promise<void>;
  clearData: () => Promise<void>;
  importTrades: (t: Trade[]) => number;
  restore: (payload: BackupPayload) => void;
  toasts: Toast[];
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  confirm: Confirm | null;
  askConfirm: (c: Confirm) => void;
  closeConfirm: () => void;
  openTradeId: string | null;
  setOpenTradeId: (id: string | null) => void;
  formState: { open: boolean; trade?: Trade };
  openForm: (t?: Trade) => void;
  closeForm: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (b: boolean) => void;
  customValue: (t: Trade, c: CustomColumn) => unknown;
  setupNames: string[];
  symbols: string[];
}

export interface BackupPayload {
  trades: Trade[];
  rules: Rule[];
  journal: JournalEntry[];
  settings?: Settings;
  columns?: CustomColumn[];
  views?: SavedView[];
  accounts?: TradingAccount[];
  cashbookTransactions?: CashbookTransaction[];
  budgets?: Budget[];
  exportedAt?: string;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

function periodStart(p: Period): number {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (p) {
    case "today":
      return d.getTime();
    case "7d":
      return d.getTime() - 6 * 86400000;
    case "30d":
      return d.getTime() - 29 * 86400000;
    case "90d":
      return d.getTime() - 89 * 86400000;
    case "ytd":
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return 0;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("trading");

  // Auth & Accounts
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([
    {
      _id: "acc_default",
      name: "Primary Trading Account",
      currency: "USD",
      startingBalance: 25000,
      defaultRiskPercent: 1.0,
      color: "#3b82f6",
      isDefault: true,
    },
  ]);
  const [activeAccount, setActiveAccount] = useState<TradingAccount | null>(null);
  const [isAllAccountsMode, setIsAllAccountsMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Cashbook
  const [cashbookTransactions, setCashbookTransactions] = useState<CashbookTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cashbookSummary, setCashbookSummary] = useState<CashbookSummary | null>(null);

  // Trading state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [views, setViews] = useState<SavedView[]>([]);
  const [page, setPage] = useState<Page>("overview");
  const [period, setPeriod] = useState<Period>("all");
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [openTradeId, setOpenTradeId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ open: boolean; trade?: Trade }>({ open: false });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loaded = useRef(false);

  // Toast System
  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // ── Load Cashbook Data ──────────────────────────────────────────────────────
  const loadCashbook = useCallback(async () => {
    try {
      const [txs, bgt, sum] = await Promise.all([
        cashbookApi.getTransactions(),
        cashbookApi.getBudgets(),
        cashbookApi.getSummary(),
      ]);
      if (txs) setCashbookTransactions(txs);
      if (bgt) setBudgets(bgt);
      if (sum) setCashbookSummary(sum);
    } catch {
      /* noop */
    }
  }, []);

  // ── Load Accounts ───────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    try {
      const accs = await accountsApi.list();
      if (accs && accs.length > 0) {
        setAccounts(accs);
        const def = accs.find((a) => a.isDefault) || accs[0];
        setActiveAccount(def);
        if (def) {
          setSettings((s) => ({
            ...s,
            currency: def.currency,
            startingBalance: def.startingBalance,
            defaultRiskPercent: def.defaultRiskPercent,
          }));
        }
      }
    } catch {
      /* fallback */
    }
  }, []);

  // ── Initial Load ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Check auth if token stored
      const token = getStoredToken();
      if (token) {
        try {
          const me = await authApi.getMe();
          if (me.ok && me.user) {
            setUser(me.user);
            if (me.accounts?.length) setAccounts(me.accounts);
            if (me.account) setActiveAccount(me.account);
          }
        } catch {
          setStoredToken(null);
        }
      }

      await loadAccounts();
      await loadCashbook();

      const [t, r, j, s, c, v, meta] = await Promise.all([
        repos.trades.load(),
        repos.rules.load(),
        repos.journal.load(),
        repos.settings.load(),
        repos.columns.load(),
        repos.views.load(),
        repos.meta.load(),
      ]);

      if (!meta?.seeded || !t || !r) {
        const rr = seedRules();
        const tt = seedTrades(rr);
        setRules(rr);
        setTrades(tt);
        setJournal(seedJournal(tt));
        setColumns(seedColumns());
        setViews(defaultViews());
        await repos.meta.save({ seeded: true, seededAt: new Date().toISOString() });
      } else {
        setTrades(t);
        setRules(r);
        setJournal(j ?? []);
        setColumns(c ?? seedColumns());
        setViews(v ?? []);
      }

      if (s) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...s,
          overviewSections: { ...DEFAULT_SETTINGS.overviewSections, ...(s.overviewSections ?? {}) },
        });
      }

      loaded.current = true;
      setTimeout(() => setReady(true), 400);
    })();
  }, [loadAccounts, loadCashbook]);

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded.current) repos.trades.save(trades).catch(() => {});
  }, [trades]);

  useEffect(() => {
    if (loaded.current) repos.rules.save(rules).catch(() => {});
  }, [rules]);

  useEffect(() => {
    if (loaded.current) repos.journal.save(journal).catch(() => {});
  }, [journal]);

  useEffect(() => {
    if (loaded.current) repos.columns.save(columns).catch(() => {});
  }, [columns]);

  useEffect(() => {
    if (loaded.current) repos.views.save(views).catch(() => {});
  }, [views]);

  useEffect(() => {
    if (loaded.current) repos.settings.save(settings).catch(() => {});
    setCurrency(settings.currency);
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings]);

  // ── Auth Actions ────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, pass: string) => {
      const res = await authApi.login(email, pass);
      if (res.token) setStoredToken(res.token);
      setUser(res.user);
      if (res.account) setActiveAccount(res.account);
      await loadAccounts();
      await loadCashbook();
    },
    [loadAccounts, loadCashbook]
  );

  const loginWithGoogle = useCallback(
    async (payload: { credential?: string; email?: string; name?: string; googleId?: string }) => {
      const res = await authApi.loginWithGoogle(payload);
      if (res.token) setStoredToken(res.token);
      setUser(res.user);
      if (res.account) setActiveAccount(res.account);
      await loadAccounts();
      await loadCashbook();
    },
    [loadAccounts, loadCashbook]
  );

  const register = useCallback(
    async (name: string, email: string, pass: string) => {
      const res = await authApi.register(name, email, pass);
      if (res.token) setStoredToken(res.token);
      setUser(res.user);
      if (res.account) setActiveAccount(res.account);
      await loadAccounts();
      await loadCashbook();
    },
    [loadAccounts, loadCashbook]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    toast("Logged out of session.", "info");
  }, [toast]);

  // ── Accounts Actions ────────────────────────────────────────────────────────
  const createAccount = useCallback(async (data: Partial<TradingAccount>) => {
    const acc = await accountsApi.create(data);
    setAccounts((p) => [...p, acc]);
    setActiveAccount(acc);
    return acc;
  }, []);

  const updateAccount = useCallback(async (id: string, data: Partial<TradingAccount>) => {
    const acc = await accountsApi.update(id, data);
    setAccounts((p) => p.map((x) => (x._id === id ? acc : x)));
    if (activeAccount?._id === id) {
      setActiveAccount(acc);
      setSettings((s) => ({
        ...s,
        currency: acc.currency,
        startingBalance: acc.startingBalance,
        defaultRiskPercent: acc.defaultRiskPercent,
      }));
    }
    return acc;
  }, [activeAccount]);

  const selectAccount = useCallback(async (id: string) => {
    const res = await accountsApi.select(id);
    if (res.account) {
      setActiveAccount(res.account);
      setSettings((s) => ({
        ...s,
        currency: res.account.currency,
        startingBalance: res.account.startingBalance,
        defaultRiskPercent: res.account.defaultRiskPercent,
      }));
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await accountsApi.delete(id);
    setAccounts((p) => p.filter((x) => x._id !== id));
    if (activeAccount?._id === id) {
      const remaining = accounts.filter((x) => x._id !== id);
      if (remaining.length > 0) setActiveAccount(remaining[0]);
    }
  }, [accounts, activeAccount]);

  // ── Cashbook Actions ────────────────────────────────────────────────────────
  const addCashbookTransaction = useCallback(
    async (data: Omit<CashbookTransaction, "_id">) => {
      const tx = await cashbookApi.addTransaction(data);
      setCashbookTransactions((p) => [tx, ...p]);
      await loadCashbook();
    },
    [loadCashbook]
  );

  const updateCashbookTransaction = useCallback(
    async (id: string, data: Partial<CashbookTransaction>) => {
      const tx = await cashbookApi.updateTransaction(id, data);
      setCashbookTransactions((p) => p.map((x) => (x._id === id ? tx : x)));
      await loadCashbook();
    },
    [loadCashbook]
  );

  const deleteCashbookTransaction = useCallback(
    async (id: string) => {
      await cashbookApi.deleteTransaction(id);
      setCashbookTransactions((p) => p.filter((x) => x._id !== id));
      await loadCashbook();
    },
    [loadCashbook]
  );

  const setBudget = useCallback(
    async (category: string, monthlyLimit: number, monthYear?: string) => {
      const bgt = await cashbookApi.setBudget(category, monthlyLimit, monthYear);
      setBudgets((p) => {
        const idx = p.findIndex((x) => x.category === category);
        if (idx >= 0) {
          const next = [...p];
          next[idx] = bgt;
          return next;
        }
        return [...p, bgt];
      });
      await loadCashbook();
    },
    [loadCashbook]
  );

  // ── Trade Filters & Calculations ───────────────────────────────────────────
  const setFilters = useCallback(
    (f: Filters | ((f: Filters) => Filters)) => setFiltersState((prev) => (typeof f === "function" ? f(prev) : f)),
    []
  );

  // Filter trades by active account (if not in combined mode)
  const accountTrades = useMemo(() => {
    if (isAllAccountsMode || !activeAccount) return trades;
    return trades.filter((t) => !t.accountId || t.accountId === activeAccount._id);
  }, [trades, activeAccount, isAllAccountsMode]);

  const periodTrades = useMemo(() => {
    const s = periodStart(period);
    return s ? accountTrades.filter((t) => new Date(t.exitTime).getTime() >= s) : accountTrades;
  }, [accountTrades, period]);

  const filteredTrades = useMemo(() => {
    const f = filters;
    const q = f.search.trim().toLowerCase();
    return periodTrades.filter((t) => {
      if (f.symbols.length && !f.symbols.includes(t.symbol)) return false;
      if (f.sides.length && !f.sides.includes(t.side)) return false;
      if (f.setups.length && !f.setups.includes(t.setup)) return false;
      if (f.sessions.length && !f.sessions.includes(t.session)) return false;
      if (f.timeframes.length && !f.timeframes.includes(t.timeframe)) return false;
      if (f.emotions.length && !f.emotions.includes(t.emotion)) return false;
      if (f.conditions.length && !f.conditions.includes(t.marketCondition)) return false;
      if (f.grades.length && !f.grades.includes(t.grade || "")) return false;
      if (f.ruleStatus && t.ruleStatus !== f.ruleStatus) return false;
      if (f.outcome === "win" && !(t.netPnL > 0)) return false;
      if (f.outcome === "loss" && !(t.netPnL < 0)) return false;
      if (f.outcome === "be" && t.netPnL !== 0) return false;
      if (f.ruleId && !t.ruleReviews.some((r) => r.ruleId === f.ruleId && r.status === "BROKEN")) return false;
      if (f.rMin != null && t.rMultiple < f.rMin) return false;
      if (f.rMax != null && t.rMultiple > f.rMax) return false;
      if (f.pnlMin != null && t.netPnL < f.pnlMin) return false;
      if (f.pnlMax != null && t.netPnL > f.pnlMax) return false;
      if (q) {
        const hay = [
          t.id,
          t.symbol,
          t.setup,
          t.notes,
          t.entryReason,
          t.exitReason,
          t.emotion,
          t.session,
          ...t.tags,
          t.mistake,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [periodTrades, filters]);

  const activeFilterCount = useMemo(() => {
    const f = filters;
    let n = 0;
    (["symbols", "sides", "setups", "sessions", "timeframes", "emotions", "conditions", "grades"] as const).forEach(
      (k) => {
        if (f[k].length) n++;
      }
    );
    if (f.ruleStatus) n++;
    if (f.outcome) n++;
    if (f.ruleId) n++;
    if (f.rMin != null || f.rMax != null) n++;
    if (f.pnlMin != null || f.pnlMax != null) n++;
    if (f.search) n++;
    return n;
  }, [filters]);

  const currentStartingBalance = useMemo(() => {
    if (isAllAccountsMode) {
      return accounts.reduce((s, a) => s + a.startingBalance, 0);
    }
    return activeAccount ? activeAccount.startingBalance : settings.startingBalance;
  }, [accounts, activeAccount, isAllAccountsMode, settings.startingBalance]);

  const balance = useMemo(() => {
    return currentStartingBalance + computeMetrics(accountTrades).netPnL;
  }, [accountTrades, currentStartingBalance]);

  const equity = balance;

  const addTrade = useCallback(
    (t: Trade) => {
      const withAcc = {
        ...t,
        accountId: t.accountId || activeAccount?._id || "acc_default",
      };
      setTrades((p) => [...p, withAcc]);
      toast("Trade saved.");
    },
    [activeAccount, toast]
  );

  const updateTrade = useCallback(
    (t: Trade) => {
      setTrades((p) =>
        p.map((x) => (x.id === t.id ? { ...x, ...t, updatedAt: new Date().toISOString() } : x))
      );
      toast("Trade updated.");
    },
    [toast]
  );

  const deleteTrades = useCallback(
    (ids: string[]) => {
      setTrades((p) => p.filter((t) => !ids.includes(t.id)));
      setOpenTradeId(null);
      toast(ids.length === 1 ? "Trade deleted." : `${ids.length} trades deleted.`);
    },
    [toast]
  );

  const duplicateTrade = useCallback(
    (id: string) => {
      const src = trades.find((t) => t.id === id)!;
      const now = new Date().toISOString();
      const copy: Trade = {
        ...src,
        id: nextTradeId(trades),
        createdAt: now,
        updatedAt: now,
        screenshots: [],
        notes: src.notes,
      };
      setTrades((p) => [...p, copy]);
      toast("Trade duplicated.");
      return copy;
    },
    [trades, toast]
  );

  const addRule = useCallback(
    (r: Omit<Rule, "id" | "order" | "createdAt">) => {
      const rule: Rule = { ...r, id: uid("rule"), order: rules.length + 1, createdAt: new Date().toISOString() };
      setRules((p) => [...p, rule]);
      toast("Rule added.");
      return rule;
    },
    [rules.length, toast]
  );

  const updateRule = useCallback(
    (r: Rule) => {
      setRules((p) => p.map((x) => (x.id === r.id ? r : x)));
      toast("Rule updated.");
    },
    [toast]
  );

  const deleteRule = useCallback(
    (id: string) => {
      setRules((p) => p.filter((x) => x.id !== id));
      toast("Rule deleted. Historical reviews preserved.");
    },
    [toast]
  );

  const upsertJournal = useCallback((e: JournalEntry) => {
    setJournal((p) => (p.some((x) => x.id === e.id) ? p.map((x) => (x.id === e.id ? e : x)) : [...p, e]));
  }, []);

  const deleteJournal = useCallback(
    (id: string) => {
      setJournal((p) => p.filter((x) => x.id !== id));
      toast("Entry deleted.");
    },
    [toast]
  );

  const updateSettings = useCallback((s: Partial<Settings>) => setSettings((p) => ({ ...p, ...s })), []);

  const addColumn = useCallback(
    (c: Omit<CustomColumn, "id">) => {
      setColumns((p) => [...p, { ...c, id: uid("col") }]);
      toast("Column created.");
    },
    [toast]
  );

  const updateColumn = useCallback(
    (c: CustomColumn) => setColumns((p) => p.map((x) => (x.id === c.id ? c : x))),
    []
  );

  const deleteColumn = useCallback(
    (id: string) => {
      setColumns((p) => p.filter((x) => x.id !== id));
      toast("Column removed.");
    },
    [toast]
  );

  const saveView = useCallback(
    (name: string) => {
      setViews((v) => [...v, { id: uid("view"), name, filters }]);
      toast(`View "${name}" saved.`);
    },
    [filters, toast]
  );

  const deleteView = useCallback((id: string) => setViews((v) => v.filter((x) => x.id !== id)), []);

  const applyView = useCallback(
    (id: string) => {
      const v = views.find((x) => x.id === id);
      if (v) {
        setFiltersState({ ...EMPTY_FILTERS, ...v.filters });
        setPage("trades");
      }
    },
    [views]
  );

  const resetDemo = useCallback(async () => {
    const rr = seedRules();
    const tt = seedTrades(rr);
    setRules(rr);
    setTrades(tt);
    setJournal(seedJournal(tt));
    setColumns(seedColumns());
    setViews(defaultViews());
    setFiltersState(EMPTY_FILTERS);
    await repos.meta.save({ seeded: true, seededAt: new Date().toISOString() });
    toast("Demo dataset restored.");
  }, [toast]);

  const clearData = useCallback(async () => {
    setTrades([]);
    setJournal([]);
    setViews([]);
    setFiltersState(EMPTY_FILTERS);
    await clearAll();
    await repos.meta.save({ seeded: true, seededAt: new Date().toISOString() });
    toast("Local trade data cleared.");
  }, [toast]);

  const importTrades = useCallback(
    (incoming: Trade[]) => {
      const existing = new Set(trades.map((t) => `${t.symbol}|${t.entryTime}|${t.entryPrice}|${t.quantity}`));
      const fresh = incoming.filter((t) => !existing.has(`${t.symbol}|${t.entryTime}|${t.entryPrice}|${t.quantity}`));
      let counter = trades.length;
      const withIds = fresh.map((t) => ({
        ...t,
        id: `T${1000 + counter++ + Math.floor(Math.random() * 100000)}`,
        accountId: activeAccount?._id || "acc_default",
      }));
      setTrades((p) => [...p, ...withIds]);
      return withIds.length;
    },
    [trades, activeAccount]
  );

  const restore = useCallback(
    (p: BackupPayload) => {
      if (!Array.isArray(p.trades) || !Array.isArray(p.rules))
        throw new Error("Backup file is missing trades or rules.");
      setTrades(p.trades);
      setRules(p.rules);
      setJournal(p.journal ?? []);
      if (p.columns) setColumns(p.columns);
      if (p.views) setViews(p.views);
      if (p.accounts) setAccounts(p.accounts);
      if (p.cashbookTransactions) setCashbookTransactions(p.cashbookTransactions);
      if (p.budgets) setBudgets(p.budgets);
      if (p.settings) setSettings((s) => ({ ...s, ...p.settings }));
      toast("Data restored.");
    },
    [toast]
  );

  const customValue = useCallback((t: Trade, c: CustomColumn) => {
    if (c.type === "formula") {
      try {
        return evalFormula(c.formula ?? "", tradeCtx(t));
      } catch {
        return "#ERR";
      }
    }
    return t.customFields[c.key];
  }, []);

  const setupNames = useMemo(() => [...new Set(trades.map((t) => t.setup))].sort(), [trades]);
  const symbols = useMemo(() => [...new Set(trades.map((t) => t.symbol))].sort(), [trades]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setFormState({ open: true });
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const value: Store = {
    ready,
    appMode,
    setAppMode,

    // Auth & Accounts
    user,
    accounts,
    activeAccount,
    isAllAccountsMode,
    toggleAllAccountsMode: setIsAllAccountsMode,
    authModalOpen,
    openAuthModal: () => setAuthModalOpen(true),
    closeAuthModal: () => setAuthModalOpen(false),
    login,
    loginWithGoogle,
    register,
    logout,
    createAccount,
    updateAccount,
    selectAccount,
    deleteAccount,

    // Cashbook
    cashbookTransactions,
    budgets,
    cashbookSummary,
    addCashbookTransaction,
    updateCashbookTransaction,
    deleteCashbookTransaction,
    setBudget,
    loadCashbook,

    // Trading
    trades,
    rules,
    journal,
    settings,
    columns,
    views,
    page,
    setPage,
    period,
    setPeriod,
    filters,
    setFilters,
    activeFilterCount,
    periodTrades,
    filteredTrades,
    balance,
    equity,
    addTrade,
    updateTrade,
    deleteTrades,
    duplicateTrade,
    addRule,
    updateRule,
    deleteRule,
    upsertJournal,
    deleteJournal,
    updateSettings,
    addColumn,
    updateColumn,
    deleteColumn,
    saveView,
    deleteView,
    applyView,
    resetDemo,
    clearData,
    importTrades,
    restore,
    toasts,
    toast,
    dismissToast,
    confirm,
    askConfirm: setConfirm,
    closeConfirm: () => setConfirm(null),
    openTradeId,
    setOpenTradeId,
    formState,
    openForm: (t?: Trade) => setFormState({ open: true, trade: t }),
    closeForm: () => setFormState({ open: false }),
    paletteOpen,
    setPaletteOpen,
    searchOpen,
    setSearchOpen,
    customValue,
    setupNames,
    symbols,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function nextTradeId(trades: Trade[]) {
  const max = trades.reduce((m, t) => {
    const n = parseInt(t.id.replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 999);
  return `T${max + 1}`;
}

function defaultViews(): SavedView[] {
  return [
    { id: "view_1", name: "London Breakouts", filters: { ...EMPTY_FILTERS, sessions: ["London"], setups: ["Breakout"] } },
    { id: "view_2", name: "Rule Violations", filters: { ...EMPTY_FILTERS, ruleStatus: "BROKEN" } },
    { id: "view_3", name: "Losses > 1R", filters: { ...EMPTY_FILTERS, rMax: -1 } },
    { id: "view_4", name: "A-grade process", filters: { ...EMPTY_FILTERS, grades: ["A"] } },
  ];
}
