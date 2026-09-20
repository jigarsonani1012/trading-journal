import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useStore } from "../store";
import type { JournalEntry } from "../types";
import { Panel, Button, Segmented, Textarea, Input, Field, Metric, StatRow, EmptyState } from "../components/ui";
import { TradeTable, TradeCards } from "../components/TradeTable";
import { computeMetrics, groupBy, ruleStats } from "../lib/analytics";
import { fmtMoney, fmtPct, fmtR, fmtPF, fmtDate, dayKey, uid, fmtRelative, signClass } from "../lib/format";
import { emptyPre, emptyPost } from "../lib/seed";
import { cn } from "../utils/cn";

type View = "daily" | "weekly" | "monthly" | "notes";
const weekStart = (d: Date) => { const w = new Date(d); w.setHours(0, 0, 0, 0); w.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return w; };

export function Journal() {
  const { trades, journal, upsertJournal, deleteJournal, rules, toast, askConfirm } = useStore();
  const [view, setView] = useState<View>("daily");
  const [date, setDate] = useState(dayKey(new Date()));
  useEffect(() => { const h = (e: Event) => { setDate((e as CustomEvent).detail); setView("daily"); }; window.addEventListener("edgelog:open-journal", h); return () => window.removeEventListener("edgelog:open-journal", h); }, []);
  const tradeDays = useMemo(() => [...new Set(trades.map(t => dayKey(t.exitTime)))].sort().reverse(), [trades]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 sm:gap-3">
        <div className="overflow-x-auto pb-0.5">
          <Segmented size="md" value={view} onChange={setView} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "notes", label: "Notes" }]} className="min-w-max" />
        </div>
        {view !== "notes" && <div className="flex items-center gap-2"><Input mono type="date" className="!w-auto !h-8 !py-0 flex-1 sm:flex-none" value={date} onChange={e => e.target.value && setDate(e.target.value)} /><Button size="sm" variant="ghost" onClick={() => setDate(dayKey(new Date()))}>Today</Button></div>}
      </div>
      {view === "daily" && <Daily date={date} setDate={setDate} tradeDays={tradeDays} />}
      {view === "weekly" && <Weekly date={date} />}
      {view === "monthly" && <Monthly date={date} />}
      {view === "notes" && <Notes journal={journal} upsert={upsertJournal} del={id => askConfirm({ title: "Delete note?", danger: true, confirmLabel: "Delete", onConfirm: () => deleteJournal(id) })} toast={toast} />}
      {view !== "notes" && rules.length === 0 && null}
    </div>
  );
}

function useEntry(date: string) {
  const { journal, upsertJournal } = useStore();
  const existing = journal.find(j => j.kind === "daily" && j.date === date);
  const [draft, setDraft] = useState<JournalEntry>(existing ?? { id: `j_${date}`, date, kind: "daily", pre: emptyPre(), post: emptyPost(), updatedAt: "" });
  useEffect(() => { setDraft(existing ?? { id: `j_${date}`, date, kind: "daily", pre: emptyPre(), post: emptyPost(), updatedAt: "" }); }, [date, existing?.id]); // eslint-disable-line
  const dirty = JSON.stringify({ ...draft, updatedAt: "" }) !== JSON.stringify({ ...(existing ?? { id: `j_${date}`, date, kind: "daily", pre: emptyPre(), post: emptyPost() }), updatedAt: "" });
  const save = () => upsertJournal({ ...draft, updatedAt: new Date().toISOString() });
  return { draft, setDraft, dirty, save, existing };
}

function Daily({ date, setDate, tradeDays }: { date: string; setDate: (d: string) => void; tradeDays: string[] }) {
  const { trades, rules, toast } = useStore();
  const dayTrades = useMemo(() => trades.filter(t => dayKey(t.exitTime) === date), [trades, date]);
  const m = useMemo(() => computeMetrics(dayTrades), [dayTrades]);
  const cum = useMemo(() => trades.filter(t => dayKey(t.exitTime) <= date).reduce((s, t) => s + t.netPnL, 0), [trades, date]);
  const { draft, setDraft, dirty, save, existing } = useEntry(date);
  const bySetup = groupBy(dayTrades, t => t.setup); const best = bySetup[0], worst = bySetup[bySetup.length - 1];
  const pre = (k: keyof JournalEntry["pre"], v: string) => setDraft(d => ({ ...d, pre: { ...d.pre, [k]: v } }));
  const post = (k: keyof JournalEntry["post"], v: string) => setDraft(d => ({ ...d, post: { ...d.post, [k]: v } }));
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Panel title="Daily review" subtitle={fmtDate(date + "T12:00:00")}>
          {dayTrades.length === 0 ? <p className="text-[12.5px] text-fg-3">No trades recorded on this day.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-3">
              <Metric size="sm" label="Daily P&L" value={fmtMoney(m.netPnL, { sign: true })} tone={m.netPnL} />
              <Metric size="sm" label="Cumulative P&L" value={fmtMoney(cum, { sign: true })} tone={cum} />
              <Metric size="sm" label="Trades" value={m.trades} />
              <Metric size="sm" label="Win rate" value={fmtPct(m.winRate)} />
              <Metric size="sm" label="Avg R" value={fmtR(m.avgR)} tone={m.avgR} />
              <Metric size="sm" label="Rule compliance" value={fmtPct(m.compliance)} />
              <Metric size="sm" label="Largest win" value={fmtMoney(m.largestWin)} tone={1} />
              <Metric size="sm" label="Largest loss" value={fmtMoney(m.largestLoss)} tone={-1} />
              <Metric size="sm" label="Best setup" value={best ? best.key : "—"} sub={best ? fmtR(best.m.totalR, 1) : undefined} />
              <Metric size="sm" label="Worst setup" value={worst && worst !== best ? worst.key : "—"} sub={worst && worst !== best ? fmtR(worst.m.totalR, 1) : undefined} />
            </div>
          )}
        </Panel>
        <Panel title="Pre-market" subtitle="Written before the session">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Market expectations" className="md:col-span-2"><Textarea rows={2} value={draft.pre.expectations} onChange={e => pre("expectations", e.target.value)} /></Field>
            <Field label="Key levels"><Input mono value={draft.pre.levels} onChange={e => pre("levels", e.target.value)} /></Field>
            <Field label="Bias"><Input value={draft.pre.bias} onChange={e => pre("bias", e.target.value)} /></Field>
            <Field label="Plan" className="md:col-span-2"><Textarea rows={2} value={draft.pre.plan} onChange={e => pre("plan", e.target.value)} /></Field>
            <Field label="Rules to emphasize"><Input value={draft.pre.rulesFocus} onChange={e => pre("rulesFocus", e.target.value)} list="rulenames" /><datalist id="rulenames">{rules.map(r => <option key={r.id} value={r.name} />)}</datalist></Field>
            <Field label="Risk limit"><Input mono value={draft.pre.riskLimit} onChange={e => pre("riskLimit", e.target.value)} placeholder="−2R" /></Field>
          </div>
        </Panel>
        <Panel title="Post-market" subtitle="Process review — reflective, not motivational">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="What happened?" className="md:col-span-2"><Textarea rows={2} value={draft.post.happened} onChange={e => post("happened", e.target.value)} /></Field>
            <Field label="What did I execute well?"><Textarea rows={2} value={draft.post.well} onChange={e => post("well", e.target.value)} /></Field>
            <Field label="What did I execute poorly?"><Textarea rows={2} value={draft.post.poorly} onChange={e => post("poorly", e.target.value)} /></Field>
            <Field label="Lesson"><Textarea rows={2} value={draft.post.learned} onChange={e => post("learned", e.target.value)} /></Field>
            <Field label="Tomorrow's focus"><Textarea rows={2} value={draft.post.changes} onChange={e => post("changes", e.target.value)} /></Field>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-fg-3">{existing?.updatedAt ? `Saved ${fmtRelative(existing.updatedAt)}` : "Not saved yet"}</span>
            <Button variant="primary" disabled={!dirty} icon={Check} onClick={() => { save(); toast("Journal entry saved."); }}>Save entry</Button>
          </div>
        </Panel>
        <Panel title="Trades on this day" bodyClassName="!px-0 !pb-0">
          {dayTrades.length === 0 ? <EmptyState title="No trades attached." body="Trades are attached automatically by exit date." /> : <><div className="hidden md:block px-4 pb-4"><TradeTable trades={dayTrades} compact /></div><div className="md:hidden px-4 pb-4"><TradeCards trades={dayTrades} /></div></>}
        </Panel>
      </div>
      <Panel title="Trading days" subtitle="Most recent first" bodyClassName="max-h-[70vh] overflow-y-auto">
        {tradeDays.slice(0, 60).map(d => { const ts = trades.filter(t => dayKey(t.exitTime) === d); const p = ts.reduce((s, t) => s + t.netPnL, 0); return <button key={d} onClick={() => setDate(d)} className={cn("w-full flex items-center justify-between h-9 px-2 rounded-[5px] text-[12px] hover:bg-surface-hover", d === date && "bg-surface-hover")}><span className="mono text-fg-2">{fmtDate(d + "T12:00:00")}</span><span className="text-fg-3 mono">{ts.length}</span><span className={cn("num", signClass(p))}>{fmtMoney(p, { sign: true, decimals: 0 })}</span></button>; })}
      </Panel>
    </div>
  );
}

function Weekly({ date }: { date: string }) {
  const { trades, rules, journal, upsertJournal, toast } = useStore();
  const ws = weekStart(new Date(date + "T12:00:00")); const we = new Date(ws.getTime() + 7 * 86400000);
  const wk = useMemo(() => trades.filter(t => { const d = new Date(t.exitTime); return d >= ws && d < we; }), [trades, ws.getTime()]); // eslint-disable-line
  const m = computeMetrics(wk); const setups = groupBy(wk, t => t.setup); const sessions = groupBy(wk, t => t.session);
  const rs = rules.map(r => ({ r, s: ruleStats(r, wk) })).filter(x => x.s.broken > 0).sort((a, b) => b.s.broken - a.s.broken);
  const mistakes = groupBy(wk.filter(t => t.mistake), t => t.mistake!).sort((a, b) => a.m.netPnL - b.m.netPnL)[0];
  const id = `jw_${dayKey(ws)}`; const existing = journal.find(j => j.id === id);
  const blank = { wins: "", problems: "", patterns: "", lessons: "", focus: "" };
  const [w, setW] = useState(existing?.weekly ?? blank);
  useEffect(() => setW(existing?.weekly ?? blank), [id]); // eslint-disable-line
  const dirty = JSON.stringify(w) !== JSON.stringify(existing?.weekly ?? blank);
  return (
    <div className="space-y-4">
      <Panel title="Weekly review" subtitle={`${fmtDate(ws)} – ${fmtDate(new Date(we.getTime() - 86400000))}`}>
        {wk.length === 0 ? <p className="text-[12.5px] text-fg-3">No trades this week.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-4">
            <Metric size="sm" label="Weekly P&L" value={fmtMoney(m.netPnL, { sign: true })} tone={m.netPnL} />
            <Metric size="sm" label="Trades" value={m.trades} />
            <Metric size="sm" label="Win rate" value={fmtPct(m.winRate)} />
            <Metric size="sm" label="Profit factor" value={fmtPF(m.profitFactor)} />
            <Metric size="sm" label="Avg R" value={fmtR(m.avgR)} tone={m.avgR} />
            <Metric size="sm" label="Max drawdown" value={fmtMoney(m.maxDrawdown)} tone={-1} />
            <Metric size="sm" label="Rule compliance" value={fmtPct(m.compliance)} />
            <Metric size="sm" label="Best setup" value={setups[0]?.key ?? "—"} sub={setups[0] ? fmtR(setups[0].m.totalR, 1) : undefined} />
            <Metric size="sm" label="Worst setup" value={setups.length > 1 ? setups[setups.length - 1].key : "—"} sub={setups.length > 1 ? fmtR(setups[setups.length - 1].m.totalR, 1) : undefined} />
            <Metric size="sm" label="Best session" value={sessions[0]?.key ?? "—"} sub={sessions[0] ? fmtR(sessions[0].m.totalR, 1) : undefined} />
            <Metric size="sm" label="Most violated rule" value={rs[0]?.r.name ?? "None"} sub={rs[0] ? `${rs[0].s.broken}×` : undefined} />
            <Metric size="sm" label="Largest mistake cost" value={mistakes ? fmtMoney(mistakes.m.netPnL) : "—"} tone={mistakes?.m.netPnL} sub={mistakes?.key} />
          </div>
        )}
      </Panel>
      <Panel title="Structured review">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([["wins", "Wins"], ["problems", "Problems"], ["patterns", "Patterns"], ["lessons", "Lessons"], ["focus", "Next week's focus"]] as const).map(([k, l]) => <Field key={k} label={l} className={k === "focus" ? "md:col-span-2" : ""}><Textarea rows={3} value={w[k]} onChange={e => setW({ ...w, [k]: e.target.value })} /></Field>)}
        </div>
        <div className="flex justify-end mt-3"><Button variant="primary" disabled={!dirty} icon={Check} onClick={() => { upsertJournal({ id, date: dayKey(ws), kind: "weekly", pre: emptyPre(), post: emptyPost(), weekly: w, updatedAt: new Date().toISOString() }); toast("Weekly review saved."); }}>Save review</Button></div>
      </Panel>
      <Panel title="Trades this week" bodyClassName="!px-0 !pb-0">{wk.length === 0 ? <EmptyState title="No trades this week." /> : <><div className="hidden md:block px-4 pb-4"><TradeTable trades={wk} compact pageSize={50} /></div><div className="md:hidden px-4 pb-4"><TradeCards trades={wk} /></div></>}</Panel>
    </div>
  );
}

function Monthly({ date }: { date: string }) {
  const { trades } = useStore();
  const ym = date.slice(0, 7);
  const mt = useMemo(() => trades.filter(t => dayKey(t.exitTime).startsWith(ym)), [trades, ym]);
  const m = computeMetrics(mt); const weeks = groupBy(mt, t => dayKey(weekStart(new Date(t.exitTime)))).sort((a, b) => a.key.localeCompare(b.key));
  const setups = groupBy(mt, t => t.setup);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Panel title="Monthly summary" subtitle={new Date(date + "T12:00:00").toLocaleString("en-US", { month: "long", year: "numeric" })} className="lg:col-span-2">
        {mt.length === 0 ? <p className="text-[12.5px] text-fg-3">No trades this month.</p> : <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Metric label="Net P&L" value={fmtMoney(m.netPnL, { sign: true })} tone={m.netPnL} />
            <Metric label="Trades" value={m.trades} sub={`${m.wins}W · ${m.losses}L`} />
            <Metric label="Avg R" value={fmtR(m.avgR)} tone={m.avgR} sub={`${fmtR(m.totalR, 1)} total`} />
            <Metric label="Compliance" value={fmtPct(m.compliance)} />
          </div>
          <table className="tbl w-full"><thead><tr><th>Week of</th><th className="!text-right">Trades</th><th className="!text-right">Win rate</th><th className="!text-right">Net P&L</th><th className="!text-right">Total R</th><th className="!text-right">Compliance</th></tr></thead><tbody>{weeks.map(w => <tr key={w.key}><td className="mono">{fmtDate(w.key + "T12:00:00")}</td><td className="text-right mono">{w.trades.length}</td><td className="text-right mono">{fmtPct(w.m.winRate, 0)}</td><td className={cn("text-right num", signClass(w.m.netPnL))}>{fmtMoney(w.m.netPnL, { sign: true })}</td><td className={cn("text-right num", signClass(w.m.totalR))}>{fmtR(w.m.totalR, 1)}</td><td className="text-right mono">{fmtPct(w.m.compliance, 0)}</td></tr>)}</tbody></table>
        </>}
      </Panel>
      <Panel title="Setups this month">{setups.length === 0 ? <p className="text-[12px] text-fg-3">—</p> : setups.map(s => <StatRow key={s.key} label={`${s.key} · ${s.trades.length}`} value={fmtR(s.m.totalR, 1)} tone={s.m.totalR} />)}</Panel>
    </div>
  );
}

function Notes({ journal, upsert, del, toast }: { journal: JournalEntry[]; upsert: (e: JournalEntry) => void; del: (id: string) => void; toast: (m: string) => void }) {
  const notes = journal.filter(j => j.kind === "note").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [sel, setSel] = useState<string | null>(notes[0]?.id ?? null);
  const cur = notes.find(n => n.id === sel);
  const [title, setTitle] = useState(cur?.title ?? ""); const [body, setBody] = useState(cur?.body ?? "");
  useEffect(() => { setTitle(cur?.title ?? ""); setBody(cur?.body ?? ""); }, [cur?.id]); // eslint-disable-line
  const create = () => { const e: JournalEntry = { id: uid("note"), date: dayKey(new Date()), kind: "note", title: "Untitled note", body: "", pre: emptyPre(), post: emptyPost(), updatedAt: new Date().toISOString() }; upsert(e); setSel(e.id); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel title="Notes" actions={<Button size="sm" icon={Plus} onClick={create}>New</Button>} bodyClassName="!px-2">
        {notes.length === 0 && <p className="text-[12px] text-fg-3 px-2">No notes yet.</p>}
        {notes.map(n => <button key={n.id} onClick={() => setSel(n.id)} className={cn("w-full text-left px-2 py-2 rounded-[5px] hover:bg-surface-hover", sel === n.id && "bg-surface-hover")}><div className="text-[12.5px] font-medium truncate">{n.title || "Untitled"}</div><div className="text-[11px] text-fg-3">{fmtRelative(n.updatedAt)}</div></button>)}
      </Panel>
      <Panel className="md:col-span-2" title={cur ? "Edit note" : "Select a note"} actions={cur && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => del(cur.id)}>Delete</Button>}>
        {!cur ? <EmptyState title="Free-form notes" body="Capture observations, playbook ideas, and research that doesn't belong to a single day." action={<Button variant="primary" onClick={create}>New note</Button>} /> : (
          <div className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="!text-[14px] font-medium" />
            <Textarea rows={12} value={body} onChange={e => setBody(e.target.value)} placeholder="Write…" />
            <div className="flex justify-end"><Button variant="primary" disabled={title === cur.title && body === cur.body} onClick={() => { upsert({ ...cur, title, body, updatedAt: new Date().toISOString() }); toast("Note saved."); }}>Save note</Button></div>
          </div>
        )}
      </Panel>
    </div>
  );
}
