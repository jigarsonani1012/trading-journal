import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ImagePlus, Trash2 } from "lucide-react";
import { useStore, nextTradeId } from "../store";
import type { Trade, Side, RuleReview, Grade } from "../types";
import { Drawer, Button, Field, Input, Select, Textarea, Segmented, Badge } from "./ui";
import { calcTrade } from "../lib/analytics";
import { fmtMoney, fmtR, fmtDuration, fmtPct, toLocalInput, signClass } from "../lib/format";
import { SETUPS, CONDITIONS, EMOTIONS, SESSIONS, TIMEFRAMES, MISTAKES, STRATEGIES, MARKETS } from "../lib/seed";
import { cn } from "../utils/cn";

interface FormState {
  symbol: string; market: string; side: Side; quantity: string; entryPrice: string; exitPrice: string; entryTime: string; exitTime: string;
  stopLoss: string; takeProfit: string; riskAmount: string; fees: string; plannedRR: string;
  setup: string; strategy: string; timeframe: string; session: string; htfBias: Trade["htfBias"]; marketCondition: string; entryModel: string; exitModel: string;
  entryReason: string; exitReason: string; confidence: number; emotion: string; mistake: string; grade: Grade; notes: string; tags: string; screenshots: string[];
  reviews: Record<string, RuleReview>; customFields: Record<string, unknown>;
}

const Sec = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => <section className="px-4 md:px-5 py-3.5 md:py-4 border-b border-border"><div className="flex items-center justify-between mb-3"><h4 className="panel-title">{title}</h4>{right}</div>{children}</section>;
const Opts = ({ list }: { list: string[] }) => <>{list.map(o => <option key={o} value={o}>{o}</option>)}</>;

function initial(t: Trade | undefined, defaults: { riskPct: number; balance: number }, ruleIds: string[]): FormState {
  const now = new Date(); const entry = new Date(now.getTime() - 60 * 60000);
  const reviews: Record<string, RuleReview> = {};
  for (const id of ruleIds) reviews[id] = t?.ruleReviews.find(r => r.ruleId === id) ?? { ruleId: id, status: "FOLLOWED" };
  if (!t) return { symbol: "", market: "", side: "LONG", quantity: "", entryPrice: "", exitPrice: "", entryTime: toLocalInput(entry.toISOString()), exitTime: toLocalInput(now.toISOString()), stopLoss: "", takeProfit: "", riskAmount: String(Math.round(defaults.balance * defaults.riskPct / 100)), fees: "0", plannedRR: "", setup: SETUPS[0], strategy: STRATEGIES[0], timeframe: "15m", session: "London", htfBias: "Bullish", marketCondition: "Trending", entryModel: "", exitModel: "", entryReason: "", exitReason: "", confidence: 3, emotion: "Calm", mistake: "", grade: "", notes: "", tags: "", screenshots: [], reviews, customFields: {} };
  return { symbol: t.symbol, market: t.market, side: t.side, quantity: String(t.quantity), entryPrice: String(t.entryPrice), exitPrice: String(t.exitPrice), entryTime: toLocalInput(t.entryTime), exitTime: toLocalInput(t.exitTime), stopLoss: t.stopLoss != null ? String(t.stopLoss) : "", takeProfit: t.takeProfit != null ? String(t.takeProfit) : "", riskAmount: String(t.riskAmount), fees: String(t.fees), plannedRR: t.plannedRR != null ? String(t.plannedRR) : "", setup: t.setup, strategy: t.strategy, timeframe: t.timeframe, session: t.session, htfBias: t.htfBias, marketCondition: t.marketCondition, entryModel: t.entryModel ?? "", exitModel: t.exitModel ?? "", entryReason: t.entryReason ?? "", exitReason: t.exitReason ?? "", confidence: t.confidence, emotion: t.emotion, mistake: t.mistake ?? "", grade: t.grade, notes: t.notes ?? "", tags: t.tags.join(", "), screenshots: t.screenshots, reviews, customFields: { ...t.customFields } };
}

export function TradeForm() {
  const { formState, closeForm, rules, settings, balance, trades, addTrade, updateTrade, setOpenTradeId, setupNames, symbols, columns, toast } = useStore();
  const activeRules = rules.filter(r => r.active).sort((a, b) => a.order - b.order);
  const [f, setF] = useState<FormState>(() => initial(formState.trade, { riskPct: settings.defaultRiskPercent, balance }, activeRules.map(r => r.id)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setF(initial(formState.trade, { riskPct: settings.defaultRiskPercent, balance }, activeRules.map(r => r.id))); setErrors({}); setSubmitted(false); }, [formState.open, formState.trade?.id]); // eslint-disable-line
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(s => ({ ...s, [k]: v }));

  const calc = useMemo(() => {
    const e = parseFloat(f.entryPrice), x = parseFloat(f.exitPrice), q = parseFloat(f.quantity), fees = parseFloat(f.fees) || 0, risk = parseFloat(f.riskAmount) || 0;
    if (!isFinite(e) || !isFinite(x) || !isFinite(q)) return null;
    return calcTrade({ side: f.side, entryPrice: e, exitPrice: x, quantity: q, fees, riskAmount: risk, entryTime: new Date(f.entryTime).toISOString(), exitTime: new Date(f.exitTime).toISOString(), balance: settings.startingBalance + trades.reduce((s, t) => s + t.netPnL, 0) });
  }, [f, settings.startingBalance, trades]);
  const autoRisk = useMemo(() => { const e = parseFloat(f.entryPrice), sl = parseFloat(f.stopLoss), q = parseFloat(f.quantity); return isFinite(e) && isFinite(sl) && isFinite(q) ? Math.abs(e - sl) * q : null; }, [f.entryPrice, f.stopLoss, f.quantity]);
  const broken = Object.values(f.reviews).filter(r => r.status === "BROKEN");

  const validate = () => {
    const er: Record<string, string> = {};
    if (!f.symbol.trim()) er.symbol = "Symbol is required.";
    if (!(parseFloat(f.entryPrice) > 0)) er.entryPrice = "Enter a valid entry price.";
    if (!(parseFloat(f.exitPrice) > 0)) er.exitPrice = "Enter a valid exit price.";
    if (!(parseFloat(f.quantity) > 0)) er.quantity = "Quantity must be greater than zero.";
    if (!(parseFloat(f.riskAmount) > 0)) er.riskAmount = "Risk amount must be greater than zero.";
    if (isNaN(new Date(f.entryTime).getTime())) er.entryTime = "Invalid date.";
    if (isNaN(new Date(f.exitTime).getTime())) er.exitTime = "Invalid date.";
    else if (new Date(f.exitTime) < new Date(f.entryTime)) er.exitTime = "Exit must be after entry.";
    for (const r of broken) if (!r.why?.trim()) er["rule:" + r.ruleId] = "Explain why this rule was broken.";
    setErrors(er); return Object.keys(er).length === 0;
  };
  const submit = (review = false) => {
    setSubmitted(true); if (!validate() || !calc) { toast("Please fix the highlighted fields.", "error"); return; }
    const now = new Date().toISOString();
    const trade: Trade = {
      ...(formState.trade ?? {} as Trade), id: formState.trade?.id ?? nextTradeId(trades),
      symbol: f.symbol.trim().toUpperCase(), market: f.market || MARKETS[f.symbol.trim().toUpperCase()]?.market || "—", side: f.side, quantity: parseFloat(f.quantity), entryPrice: parseFloat(f.entryPrice), exitPrice: parseFloat(f.exitPrice),
      entryTime: new Date(f.entryTime).toISOString(), exitTime: new Date(f.exitTime).toISOString(), stopLoss: f.stopLoss ? parseFloat(f.stopLoss) : undefined, takeProfit: f.takeProfit ? parseFloat(f.takeProfit) : undefined,
      riskAmount: parseFloat(f.riskAmount), plannedRR: f.plannedRR ? parseFloat(f.plannedRR) : undefined, fees: parseFloat(f.fees) || 0, ...calc,
      setup: f.setup, strategy: f.strategy, timeframe: f.timeframe, session: f.session, htfBias: f.htfBias, marketCondition: f.marketCondition, entryModel: f.entryModel || undefined, exitModel: f.exitModel || undefined,
      entryReason: f.entryReason || undefined, exitReason: f.exitReason || undefined, confidence: f.confidence, emotion: f.emotion, mistake: f.mistake || undefined, grade: f.grade,
      ruleStatus: broken.length ? "BROKEN" : "FOLLOWED", ruleReviews: Object.values(f.reviews), notes: f.notes || undefined, screenshots: f.screenshots, tags: f.tags.split(",").map(s => s.trim()).filter(Boolean),
      customFields: f.customFields, createdAt: formState.trade?.createdAt ?? now, updatedAt: now,
    };
    if (formState.trade) updateTrade(trade); else addTrade(trade);
    closeForm(); if (review) setOpenTradeId(trade.id);
  };
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 4).forEach(file => {
      if (!file.type.startsWith("image/")) { toast("Only image files are supported.", "error"); return; }
      if (file.size > 1_500_000) { toast("Image too large for local storage (max 1.5 MB).", "error"); return; }
      const reader = new FileReader(); reader.onload = () => setF(s => ({ ...s, screenshots: [...s.screenshots, String(reader.result)] })); reader.readAsDataURL(file);
    });
  };
  const num = (k: keyof FormState, extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => <Input mono type="number" step="any" inputMode="decimal" value={String(f[k] ?? "")} onChange={e => set(k, e.target.value as never)} error={submitted && !!errors[k]} {...extra} />;

  return (
    <Drawer open={formState.open} onClose={closeForm} title={formState.trade ? `Edit ${formState.trade.symbol} · ${formState.trade.id}` : "New Trade"} subtitle="Record what happened, then review the process." width="max-w-[760px]"
      footer={<>
        <div className="flex-1 flex items-center gap-2 md:gap-4 text-[12px] min-w-0 overflow-hidden">
          {calc ? <><span className="text-fg-3 hidden sm:inline">Net</span><span className={cn("num font-medium text-[13px] md:text-[14px]", signClass(calc.netPnL))}>{fmtMoney(calc.netPnL, { sign: true })}</span><span className={cn("num", signClass(calc.rMultiple))}>{fmtR(calc.rMultiple)}</span><span className="text-fg-3 hidden md:inline">{fmtDuration(calc.holdingMinutes)}</span></> : <span className="text-fg-3 hidden sm:inline text-[11px]">Enter prices to calculate.</span>}
        </div>
        <Button variant="ghost" onClick={closeForm} className="hidden sm:inline-flex">Cancel</Button>
        {!formState.trade && <Button onClick={() => submit(true)} className="hidden sm:inline-flex">Save & review</Button>}
        <Button variant="primary" onClick={() => submit(false)}>{formState.trade ? "Save" : "Save trade"}</Button>
      </>}>
      <Sec title="Trade">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Symbol" required error={submitted ? errors.symbol : undefined}><Input mono list="symbols" value={f.symbol} onChange={e => { const v = e.target.value.toUpperCase(); set("symbol", v); if (MARKETS[v]) set("market", MARKETS[v].market); }} placeholder="XAUUSD" error={submitted && !!errors.symbol} autoFocus /><datalist id="symbols">{[...new Set([...symbols, ...Object.keys(MARKETS)])].map(s => <option key={s} value={s} />)}</datalist></Field>
          <Field label="Market"><Input value={f.market} onChange={e => set("market", e.target.value)} placeholder="Forex, Index…" /></Field>
          <Field label="Side" className="col-span-2 md:col-span-1"><Segmented size="md" className="w-full" value={f.side} onChange={v => set("side", v)} options={[{ value: "LONG", label: "Buy / Long" }, { value: "SHORT", label: "Sell / Short" }]} /></Field>
          <Field label="Quantity / Lots" required error={submitted ? errors.quantity : undefined}>{num("quantity", { placeholder: "1" })}</Field>
          <Field label="Entry price" required error={submitted ? errors.entryPrice : undefined}>{num("entryPrice")}</Field>
          <Field label="Exit price" required error={submitted ? errors.exitPrice : undefined}>{num("exitPrice")}</Field>
          <Field label="Entry time" required error={submitted ? errors.entryTime : undefined}><Input mono type="datetime-local" value={f.entryTime} onChange={e => set("entryTime", e.target.value)} /></Field>
          <Field label="Exit time" required error={submitted ? errors.exitTime : undefined}><Input mono type="datetime-local" value={f.exitTime} onChange={e => set("exitTime", e.target.value)} error={submitted && !!errors.exitTime} /></Field>
        </div>
      </Sec>
      <Sec title="Risk" right={autoRisk != null && Math.abs(autoRisk - parseFloat(f.riskAmount)) > 0.01 && <button className="text-[11px] text-accent hover:underline" onClick={() => set("riskAmount", autoRisk.toFixed(2))}>Use stop distance × qty = {fmtMoney(autoRisk)}</button>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Stop loss">{num("stopLoss")}</Field>
          <Field label="Take profit">{num("takeProfit")}</Field>
          <Field label="Risk amount" required error={submitted ? errors.riskAmount : undefined} hint="Amount at risk if the stop is hit. R multiple = Net P&L / Risk amount.">{num("riskAmount")}</Field>
          <Field label="Planned R:R" hint="Target reward divided by risk at the time of entry.">{num("plannedRR", { placeholder: "2.0" })}</Field>
          <Field label="Fees (total)" hint="Commission + exchange + other fees. Net P&L = Gross − Fees.">{num("fees")}</Field>
        </div>
        {calc && (
          <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 rounded-[6px] bg-surface-2 border border-border p-3">
            {[["Gross P&L", fmtMoney(calc.grossPnL, { sign: true }), calc.grossPnL], ["Fees", fmtMoney(parseFloat(f.fees) || 0), null], ["Net P&L", fmtMoney(calc.netPnL, { sign: true }), calc.netPnL], ["R multiple", fmtR(calc.rMultiple), calc.rMultiple], ["Risk %", fmtPct(calc.riskPercent, 2), null], ["Holding", fmtDuration(calc.holdingMinutes), null]].map(([l, v, tone]) => <div key={String(l)}><div className="text-[10px] uppercase tracking-wider text-fg-3">{l as string}</div><div className={cn("num text-[13px] mt-0.5", tone != null ? signClass(tone as number) : "")}>{v as string}</div></div>)}
          </div>
        )}
      </Sec>
      <Sec title="Context">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Setup"><Input list="setups" value={f.setup} onChange={e => set("setup", e.target.value)} /><datalist id="setups">{[...new Set([...SETUPS, ...setupNames])].map(s => <option key={s} value={s} />)}</datalist></Field>
          <Field label="Strategy"><Input list="strategies" value={f.strategy} onChange={e => set("strategy", e.target.value)} /><datalist id="strategies"><Opts list={STRATEGIES} /></datalist></Field>
          <Field label="Timeframe"><Select value={f.timeframe} onChange={e => set("timeframe", e.target.value)}><Opts list={TIMEFRAMES.concat(["Daily"])} /></Select></Field>
          <Field label="Session"><Select value={f.session} onChange={e => set("session", e.target.value)}><Opts list={SESSIONS} /></Select></Field>
          <Field label="HTF bias"><Select value={f.htfBias} onChange={e => set("htfBias", e.target.value as Trade["htfBias"])}><Opts list={["Bullish", "Bearish", "Neutral"]} /></Select></Field>
          <Field label="Market condition"><Select value={f.marketCondition} onChange={e => set("marketCondition", e.target.value)}><Opts list={CONDITIONS} /></Select></Field>
          <Field label="Entry model"><Input value={f.entryModel} onChange={e => set("entryModel", e.target.value)} placeholder="Candle close, limit…" /></Field>
          <Field label="Exit model"><Input value={f.exitModel} onChange={e => set("exitModel", e.target.value)} placeholder="Fixed TP, trailing…" /></Field>
        </div>
      </Sec>
      <Sec title="Execution">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Confidence"><div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" onClick={() => set("confidence", n)} className={cn("h-8 flex-1 rounded-[5px] border text-[12px] mono transition-colors", f.confidence === n ? "bg-accent-soft border-accent text-accent" : "border-border bg-surface-2 text-fg-2")}>{n}</button>)}</div></Field>
          <Field label="Emotion"><Select value={f.emotion} onChange={e => set("emotion", e.target.value)}><Opts list={EMOTIONS} /></Select></Field>
          <Field label="Mistake"><Select value={f.mistake} onChange={e => set("mistake", e.target.value)}><option value="">None</option><Opts list={MISTAKES} /></Select></Field>
          <Field label="Grade (process)" hint="Grade the process, not the P&L. A = rules followed, clean execution. D = major process violation."><div className="flex gap-1">{(["", "A", "B", "C", "D"] as Grade[]).map(g => <button key={g} type="button" onClick={() => set("grade", g)} className={cn("h-8 flex-1 rounded-[5px] border text-[12px] mono transition-colors", f.grade === g ? "bg-accent-soft border-accent text-accent" : "border-border bg-surface-2 text-fg-2")}>{g || "—"}</button>)}</div></Field>
          <Field label="Entry reason" className="col-span-2"><Textarea rows={2} value={f.entryReason} onChange={e => set("entryReason", e.target.value)} /></Field>
          <Field label="Exit reason" className="col-span-2"><Textarea rows={2} value={f.exitReason} onChange={e => set("exitReason", e.target.value)} /></Field>
          <Field label="Notes" className="col-span-2 md:col-span-3"><Textarea rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} /></Field>
          <Field label="Tags" hint="Comma separated"><Input value={f.tags} onChange={e => set("tags", e.target.value)} placeholder="a-plus, news-day" /></Field>
        </div>
        {columns.filter(c => c.type !== "formula").length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {columns.filter(c => c.type !== "formula").map(c => {
              const v = f.customFields[c.key]; const setC = (val: unknown) => setF(s => ({ ...s, customFields: { ...s.customFields, [c.key]: val } }));
              return <Field key={c.id} label={c.label}>
                {c.type === "rating" ? <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" onClick={() => setC(n)} className={cn("h-8 flex-1 rounded-[5px] border text-[12px]", Number(v) >= n ? "bg-accent-soft border-accent text-accent" : "border-border bg-surface-2 text-fg-3")}>★</button>)}</div>
                  : c.type === "checkbox" ? <Select value={v ? "1" : "0"} onChange={e => setC(e.target.value === "1")}><option value="0">No</option><option value="1">Yes</option></Select>
                  : c.type === "dropdown" ? <Select value={String(v ?? "")} onChange={e => setC(e.target.value)}><option value="">—</option><Opts list={c.options ?? []} /></Select>
                  : c.type === "multiselect" ? <Input value={Array.isArray(v) ? v.join(", ") : ""} onChange={e => setC(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder={(c.options ?? []).join(", ")} />
                  : ["number", "currency", "percent"].includes(c.type) ? <Input mono type="number" step="any" value={v == null ? "" : String(v)} onChange={e => setC(e.target.value === "" ? undefined : parseFloat(e.target.value))} />
                  : c.type === "date" ? <Input mono type="date" value={String(v ?? "")} onChange={e => setC(e.target.value)} />
                  : c.type === "datetime" ? <Input mono type="datetime-local" value={String(v ?? "")} onChange={e => setC(e.target.value)} />
                  : <Input value={String(v ?? "")} onChange={e => setC(e.target.value)} />}
              </Field>;
            })}
          </div>
        )}
        <div className="mt-3">
          <div className="label mb-1.5">Screenshots</div>
          <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }} onClick={() => fileRef.current?.click()} className="border border-dashed border-border-strong rounded-[6px] p-4 text-center text-[12px] text-fg-3 hover:border-accent hover:text-fg-2 cursor-pointer transition-colors">
            <ImagePlus size={16} className="mx-auto mb-1" />Drop images here or click to upload · stored locally
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
          </div>
          {f.screenshots.length > 0 && <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">{f.screenshots.map((s, i) => <div key={i} className="relative group"><img src={s} alt="" className="rounded-[5px] border border-border h-20 w-full object-cover" /><button type="button" onClick={() => set("screenshots", f.screenshots.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100" aria-label="Remove"><Trash2 size={12} /></button></div>)}</div>}
        </div>
      </Sec>
      <Sec title="Rule review" right={broken.length === 0 ? <Badge tone="pos"><Check size={10} strokeWidth={3} /> Process followed</Badge> : <Badge tone="neg">{broken.length} broken</Badge>}>
        {activeRules.length === 0 && <p className="text-[12px] text-fg-3">No active rules. Build your process in the Rules section.</p>}
        <div className="space-y-1.5">
          {activeRules.map(r => { const rv = f.reviews[r.id]; if (!rv) return null; const isB = rv.status === "BROKEN"; const setR = (patch: Partial<RuleReview>) => setF(s => ({ ...s, reviews: { ...s.reviews, [r.id]: { ...s.reviews[r.id], ...patch } } }));
            return (
              <div key={r.id} className={cn("rounded-[6px] border transition-colors", isB ? "border-neg/40 bg-neg-soft/30" : "border-border")}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="mono text-[11px] text-fg-3 w-5">{String(r.order).padStart(2, "0")}</span>
                  <span className="flex-1 text-[12.5px]">{r.name}</span>
                  <div className="inline-flex rounded-[5px] border border-border overflow-hidden">
                    <button type="button" onClick={() => setR({ status: "FOLLOWED" })} className={cn("h-7 px-2.5 text-[11px] font-semibold flex items-center gap-1", !isB ? "bg-pos-soft text-pos" : "text-fg-3 hover:text-fg")}><Check size={11} strokeWidth={3} />Followed</button>
                    <button type="button" onClick={() => setR({ status: "BROKEN" })} className={cn("h-7 px-2.5 text-[11px] font-semibold flex items-center gap-1 border-l border-border", isB ? "bg-neg-soft text-neg" : "text-fg-3 hover:text-fg")}><X size={11} strokeWidth={3} />Broken</button>
                  </div>
                </div>
                {isB && (
                  <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2 anim-fade">
                    <Field label="Why did I break it?" required error={submitted ? errors["rule:" + r.id] : undefined}><Input value={rv.why ?? ""} onChange={e => setR({ why: e.target.value })} error={submitted && !!errors["rule:" + r.id]} /></Field>
                    <Field label="What happened?"><Input value={rv.whatHappened ?? ""} onChange={e => setR({ whatHappened: e.target.value })} /></Field>
                    <Field label="What did I learn?"><Input value={rv.lesson ?? ""} onChange={e => setR({ lesson: e.target.value })} /></Field>
                    <Field label="What changes next time?"><Input value={rv.change ?? ""} onChange={e => setR({ change: e.target.value })} /></Field>
                  </div>
                )}
              </div>
            ); })}
        </div>
      </Sec>
    </Drawer>
  );
}
