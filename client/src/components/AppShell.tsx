import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Table2,
  ShieldCheck,
  BarChart3,
  Compass,
  NotebookPen,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  Command,
  Sun,
  Moon,
  HardDrive,
  MoreHorizontal,
  X,
  Wallet,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
  Download,
  Smartphone,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useStore, type Page } from "../store";
import { Segmented } from "./ui";
import type { Period } from "../types";
import { fmtDateShort, fmtR } from "../lib/format";
import { AccountSwitcher } from "./AccountSwitcher";

const NAV: {
  id: Page;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
  subtitle: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Performance", subtitle: "Command center" },
  { id: "trades", label: "Trades", icon: Table2, group: "Performance", subtitle: "Trade database" },
  { id: "rules", label: "Rules", icon: ShieldCheck, group: "Process", subtitle: "Rules engine & compliance" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Research", subtitle: "Performance laboratory" },
  { id: "edge", label: "Edge", icon: Compass, group: "Research", subtitle: "Find the conditions behind your performance" },
  { id: "journal", label: "Journal", icon: NotebookPen, group: "Process", subtitle: "Daily & weekly review" },
  { id: "cashbook", label: "Cashbook & Budget", icon: Wallet, group: "Finance", subtitle: "Income, expenses & financial runway" },
  { id: "data", label: "Data / Workspace", icon: Database, group: "System", subtitle: "Cloud sync, backup, import, settings" },
];

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Brand Icon Emblem */}
      <div className="relative h-8 w-8 rounded-lg bg-surface border border-border/80 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group">
        <img
          src="/edgelog-icon.jpg"
          alt="EDGELOG"
          className="h-full w-full object-cover rounded-lg"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-accent/20 pointer-events-none" />
      </div>

      {/* Brand Wordmark & Subtitle (Hidden when compact) */}
      {!compact && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 leading-none">
            <span className="font-extrabold text-[15px] tracking-tight text-fg">EDGE</span>
            <span className="font-extrabold text-[15px] tracking-tight bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">
              LOG
            </span>
          </div>
          <span className="text-[9px] font-semibold tracking-[0.16em] uppercase text-fg-3 mt-0.5 leading-none">
            Trading OS
          </span>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    page,
    setPage,
    settings,
    updateSettings,
    trades,
    period,
    setPeriod,
    openForm,
    setSearchOpen,
    setPaletteOpen,
    user,
    openAuthModal,
    logout,
    toast,
  } = useStore();

  const collapsed = settings.sidebarCollapsed;
  const current = NAV.find((n) => n.id === page) || NAV[0];
  const [moreOpen, setMoreOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        toast("Thank you for installing EDGELOG!", "success");
      }
    } else {
      toast("To install EDGELOG: On Mobile, tap Share (↑) and choose 'Add to Home Screen'. On Desktop, click the Install icon in your address bar.", "neutral");
    }
  };

  return (
    <div className="h-full flex bg-bg text-fg">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar shrink-0 transition-[width] duration-200",
          collapsed ? "w-[60px]" : "w-[230px]"
        )}
      >
        <div className={cn("h-14 flex items-center border-b border-border", collapsed ? "justify-center px-0" : "px-4")}>
          <Logo compact={collapsed} />
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
          {["Performance", "Process", "Research", "Finance", "System"].map((g) => {
            const items = NAV.filter((n) => n.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g}>
                {!collapsed && (
                  <div className="px-2 mb-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-fg-3">
                    {g}
                  </div>
                )}
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setPage(n.id)}
                    title={n.label}
                    aria-current={page === n.id ? "page" : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 h-8 rounded-[6px] text-[12.5px] transition-colors mb-0.5",
                      collapsed ? "justify-center px-0" : "px-2",
                      page === n.id
                        ? "bg-surface-hover text-fg font-medium"
                        : "text-fg-2 hover:text-fg hover:bg-surface-hover/60"
                    )}
                  >
                    <n.icon size={15} className={cn(page === n.id ? "text-accent" : "")} />
                    {!collapsed && <span className="truncate">{n.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: User profile & Theme toggle */}
        <div className="border-t border-border p-2 space-y-2">
          {/* User Profile Card */}
          {!collapsed && (
            <div className="px-2.5 py-2 rounded-lg bg-surface/80 border border-border">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 text-[11px] font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-fg truncate">{user.name}</div>
                      <div className="text-[10px] text-fg-3 truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1 rounded text-fg-3 hover:text-neg hover:bg-neg/10 transition-colors"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="w-full flex items-center justify-between text-xs text-accent font-medium hover:underline"
                >
                  <span className="flex items-center gap-1.5">
                    <LogIn size={13} /> Sign In / Register
                  </span>
                  <span className="text-[10px] text-fg-3">Cloud Vault</span>
                </button>
              )}
            </div>
          )}

            {/* PWA Install Button */}
            {!isInstalled && (
              <button
                onClick={handleInstallApp}
                title="Install EDGELOG Desktop/Mobile App"
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium text-accent bg-accent-soft hover:brightness-110 transition-all border border-accent/20",
                  collapsed ? "justify-center px-0 h-8" : ""
                )}
              >
                <Download size={13} className="shrink-0" />
                {!collapsed && <span>Install App</span>}
              </button>
            )}

          {/* Database Status badge */}
          {!collapsed && (
            <div className="px-2.5 py-1.5 rounded-[6px] bg-surface/50 border border-border flex items-center justify-between text-[10.5px] text-fg-3">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
                MongoDB Atlas
              </span>
              <span className="font-mono text-[10px] text-pos">ONLINE</span>
            </div>
          )}

          {/* Controls: Theme & Collapse */}
          <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "justify-between")}>
            <button
              onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
              title="Toggle theme"
              className="h-8 w-8 flex items-center justify-center rounded-[6px] text-fg-2 hover:text-fg hover:bg-surface-hover"
            >
              {settings.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {collapsed && (
              <button
                onClick={user ? logout : openAuthModal}
                title={user ? `Signed in as ${user.name} (Click to Logout)` : "Sign In / Register"}
                className="h-8 w-8 flex items-center justify-center rounded-[6px] text-fg-2 hover:text-fg hover:bg-surface-hover"
              >
                {user ? <UserIcon size={15} className="text-accent" /> : <LogIn size={15} />}
              </button>
            )}

            <button
              onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="h-8 w-8 flex items-center justify-center rounded-[6px] text-fg-2 hover:text-fg hover:bg-surface-hover"
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-border bg-bg/85 backdrop-blur flex items-center gap-2 md:gap-3 px-3 md:px-6 sticky top-0 z-30">
          <div className="md:hidden">
            <Logo compact />
          </div>

          {/* Page title */}
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-[14px] font-semibold leading-tight truncate">{current.label}</h1>
            <p className="text-[11px] text-fg-3 truncate">{current.subtitle}</p>
          </div>

          <div className="sm:hidden min-w-0 flex-1">
            <h1 className="text-[13px] font-semibold truncate ml-1">{current.label}</h1>
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Account Switcher Component */}
          <AccountSwitcher />

          {/* Period selector */}
          <Segmented value={period} onChange={setPeriod} options={PERIODS} className="hidden lg:inline-flex" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="input lg:hidden !w-auto !h-8 !py-0 !text-[11px] !px-2 !pr-6"
            aria-label="Period"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 h-8 px-2.5 rounded-[6px] border border-border bg-surface-2 text-fg-3 text-[12px] hover:text-fg hover:border-border-strong transition-colors w-[180px]"
          >
            <Search size={13} />
            <span className="flex-1 text-left">Search…</span>
            <kbd>/</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden h-9 w-9 flex items-center justify-center rounded-[6px] text-fg-2 hover:bg-surface-hover"
            aria-label="Search"
          >
            <Search size={17} />
          </button>

          {/* Command Palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-surface-2 text-fg-2 hover:text-fg"
            aria-label="Command palette"
            title="Command palette (⌘K)"
          >
            <Command size={13} />
          </button>

          {/* New Trade button */}
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 md:px-3 rounded-[6px] bg-fg text-bg text-[12.5px] font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Trade</span>
            <kbd className="hidden md:inline !bg-transparent !border-bg/30 !text-bg/70">N</kbd>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="max-w-[1600px] mx-auto p-3 md:p-6 anim-fade" key={page}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-border flex items-stretch pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {[
          ["overview", "Overview", LayoutDashboard],
          ["trades", "Trades", Table2],
          ["analytics", "Analytics", BarChart3],
          ["cashbook", "Cashbook", Wallet],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setPage(id as Page);
              setMoreOpen(false);
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
              page === id ? "text-accent" : "text-fg-3"
            )}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
            ["rules", "edge", "journal", "data"].includes(page) ? "text-accent" : "text-fg-3"
          )}
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[45]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-[calc(56px+env(safe-area-inset-bottom))] inset-x-0 bg-surface border-t border-border rounded-t-[16px] p-3 anim-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-2">
              <div className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="panel-title">More Features</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close">
                <X size={16} className="text-fg-3" />
              </button>
            </div>
            {NAV.filter((n) => ["rules", "edge", "journal", "data"].includes(n.id)).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setPage(n.id);
                  setMoreOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 h-12 px-2 rounded-[6px] hover:bg-surface-hover text-[13px]",
                  page === n.id ? "text-accent" : ""
                )}
              >
                <n.icon size={18} className="text-fg-2" />
                {n.label}
              </button>
            ))}
            {!isInstalled && (
              <button
                onClick={() => {
                  setMoreOpen(false);
                  handleInstallApp();
                }}
                className="w-full flex items-center gap-3 h-12 px-2 rounded-[6px] text-accent bg-accent-soft text-[13px] font-medium"
              >
                <Download size={18} className="text-accent" />
                Install Mobile App
              </button>
            )}
            <button
              onClick={() => {
                updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" });
              }}
              className="w-full flex items-center gap-3 h-12 px-2 rounded-[6px] hover:bg-surface-hover text-[13px]"
            >
              {settings.theme === "dark" ? <Sun size={18} className="text-fg-2" /> : <Moon size={18} className="text-fg-2" />}
              Toggle theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Command palette ----------
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setPage, openForm, settings, updateSettings, setSearchOpen } = useStore();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
      setTimeout(() => ref.current?.focus(), 10);
    }
  }, [paletteOpen]);

  const actions = useMemo(
    () => [
      { label: "New Trade", hint: "N", run: () => openForm() },
      { label: "Search Trades", hint: "/", run: () => setSearchOpen(true) },
      { label: "Open Overview", run: () => setPage("overview") },
      { label: "Open Trades", run: () => setPage("trades") },
      { label: "Open Analytics", run: () => setPage("analytics") },
      { label: "Open Rules", run: () => setPage("rules") },
      { label: "Open Cashbook & Budget", run: () => setPage("cashbook") },
      { label: "Open Edge Lab", run: () => setPage("edge") },
      { label: "Open Journal", run: () => setPage("journal") },
      {
        label: "Add Rule",
        run: () => {
          setPage("rules");
          setTimeout(() => window.dispatchEvent(new CustomEvent("edgelog:add-rule")), 50);
        },
      },
      { label: "Import Data", run: () => setPage("data") },
      {
        label: "Export Data",
        run: () => {
          setPage("data");
          setTimeout(() => window.dispatchEvent(new CustomEvent("edgelog:export-json")), 50);
        },
      },
      { label: "Toggle Theme", run: () => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" }) },
      { label: "Open Settings", run: () => setPage("data") },
    ],
    [openForm, setPage, setSearchOpen, settings.theme, updateSettings]
  );

  const list = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  if (!paletteOpen) return null;

  const run = (a: (typeof actions)[number]) => {
    setPaletteOpen(false);
    a.run();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 anim-fade" onClick={() => setPaletteOpen(false)} />
      <div className="relative w-full max-w-[520px] bg-surface border border-border-strong rounded-[10px] shadow-2xl anim-pop overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Command size={14} className="text-fg-3" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(list.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && list[idx]) run(list[idx]);
            }}
            placeholder="Type a command…"
            className="flex-1 h-11 bg-transparent outline-none text-[13.5px]"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {list.length === 0 && (
            <div className="px-3 py-6 text-center text-[12.5px] text-fg-3">No matching commands.</div>
          )}
          {list.map((a, i) => (
            <button
              key={a.label}
              onMouseEnter={() => setIdx(i)}
              onClick={() => run(a)}
              className={cn(
                "w-full flex items-center justify-between h-9 px-3 rounded-[6px] text-[13px]",
                i === idx ? "bg-surface-hover" : ""
              )}
            >
              <span>{a.label}</span>
              {a.hint && <kbd>{a.hint}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Global search ----------
export function GlobalSearch() {
  const { searchOpen, setSearchOpen, trades, rules, journal, setOpenTradeId, setPage, setFilters } = useStore();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQ("");
      setTimeout(() => ref.current?.focus(), 10);
    }
  }, [searchOpen]);

  const ql = q.trim().toLowerCase();
  const res = useMemo(() => {
    if (!ql) return { trades: [], rules: [], journal: [], setups: [], symbols: [], tags: [] };
    const tr = trades
      .filter((t) =>
        [t.id, t.symbol, t.setup, t.notes, t.entryReason, t.exitReason, t.mistake, ...t.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(ql)
      )
      .slice(-8)
      .reverse();
    return {
      trades: tr,
      rules: rules.filter((r) => (r.name + " " + r.description).toLowerCase().includes(ql)).slice(0, 4),
      journal: journal.filter((j) => JSON.stringify(j).toLowerCase().includes(ql)).slice(0, 4),
      setups: [...new Set(trades.map((t) => t.setup))].filter((s) => s.toLowerCase().includes(ql)),
      symbols: [...new Set(trades.map((t) => t.symbol))].filter((s) => s.toLowerCase().includes(ql)),
      tags: [...new Set(trades.flatMap((t) => t.tags))].filter((s) => s.toLowerCase().includes(ql)).slice(0, 6),
    };
  }, [ql, trades, rules, journal]);

  if (!searchOpen) return null;
  const close = () => setSearchOpen(false);

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-2">
      <div className="px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-fg-3 font-semibold">{title}</div>
      {children}
    </div>
  );

  const Row = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={() => {
        onClick();
        close();
      }}
      className="w-full flex items-center gap-3 px-3 h-9 rounded-[6px] hover:bg-surface-hover text-[12.5px] text-left"
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 anim-fade" onClick={close} />
      <div className="relative w-full max-w-[600px] bg-surface border border-border-strong rounded-[10px] shadow-2xl anim-pop overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search size={14} className="text-fg-3" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbols, trade IDs, setups, rules, notes, tags, journal…"
            className="flex-1 h-11 bg-transparent outline-none text-[13.5px]"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {!ql && <div className="px-3 py-8 text-center text-[12.5px] text-fg-3">Type to search across your journal.</div>}
          {ql && Object.values(res).every((a) => a.length === 0) && (
            <div className="px-3 py-8 text-center text-[12.5px] text-fg-3">No results for “{q}”.</div>
          )}
          {res.symbols.length > 0 && (
            <Group title="Symbols">
              {res.symbols.map((s) => (
                <Row
                  key={s}
                  onClick={() => {
                    setFilters((f) => ({ ...f, symbols: [s] }));
                    setPage("trades");
                  }}
                >
                  <span className="mono font-medium">{s}</span>
                  <span className="text-fg-3">Filter trades</span>
                </Row>
              ))}
            </Group>
          )}
          {res.setups.length > 0 && (
            <Group title="Setups">
              {res.setups.map((s) => (
                <Row
                  key={s}
                  onClick={() => {
                    setFilters((f) => ({ ...f, setups: [s] }));
                    setPage("trades");
                  }}
                >
                  <span>{s}</span>
                  <span className="text-fg-3">Filter trades</span>
                </Row>
              ))}
            </Group>
          )}
          {res.tags.length > 0 && (
            <Group title="Tags">
              {res.tags.map((s) => (
                <Row
                  key={s}
                  onClick={() => {
                    setFilters((f) => ({ ...f, search: s }));
                    setPage("trades");
                  }}
                >
                  <span className="mono">#{s}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.trades.length > 0 && (
            <Group title="Trades">
              {res.trades.map((t) => (
                <Row key={t.id} onClick={() => setOpenTradeId(t.id)}>
                  <span className="mono text-fg-3 w-12">{t.id}</span>
                  <span className="mono font-medium w-16">{t.symbol}</span>
                  <span className="text-fg-2 flex-1 truncate">
                    {t.setup} · {t.session}
                  </span>
                  <span className={cn("num", t.netPnL >= 0 ? "text-pos" : "text-neg")}>{fmtR(t.rMultiple)}</span>
                  <span className="text-fg-3 mono text-[11px]">{fmtDateShort(t.exitTime)}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.rules.length > 0 && (
            <Group title="Rules">
              {res.rules.map((r) => (
                <Row
                  key={r.id}
                  onClick={() => {
                    setPage("rules");
                    setTimeout(() => window.dispatchEvent(new CustomEvent("edgelog:open-rule", { detail: r.id })), 50);
                  }}
                >
                  <span className="mono text-fg-3">{String(r.order).padStart(2, "0")}</span>
                  <span>{r.name}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.journal.length > 0 && (
            <Group title="Journal">
              {res.journal.map((j) => (
                <Row
                  key={j.id}
                  onClick={() => {
                    setPage("journal");
                    setTimeout(() => window.dispatchEvent(new CustomEvent("edgelog:open-journal", { detail: j.date })), 50);
                  }}
                >
                  <span className="mono text-fg-3">{j.date}</span>
                  <span className="truncate">{j.kind === "note" ? j.title : j.pre.plan || j.post.happened || "Daily entry"}</span>
                </Row>
              ))}
            </Group>
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-[11px] text-fg-3 flex gap-3">
          <span>Results grouped by type</span>
          <span>
            · Press <kbd>⌘K</kbd> for commands
          </span>
        </div>
      </div>
    </div>
  );
}
