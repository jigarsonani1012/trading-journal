import React, { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, BarChart, Bar, Cell, ReferenceLine, LineChart, Line } from "recharts";
import type { Trade } from "../types";
import { equityCurve, computeMetrics, type EquityPoint } from "../lib/analytics";
import { fmtMoney, fmtR, fmtDateShort, fmtPct, dayKey } from "../lib/format";
import { cn } from "../utils/cn";
import { Segmented } from "./ui";

const css = (v: string) => `var(--${v})`;

function TipBox({ rows, title }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <div className="bg-surface border border-border-strong rounded-[6px] shadow-xl px-3 py-2 text-[11.5px] min-w-[170px]">
      <div className="mono text-fg-3 mb-1">{title}</div>
      {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-fg-2">{k}</span><span className="num text-fg">{v}</span></div>)}
    </div>
  );
}

export function EquityCurve({ trades, startingBalance, height = 280, showControls = true, mode: modeProp }: { trades: Trade[]; startingBalance: number; height?: number; showControls?: boolean; mode?: "balance" | "cumPnL" | "cumR" }) {
  const [mode, setMode] = useState<"balance" | "cumPnL" | "cumR">(modeProp ?? "balance");
  const [range, setRange] = useState<"1W" | "1M" | "3M" | "6M" | "YTD" | "ALL">("ALL");
  const pts = useMemo(() => {
    const all = equityCurve(trades, startingBalance);
    const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, YTD: 0, ALL: 0 }[range];
    if (range === "ALL") return all;
    const from = range === "YTD" ? new Date(new Date().getFullYear(), 0, 1).getTime() : Date.now() - days * 86400000;
    return all.filter(p => p.ts >= from);
  }, [trades, startingBalance, range]);
  const key = mode; const positive = pts.length ? pts[pts.length - 1][key] >= (mode === "balance" ? startingBalance : 0) : true;
  const color = positive ? css("pos") : css("neg");
  const fmtY = (v: number) => mode === "cumR" ? `${v.toFixed(0)}R` : fmtMoney(v, { compact: true, decimals: 0 });
  return (
    <div>
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Segmented value={mode} onChange={setMode} options={[{ value: "balance", label: "Balance" }, { value: "cumPnL", label: "Cumulative P&L" }, { value: "cumR", label: "Cumulative R" }]} />
          <Segmented value={range} onChange={setRange} options={(["1W", "1M", "3M", "6M", "YTD", "ALL"] as const).map(r => ({ value: r, label: r }))} />
        </div>
      )}
      {pts.length < 2 ? <div className="h-[200px] flex items-center justify-center text-[12px] text-fg-3">Not enough data for this range.</div> : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={pts} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs><linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.22} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={v => fmtDateShort(new Date(v))} tickLine={false} axisLine={false} minTickGap={48} />
            <YAxis tickFormatter={fmtY} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
            {mode !== "balance" && <ReferenceLine y={0} stroke="var(--border-strong)" />}
            {mode === "balance" && <ReferenceLine y={startingBalance} stroke="var(--border-strong)" strokeDasharray="3 3" />}
            <RTooltip cursor={{ stroke: "var(--border-strong)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload as EquityPoint; return <TipBox title={fmtDateShort(p.date) + " · " + p.trades + " trades"} rows={[["Balance", fmtMoney(p.balance)], ["Daily P&L", <span className={p.dailyPnL >= 0 ? "text-pos" : "text-neg"}>{fmtMoney(p.dailyPnL, { sign: true })}</span>], ["Cumulative P&L", fmtMoney(p.cumPnL, { sign: true })], ["Cumulative R", fmtR(p.cumR, 1)], ["Drawdown", <span className={p.drawdown < 0 ? "text-neg" : ""}>{fmtMoney(p.drawdown)} ({fmtPct(p.drawdownPct)})</span>]]} />; }} />
            <Area type="monotone" dataKey={key} stroke={color} strokeWidth={1.6} fill="url(#eqfill)" isAnimationActive={false} activeDot={{ r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DrawdownChart({ trades, startingBalance, height = 140 }: { trades: Trade[]; startingBalance: number; height?: number }) {
  const pts = useMemo(() => equityCurve(trades, startingBalance), [trades, startingBalance]);
  if (pts.length < 2) return <div className="h-[100px] flex items-center justify-center text-[12px] text-fg-3">Not enough data.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={pts} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="ddfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={css("neg")} stopOpacity={0.05} /><stop offset="100%" stopColor={css("neg")} stopOpacity={0.35} /></linearGradient></defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={v => fmtDateShort(new Date(v))} tickLine={false} axisLine={false} minTickGap={48} />
        <YAxis tickFormatter={v => fmtPct(v, 0)} tickLine={false} axisLine={false} width={44} />
        <RTooltip cursor={{ stroke: "var(--border-strong)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload as EquityPoint; return <TipBox title={fmtDateShort(p.date)} rows={[["Drawdown", <span className="text-neg">{fmtMoney(p.drawdown)}</span>], ["Drawdown %", fmtPct(p.drawdownPct)], ["Balance", fmtMoney(p.balance)]]} />; }} />
        <Area type="step" dataKey="drawdownPct" stroke={css("neg")} strokeWidth={1.2} fill="url(#ddfill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RHistogram({ trades, height = 200 }: { trades: Trade[]; height?: number }) {
  const data = useMemo(() => {
    const bins: { label: string; lo: number; hi: number; n: number }[] = [];
    for (let b = -3; b < 5; b += 0.5) bins.push({ label: `${b >= 0 ? "+" : ""}${b.toFixed(1)}`, lo: b, hi: b + 0.5, n: 0 });
    for (const t of trades) { const r = Math.max(-3, Math.min(4.99, t.rMultiple)); const bin = bins.find(b => r >= b.lo && r < b.hi); if (bin) bin.n++; }
    return bins;
  }, [trades]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} />
        <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <RTooltip cursor={{ fill: "var(--surface-hover)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload; return <TipBox title={`${p.label}R to ${(p.hi >= 0 ? "+" : "") + p.hi.toFixed(1)}R`} rows={[["Trades", p.n]]} />; }} />
        <Bar dataKey="n" radius={[2, 2, 0, 0]} isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={d.lo < 0 ? css("neg") : css("pos")} fillOpacity={0.75} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarMetric({ data, valueKey = "value", height = 180, format = (v: number) => fmtMoney(v, { compact: true, decimals: 0 }), labelKey = "label" }: { data: Record<string, unknown>[]; valueKey?: string; height?: number; format?: (v: number) => string; labelKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={labelKey} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={format} tickLine={false} axisLine={false} width={50} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <RTooltip cursor={{ fill: "var(--surface-hover)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload; return <TipBox title={String(p[labelKey])} rows={[["Value", format(Number(p[valueKey]))], ...(p.n != null ? [["Trades", p.n] as [string, React.ReactNode]] : [])]} />; }} />
        <Bar dataKey={valueKey} radius={[2, 2, 0, 0]} isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={Number(d[valueKey]) >= 0 ? css("pos") : css("neg")} fillOpacity={0.8} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CumulativeR({ trades, height = 180 }: { trades: Trade[]; height?: number }) {
  const data = useMemo(() => { let c = 0; return [...trades].sort((a, b) => a.exitTime.localeCompare(b.exitTime)).map((t, i) => { c += t.rMultiple; return { i: i + 1, r: Math.round(c * 100) / 100, id: t.id }; }); }, [trades]);
  if (data.length < 2) return <div className="h-[100px] flex items-center justify-center text-[12px] text-fg-3">Not enough data.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="i" tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis tickFormatter={v => `${v}R`} tickLine={false} axisLine={false} width={44} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <RTooltip cursor={{ stroke: "var(--border-strong)" }} content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload; return <TipBox title={`Trade #${p.i} · ${p.id}`} rows={[["Cumulative R", fmtR(p.r, 1)]]} />; }} />
        <Line type="monotone" dataKey="r" stroke={css("accent")} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------- Heatmap (day x hour) ----------
export function TimeHeatmap({ trades, metric = "pnl" }: { trades: Trade[]; metric?: "pnl" | "avgR" | "count" | "winRate" }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]; const hours = Array.from({ length: 20 }, (_, i) => i + 1);
  const grid = useMemo(() => {
    const m = new Map<string, Trade[]>();
    for (const t of trades) { const d = new Date(t.entryTime); const k = `${d.getDay()}-${d.getHours()}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); }
    return m;
  }, [trades]);
  const val = (ts: Trade[]) => { const m = computeMetrics(ts); return metric === "pnl" ? m.netPnL : metric === "avgR" ? (m.avgR ?? 0) : metric === "count" ? m.trades : (m.winRate ?? 0); };
  const all = [...grid.values()].map(val); const max = Math.max(1e-9, ...all.map(Math.abs));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid" style={{ gridTemplateColumns: `40px repeat(${hours.length}, 1fr)` }}>
          <div />{hours.map(h => <div key={h} className="mono text-[9.5px] text-fg-3 text-center pb-1">{String(h).padStart(2, "0")}</div>)}
          {days.map((d, di) => (
            <React.Fragment key={d}>
              <div className="text-[11px] text-fg-2 flex items-center">{d}</div>
              {hours.map(h => {
                const ts = grid.get(`${di + 1}-${h}`) ?? []; const v = ts.length ? val(ts) : null;
                const intensity = v == null ? 0 : metric === "count" ? Math.abs(v) / max : Math.min(1, Math.abs(v) / max) * 0.85 + 0.15;
                const pos = metric === "count" ? true : metric === "winRate" ? (v ?? 0) >= 50 : (v ?? 0) >= 0;
                const bg = v == null ? "var(--surface-2)" : `color-mix(in srgb, ${pos ? "var(--pos)" : "var(--neg)"} ${Math.round(intensity * 60)}%, var(--surface-2))`;
                const m = computeMetrics(ts);
                return <div key={h} title={ts.length ? `${d} ${h}:00 — ${ts.length} trades · ${fmtMoney(m.netPnL, { sign: true })} · ${fmtR(m.avgR)} avg · ${fmtPct(m.winRate)} WR` : `${d} ${h}:00 — no trades`} className="h-7 m-[1.5px] rounded-[3px] border border-border/50 transition-transform hover:scale-105 cursor-default" style={{ background: bg }} />;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Calendar ----------
export function PnLCalendar({ trades, month, onMonth, onDay, selected }: { trades: Trade[]; month: Date; onMonth: (d: Date) => void; onDay: (k: string) => void; selected?: string }) {
  const byDay = useMemo(() => { const m = new Map<string, Trade[]>(); for (const t of trades) { const k = dayKey(t.exitTime); if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); } return m; }, [trades]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1); const startDow = (first.getDay() + 6) % 7; const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: dim }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const max = Math.max(1, ...[...byDay.entries()].filter(([k]) => k.startsWith(dayKey(first).slice(0, 7))).map(([, ts]) => Math.abs(ts.reduce((s, t) => s + t.netPnL, 0))));
  const monthTrades = trades.filter(t => dayKey(t.exitTime).startsWith(dayKey(first).slice(0, 7))); const mm = computeMetrics(monthTrades);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1"><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="h-7 w-7 rounded-[5px] hover:bg-surface-hover text-fg-2" aria-label="Previous month">‹</button><span className="text-[13px] font-medium w-[120px] text-center">{month.toLocaleString("en-US", { month: "long", year: "numeric" })}</span><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="h-7 w-7 rounded-[5px] hover:bg-surface-hover text-fg-2" aria-label="Next month">›</button></div>
        <div className="text-[11.5px] text-fg-3 flex gap-3"><span>{mm.trades} trades</span><span className={cn("num", mm.netPnL >= 0 ? "text-pos" : "text-neg")}>{fmtMoney(mm.netPnL, { sign: true })}</span></div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <div key={d} className="text-[10px] text-fg-3 text-center font-medium pb-1">{d}</div>)}
        {cells.map((k, i) => {
          if (!k) return <div key={i} />;
          const ts = byDay.get(k) ?? []; const pnl = ts.reduce((s, t) => s + t.netPnL, 0); const wins = ts.filter(t => t.netPnL > 0).length; const r = ts.reduce((s, t) => s + t.rMultiple, 0);
          const intensity = ts.length ? Math.min(1, Math.abs(pnl) / max) * 0.5 + 0.1 : 0;
          const bg = ts.length ? `color-mix(in srgb, ${pnl >= 0 ? "var(--pos)" : "var(--neg)"} ${Math.round(intensity * 100)}%, var(--surface-2))` : "var(--surface-2)";
          return (
            <button key={k} onClick={() => ts.length && onDay(k)} className={cn("rounded-[5px] border text-left p-1.5 min-h-[56px] md:min-h-[64px] transition-all", selected === k ? "border-accent" : "border-border/60", ts.length ? "hover:scale-[1.02] cursor-pointer" : "cursor-default opacity-70")} style={{ background: bg }}>
              <div className="flex justify-between items-start"><span className="mono text-[10px] text-fg-3">{Number(k.slice(-2))}</span>{ts.length > 0 && <span className="mono text-[9.5px] text-fg-3">{ts.length}</span>}</div>
              {ts.length > 0 && <><div className={cn("num text-[11px] md:text-[12px] font-medium mt-1 leading-tight", pnl >= 0 ? "text-pos" : "text-neg")}>{fmtMoney(pnl, { sign: true, decimals: 0, compact: true })}</div><div className="hidden md:flex justify-between text-[9.5px] text-fg-3 mono mt-0.5"><span>{fmtR(r, 1)}</span><span>{Math.round((wins / ts.length) * 100)}%</span></div></>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
