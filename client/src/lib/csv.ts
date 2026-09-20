import type { Trade, CustomColumn, Side } from "../types";
import { calcTrade } from "./analytics";

const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function tradesToCSV(trades: Trade[], columns: CustomColumn[] = [], customValue?: (t: Trade, c: CustomColumn) => unknown) {
  const base = ["id","entryTime","exitTime","symbol","market","side","quantity","entryPrice","exitPrice","stopLoss","takeProfit","riskAmount","riskPercent","plannedRR","grossPnL","fees","netPnL","rMultiple","holdingMinutes","setup","strategy","timeframe","session","htfBias","marketCondition","entryModel","exitModel","entryReason","exitReason","emotion","confidence","mistake","grade","ruleStatus","notes","tags"];
  const head = [...base, ...columns.map(c => c.key)];
  const rows = trades.map(t => [...base.map(k => { const v = (t as unknown as Record<string, unknown>)[k]; return Array.isArray(v) ? v.join("|") : v; }), ...columns.map(c => customValue ? customValue(t, c) : t.customFields[c.key])].map(esc).join(","));
  return [head.join(","), ...rows].join("\n");
}

export function download(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCSV(trades: Trade[], columns: CustomColumn[], customValue: (t: Trade, c: CustomColumn) => unknown) {
  download(`edgelog-trades-${new Date().toISOString().slice(0, 10)}.csv`, tradesToCSV(trades, columns, customValue), "text/csv");
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; cur.push(field); field = ""; if (cur.some(x => x !== "")) rows.push(cur); cur = []; }
    else field += c;
  }
  if (field || cur.length) { cur.push(field); if (cur.some(x => x !== "")) rows.push(cur); }
  if (!rows.length) throw new Error("The CSV file is empty.");
  return { headers: rows[0].map(h => h.trim()), rows: rows.slice(1) };
}

export const IMPORT_FIELDS = ["entryTime","exitTime","symbol","side","quantity","entryPrice","exitPrice","fees","riskAmount","setup","session","timeframe","notes"] as const;
export type ImportField = typeof IMPORT_FIELDS[number];

export function guessMapping(headers: string[]): Record<ImportField, string> {
  const m = {} as Record<ImportField, string>;
  const syn: Record<ImportField, string[]> = {
    entryTime: ["entrytime","entry time","date","open time","opened","entry date"], exitTime: ["exittime","exit time","close time","closed","exit date"], symbol: ["symbol","ticker","instrument","pair"], side: ["side","direction","type","action"],
    quantity: ["quantity","qty","size","lots","volume","contracts"], entryPrice: ["entryprice","entry price","entry","open price","open"], exitPrice: ["exitprice","exit price","exit","close price","close"], fees: ["fees","commission","fee"], riskAmount: ["riskamount","risk","risk amount"],
    setup: ["setup","strategy","playbook"], session: ["session"], timeframe: ["timeframe","tf"], notes: ["notes","comment","comments"],
  };
  for (const f of IMPORT_FIELDS) { const hit = headers.find(h => syn[f].includes(h.toLowerCase())); m[f] = hit ?? ""; }
  return m;
}

export function rowsToTrades(headers: string[], rows: string[][], map: Record<ImportField, string>, balance: number): { trades: Trade[]; errors: string[] } {
  const idx = (f: ImportField) => headers.indexOf(map[f]);
  const errors: string[] = []; const out: Trade[] = [];
  rows.forEach((r, i) => {
    const g = (f: ImportField) => { const k = idx(f); return k >= 0 ? (r[k] ?? "").trim() : ""; };
    const symbol = g("symbol").toUpperCase(); const entryPrice = parseFloat(g("entryPrice")); const exitPrice = parseFloat(g("exitPrice")); const quantity = parseFloat(g("quantity"));
    const sideRaw = g("side").toUpperCase(); const side: Side = /SHORT|SELL|S$/.test(sideRaw) ? "SHORT" : "LONG";
    const entryTime = new Date(g("entryTime")); const exitTime = g("exitTime") ? new Date(g("exitTime")) : entryTime;
    if (!symbol) { errors.push(`Row ${i + 2}: missing symbol`); return; }
    if (!isFinite(entryPrice) || !isFinite(exitPrice)) { errors.push(`Row ${i + 2}: invalid entry/exit price`); return; }
    if (!isFinite(quantity) || quantity <= 0) { errors.push(`Row ${i + 2}: invalid quantity`); return; }
    if (isNaN(entryTime.getTime())) { errors.push(`Row ${i + 2}: invalid date`); return; }
    const fees = parseFloat(g("fees")) || 0; const riskAmount = parseFloat(g("riskAmount")) || Math.abs(entryPrice - exitPrice) * quantity || 1;
    const calc = calcTrade({ side, entryPrice, exitPrice, quantity, fees, riskAmount, entryTime: entryTime.toISOString(), exitTime: exitTime.toISOString(), balance });
    const now = new Date().toISOString();
    out.push({ id: "", symbol, market: "Imported", side, quantity, entryPrice, exitPrice, entryTime: entryTime.toISOString(), exitTime: exitTime.toISOString(), riskAmount, plannedRR: undefined, ...calc, fees, setup: g("setup") || "Unclassified", strategy: "—", timeframe: g("timeframe") || "—", session: g("session") || "—", htfBias: "Neutral", marketCondition: "—", emotion: "Neutral", confidence: 3, grade: "", ruleStatus: "FOLLOWED", ruleReviews: [], notes: g("notes") || undefined, screenshots: [], tags: ["imported"], customFields: {}, createdAt: now, updatedAt: now });
  });
  return { trades: out, errors };
}
