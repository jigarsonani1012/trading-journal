import { useMemo, useState } from "react";
import { Settings2, ArrowRight } from "lucide-react";
import { useStore } from "../store";
import { Panel, Metric, StatRow, Button, Popover, Checkbox, Segmented, SampleWarning, EmptyState } from "../components/ui";
import { EquityCurve, PnLCalendar } from "../components/charts";
import { TradeTable, TradeCards } from "../components/TradeTable";
import { computeMetrics, streaks, drawdownSeries, groupBy, sortByTime } from "../lib/analytics";
import { fmtMoney, fmtPct, fmtR, fmtPF, fmtDuration, dayKey, signClass } from "../lib/format";
import { PERIODS } from "../components/AppShell";
import { cn } from "../utils/cn";

const HINTS = {
  winRate: "Winning trades ÷ total trades. Breakeven trades count as non-wins.",
  pf: "Profit factor = gross profit ÷ absolute gross loss. Shown as — when there are no losses.",
  avgR: "Average R multiple across trades. R = Net P&L ÷ Risk amount.",
  dd: "Largest peak-to-trough decline of the balance curve in this period.",
  exp: "Expectancy = average net P&L per trade. R expectancy = average R per trade.",
};

export function Overview() {
  const { periodTrades, trades, settings, balance, equity, period, setPeriod, updateSettings, setPage, openForm } = useStore();
  const m = useMemo(() => computeMetrics(periodTrades, settings.startingBalance), [periodTrades, settings.startingBalance]);
  const allM = useMemo(() => computeMetrics(trades), [trades]);
  const todayTrades = useMemo(() => { const k = dayKey(new Date()); return trades.filter(t => dayKey(t.exitTime) === k); }, [trades]);
  const tm = useMemo(() => computeMetrics(todayTrades), [todayTrades]);
  const st = useMemo(() => streaks(trades), [trades]);
  const dd = useMemo(() => drawdownSeries(trades, settings.startingBalance), [trades, settings.startingBalance]);
  const followed = useMemo(() => computeMetrics(periodTrades.filter(t => t.ruleStatus === "FOLLOWED")), [periodTrades]);
  const broken = useMemo(() => computeMetrics(periodTrades.filter(t => t.ruleStatus === "BROKEN")), [periodTrades]);
  const bySetup = useMemo(() => groupBy(periodTrades, t => t.setup), [periodTrades]);
  const bySession = useMemo(() => groupBy(periodTrades, t => t.session), [periodTrades]);
  const recent = useMemo(() => sortByTime(periodTrades).reverse().slice(0, 10), [periodTrades]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState<string | undefined>();
  const dayTrades = selDay ? trades.filter(t => dayKey(t.exitTime) === selDay) : [];
  const sec = settings.overviewSections;
  const periodLabel = PERIODS.find(p => p.value === period)?.label;
  const dailyLoss = useMemo(() => { const byDay = groupBy(trades, t => dayKey(t.exitTime)); return Math.min(0, ...byDay.map(g => g.m.netPnL)); }, [trades]);

  return (
    <div className="space-y-4">
      {/* Account header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[10.5px] tracking-[0.16em] uppercase text-fg-3 font-semibold">Personal Trading Journal</div>
          <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-8 gap-y-2 mt-2">
            <div><div className="label">Account balance</div><div className="num text-[24px] md:text-[30px] font-medium leading-none mt-1">{fmtMoney(balance)}</div></div>
            <div><div className="label">Equity</div><div className="num text-[16px] md:text-[20px] font-medium leading-none mt-1 text-fg-2">{fmtMoney(equity)}</div></div>
            <div><div className="label">All-time net</div><div className={cn("num text-[16px] md:text-[20px] font-medium leading-none mt-1", signClass(allM.netPnL))}>{fmtMoney(allM.netPnL, { sign: true })}</div></div>
            <div><div className="label">Period</div><div className="text-[13px] font-medium mt-1.5">{periodLabel === "All" ? "All time" : periodLabel} · <span className="mono text-fg-2">{m.trades} trades</span></div></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={period} onChange={setPeriod} options={PERIODS} className="hidden sm:inline-flex" />
          <Popover align="right" trigger={<Button size="sm" icon={Settings2}>Customize</Button>} className="w-[220px]">
            {() => <div className="p-1">{[["today", "Today"], ["equity", "Equity curve"], ["process", "Process vs outcome"], ["recent", "Recent trades"], ["calendar", "Calendar"], ["setups", "Setup performance"], ["sessions", "Session performance"], ["risk", "Risk panel"]].map(([k, l]) => <div key={k} className="h-8 flex items-center px-1"><Checkbox checked={sec[k] !== false} onChange={b => updateSettings({ overviewSections: { ...sec, [k]: b } })} label={l} /></div>)}</div>}
          </Popover>
        </div>
      </div>

      {/* KPI strip — horizontal scroll on mobile */}
      <div className="panel overflow-x-auto">
        <div className="grid grid-cols-4 sm:grid-cols-4 xl:grid-cols-8 divide-x divide-y sm:divide-y-0 xl:divide-y-0 divide-border min-w-[480px] xl:min-w-0">
          {[
            { label: "Net P&L", value: fmtMoney(m.netPnL, { sign: true }), tone: m.netPnL, sub: `${fmtR(m.totalR, 1)} total` },
            { label: "Today's P&L", value: fmtMoney(tm.netPnL, { sign: true }), tone: tm.netPnL, sub: tm.trades ? `${tm.trades} trade${tm.trades > 1 ? "s" : ""}` : "No trades today" },
            { label: "Win rate", value: fmtPct(m.winRate), sub: `${m.wins}W · ${m.losses}L · ${m.breakeven}BE`, hint: HINTS.winRate },
            { label: "Profit factor", value: fmtPF(m.profitFactor), sub: m.profitFactor == null ? "Insufficient losses" : m.profitFactor >= 1.5 ? "Above 1.5" : m.profitFactor >= 1 ? "Positive" : "Below 1.0", hint: HINTS.pf },
            { label: "Average R", value: fmtR(m.avgR), tone: m.avgR, sub: `Median ${fmtR(m.medianR)}`, hint: HINTS.avgR },
            { label: "Expectancy", value: fmtMoney(m.expectancy, { sign: true }), tone: m.expectancy, sub: `${fmtR(m.expectancyR)} per trade`, hint: HINTS.exp },
            { label: "Max drawdown", value: fmtMoney(m.maxDrawdown), tone: m.maxDrawdown < 0 ? -1 : 0, sub: fmtPct(m.maxDrawdownPct), hint: HINTS.dd },
            { label: "Rule compliance", value: fmtPct(m.compliance), sub: `${broken.trades} trades with violations` },
          ].map(k => <div key={k.label} className="px-3 md:px-4 py-3 md:py-3.5"><Metric label={k.label} value={k.value} tone={k.tone} sub={k.sub} hint={k.hint} /></div>)}
        </div>
      </div>

      {sec.today !== false && (
        <Panel title="Today" subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })} actions={<Button size="sm" variant="primary" onClick={() => openForm()}>Add trade</Button>}>
          {todayTrades.length === 0 ? <p className="text-[12.5px] text-fg-3">No trades recorded today.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <Metric size="sm" label="Session P&L" value={fmtMoney(tm.netPnL, { sign: true })} tone={tm.netPnL} />
              <Metric size="sm" label="Trades" value={tm.trades} />
              <Metric size="sm" label="Win rate" value={fmtPct(tm.winRate)} />
              <Metric size="sm" label="Avg R" value={fmtR(tm.avgR)} tone={tm.avgR} />
              <Metric size="sm" label="Rules followed" value={todayTrades.filter(t => t.ruleStatus === "FOLLOWED").length} />
              <Metric size="sm" label="Rules broken" value={todayTrades.reduce((s, t) => s + t.ruleReviews.filter(r => r.status === "BROKEN").length, 0)} />
              <Metric size="sm" label="Streak" value={st.current ? `${st.current}${st.currentType}` : "—"} />
              <Metric size="sm" label="Total R" value={fmtR(tm.totalR, 1)} tone={tm.totalR} />
            </div>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {sec.equity !== false && (
          <Panel title="Equity curve" className="xl:col-span-2" subtitle="Daily close of balance · hover for drawdown">
            <EquityCurve trades={periodTrades} startingBalance={settings.startingBalance + (trades.filter(t => !periodTrades.includes(t)).reduce((s, t) => s + t.netPnL, 0))} />
          </Panel>
        )}
        <Panel title="Performance snapshot" subtitle={`${m.trades} trades in period`}>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <StatRow label="Total trades" value={m.trades} />
              <StatRow label="Winning" value={m.wins} />
              <StatRow label="Losing" value={m.losses} />
              <StatRow label="Breakeven" value={m.breakeven} />
              <StatRow label="Average win" value={fmtMoney(m.avgWin)} tone={1} />
              <StatRow label="Average loss" value={fmtMoney(m.avgLoss)} tone={-1} />
            </div>
            <div>
              <StatRow label="Largest win" value={fmtMoney(m.largestWin)} tone={1} />
              <StatRow label="Largest loss" value={fmtMoney(m.largestLoss)} tone={-1} />
              <StatRow label="Best R" value={fmtR(m.bestR)} tone={m.bestR} />
              <StatRow label="Worst R" value={fmtR(m.worstR)} tone={m.worstR} />
              <StatRow label="Avg hold" value={fmtDuration(m.avgHold)} />
              <StatRow label="Fees paid" value={fmtMoney(m.fees)} />
            </div>
          </div>
        </Panel>
      </div>

      {sec.process !== false && (
        <Panel title="Process vs outcome" subtitle="Review the trade. Not the result." hint="A losing trade with every rule followed is a valid loss. A winning trade with a violation is a profitable mistake. This compares the two populations.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[{ t: "Rules followed", m: followed, tone: "pos" }, { t: "Rules broken", m: broken, tone: "neg" }].map(({ t, m: x, tone }) => (
              <div key={t} className={cn("rounded-[8px] border p-4", tone === "pos" ? "border-pos/25" : "border-neg/25")}>
                <div className="flex items-baseline justify-between mb-3"><span className={cn("text-[11px] font-semibold tracking-[0.1em] uppercase", tone === "pos" ? "text-pos" : "text-neg")}>{t}</span><span className="mono text-[12px] text-fg-3">{x.trades} trades · {fmtPct(m.trades ? (x.trades / m.trades) * 100 : null, 0)}</span></div>
                {x.trades === 0 ? <p className="text-[12px] text-fg-3">No trades in this group.</p> : (
                  <div className="grid grid-cols-4 gap-3">
                    <Metric size="sm" label="Win rate" value={fmtPct(x.winRate)} />
                    <Metric size="sm" label="Net P&L" value={fmtMoney(x.netPnL, { sign: true, compact: true })} tone={x.netPnL} />
                    <Metric size="sm" label="Total R" value={fmtR(x.totalR, 1)} tone={x.totalR} />
                    <Metric size="sm" label="Profit factor" value={fmtPF(x.profitFactor)} />
                    <Metric size="sm" label="Avg R" value={fmtR(x.avgR)} tone={x.avgR} />
                    <Metric size="sm" label="Avg win" value={fmtMoney(x.avgWin, { decimals: 0 })} />
                    <Metric size="sm" label="Avg loss" value={fmtMoney(x.avgLoss, { decimals: 0 })} />
                    <Metric size="sm" label="Expectancy" value={fmtMoney(x.expectancy, { sign: true, decimals: 0 })} tone={x.expectancy} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {m.trades > 0 && (
            <div className="mt-3 h-1.5 rounded-full overflow-hidden flex bg-surface-2"><div className="bg-pos/70" style={{ width: `${(followed.trades / m.trades) * 100}%` }} /><div className="bg-neg/70 flex-1" /></div>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {sec.calendar !== false && (
          <Panel title="Calendar" className="xl:col-span-2">
            <PnLCalendar trades={trades} month={month} onMonth={setMonth} onDay={k => setSelDay(k === selDay ? undefined : k)} selected={selDay} />
            {selDay && dayTrades.length > 0 && (() => { const dm = computeMetrics(dayTrades); const best = [...dayTrades].sort((a, b) => b.netPnL - a.netPnL)[0], worst = [...dayTrades].sort((a, b) => a.netPnL - b.netPnL)[0]; return (
              <div className="mt-4 border-t border-border pt-3 anim-fade">
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
                  <Metric size="sm" label="Daily P&L" value={fmtMoney(dm.netPnL, { sign: true })} tone={dm.netPnL} />
                  <Metric size="sm" label="Trades" value={dm.trades} />
                  <Metric size="sm" label="Win rate" value={fmtPct(dm.winRate)} />
                  <Metric size="sm" label="Rules broken" value={dayTrades.filter(t => t.ruleStatus === "BROKEN").length} />
                  <Metric size="sm" label="Best" value={`${best.symbol} ${fmtR(best.rMultiple)}`} tone={best.rMultiple} />
                  <Metric size="sm" label="Worst" value={`${worst.symbol} ${fmtR(worst.rMultiple)}`} tone={worst.rMultiple} />
                </div>
                <div className="hidden md:block"><TradeTable trades={dayTrades} compact /></div>
                <div className="md:hidden"><TradeCards trades={dayTrades} /></div>
              </div>
            ); })()}
          </Panel>
        )}
        {sec.risk !== false && (
          <Panel title="Risk" subtitle="Historical journaling metrics, not live exposure">
            <StatRow label="Average risk %" value={fmtPct(allM.avgRiskPct, 2)} />
            <StatRow label="Maximum risk %" value={fmtPct(allM.maxRiskPct, 2)} tone={(allM.maxRiskPct ?? 0) > settings.defaultRiskPercent * 1.5 ? -1 : 0} />
            <StatRow label="Average R" value={fmtR(allM.avgR)} tone={allM.avgR} />
            <StatRow label="Largest loss (R)" value={fmtR(allM.worstR)} tone={allM.worstR} />
            <StatRow label="Current drawdown" value={`${fmtMoney(dd.currentDD)} · ${fmtPct(balance ? (dd.currentDD / (balance - dd.currentDD)) * 100 : 0)}`} tone={dd.currentDD < 0 ? -1 : 0} />
            <StatRow label="Largest daily loss" value={fmtMoney(dailyLoss)} tone={dailyLoss} />
            <StatRow label="Losing streak (worst)" value={`${st.worstLoss} trades`} />
            <StatRow label="Current streak" value={st.current ? `${st.current} ${st.currentType === "W" ? "wins" : "losses"}` : "—"} tone={st.currentType === "W" ? 1 : st.currentType === "L" ? -1 : 0} />
            <StatRow label="Risk consistency" value={allM.avgRiskPct && allM.maxRiskPct ? `${fmtPct((allM.avgRiskPct / allM.maxRiskPct) * 100, 0)} of max` : "—"} />
          </Panel>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sec.setups !== false && (
          <Panel title="Setup performance" actions={<Button size="sm" variant="ghost" onClick={() => setPage("analytics")}>Analytics <ArrowRight size={12} /></Button>}>
            <MiniTable rows={bySetup} min={settings.minSample} />
          </Panel>
        )}
        {sec.sessions !== false && (
          <Panel title="Session performance" actions={<Button size="sm" variant="ghost" onClick={() => setPage("analytics")}>Analytics <ArrowRight size={12} /></Button>}>
            <MiniTable rows={bySession} min={settings.minSample} />
          </Panel>
        )}
      </div>

      {sec.recent !== false && (
        <Panel title="Recent trades" actions={<Button size="sm" variant="ghost" onClick={() => setPage("trades")}>All trades <ArrowRight size={12} /></Button>} bodyClassName="!px-0 !pb-0">
          {recent.length === 0 ? <EmptyState title="No trades in this period." action={<Button variant="primary" onClick={() => openForm()}>Add your first trade</Button>} /> : <><div className="hidden md:block px-4 pb-4"><TradeTable trades={recent} compact /></div><div className="md:hidden px-4 pb-4"><TradeCards trades={recent} /></div></>}
        </Panel>
      )}
    </div>
  );
}

function MiniTable({ rows, min }: { rows: ReturnType<typeof groupBy>; min: number }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.m.netPnL)));
  if (!rows.length) return <p className="text-[12px] text-fg-3">No data in this period.</p>;
  return (
    <table className="w-full text-[12px]">
      <thead><tr className="text-[10px] uppercase tracking-wider text-fg-3"><th className="text-left font-semibold pb-2">Name</th><th className="text-right font-semibold pb-2">Trades</th><th className="text-right font-semibold pb-2">Win</th><th className="text-right font-semibold pb-2">Avg R</th><th className="text-right font-semibold pb-2 hidden sm:table-cell">PF</th><th className="text-right font-semibold pb-2">Net</th><th className="w-[90px] pb-2 hidden sm:table-cell" /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.key} className="border-t border-border"><td className="py-1.5"><div className="flex items-center gap-2">{r.key}<SampleWarning n={r.trades.length} min={min} /></div></td><td className="text-right mono text-fg-2">{r.trades.length}</td><td className="text-right mono">{fmtPct(r.m.winRate, 0)}</td><td className={cn("text-right num", signClass(r.m.avgR))}>{fmtR(r.m.avgR)}</td><td className="text-right mono hidden sm:table-cell">{fmtPF(r.m.profitFactor)}</td><td className={cn("text-right num font-medium", signClass(r.m.netPnL))}>{fmtMoney(r.m.netPnL, { sign: true, decimals: 0 })}</td><td className="pl-3 hidden sm:table-cell"><div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className={cn("h-full", r.m.netPnL >= 0 ? "bg-pos/70" : "bg-neg/70")} style={{ width: `${(Math.abs(r.m.netPnL) / max) * 100}%` }} /></div></td></tr>)}</tbody>
    </table>
  );
}
