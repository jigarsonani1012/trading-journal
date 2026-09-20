import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useStore } from "../store";
import type { Rule } from "../types";
import { Panel, Button, Drawer, Field, Input, Select, Textarea, Toggle, Metric, StatRow, Badge, EmptyState, Modal, SampleWarning } from "../components/ui";
import { ruleStats, mistakeLibrary, groupBy, sortByTime } from "../lib/analytics";
import { fmtMoney, fmtPct, fmtR, fmtPF, fmtDate, fmtDateShort, signClass } from "../lib/format";
import { TradeTable, TradeCards } from "../components/TradeTable";
import { BarMetric } from "../components/charts";
import { cn } from "../utils/cn";

export function Rules() {
  const { rules, periodTrades, addRule, updateRule, deleteRule, askConfirm, settings, setFilters, setPage, setOpenTradeId } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Rule> | null>(null);
  useEffect(() => { const a = () => setEdit({}); const o = (e: Event) => setOpenId((e as CustomEvent).detail); window.addEventListener("edgelog:add-rule", a); window.addEventListener("edgelog:open-rule", o); return () => { window.removeEventListener("edgelog:add-rule", a); window.removeEventListener("edgelog:open-rule", o); }; }, []);
  const stats = useMemo(() => rules.map(r => ({ r, s: ruleStats(r, periodTrades) })), [rules, periodTrades]);
  const mostViolated = [...stats].sort((a, b) => b.s.broken - a.s.broken)[0];
  const mostExpensive = [...stats].filter(x => x.s.broken > 0).sort((a, b) => a.s.mB.netPnL - b.s.mB.netPnL)[0];
  const compliance = useMemo(() => { const n = periodTrades.length; return n ? (periodTrades.filter(t => t.ruleStatus === "FOLLOWED").length / n) * 100 : null; }, [periodTrades]);
  const complianceOverTime = useMemo(() => { const byWeek = groupBy(sortByTime(periodTrades), t => { const d = new Date(t.exitTime); const w = new Date(d); w.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return w.toISOString().slice(0, 10); }); return byWeek.sort((a, b) => a.key.localeCompare(b.key)).map(g => ({ label: fmtDateShort(g.key), value: Math.round((g.m.compliance ?? 0)), n: g.trades.length })); }, [periodTrades]);
  const mistakes = useMemo(() => mistakeLibrary(periodTrades), [periodTrades]);
  const open = stats.find(x => x.r.id === openId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Panel><Metric label="Overall compliance" value={fmtPct(compliance)} sub={`${periodTrades.filter(t => t.ruleStatus === "BROKEN").length} of ${periodTrades.length} trades with a violation`} /></Panel>
        <Panel><Metric label="Most violated" value={mostViolated?.s.broken ? mostViolated.r.name : "—"} size="sm" sub={mostViolated?.s.broken ? `${mostViolated.s.broken} violations` : "No violations recorded"} /></Panel>
        <Panel><Metric label="Most expensive violation" value={mostExpensive ? mostExpensive.r.name : "—"} size="sm" sub={mostExpensive ? `${fmtMoney(mostExpensive.s.mB.netPnL, { sign: true })} when broken · ${fmtR(mostExpensive.s.mB.avgR)} avg` : "—"} /></Panel>
        <Panel><Metric label="Active rules" value={rules.filter(r => r.active).length} sub={`${rules.length} total`} /></Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Rules" subtitle="Measure what you repeat." className="xl:col-span-2" actions={<Button size="sm" variant="primary" icon={Plus} onClick={() => setEdit({})}>Add rule</Button>} bodyClassName="!px-0 !pb-0">
          {rules.length === 0 ? <EmptyState icon={ShieldCheck} title="Build your trading process." body="Rules turn discipline into measurable data. Every trade is reviewed against them." action={<Button variant="primary" onClick={() => setEdit({})}>Create first rule</Button>} /> : (
            <div>
              {stats.sort((a, b) => a.r.order - b.r.order).map(({ r, s }) => (
                <button key={r.id} onClick={() => setOpenId(r.id)} className={cn("w-full text-left flex items-center gap-4 px-4 py-3 border-t border-border hover:bg-surface-hover transition-colors", !r.active && "opacity-50")}>
                  <span className="mono text-[13px] text-fg-3 w-6">{String(r.order).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] font-medium">{r.name}</span><Badge tone={r.priority === "High" ? "warn" : "neutral"}>{r.priority}</Badge><span className="text-[11px] text-fg-3">{r.category}</span>{!r.active && <Badge>Inactive</Badge>}</div>
                    <p className="text-[11.5px] text-fg-3 truncate mt-0.5">{r.description}</p>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-5 text-right">
                    <div><div className="text-[10px] uppercase tracking-wider text-fg-3">Followed</div><div className="mono text-[13px]">{s.followed}</div></div>
                    <div><div className="text-[10px] uppercase tracking-wider text-fg-3">Broken</div><div className={cn("mono text-[13px]", s.broken > 0 && "text-neg")}>{s.broken}</div></div>
                    <div><div className="text-[10px] uppercase tracking-wider text-fg-3">Compliance</div><div className="mono text-[13px]">{fmtPct(s.compliance, 0)}</div></div>
                  </div>
                  <div className="w-[70px] hidden md:block"><div className="h-1.5 rounded-full bg-neg-soft overflow-hidden"><div className="h-full bg-pos/80" style={{ width: `${s.compliance ?? 0}%` }} /></div></div>
                  <ArrowRight size={14} className="text-fg-3" />
                </button>
              ))}
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Compliance over time" subtitle="Weekly share of trades with all rules followed">
            {complianceOverTime.length > 1 ? <BarMetric data={complianceOverTime} format={v => `${v}%`} height={160} /> : <p className="text-[12px] text-fg-3">Not enough data.</p>}
          </Panel>
          <Panel title="Compliance vs profitability" hint="Each row compares results when the rule was followed versus broken.">
            {stats.filter(x => x.s.broken > 0).length === 0 ? <p className="text-[12px] text-fg-3">No violations in this period.</p> : stats.filter(x => x.s.broken > 0).sort((a, b) => (a.s.mB.avgR ?? 0) - (b.s.mB.avgR ?? 0)).slice(0, 6).map(({ r, s }) => (
              <div key={r.id} className="py-2 border-b border-border last:border-0">
                <div className="flex justify-between text-[12px]"><span className="truncate">{r.name}</span><span className="mono text-fg-3">{s.broken}×</span></div>
                <div className="flex gap-4 mt-1 text-[11px]"><span className="text-fg-3">Followed <span className={cn("num", signClass(s.mF.avgR))}>{fmtR(s.mF.avgR)}</span></span><span className="text-fg-3">Broken <span className={cn("num", signClass(s.mB.avgR))}>{fmtR(s.mB.avgR)}</span></span></div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <Panel title="Mistake library" subtitle="Repeated mistake types aggregated from trade reviews" bodyClassName="overflow-x-auto">
        {mistakes.length === 0 ? <p className="text-[12px] text-fg-3">No mistakes logged.</p> : (
          <table className="tbl w-full"><thead><tr><th>Mistake</th><th className="!text-right">Count</th><th className="!text-right">Cost (net)</th><th className="!text-right">Avg R</th><th className="!text-right">Win rate</th><th>Most common session</th><th>Most common setup</th><th>Related rules</th></tr></thead>
            <tbody>{mistakes.map(mk => <tr key={mk.key} className="cursor-pointer" onClick={() => { setFilters(f => ({ ...f, search: mk.key })); setPage("trades"); }}><td className="font-medium">{mk.key}</td><td className="text-right mono">{mk.trades.length}</td><td className={cn("text-right num", signClass(mk.m.netPnL))}>{fmtMoney(mk.m.netPnL, { sign: true })}</td><td className={cn("text-right num", signClass(mk.m.avgR))}>{fmtR(mk.m.avgR)}</td><td className="text-right mono">{fmtPct(mk.m.winRate, 0)}</td><td className="text-fg-2">{mk.session}</td><td className="text-fg-2">{mk.setup}</td><td className="text-fg-3 text-[11px]">{mk.ruleIds.map(id => rules.find(r => r.id === id)?.name).filter(Boolean).join(", ") || "—"}</td></tr>)}</tbody>
          </table>
        )}
      </Panel>

      {/* Rule detail */}
      <Drawer open={!!open} onClose={() => setOpenId(null)} width="max-w-[680px]"
        header={open && <div className="flex-1"><div className="flex items-center gap-2"><span className="mono text-fg-3">{String(open.r.order).padStart(2, "0")}</span><h2 className="text-[15px] font-semibold">{open.r.name}</h2><Badge tone={open.r.priority === "High" ? "warn" : "neutral"}>{open.r.priority}</Badge></div><p className="text-[12px] text-fg-2 mt-1 leading-relaxed">{open.r.description}</p><p className="text-[11px] text-fg-3 mt-1">{open.r.category} · Created {fmtDate(open.r.createdAt)} · {open.r.active ? "Active" : "Inactive"}</p></div>}
        footer={open && <><Button variant="ghost" icon={Trash2} onClick={() => askConfirm({ title: "Delete rule?", body: "Historical trade reviews referencing this rule are preserved.", danger: true, confirmLabel: "Delete", onConfirm: () => { deleteRule(open.r.id); setOpenId(null); } })}>Delete</Button><Button variant="ghost" onClick={() => updateRule({ ...open.r, active: !open.r.active })}>{open.r.active ? "Deactivate" : "Activate"}</Button><Button variant="primary" icon={Pencil} onClick={() => setEdit(open.r)}>Edit</Button></>}>
        {open && (
          <div>
            <div className="grid grid-cols-3 gap-4 px-5 py-4 border-b border-border">
              <Metric label="Evaluated" value={open.s.evaluated} />
              <Metric label="Compliance" value={fmtPct(open.s.compliance)} sub={<SampleWarning n={open.s.evaluated} min={settings.minSample} />} />
              <Metric label="Broken" value={open.s.broken} tone={open.s.broken ? -1 : 0} />
            </div>
            <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-border">
              {[{ l: "When followed", m: open.s.mF, n: open.s.followed, pos: true }, { l: "When broken", m: open.s.mB, n: open.s.broken, pos: false }].map(x => (
                <div key={x.l} className={cn("rounded-[8px] border p-3", x.pos ? "border-pos/25" : "border-neg/25")}>
                  <div className={cn("text-[10.5px] font-semibold tracking-[0.1em] uppercase mb-2", x.pos ? "text-pos" : "text-neg")}>{x.l} · {x.n}</div>
                  {x.n === 0 ? <p className="text-[12px] text-fg-3">No trades.</p> : <>
                    <StatRow label="Net P&L" value={fmtMoney(x.m.netPnL, { sign: true })} tone={x.m.netPnL} />
                    <StatRow label="Average R" value={fmtR(x.m.avgR)} tone={x.m.avgR} />
                    <StatRow label="Win rate" value={fmtPct(x.m.winRate)} />
                    <StatRow label="Profit factor" value={fmtPF(x.m.profitFactor)} />
                    <StatRow label="Expectancy" value={fmtMoney(x.m.expectancy, { sign: true })} tone={x.m.expectancy} />
                  </>}
                </div>
              ))}
            </div>
            {open.s.broken > 0 && (
              <div className="px-5 py-4 border-b border-border">
                <h4 className="panel-title mb-2">Violation timeline</h4>
                <div className="flex flex-wrap gap-1">{open.s.brokenTrades.slice().reverse().map(t => <button key={t.id} onClick={() => setOpenTradeId(t.id)} title={`${t.symbol} · ${fmtDate(t.exitTime)} · ${fmtR(t.rMultiple)}`} className={cn("h-5 w-3 rounded-[2px]", t.netPnL >= 0 ? "bg-pos/60" : "bg-neg/70")} />)}</div>
                <p className="text-[11px] text-fg-3 mt-1.5">Each bar is a violation, oldest → newest. Green: the trade still made money (profitable mistake).</p>
              </div>
            )}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2"><h4 className="panel-title">Recent violations</h4>{open.s.broken > 0 && <Button size="sm" variant="ghost" onClick={() => { setFilters(f => ({ ...f, ruleId: open.r.id })); setPage("trades"); setOpenId(null); }}>Filter trades <ArrowRight size={12} /></Button>}</div>
              {open.s.broken === 0 ? <p className="text-[12px] text-fg-3">This rule has never been broken in the selected period.</p> : <>
                <div className="hidden sm:block"><TradeTable trades={open.s.brokenTrades.slice(0, 8)} compact /></div>
                <div className="sm:hidden"><TradeCards trades={open.s.brokenTrades.slice(0, 8)} /></div>
                <div className="mt-3 space-y-2">{open.s.brokenTrades.slice(0, 4).map(t => { const rv = t.ruleReviews.find(r => r.ruleId === open.r.id)!; return <div key={t.id} className="text-[12px] rounded-[6px] bg-surface-2 border border-border px-3 py-2"><div className="flex justify-between text-[11px] text-fg-3 mono mb-1"><span>{t.symbol} · {fmtDate(t.exitTime)}</span><span className={signClass(t.rMultiple)}>{fmtR(t.rMultiple)}</span></div>{rv.why && <div><span className="text-fg-3">Why · </span>{rv.why}</div>}{rv.lesson && <div><span className="text-fg-3">Lesson · </span>{rv.lesson}</div>}</div>; })}</div>
              </>}
            </div>
          </div>
        )}
      </Drawer>

      <RuleEditor rule={edit} onClose={() => setEdit(null)} onSave={r => { if (r.id) updateRule(r as Rule); else addRule(r as Omit<Rule, "id" | "order" | "createdAt">); setEdit(null); }} />
    </div>
  );
}

function RuleEditor({ rule, onClose, onSave }: { rule: Partial<Rule> | null; onClose: () => void; onSave: (r: Partial<Rule>) => void }) {
  const [f, setF] = useState<Partial<Rule>>({});
  useEffect(() => { if (rule) setF({ name: "", description: "", category: "Execution", priority: "Medium", active: true, ...rule }); }, [rule]);
  if (!rule) return null;
  return (
    <Modal open onClose={onClose} title={rule.id ? "Edit rule" : "New rule"} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.name?.trim()} onClick={() => onSave(f)}>{rule.id ? "Save" : "Add rule"}</Button></>}>
      <div className="space-y-3">
        <Field label="Rule" required><Input value={f.name ?? ""} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Wait for confirmation" autoFocus /></Field>
        <Field label="Description"><Textarea value={f.description ?? ""} onChange={e => setF({ ...f, description: e.target.value })} placeholder="What exactly counts as following this rule?" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{["Analysis", "Execution", "Risk", "Psychology", "Routine"].map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Priority"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Rule["priority"] })}>{["High", "Medium", "Low"].map(c => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <div className="flex items-center justify-between rounded-[6px] border border-border px-3 py-2"><span className="text-[12.5px]">Active — shown in trade review</span><Toggle checked={f.active ?? true} onChange={b => setF({ ...f, active: b })} /></div>
      </div>
    </Modal>
  );
}
