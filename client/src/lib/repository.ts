import type {
  Trade,
  Rule,
  JournalEntry,
  Settings,
  CustomColumn,
  SavedView,
  User,
  TradingAccount,
  CashbookTransaction,
  Budget,
  CashbookSummary,
} from "../types";

/**
 * Repository abstraction.
 * ApiRepository persists to the Express + MongoDB backend.
 */
export interface Repository<T> {
  load(): Promise<T | null>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

// ── API base URL ──────────────────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

// ── Auth Token Storage ────────────────────────────────────────────────────────
const TOKEN_KEY = "edgelog_auth_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* noop */
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const b = (await res.json()) as { error?: string };
      if (b.error) msg = b.error;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

// ── Generic API Repository ────────────────────────────────────────────────────
export class ApiRepository<T> implements Repository<T> {
  constructor(private endpoint: string) {}

  async load(): Promise<T | null> {
    try {
      return await apiFetch<T>(this.endpoint);
    } catch (e) {
      console.error(`[ApiRepository] load ${this.endpoint} failed:`, e);
      return null;
    }
  }

  async save(value: T): Promise<void> {
    await apiFetch<{ ok: boolean }>(this.endpoint, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }

  async clear(): Promise<void> {
    await apiFetch<{ ok: boolean }>(this.endpoint, { method: "DELETE" });
  }
}

// ── Singleton repository (for settings & meta) ────────────────────────────────
export class SingletonApiRepository<T extends object> implements Repository<T> {
  constructor(private endpoint: string) {}

  async load(): Promise<T | null> {
    try {
      return await apiFetch<T>(this.endpoint);
    } catch (e) {
      console.error(`[SingletonApiRepository] load ${this.endpoint} failed:`, e);
      return null;
    }
  }

  async save(value: T): Promise<void> {
    await apiFetch<{ ok: boolean }>(this.endpoint, {
      method: "POST",
      body: JSON.stringify(value),
    });
  }

  async clear(): Promise<void> {
    await apiFetch<{ ok: boolean }>(this.endpoint, { method: "DELETE" });
  }
}

// ── Repo instances ────────────────────────────────────────────────────────────
export const repos = {
  trades: new ApiRepository<Trade[]>("/api/trades"),
  rules: new ApiRepository<Rule[]>("/api/rules"),
  journal: new ApiRepository<JournalEntry[]>("/api/journal"),
  settings: new SingletonApiRepository<Settings>("/api/settings"),
  columns: new ApiRepository<CustomColumn[]>("/api/columns"),
  views: new ApiRepository<SavedView[]>("/api/views"),
  meta: new SingletonApiRepository<{ seeded: boolean; seededAt: string }>("/api/meta"),
};

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  async register(name: string, email: string, password: string): Promise<{ ok: boolean; token: string; user: User; account: TradingAccount }> {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string): Promise<{ ok: boolean; token: string; user: User; account: TradingAccount }> {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async loginWithGoogle(payload: { credential?: string; email?: string; name?: string; googleId?: string }): Promise<{ ok: boolean; token: string; user: User; account: TradingAccount }> {
    return apiFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<{ ok: boolean; user: User; account: TradingAccount; accounts: TradingAccount[] }> {
    return apiFetch("/api/auth/me");
  },
};

// ── Accounts API ──────────────────────────────────────────────────────────────
export const accountsApi = {
  async list(): Promise<TradingAccount[]> {
    return apiFetch("/api/accounts");
  },

  async create(data: Partial<TradingAccount>): Promise<TradingAccount> {
    return apiFetch("/api/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<TradingAccount>): Promise<TradingAccount> {
    return apiFetch(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async select(id: string): Promise<{ ok: boolean; activeAccountId: string; account: TradingAccount }> {
    return apiFetch(`/api/accounts/${id}/select`, {
      method: "POST",
    });
  },

  async delete(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/accounts/${id}`, {
      method: "DELETE",
    });
  },
};

// ── Cashbook API ──────────────────────────────────────────────────────────────
export const cashbookApi = {
  async getTransactions(): Promise<CashbookTransaction[]> {
    return apiFetch("/api/cashbook/transactions");
  },

  async addTransaction(data: Omit<CashbookTransaction, "_id">): Promise<CashbookTransaction> {
    return apiFetch("/api/cashbook/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateTransaction(id: string, data: Partial<CashbookTransaction>): Promise<CashbookTransaction> {
    return apiFetch(`/api/cashbook/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteTransaction(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/cashbook/transactions/${id}`, {
      method: "DELETE",
    });
  },

  async getBudgets(): Promise<Budget[]> {
    return apiFetch("/api/cashbook/budgets");
  },

  async setBudget(category: string, monthlyLimit: number, monthYear?: string): Promise<Budget> {
    return apiFetch("/api/cashbook/budgets", {
      method: "POST",
      body: JSON.stringify({ category, monthlyLimit, monthYear }),
    });
  },

  async getSummary(): Promise<CashbookSummary> {
    return apiFetch("/api/cashbook/summary");
  },
};

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(repos).map((r) => r.clear()));
}

export function storageUsage(): number {
  return 0;
}
