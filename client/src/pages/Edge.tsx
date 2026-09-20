import { useMemo, useState } from "react";
import { Compass, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStore } from "../store";
import { FilterBar } from "../components/FilterBar";
import { Panel, Select, Field, Badge, SampleWarning, Checkbox, Input } from "../components/ui";
import { edgeCombos, DIMENSIONS, detectPatterns, type GroupRow } from "../lib/analytics";
import { fmtMoney, fmtPct, fmtR, fmtPF, signClass } from "../lib/format";
import { cn } from "../utils/cn";

const PRESETS: [string, string, string?][] = [["setup", "session"], ["setup", "htfBias"], ["setup", "dow"], ["setup", "side"], ["session", "hour"], ["ruleStatus", "setup"], ["marketCondition", "setup"], ["emotion", "setup"], ["timeframe", "setup"], ["setup", "session", "htfBias"]];

export function Edge() {
  const { filteredTrades, rules, settings } = useStore();
  const [a, setA] = useState("setup"); const [b, setB] = useState("session"); const [c, setC] = useState<string>("");
  const [minN, setMinN] = useState(5); const [hideSmall, setHideSmall] = useState(false);
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: "totalR", d: -1 });
  const rows = useMemo(() => edgeCombos(filteredTrades, a, b, c || undefined), [filteredTrades, a, b, c]);
  const visible = useMemo(() => {
    const get = (g: GroupRow): Record<string, number | string> => ({ key: g.key, n: g.trades.length, wr: g.m.winRate ?? -1, net: g.m.netPnL, totalR: g.m.totalR, avgR: g.m.avgR ?? -99, pf: g.m.profitFactor ?? -1, exp: g.m.expectancy ?? -99, comp: g.m.compliance ?? -1 });
    return rows.filter(g => g.trades.length >= minN && (!hideSmall || g.trades.length >= settings.minSample)).sort((x, y) => { const p = get(x)[sort.k], q = get(y)[sort.k]; return (typeof p === "number" && typeof q === "number" ? p - q : String(p).localeCompare(String(q))) * sort.d; });
  }, [rows, minN, hideSmall, settings.minSample, sort]);
  const patterns = useMemo(() => detectPatterns(filteredTrades, rules, settings.minSample), [filteredTrades, rules, settings.minSample]);
  const best = visible.filter(g => g.trades.length >= settings.minSample).slice().sort((x, y) => (y.m.avgR ?? 0) - (x.m.avgR ?? 0))[0];
  const worst = visible.filter(g => g.trades.length >= settings.minSample).slice().sort((x, y) => (x.m.avgR ?? 0) - (y.m.avgR ?? 0))[0];
  const H = ({ k, l, r = true }: { k: string; l: string; r?: boolean }) => <th className={cn(r && "!text-right", "cursor-pointer hover:text-fg select-none")} onClick={() => setSort(s => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : -1 }))}><span className="inline-flex items-center gap-1">{l}{sort.k === k && (sort.d === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span></th>;
  const dimLabel = (id: string) => DIMENSIONS.find(d => d.id === id)?.label ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-[8px] bg-accent-soft text-accent flex items-center justify-center shrink-0"><Compass size={18} /></div>
        <div><h2 className="text-[18px] font-semibold tracking-tight">EDGE</h2><p className="text-[12.5px] text-fg-2">Find the conditions under which your process historically performs best. Descriptive analysis of recorded trades only — no predictions.</p></div>
      </div>
      <FilterBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Historical patterns" subtitle="Observations derived from your recorded data" className="lg:col-span-2">
          {patterns.length === 0 ? <p className="text-[12px] text-fg-3">Not enough trades to surface patterns. Record more trades or widen the filters.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {patterns.map((p, i) => (
                <div key={i} className="rounded-[6px] border border-border bg-surface-2/50 p-3 flex gap-3">
                  <div className={cn("h-6 w-6 rounded-[5px] flex items-center justify-center shrink-0", p.kind === "pos" ? "bg-pos-soft text-pos" : p.kind === "neg" ? "bg-neg-soft text-neg" : "bg-surface-hover text-fg-2")}>{p.kind === "pos" ? <TrendingUp size={13} /> : p.kind === "neg" ? <TrendingDown size={13} /> : <Minus size={13} />}</div>
                  <div className="min-w-0"><p className="text-[12.5px] leading-relaxed">{p.text}</p><div className="flex items-center gap-2 mt-1.5"><Badge>Historical observation</Badge><span className="text-[10.5px] text-fg-3 mono">n = {p.sample}</span><SampleWarning n={p.sample} min={settings.minSample} /></div></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          {[{ t: "Strongest condition", g: best, pos: true }, { t: "Weakest condition", g: worst, pos: false }].map(x => (
            <Panel key={x.t} title={x.t} subtitle={`By average R · n ≥ ${settings.minSample}`}>
              {!x.g ? <p className="text-[12px] text-fg-3">No combination reaches the minimum sample size.</p> : (
                <div>
                  <div className="text-[13.5px] font-medium leading-snug">{x.g.key}</div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div><div className="label">Trades</div><div className="mono text-[15px] mt-0.5">{x.g.trades.length}</div></div>
                    <div><div className="label">Win rate</div><div className="mono text-[15px] mt-0.5">{fmtPct(x.g.m.winRate)}</div></div>
                    <div><div className="label">Avg R</div><div className={cn("num text-[15px] mt-0.5", signClass(x.g.m.avgR))}>{fmtR(x.g.m.avgR)}</div></div>
                    <div><div className="label">Net</div><div className={cn("num text-[13px] mt-0.5", signClass(x.g.m.netPnL))}>{fmtMoney(x.g.m.netPnL, { sign: true, decimals: 0 })}</div></div>
                    <div><div className="label">Total R</div><div className={cn("num text-[13px] mt-0.5", signClass(x.g.m.totalR))}>{fmtR(x.g.m.totalR, 1)}</div></div>
                    <div><div className="label">PF</div><div className="mono text-[13px] mt-0.5">{fmtPF(x.g.m.profitFactor)}</div></div>
                  </div>
                </div>
              )}
            </Panel>
          ))}
        </div>
      </div>

      <Panel title="Edge conditions" subtitle="Combine dimensions to compute historical statistics for each combination">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <Field label="Dimension A"><Select className="!w-[170px]" value={a} onChange={e => setA(e.target.value)}>{DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</Select></Field>
          <span className="text-fg-3 pb-2">+</span>
          <Field label="Dimension B"><Select className="!w-[170px]" value={b} onChange={e => setB(e.target.value)}>{DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</Select></Field>
          <span className="text-fg-3 pb-2">+</span>
          <Field label="Dimension C (optional)"><Select className="!w-[170px]" value={c} onChange={e => setC(e.target.value)}><option value="">None</option>{DIMENSIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</Select></Field>
          <Field label="Min trades"><Input mono type="number" className="!w-[80px]" value={minN} min={1} onChange={e => setMinN(Math.max(1, parseInt(e.target.value) || 1))} /></Field>
          <div className="pb-2"><Checkbox checked={hideSmall} onChange={setHideSmall} label={`Hide samples < ${settings.minSample}`} /></div>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">{PRESETS.map(p => <button key={p.join()} onClick={() => { setA(p[0]); setB(p[1]); setC(p[2] ?? ""); }} className={cn("h-6 px-2 rounded-[4px] text-[11px] border transition-colors", a === p[0] && b === p[1] && (c || "") === (p[2] ?? "") ? "bg-accent-soft border-accent/50 text-accent" : "border-border text-fg-2 hover:text-fg")}>{p.filter((x): x is string => !!x).map(dimLabel).join(" + ")}</button>)}</div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="tbl w-full min-w-[820px]">
            <thead><tr><H k="key" l="Condition" r={false} /><H k="n" l="Trades" /><H k="wr" l="Win rate" /><H k="net" l="Net P&L" /><H k="totalR" l="Total R" /><H k="avgR" l="Avg R" /><H k="pf" l="PF" /><H k="exp" l="Expectancy" /><H k="comp" l="Compliance" /><th>Sample</th></tr></thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={10} className="text-center text-fg-3 py-8">No combinations meet the minimum trade count.</td></tr>}
              {visible.map(g => (
                <tr key={g.key}>
                  <td className="font-medium">{g.key}</td>
                  <td className="text-right mono text-fg-2">{g.trades.length}</td>
                  <td className="text-right mono">{fmtPct(g.m.winRate)}</td>
                  <td className={cn("text-right num", signClass(g.m.netPnL))}>{fmtMoney(g.m.netPnL, { sign: true })}</td>
                  <td className={cn("text-right num font-medium", signClass(g.m.totalR))}>{fmtR(g.m.totalR, 1)}</td>
                  <td className={cn("text-right num", signClass(g.m.avgR))}>{fmtR(g.m.avgR)}</td>
                  <td className="text-right mono">{fmtPF(g.m.profitFactor)}</td>
                  <td className={cn("text-right num", signClass(g.m.expectancy))}>{fmtMoney(g.m.expectancy, { sign: true })}</td>
                  <td className="text-right mono">{fmtPct(g.m.compliance, 0)}</td>
                  <td>{g.trades.length >= settings.minSample ? <Badge tone="neutral">n = {g.trades.length}</Badge> : <SampleWarning n={g.trades.length} min={settings.minSample} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-fg-3 mt-3">One trade is noise. A pattern is data. Minimum sample size can be changed in Settings (currently {settings.minSample}).</p>
      </Panel>
    </div>
  );
}
