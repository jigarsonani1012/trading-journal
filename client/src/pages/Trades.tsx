import { useMemo, useState } from "react";
import { Trash2, Columns3 } from "lucide-react";
import { useStore } from "../store";
import { FilterBar } from "../components/FilterBar";
import { TradeTable, TradeCards } from "../components/TradeTable";
import { Modal, Button, Field, Input, Select, Textarea, Metric, Checkbox, Panel } from "../components/ui";
import { computeMetrics, evalFormula, tradeCtx, FORMULA_FIELDS } from "../lib/analytics";
import type { ColumnType, CustomColumn } from "../types";
import { fmtMoney, fmtPct, fmtR, fmtPF } from "../lib/format";

export function Trades() {
  const { filteredTrades, columns, addColumn, updateColumn, deleteColumn, trades, askConfirm } = useStore();
  const m = useMemo(() => computeMetrics(filteredTrades), [filteredTrades]);
  const [colOpen, setColOpen] = useState(false); const [manageOpen, setManageOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="panel overflow-x-auto">
        <div className="flex items-center gap-x-5 gap-y-2 px-4 py-3 min-w-[480px]">
          <Metric size="sm" label="Trades" value={<span>{m.trades}<span className="text-fg-3 text-[11px]"> / {trades.length}</span></span>} />
          <Metric size="sm" label="Net P&L" value={fmtMoney(m.netPnL, { sign: true })} tone={m.netPnL} />
          <Metric size="sm" label="Win rate" value={fmtPct(m.winRate)} />
          <Metric size="sm" label="Profit factor" value={fmtPF(m.profitFactor)} />
          <Metric size="sm" label="Avg R" value={fmtR(m.avgR)} tone={m.avgR} />
          <Metric size="sm" label="Expectancy" value={fmtMoney(m.expectancy, { sign: true })} tone={m.expectancy} />
          <Metric size="sm" label="Max DD" value={fmtMoney(m.maxDrawdown)} tone={m.maxDrawdown < 0 ? -1 : 0} />
          <Metric size="sm" label="Compliance" value={fmtPct(m.compliance)} />
          <div className="flex-1" />
          <Button size="sm" variant="ghost" icon={Columns3} onClick={() => setManageOpen(true)} className="shrink-0"><span className="hidden sm:inline">Custom columns ({columns.length})</span><span className="sm:hidden">{columns.length}</span></Button>
        </div>
      </div>
      <FilterBar />
      <div className="hidden md:block"><TradeTable trades={filteredTrades} onAddColumn={() => setColOpen(true)} /></div>
      <div className="md:hidden"><TradeCards trades={filteredTrades} limit={100} /></div>
      <ColumnDialog open={colOpen} onClose={() => setColOpen(false)} onSave={c => { addColumn(c); setColOpen(false); }} />
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Custom columns" footer={<Button variant="primary" onClick={() => { setManageOpen(false); setColOpen(true); }}>+ Add column</Button>}>
        {columns.length === 0 && <p className="text-[12.5px] text-fg-3">No custom columns yet. Add fields like Market Condition, Setup Quality, or formula columns such as Reward/Risk.</p>}
        <div className="space-y-1.5">
          {columns.map(c => (
            <div key={c.id} className="flex items-center gap-3 rounded-[6px] border border-border px-3 py-2">
              <div className="flex-1 min-w-0"><div className="text-[12.5px] font-medium">{c.label} <span className="mono text-[10.5px] text-fg-3 ml-1">{c.key}</span></div><div className="text-[11px] text-fg-3 mono truncate">{c.type}{c.formula ? ` · ${c.formula}` : ""}{c.options ? ` · ${c.options.join(", ")}` : ""}</div></div>
              <Checkbox checked={c.visible} onChange={b => updateColumn({ ...c, visible: b })} label="Visible" />
              <button onClick={() => askConfirm({ title: `Remove column "${c.label}"?`, body: "Stored values remain in trade records but the column will no longer be shown.", danger: true, confirmLabel: "Remove", onConfirm: () => deleteColumn(c.id) })} className="text-fg-3 hover:text-neg" aria-label="Delete column"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

const TYPES: { v: ColumnType; l: string }[] = [{ v: "text", l: "Text" }, { v: "number", l: "Number" }, { v: "currency", l: "Currency" }, { v: "percent", l: "Percentage" }, { v: "date", l: "Date" }, { v: "datetime", l: "Date + Time" }, { v: "dropdown", l: "Dropdown" }, { v: "multiselect", l: "Multi-select" }, { v: "checkbox", l: "Checkbox" }, { v: "formula", l: "Formula / Calculated" }, { v: "rating", l: "Rating (1–5)" }];
const EXAMPLES = ['IF(netPnL > 0, "Win", "Loss")', "netPnL / riskAmount", "IF(riskAmount > 0, ROUND(ABS(grossPnL) / riskAmount, 2), 0)", "holdingMinutes / 60", 'IF(AND(ruleStatus = "FOLLOWED", netPnL < 0), "Valid loss", "")'];

export function ColumnDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (c: Omit<CustomColumn, "id">) => void }) {
  const { trades, columns } = useStore();
  const [label, setLabel] = useState(""); const [type, setType] = useState<ColumnType>("text"); const [options, setOptions] = useState(""); const [formula, setFormula] = useState("");
  const key = label.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^./, c => c.toLowerCase()) || "field";
  const sample = trades[trades.length - 1];
  const preview = useMemo(() => { if (type !== "formula" || !formula.trim() || !sample) return null; try { return { ok: true, v: String(evalFormula(formula, tradeCtx(sample))) }; } catch (e) { return { ok: false, v: (e as Error).message }; } }, [formula, type, sample]);
  const dup = columns.some(c => c.key === key);
  const valid = label.trim() && !dup && (type !== "formula" || (preview?.ok ?? false)) && (!["dropdown", "multiselect"].includes(type) || options.trim());
  const reset = () => { setLabel(""); setType("text"); setOptions(""); setFormula(""); };
  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add column" width="max-w-[560px]" footer={<><Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={() => { onSave({ key, label: label.trim(), type, visible: true, options: ["dropdown", "multiselect"].includes(type) ? options.split(",").map(s => s.trim()).filter(Boolean) : undefined, formula: type === "formula" ? formula.trim() : undefined }); reset(); }}>Create column</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Column name" required error={dup ? "A column with this key already exists." : undefined}><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Setup Quality" autoFocus /></Field>
        <Field label="Type"><Select value={type} onChange={e => setType(e.target.value as ColumnType)}>{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</Select></Field>
        {["dropdown", "multiselect"].includes(type) && <Field label="Options (comma separated)" className="col-span-2" required><Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Trending, Ranging, Choppy" /></Field>}
        {type === "formula" && (
          <div className="col-span-2 space-y-2">
            <Field label="Formula" required hint="Supported: IF, AND, OR, NOT, SUM, AVERAGE, MIN, MAX, ABS, ROUND and + − × ÷ comparisons. No arbitrary code is executed."><Textarea rows={2} className="mono" value={formula} onChange={e => setFormula(e.target.value)} placeholder='IF(netPnL > 0, "Win", "Loss")' /></Field>
            {preview && <div className={`text-[11.5px] rounded-[5px] px-2.5 py-1.5 border ${preview.ok ? "border-border bg-surface-2 text-fg-2" : "border-neg/40 bg-neg-soft text-neg"}`}>{preview.ok ? <>Preview on {sample?.symbol} {sample?.id}: <span className="mono text-fg">{preview.v}</span></> : `Invalid formula: ${preview.v}`}</div>}
            <Panel title="Available fields" bodyClassName="!pb-3">
              <div className="flex flex-wrap gap-1">{[...FORMULA_FIELDS, ...columns.filter(c => c.type !== "formula").map(c => c.key)].map(f => <button key={f} type="button" onClick={() => setFormula(x => (x ? x + " " : "") + f)} className="mono text-[10.5px] px-1.5 h-5 rounded bg-surface-2 border border-border hover:border-accent">{f}</button>)}</div>
              <div className="mt-2 text-[10.5px] uppercase tracking-wider text-fg-3">Examples</div>
              <div className="mt-1 space-y-0.5">{EXAMPLES.map(e => <button key={e} type="button" onClick={() => setFormula(e)} className="block mono text-[11px] text-fg-2 hover:text-accent text-left">{e}</button>)}</div>
            </Panel>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-fg-3">Key: <span className="mono">{key}</span> · Columns can be shown or hidden from the table header menu.</p>
    </Modal>
  );
}
