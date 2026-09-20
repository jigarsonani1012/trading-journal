import { useState } from "react";
import { X, Bookmark, SlidersHorizontal, Search, ListFilter } from "lucide-react";
import { useStore } from "../store";
import { EMPTY_FILTERS } from "../types";
import { MultiSelect, Button, Popover, Input, Select, MenuItem, Modal, Field } from "./ui";
import { SESSIONS, TIMEFRAMES, EMOTIONS, CONDITIONS } from "../lib/seed";
import { cn } from "../utils/cn";

export function FilterBar({ showSearch = true }: { showSearch?: boolean }) {
  const { filters, setFilters, activeFilterCount, symbols, setupNames, rules, views, saveView, deleteView, applyView, filteredTrades } = useStore();
  const [saveOpen, setSaveOpen] = useState(false); const [name, setName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const f = filters; const up = (p: Partial<typeof f>) => setFilters(x => ({ ...x, ...p }));
  return (
    <>
      {/* ── Desktop filter bar ── */}
      <div className="hidden md:flex flex-wrap items-center gap-1.5">
        {showSearch && <div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" /><input value={f.search} onChange={e => up({ search: e.target.value })} placeholder="Search trades…" className="input !h-7 !py-0 !pl-7 !w-[170px] !text-[12px]" /></div>}
        <MultiSelect label="Symbol" options={symbols} value={f.symbols} onChange={v => up({ symbols: v })} />
        <MultiSelect label="Setup" options={setupNames} value={f.setups} onChange={v => up({ setups: v })} />
        <MultiSelect label="Session" options={SESSIONS} value={f.sessions} onChange={v => up({ sessions: v })} />
        <MultiSelect label="Side" options={["LONG", "SHORT"]} value={f.sides} onChange={v => up({ sides: v as ("LONG" | "SHORT")[] })} />
        <Select value={f.ruleStatus} onChange={e => up({ ruleStatus: e.target.value as typeof f.ruleStatus })} className={cn("!w-auto !h-7 !py-0 !text-[12px]", f.ruleStatus && "!border-accent/50 !bg-accent-soft !text-accent")}><option value="">Rule status</option><option value="FOLLOWED">Followed</option><option value="BROKEN">Broken</option></Select>
        <Select value={f.outcome} onChange={e => up({ outcome: e.target.value as typeof f.outcome })} className={cn("!w-auto !h-7 !py-0 !text-[12px]", f.outcome && "!border-accent/50 !bg-accent-soft !text-accent")}><option value="">Outcome</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">Breakeven</option></Select>
        <Popover trigger={<Button size="sm" icon={SlidersHorizontal}>More</Button>} className="w-[300px] p-3">
          {() => (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <MultiSelect label="Timeframe" options={TIMEFRAMES} value={f.timeframes} onChange={v => up({ timeframes: v })} />
                <MultiSelect label="Emotion" options={EMOTIONS} value={f.emotions} onChange={v => up({ emotions: v })} />
                <MultiSelect label="Condition" options={CONDITIONS} value={f.conditions} onChange={v => up({ conditions: v })} />
                <MultiSelect label="Grade" options={["A", "B", "C", "D"]} value={f.grades} onChange={v => up({ grades: v })} />
              </div>
              <Field label="Broken rule"><Select value={f.ruleId} onChange={e => up({ ruleId: e.target.value })}><option value="">Any</option>{rules.map(r => <option key={r.id} value={r.id}>{String(r.order).padStart(2, "0")} {r.name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="R min"><Input mono type="number" step="0.1" value={f.rMin ?? ""} onChange={e => up({ rMin: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
                <Field label="R max"><Input mono type="number" step="0.1" value={f.rMax ?? ""} onChange={e => up({ rMax: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
                <Field label="P&L min"><Input mono type="number" value={f.pnlMin ?? ""} onChange={e => up({ pnlMin: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
                <Field label="P&L max"><Input mono type="number" value={f.pnlMax ?? ""} onChange={e => up({ pnlMax: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
              </div>
            </div>
          )}
        </Popover>
        <Popover align="right" trigger={<Button size="sm" icon={Bookmark}>Views</Button>} className="w-[220px]">
          {close => (
            <div>
              {views.length === 0 && <div className="px-2 py-2 text-[12px] text-fg-3">No saved views.</div>}
              {views.map(v => <div key={v.id} className="flex items-center group"><MenuItem onClick={() => { applyView(v.id); close(); }}>{v.name}</MenuItem><button onClick={() => deleteView(v.id)} className="h-7 w-7 text-fg-3 hover:text-neg opacity-0 group-hover:opacity-100" aria-label="Delete view"><X size={12} /></button></div>)}
              <div className="border-t border-border mt-1 pt-1"><MenuItem onClick={() => { setSaveOpen(true); close(); }}>Save current filters as view…</MenuItem></div>
            </div>
          )}
        </Popover>
        {activeFilterCount > 0 && <>
          <span className="text-[11.5px] text-fg-3 ml-1"><span className="mono text-fg">{filteredTrades.length}</span> trades · {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}</span>
          <Button size="sm" variant="ghost" icon={X} onClick={() => setFilters(EMPTY_FILTERS)}>Clear</Button>
        </>}
      </div>

      {/* ── Mobile filter bar ── */}
      <div className="md:hidden flex items-center gap-1.5">
        {showSearch && (
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input value={f.search} onChange={e => up({ search: e.target.value })} placeholder="Search…" className="input !h-8 !py-0 !pl-7 !text-[13px] w-full" />
          </div>
        )}
        <Button
          size="sm"
          icon={ListFilter}
          onClick={() => setMobileOpen(true)}
          className={cn("shrink-0", activeFilterCount > 0 && "!bg-accent-soft !text-accent !border-accent/40")}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
        {activeFilterCount > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} aria-label="Clear filters">
            <X size={13} />
          </Button>
        )}
      </div>

      {/* ── Mobile filter modal ── */}
      <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Filters" width="max-w-full sm:max-w-[480px]"
        footer={<>
          {activeFilterCount > 0 && <Button variant="ghost" icon={X} onClick={() => { setFilters(EMPTY_FILTERS); setMobileOpen(false); }}>Clear all</Button>}
          <Button variant="primary" onClick={() => setMobileOpen(false)}>Show {filteredTrades.length} trades</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Symbol">
              <Select value={f.symbols[0] ?? ""} onChange={e => up({ symbols: e.target.value ? [e.target.value] : [] })}>
                <option value="">All symbols</option>
                {symbols.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Setup">
              <Select value={f.setups[0] ?? ""} onChange={e => up({ setups: e.target.value ? [e.target.value] : [] })}>
                <option value="">All setups</option>
                {setupNames.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Side">
              <Select value={f.sides[0] ?? ""} onChange={e => up({ sides: e.target.value ? [e.target.value as "LONG" | "SHORT"] : [] })}>
                <option value="">Both</option><option value="LONG">Long</option><option value="SHORT">Short</option>
              </Select>
            </Field>
            <Field label="Session">
              <Select value={f.sessions[0] ?? ""} onChange={e => up({ sessions: e.target.value ? [e.target.value] : [] })}>
                <option value="">All sessions</option>
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Outcome">
              <Select value={f.outcome} onChange={e => up({ outcome: e.target.value as typeof f.outcome })}>
                <option value="">Any</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">Breakeven</option>
              </Select>
            </Field>
            <Field label="Rule status">
              <Select value={f.ruleStatus} onChange={e => up({ ruleStatus: e.target.value as typeof f.ruleStatus })}>
                <option value="">Any</option><option value="FOLLOWED">Followed</option><option value="BROKEN">Broken</option>
              </Select>
            </Field>
            <Field label="Timeframe">
              <Select value={f.timeframes[0] ?? ""} onChange={e => up({ timeframes: e.target.value ? [e.target.value] : [] })}>
                <option value="">All</option>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Grade">
              <Select value={f.grades[0] ?? ""} onChange={e => up({ grades: e.target.value ? [e.target.value] : [] })}>
                <option value="">All</option>{["A", "B", "C", "D"].map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="R min"><Input mono type="number" step="0.1" value={f.rMin ?? ""} onChange={e => up({ rMin: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
            <Field label="R max"><Input mono type="number" step="0.1" value={f.rMax ?? ""} onChange={e => up({ rMax: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
            <Field label="P&L min"><Input mono type="number" value={f.pnlMin ?? ""} onChange={e => up({ pnlMin: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
            <Field label="P&L max"><Input mono type="number" value={f.pnlMax ?? ""} onChange={e => up({ pnlMax: e.target.value === "" ? undefined : parseFloat(e.target.value) })} /></Field>
          </div>
        </div>
      </Modal>

      {/* Save view modal */}
      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save view" width="max-w-[380px]" footer={<><Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => { saveView(name.trim()); setName(""); setSaveOpen(false); }}>Save</Button></>}>
        <Field label="View name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="London Breakouts" autoFocus /></Field>
      </Modal>
    </>
  );
}
