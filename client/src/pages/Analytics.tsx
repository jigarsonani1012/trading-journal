import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useStore } from "../store";
import { FilterBar } from "../components/FilterBar";
import { Panel, Metric, StatRow, Segmented, SampleWarning, EmptyState, Button } from "../components/ui";
import { EquityCurve, DrawdownChart, RHistogram, CumulativeR, TimeHeatmap, BarMetric } from "../components/charts";
import { computeMetrics, groupBy, DIMENSIONS, dimById, streaks, drawdownSeries, type GroupRow } from "../lib/analytics";
import { fmtMoney, fmtPct, fmtR, fmtPF, fmtDuration, signClass } from "../lib/format";
import { cn } from "../utils/cn";
import { EMPTY_FILTERS } from "../types";

type Tab = "dimensions" | "time" | "r" | "drawdown" | "streaks" | "holding";

export function Analytics() {
  const { filteredTrades, settings, activeFilterCount, setFilters } = useStore();
  const [tab, setTab] = useState<Tab>("dimensions");
  const m = useMemo(() => computeMetrics(filteredTrades, settings.startingBalance), [filteredTrades, settings.startingBalance]);
  return (
    <div className="space-y-3">
      <FilterBar />
      <div className="panel overflow-x-auto">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-x-5 gap-y-2 px-4 py-3 min-w-[400px]">
          <Metric size="sm" label={activeFilterCount ? "Filtered trades" : "Trades"} value={m.trades} />
          <Metric size="sm" label="Net P&L" value={fmtMoney(m.netPnL, { sign: true })} tone={m.netPnL} />
          <Metric size="sm" label="Win rate" value={fmtPct(m.winRate)} />
          <Metric size="sm" label="Profit factor" value={fmtPF(m.profitFactor)} />
          <Metric size="sm" label="Avg R" value={fmtR(m.avgR)} tone={m.avgR} />
          <Metric size="sm" label="Expectancy" value={fmtMoney(m.expectancy, { sign: true })} tone={m.expectancy} />
          <Metric size="sm" label="Avg win / loss" value={<span>{fmtMoney(m.avgWin, { decimals: 0 })} <span className="text-fg-3">/</span> {fmtMoney(m.avgLoss, { decimals: 0 })}</span>} />
          <Metric size="sm" label="Max DD" value={fmtMoney(m.maxDrawdown)} tone={m.maxDrawdown < 0 ? -1 : 0} />
        </div>
      </div>
      <div className="overflow-x-auto pb-0.5">
        <Segmented size="md" value={tab} onChange={setTab} options={[{ value: "dimensions", label: "Dimensions" }, { value: "time", label: "Day / Time" }, { value: "r", label: "R multiple" }, { value: "drawdown", label: "Drawdown" }, { value: "streaks", label: "Streaks" }, { value: "holding", label: "Holding time" }]} className="min-w-max" />
      </div>
      {filteredTrades.length === 0 ? <Panel><EmptyState title="No trades match these conditions." action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>} /></Panel> : (
        <>
          {tab === "dimensions" && <Dimensions />}
          {tab === "time" && <TimeTab />}
          {tab === "r" && <RTab />}
          {tab === "drawdown" && <DrawdownTab />}
          {tab === "streaks" && <StreaksTab />}
          {tab === "holding" && <HoldingTab />}
        </>
      )}
    </div>
  );
}

export function AnalyticsTable({ rows, min, label, extra }: { rows: GroupRow[]; min: number; label: string; extra?: { h: string; f: (g: GroupRow) => React.ReactNode }[] }) {
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: "net", d: -1 });
  const { setFilters, setPage } = useStore();
  const get = (g: GroupRow, k: string): number | string => ({ key: g.key, n: g.trades.length, wr: g.m.winRate ?? -1, net: g.m.netPnL, avgR: g.m.avgR ?? -99, pf: g.m.profitFactor ?? -1, exp: g.m.expectancy ?? -99, comp: g.m.compliance ?? -1, avgWin: g.m.avgWin ?? 0, avgLoss: g.m.avgLoss ?? 0, dd: g.m.maxDrawdown, best: g.m.bestR ?? 0, worst: g.m.worstR ?? 0, hold: g.m.avgHold ?? 0 } as Record<string, number | string>)[k];
  const sorted = [...rows].sort((a, b) => { const x = get(a, sort.k), y = get(b, sort.k); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.d; });
  const cols: [string, string, boolean][] = [["key", label, false], ["n", "Trades", true], ["wr", "Win rate", true], ["net", "Net P&L", true], ["avgR", "Avg R", true], ["pf", "PF", true], ["exp", "Expectancy", true], ["comp", "Compliance", true], ["avgWin", "Avg win", true], ["avgLoss", "Avg loss", true], ["dd", "Max DD", true], ["best", "Best R", true], ["worst", "Worst R", true], ["hold", "Avg hold", true]];
  const H = ({ k, l, r }: { k: string; l: string; r: boolean }) => <th className={cn(r && "!text-right", "cursor-pointer hover:text-fg select-none")} onClick={() => setSort(s => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : -1 }))}><span className="inline-flex items-center gap-1">{l}{sort.k === k && (sort.d === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span></th>;
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="tbl w-full min-w-[900px]">
        <thead><tr>{cols.map(([k, l, r]) => <H key={k} k={k} l={l} r={r} />)}{extra?.map(e => <th key={e.h}>{e.h}</th>)}</tr></thead>
        <tbody>{sorted.map(g => (
          <tr key={g.key} className="cursor-pointer" onClick={() => { const dim = DIMENSIONS.find(d => d.label === label); if (dim && ["symbol", "setup", "session", "side", "timeframe", "emotion", "marketCondition", "grade"].includes(dim.id)) { const map: Record<string, string> = { symbol: "symbols", setup: "setups", session: "sessions", side: "sides", timeframe: "timeframes", emotion: "emotions", marketCondition: "conditions", grade: "grades" }; setFilters(f => ({ ...f, [map[dim.id]]: [g.key === "Ungraded" ? "" : g.key] })); setPage("trades"); } }}>
            <td className="font-medium"><div className="flex items-center gap-2">{g.key}<SampleWarning n={g.trades.length} min={min} /></div></td>
            <td className="text-right mono text-fg-2">{g.trades.length}</td>
            <td className="text-right mono">{fmtPct(g.m.winRate)}</td>
            <td className={cn("text-right num font-medium", signClass(g.m.netPnL))}>{fmtMoney(g.m.netPnL, { sign: true })}</td>
            <td className={cn("text-right num", signClass(g.m.avgR))}>{fmtR(g.m.avgR)}</td>
            <td className="text-right mono">{fmtPF(g.m.profitFactor)}</td>
            <td className={cn("text-right num", signClass(g.m.expectancy))}>{fmtMoney(g.m.expectancy, { sign: true })}</td>
            <td className="text-right mono">{fmtPct(g.m.compliance, 0)}</td>
            <td className="text-right mono text-pos">{fmtMoney(g.m.avgWin, { decimals: 0 })}</td>
            <td className="text-right mono text-neg">{fmtMoney(g.m.avgLoss, { decimals: 0 })}</td>
            <td className="text-right mono text-fg-2">{fmtMoney(g.m.maxDrawdown, { decimals: 0 })}</td>
            <td className="text-right num text-pos">{fmtR(g.m.bestR)}</td>
            <td className="text-right num text-neg">{fmtR(g.m.worstR)}</td>
            <td className="text-right mono text-fg-2">{fmtDuration(g.m.avgHold)}</td>
            {extra?.map(e => <td key={e.h}>{e.f(g)}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Dimensions() {
  const { filteredTrades, settings } = useStore();
  const [dim, setDim] = useState("symbol");
  const rows = useMemo(() => groupBy(filteredTrades, dimById(dim).fn), [filteredTrades, dim]);
  const chart = rows.map(r => ({ label: r.key, value: Math.round(r.m.netPnL), n: r.trades.length }));
  const chartR = rows.map(r => ({ label: r.key, value: Math.round((r.m.avgR ?? 0) * 100) / 100, n: r.trades.length }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">{DIMENSIONS.map(d => <button key={d.id} onClick={() => setDim(d.id)} className={cn("h-7 px-2.5 rounded-[5px] text-[11.5px] border transition-colors", dim === d.id ? "bg-fg text-bg border-fg" : "border-border bg-surface text-fg-2 hover:text-fg")}>{d.label}</button>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={`Net P&L by ${dimById(dim).label.toLowerCase()}`}><BarMetric data={chart} height={200} /></Panel>
        <Panel title={`Average R by ${dimById(dim).label.toLowerCase()}`}><BarMetric data={chartR} height={200} format={v => `${v.toFixed(2)}R`} /></Panel>
      </div>
      <Panel title={`Performance by ${dimById(dim).label.toLowerCase()}`} subtitle="Click a column header to sort · click a row to filter trades where applicable">
        <AnalyticsTable rows={rows} min={settings.minSample} label={dimById(dim).label} />
      </Panel>
      {dim === "side" && <SideCompare />}
    </div>
  );
}

function SideCompare() {
  const { filteredTrades } = useStore();
  const L = computeMetrics(filteredTrades.filter(t => t.side === "LONG")), S = computeMetrics(filteredTrades.filter(t => t.side === "SHORT"));
  return (
    <Panel title="Long vs short">
      <div className="grid grid-cols-2 gap-6">{[["LONG", L], ["SHORT", S]].map(([k, x]) => { const mm = x as typeof L; return <div key={k as string}><div className="mono text-[11px] text-fg-3 mb-1">{k as string}</div><StatRow label="Trades" value={mm.trades} /><StatRow label="Win rate" value={fmtPct(mm.winRate)} /><StatRow label="Net P&L" value={fmtMoney(mm.netPnL, { sign: true })} tone={mm.netPnL} /><StatRow label="Avg R" value={fmtR(mm.avgR)} tone={mm.avgR} /><StatRow label="Profit factor" value={fmtPF(mm.profitFactor)} /><StatRow label="Avg duration" value={fmtDuration(mm.avgHold)} /><StatRow label="Compliance" value={fmtPct(mm.compliance)} /></div>; })}</div>
    </Panel>
  );
}

function TimeTab() {
  const { filteredTrades, settings } = useStore();
  const [metric, setMetric] = useState<"pnl" | "avgR" | "count" | "winRate">("pnl");
  const dow = useMemo(() => { const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; return groupBy(filteredTrades, dimById("dow").fn).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)); }, [filteredTrades]);
  const hours = useMemo(() => groupBy(filteredTrades, dimById("hour").fn).sort((a, b) => a.key.localeCompare(b.key)), [filteredTrades]);
  const sessions = useMemo(() => groupBy(filteredTrades, t => t.session), [filteredTrades]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Day of week · net P&L"><BarMetric data={dow.map(r => ({ label: r.key, value: Math.round(r.m.netPnL), n: r.trades.length }))} height={180} /></Panel>
        <Panel title="Hour of day · net P&L"><BarMetric data={hours.map(r => ({ label: r.key.slice(0, 2), value: Math.round(r.m.netPnL), n: r.trades.length }))} height={180} /></Panel>
      </div>
      <Panel title="Day × hour heatmap" actions={<Segmented value={metric} onChange={setMetric} options={[{ value: "pnl", label: "Net P&L" }, { value: "avgR", label: "Avg R" }, { value: "winRate", label: "Win rate" }, { value: "count", label: "Count" }]} />} subtitle="Hover a cell for trade count, P&L, avg R and win rate">
        <TimeHeatmap trades={filteredTrades} metric={metric} />
      </Panel>
      <Panel title="Sessions"><AnalyticsTable rows={sessions} min={settings.minSample} label="Session" /></Panel>
      <Panel title="Day of week"><AnalyticsTable rows={dow} min={settings.minSample} label="Day of week" /></Panel>
    </div>
  );
}

function RTab() {
  const { filteredTrades } = useStore();
  const m = computeMetrics(filteredTrades);
  const pos = filteredTrades.filter(t => t.rMultiple > 0).length, neg = filteredTrades.filter(t => t.rMultiple < 0).length;
  return (
    <div className="space-y-4">
      <div className="panel grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border">
        {[["Average R", fmtR(m.avgR), m.avgR], ["Median R", fmtR(m.medianR), m.medianR], ["Best R", fmtR(m.bestR), m.bestR], ["Worst R", fmtR(m.worstR), m.worstR], ["Positive R", `${pos} (${fmtPct(m.trades ? (pos / m.trades) * 100 : null, 0)})`, 1], ["Negative R", `${neg} (${fmtPct(m.trades ? (neg / m.trades) * 100 : null, 0)})`, -1]].map(([l, v, t]) => <div key={l as string} className="px-4 py-3"><Metric label={l as string} value={v as string} tone={t as number} /></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="R distribution" subtitle="Trades per 0.5R bucket"><RHistogram trades={filteredTrades} height={240} /></Panel>
        <Panel title="Cumulative R" subtitle="Running sum of R per trade, in sequence"><CumulativeR trades={filteredTrades} height={240} /></Panel>
      </div>
      <Panel title="R expectancy" hint="R expectancy = (win rate × average winning R) − (loss rate × average losing R). Equivalent to average R across all trades.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Avg winning R" value={fmtR(m.wins ? filteredTrades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.rMultiple, 0) / m.wins : null)} tone={1} />
          <Metric label="Avg losing R" value={fmtR(m.losses ? filteredTrades.filter(t => t.netPnL < 0).reduce((s, t) => s + t.rMultiple, 0) / m.losses : null)} tone={-1} />
          <Metric label="Total R" value={fmtR(m.totalR, 1)} tone={m.totalR} />
          <Metric label="R expectancy" value={fmtR(m.expectancyR)} tone={m.expectancyR} />
        </div>
      </Panel>
    </div>
  );
}

function DrawdownTab() {
  const { filteredTrades, settings } = useStore();
  const dd = useMemo(() => drawdownSeries(filteredTrades, settings.startingBalance), [filteredTrades, settings.startingBalance]);
  const st = useMemo(() => streaks(filteredTrades), [filteredTrades]);
  return (
    <div className="space-y-4">
      <div className="panel grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border">
        {[["Max drawdown", fmtMoney(dd.maxDD), -1], ["Max drawdown %", fmtPct(dd.maxDDPct), -1], ["Current drawdown", fmtMoney(dd.currentDD), dd.currentDD < 0 ? -1 : 0], ["Average drawdown", fmtMoney(dd.avgDD), -1], ["Longest recovery", `${dd.longestRecovery} trades`, 0], ["Largest losing streak", `${st.worstLoss} trades`, 0]].map(([l, v, t]) => <div key={l as string} className="px-4 py-3"><Metric label={l as string} value={v as string} tone={t as number} /></div>)}
      </div>
      <Panel title="Equity curve"><EquityCurve trades={filteredTrades} startingBalance={settings.startingBalance} showControls={false} height={220} /></Panel>
      <Panel title="Drawdown from peak (%)" subtitle="Area beneath the equity curve"><DrawdownChart trades={filteredTrades} startingBalance={settings.startingBalance} height={160} /></Panel>
      <Panel title="Drawdown periods">
        {dd.periods.length === 0 ? <p className="text-[12px] text-fg-3">No drawdown periods.</p> : (
          <table className="tbl w-full"><thead><tr><th>Start</th><th>Recovered</th><th className="!text-right">Depth</th></tr></thead><tbody>{dd.periods.sort((a, b) => a.depth - b.depth).slice(0, 10).map((p, i) => <tr key={i}><td className="mono">{p.start.slice(0, 10)}</td><td className="mono">{p.end ? p.end.slice(0, 10) : <span className="text-warn">Ongoing</span>}</td><td className="text-right num text-neg">{fmtMoney(p.depth)}</td></tr>)}</tbody></table>
        )}
      </Panel>
    </div>
  );
}

function StreaksTab() {
  const { filteredTrades } = useStore();
  const st = useMemo(() => streaks(filteredTrades), [filteredTrades]);
  const seq = useMemo(() => [...filteredTrades].sort((a, b) => a.exitTime.localeCompare(b.exitTime)).slice(-80), [filteredTrades]);
  return (
    <div className="space-y-4">
      <div className="panel grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y lg:divide-y-0 divide-border">
        {[["Current streak", st.current ? `${st.current} ${st.currentType === "W" ? "wins" : "losses"}` : "—", st.currentType === "W" ? 1 : st.currentType === "L" ? -1 : 0], ["Best winning streak", `${st.bestWin}`, 1], ["Worst losing streak", `${st.worstLoss}`, -1], ["Avg winning streak", st.avgWin?.toFixed(1) ?? "—", 0], ["Avg losing streak", st.avgLoss?.toFixed(1) ?? "—", 0], ["Largest consecutive win", fmtMoney(st.maxConsecWinPnL, { sign: true }), 1], ["Largest consecutive loss", fmtMoney(st.maxConsecLossPnL), -1]].map(([l, v, t]) => <div key={l as string} className="px-4 py-3"><Metric label={l as string} value={v as string} tone={t as number} /></div>)}
      </div>
      <Panel title="Outcome sequence" subtitle={`Last ${seq.length} trades, oldest → newest. Height is |R|.`}>
        <div className="flex items-end gap-[3px] h-[120px] overflow-x-auto">{seq.map(t => <div key={t.id} title={`${t.symbol} ${fmtR(t.rMultiple)}`} className={cn("w-[7px] shrink-0 rounded-[2px]", t.netPnL > 0 ? "bg-pos/70" : t.netPnL < 0 ? "bg-neg/70" : "bg-fg-3/50")} style={{ height: `${Math.max(6, Math.min(100, Math.abs(t.rMultiple) * 30))}%` }} />)}</div>
      </Panel>
    </div>
  );
}

function HoldingTab() {
  const { filteredTrades, settings } = useStore();
  const m = computeMetrics(filteredTrades);
  const byHold = useMemo(() => groupBy(filteredTrades, dimById("hold").fn), [filteredTrades]);
  const bySetup = useMemo(() => groupBy(filteredTrades, t => t.setup).map(g => ({ label: g.key, value: Math.round(g.m.avgHold ?? 0), n: g.trades.length })), [filteredTrades]);
  const bySession = useMemo(() => groupBy(filteredTrades, t => t.session).map(g => ({ label: g.key, value: Math.round(g.m.avgHold ?? 0), n: g.trades.length })), [filteredTrades]);
  return (
    <div className="space-y-4">
      <div className="panel grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
        {[["Average holding time", fmtDuration(m.avgHold)], ["Median holding time", fmtDuration(m.medianHold)], ["Longest trade", fmtDuration(m.longestHold)], ["Shortest trade", fmtDuration(m.shortestHold)]].map(([l, v]) => <div key={l} className="px-4 py-3"><Metric label={l} value={v} /></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Average hold by setup (minutes)"><BarMetric data={bySetup} format={v => fmtDuration(v)} height={180} /></Panel>
        <Panel title="Average hold by session (minutes)"><BarMetric data={bySession} format={v => fmtDuration(v)} height={180} /></Panel>
      </div>
      <Panel title="Performance by holding time"><AnalyticsTable rows={byHold} min={settings.minSample} label="Holding time" /></Panel>
    </div>
  );
}
