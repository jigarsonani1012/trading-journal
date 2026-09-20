import type { Trade, Rule, JournalEntry, Settings, CustomColumn, SavedView } from "../types";

/**
 * Repository abstraction.
 * ApiRepository persists to the Express + MongoDB backend.
 * The interface is identical to the old LocalRepository so zero UI changes are needed.
 */
export interface Repository<T> {
  load(): Promise<T | null>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

// ── API base URL ──────────────────────────────────────────────────────────────
// In dev, Vite proxies /api/* → http://localhost:3001 (see vite.config.ts)
// In production, set VITE_API_URL env var to your deployed backend URL
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  // 204 No Content or empty body
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
// Settings is a single object, not an array — same load/save/clear interface.
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
  trades:   new ApiRepository<Trade[]>("/api/trades"),
  rules:    new ApiRepository<Rule[]>("/api/rules"),
  journal:  new ApiRepository<JournalEntry[]>("/api/journal"),
  settings: new SingletonApiRepository<Settings>("/api/settings"),
  columns:  new ApiRepository<CustomColumn[]>("/api/columns"),
  views:    new ApiRepository<SavedView[]>("/api/views"),
  meta:     new SingletonApiRepository<{ seeded: boolean; seededAt: string }>("/api/meta"),
};

// ── clearAll ──────────────────────────────────────────────────────────────────
export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(repos).map((r) => r.clear()));
}

// ── storageUsage (no longer applicable — kept for API compatibility) ──────────
export function storageUsage(): number {
  return 0;
}
