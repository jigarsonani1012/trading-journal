import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Columns3, Copy, Trash2, Download, Plus, GripVertical } from "lucide-react";
import { cn } from "../utils/cn";
import { useStore } from "../store";
import type { Trade, CustomColumn } from "../types";
import { fmtDate, fmtTime, fmtMoney, fmtR, fmtPrice, fmtNum, fmtDuration, signClass } from "../lib/format";
import { Button, Checkbox, Popover, RuleBadge, SideBadge, EmptyState, MenuItem } from "./ui";
import { exportCSV } from "../lib/csv";

interface ColDef { id: string; label: string; width: number; priority: 1 | 2 | 3; align?: "right"; render: (t: Trade) => React.ReactNode; sort?: (t: Trade) => number | string; sticky?: boolean }

export function useBaseColumns(): ColDef[] {
  const { settings } = useStore();
  return useMemo<ColDef[]>(() => [
    { id: "date", label: "Date", width: 96, priority: 1, sticky: true, render: t => <span className="mono text-fg-2">{fmtDate(t.exitTime, settings.dateFormat)}</span>, sort: t => t.exitTime },
    { id: "time", label: "Time", width: 64, priority: 3, render: t => <span className="mono text-fg-3">{fmtTime(t.entryTime, settings.timeFormat)}</span>, sort: t => new Date(t.entryTime).getHours() * 60 + new Date(t.entryTime).getMinutes() },
    { id: "symbol", label: "Symbol", width: 84, priority: 1, render: t => <span className="mono font-medium">{t.symbol}</span>, sort: t => t.symbol },
    { id: "side", label: "Side", width: 68, priority: 1, render: t => <SideBadge side={t.side} />, sort: t => t.side },
    { id: "setup", label: "Setup", width: 130, priority: 2, render: t => <span className="text-fg-2">{t.setup}</span>, sort: t => t.setup },
    { id: "session", label: "Session", width: 110, priority: 3, render: t => <span className="text-fg-2">{t.session}</span>, sort: t => t.session },
    { id: "entry", label: "Entry", width: 90, priority: 3, align: "right", render: t => <span className="mono">{fmtPrice(t.entryPrice)}</span>, sort: t => t.entryPrice },
    { id: "exit", label: "Exit", width: 90, priority: 3, align: "right", render: t => <span className="mono">{fmtPrice(t.exitPrice)}</span>, sort: t => t.exitPrice },
    { id: "qty", label: "Qty", width: 70, priority: 3, align: "right", render: t => <span className="mono">{fmtNum(t.quantity, t.quantity % 1 ? 2 : 0)}</span>, sort: t => t.quantity },
    { id: "risk", label: "Risk", width: 84, priority: 3, align: "right", render: t => <span className="mono text-fg-2">{fmtMoney(t.riskAmount, { decimals: 0 })}</span>, sort: t => t.riskAmount },
    { id: "gross", label: "Gross P&L", width: 96, priority: 3, align: "right", render: t => <span className={cn("num", signClass(t.grossPnL))}>{fmtMoney(t.grossPnL, { sign: true })}</span>, sort: t => t.grossPnL },
    { id: "fees", label: "Fees", width: 70, priority: 3, align: "right", render: t => <span className="mono text-fg-3">{fmtMoney(t.fees)}</span>, sort: t => t.fees },
    { id: "net", label: "Net P&L", width: 100, priority: 1, align: "right", render: t => <span className={cn("num font-medium", signClass(t.netPnL))}>{fmtMoney(t.netPnL, { sign: true })}</span>, sort: t => t.netPnL },
    { id: "r", label: "R", width: 70, priority: 1, align: "right", render: t => <span className={cn("num", signClass(t.rMultiple))}>{fmtR(t.rMultiple)}</span>, sort: t => t.rMultiple },
    { id: "hold", label: "Duration", width: 76, priority: 3, align: "right", render: t => <span className="mono text-fg-3">{fmtDuration(t.holdingMinutes)}</span>, sort: t => t.holdingMinutes },
    { id: "grade", label: "Grade", width: 56, priority: 3, render: t => <span className="mono text-fg-2">{t.grade || "—"}</span>, sort: t => t.grade },
    { id: "rules", label: "Rule Status", width: 104, priority: 1, render: t => <RuleBadge status={t.ruleStatus} />, sort: t => t.ruleStatus },
  ], [settings.dateFormat, settings.timeFormat]);
}

function customToCol(c: CustomColumn, customValue: (t: Trade, c: CustomColumn) => unknown): ColDef {
  return {
    id: "custom:" + c.id, label: c.label, width: 110, priority: 2, align: ["number", "currency", "percent", "formula"].includes(c.type) ? "right" : undefined,
    render: t => { const v = customValue(t, c); return <span className={cn(c.type !== "text" && c.type !== "dropdown" && "mono", v === "#ERR" && "text-neg")}>{formatCustom(v, c)}</span>; },
    sort: t => { const v = customValue(t, c); return typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : String(v ?? ""); },
  };
}
export function formatCustom(v: unknown, c: CustomColumn): string {
  if (v == null || v === "") return "—";
  if (c.type === "rating") return "★".repeat(Number(v)) + "☆".repeat(Math.max(0, 5 - Number(v)));
  if (c.type === "checkbox") return v ? "Yes" : "No";
  if (c.type === "currency") return fmtMoney(Number(v));
  if (c.type === "percent") return fmtNum(Number(v), 1) + "%";
  if (c.type === "number") return fmtNum(Number(v), Number.isInteger(Number(v)) ? 0 : 2);
  if (c.type === "multiselect" && Array.isArray(v)) return v.join(", ");
  if (c.type === "date") return fmtDate(String(v));
  if (c.type === "datetime") return fmtDate(String(v)) + " " + fmtTime(String(v));
  if (typeof v === "number") return fmtNum(v, Number.isInteger(v) ? 0 : 2);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

export function TradeTable({ trades, compact = false, pageSize = 25, onAddColumn }: { trades: Trade[]; compact?: boolean; pageSize?: number; onAddColumn?: () => void }) {
  const { setOpenTradeId, columns, customValue, deleteTrades, duplicateTrade, askConfirm, toast, setFilters, activeFilterCount } = useStore();
  const base = useBaseColumns();
  const allCols = useMemo(() => [...base, ...columns.map(c => customToCol(c, customValue))], [base, columns, customValue]);
  const [order, setOrder] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("edgelog:v1:colorder") || "null") ?? []; } catch { return []; } });
  const [hidden, setHidden] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("edgelog:v1:colhidden") || "null") ?? []; } catch { return []; } });
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" }>({ id: "date", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageN, setPageN] = useState(0);
  const [drag, setDrag] = useState<string | null>(null);
  useEffect(() => { localStorage.setItem("edgelog:v1:colorder", JSON.stringify(order)); }, [order]);
  useEffect(() => { localStorage.setItem("edgelog:v1:colhidden", JSON.stringify(hidden)); }, [hidden]);
  useEffect(() => setPageN(0), [trades.length, sort]);

  const cols = useMemo(() => {
    const ordered = [...allCols].sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    const customHidden = columns.filter(c => !c.visible).map(c => "custom:" + c.id);
    return ordered.filter(c => !hidden.includes(c.id) && !customHidden.includes(c.id) && (!compact || c.priority === 1 || c.id === "setup"));
  }, [allCols, order, hidden, compact, columns]);

  const sorted = useMemo(() => {
    const col = allCols.find(c => c.id === sort.id); if (!col?.sort) return trades;
    const f = col.sort; return [...trades].sort((a, b) => { const x = f(a), y = f(b); const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)); return sort.dir === "asc" ? c : -c; });
  }, [trades, sort, allCols]);
  const pageRows = compact ? sorted.slice(0, pageSize) : sorted.slice(pageN * pageSize, (pageN + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);
  const allSel = pageRows.length > 0 && pageRows.every(t => selected.has(t.id));

  const startResize = (e: React.MouseEvent, id: string, w: number) => {
    e.preventDefault(); e.stopPropagation(); const x0 = e.clientX;
    const move = (ev: MouseEvent) => setWidths(ws => ({ ...ws, [id]: Math.max(50, w + ev.clientX - x0) }));
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  };

  if (trades.length === 0) return <EmptyState title="No trades match these conditions." body="Adjust or clear the active filters to see trades." action={activeFilterCount > 0 ? <Button onClick={() => setFilters(f => ({ ...f, symbols: [], sides: [], setups: [], sessions: [], timeframes: [], emotions: [], conditions: [], grades: [], ruleStatus: "", outcome: "", ruleId: "", rMin: undefined, rMax: undefined, pnlMin: undefined, pnlMax: undefined, search: "" }))}>Clear filters</Button> : undefined} />;

  return (
    <div className="flex flex-col min-w-0">
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {selected.size > 0 ? (
            <>
              <span className="text-[12px] text-fg-2 mono">{selected.size} selected</span>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => askConfirm({ title: `Delete ${selected.size} selected trade${selected.size > 1 ? "s" : ""}?`, body: "This permanently removes them from your local journal.", confirmLabel: "Delete", danger: true, onConfirm: () => { deleteTrades([...selected]); setSelected(new Set()); } })}>Delete</Button>
              {selected.size === 1 && <Button size="sm" icon={Copy} onClick={() => { duplicateTrade([...selected][0]); setSelected(new Set()); }}>Duplicate</Button>}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </>
          ) : <span className="text-[12px] text-fg-3"><span className="mono text-fg">{trades.length}</span> trades</span>}
          <div className="flex-1" />
          <Popover align="right" trigger={<Button size="sm" icon={Columns3}>Columns</Button>} className="w-[240px]">
            {() => (
              <div className="max-h-[320px] overflow-y-auto">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-fg-3">Drag to reorder · toggle visibility</div>
                {[...allCols].sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); }).map(c => (
                  <div key={c.id} draggable onDragStart={() => setDrag(c.id)} onDragOver={e => e.preventDefault()} onDrop={() => { if (!drag || drag === c.id) return; const ids = [...allCols].sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); }).map(x => x.id); const from = ids.indexOf(drag), to = ids.indexOf(c.id); ids.splice(from, 1); ids.splice(to, 0, drag); setOrder(ids); setDrag(null); }} className="flex items-center gap-2 px-2 h-8 rounded-[5px] hover:bg-surface-hover cursor-grab">
                    <GripVertical size={12} className="text-fg-3" />
                    <Checkbox checked={!hidden.includes(c.id)} onChange={b => setHidden(h => (b ? h.filter(x => x !== c.id) : [...h, c.id]))} label={c.label} />
                  </div>
                ))}
              </div>
            )}
          </Popover>
          {onAddColumn && <Button size="sm" icon={Plus} onClick={onAddColumn}>Add Column</Button>}
          <Button size="sm" icon={Download} onClick={() => { exportCSV(sorted, columns, customValue); toast("CSV exported."); }}>Export</Button>
        </div>
      )}
      <div className="overflow-auto border border-border rounded-[8px] bg-surface" style={{ maxHeight: compact ? undefined : "calc(100vh - 300px)" }}>
        <table className="tbl w-full border-separate border-spacing-0" style={{ minWidth: compact ? undefined : cols.reduce((s, c) => s + (widths[c.id] ?? c.width), 44) }}>
          <thead>
            <tr>
              {!compact && <th className="!px-3 w-[36px] sticky left-0 z-[3] bg-surface"><Checkbox checked={allSel} onChange={b => setSelected(s => { const n = new Set(s); pageRows.forEach(t => (b ? n.add(t.id) : n.delete(t.id))); return n; })} /></th>}
              {cols.map(c => (
                <th key={c.id} style={{ width: widths[c.id] ?? c.width }} className={cn("relative group select-none", c.align === "right" && "!text-right", c.sticky && !compact && "sticky left-[36px] z-[3] bg-surface")}>
                  <button onClick={() => setSort(s => ({ id: c.id, dir: s.id === c.id && s.dir === "desc" ? "asc" : "desc" }))} className={cn("inline-flex items-center gap-1 hover:text-fg", c.align === "right" && "flex-row-reverse")}>{c.label}{sort.id === c.id ? (sort.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-60" />}</button>
                  {!compact && <span onMouseDown={e => startResize(e, c.id, widths[c.id] ?? c.width)} className="absolute right-0 top-1/4 h-1/2 w-[3px] cursor-col-resize hover:bg-accent/60 rounded" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(t => (
              <tr key={t.id} onClick={() => setOpenTradeId(t.id)} className={cn("cursor-pointer", selected.has(t.id) && "bg-accent-soft/40")}>
                {!compact && <td className="!px-3 sticky left-0 bg-surface z-[1]" onClick={e => e.stopPropagation()}><Checkbox checked={selected.has(t.id)} onChange={b => setSelected(s => { const n = new Set(s); b ? n.add(t.id) : n.delete(t.id); return n; })} /></td>}
                {cols.map(c => <td key={c.id} className={cn(c.align === "right" && "text-right", c.sticky && !compact && "sticky left-[36px] bg-surface z-[1]")}>{c.render(t)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-between mt-2.5 text-[12px] text-fg-3">
          <span className="mono">{pageN * pageSize + 1}–{Math.min(sorted.length, (pageN + 1) * pageSize)} of {sorted.length}</span>
          <div className="flex items-center gap-1"><Button size="sm" variant="ghost" disabled={pageN === 0} onClick={() => setPageN(p => p - 1)}>Previous</Button><span className="mono px-2">{pageN + 1}/{totalPages}</span><Button size="sm" variant="ghost" disabled={pageN >= totalPages - 1} onClick={() => setPageN(p => p + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  );
}

/** Mobile card list for trades */
export function TradeCards({ trades, limit }: { trades: Trade[]; limit?: number }) {
  const { setOpenTradeId } = useStore();
  const rows = [...trades].sort((a, b) => b.exitTime.localeCompare(a.exitTime)).slice(0, limit ?? 50);
  if (!rows.length) return <EmptyState title="No trades match these conditions." />;
  return (
    <div className="space-y-1.5">
      {rows.map(t => (
        <button key={t.id} onClick={() => setOpenTradeId(t.id)} className="w-full text-left panel px-3 py-2.5 flex items-center gap-3 active:bg-surface-hover">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><span className="mono font-medium">{t.symbol}</span><SideBadge side={t.side} /><span className="text-[11px] text-fg-3 truncate">{t.setup}</span></div>
            <div className="text-[11px] text-fg-3 mono mt-1">{fmtDate(t.exitTime)} · {fmtTime(t.entryTime)}</div>
          </div>
          <div className="text-right"><div className={cn("num font-medium", signClass(t.netPnL))}>{fmtMoney(t.netPnL, { sign: true })}</div><div className={cn("num text-[11px]", signClass(t.rMultiple))}>{fmtR(t.rMultiple)}</div></div>
          <RuleBadge status={t.ruleStatus} />
        </button>
      ))}
    </div>
  );
}

export { MenuItem };
