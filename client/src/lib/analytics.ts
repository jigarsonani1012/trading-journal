import type { Trade, Rule, Side } from "../types";
import { dayKey } from "./format";

export interface Metrics {
  trades: number; wins: number; losses: number; breakeven: number;
  winRate: number | null; netPnL: number; grossPnL: number; fees: number;
  profitFactor: number | null; avgR: number | null; medianR: number | null; bestR: number | null; worstR: number | null;
  avgWin: number | null; avgLoss: number | null; largestWin: number | null; largestLoss: number | null;
  expectancy: number | null; expectancyR: number | null; totalR: number;
  maxDrawdown: number; maxDrawdownPct: number; compliance: number | null;
  avgHold: number | null; medianHold: number | null; longestHold: number | null; shortestHold: number | null;
  avgRiskPct: number | null; maxRiskPct: number | null;
}

const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function sortByTime(trades: Trade[]) {
  return [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());
}

export function computeMetrics(trades: Trade[], startingBalance = 0): Metrics {
  const n = trades.length;
  const winsArr = trades.filter(t => t.netPnL > 0), lossArr = trades.filter(t => t.netPnL < 0);
  const be = n - winsArr.length - lossArr.length;
  const gp = winsArr.reduce((s, t) => s + t.netPnL, 0), gl = Math.abs(lossArr.reduce((s, t) => s + t.netPnL, 0));
  const rs = trades.map(t => t.rMultiple);
  const holds = trades.map(t => t.holdingMinutes);
  const dd = drawdownSeries(trades, startingBalance);
  const followed = trades.filter(t => t.ruleStatus === "FOLLOWED").length;
  return {
    trades: n, wins: winsArr.length, losses: lossArr.length, breakeven: be,
    winRate: n ? (winsArr.length / n) * 100 : null,
    netPnL: trades.reduce((s, t) => s + t.netPnL, 0),
    grossPnL: trades.reduce((s, t) => s + t.grossPnL, 0),
    fees: trades.reduce((s, t) => s + t.fees, 0),
    profitFactor: gl > 0 ? gp / gl : gp > 0 ? null : null,
    avgR: avg(rs), medianR: median(rs), bestR: n ? Math.max(...rs) : null, worstR: n ? Math.min(...rs) : null,
    avgWin: avg(winsArr.map(t => t.netPnL)), avgLoss: avg(lossArr.map(t => t.netPnL)),
    largestWin: winsArr.length ? Math.max(...winsArr.map(t => t.netPnL)) : null,
    largestLoss: lossArr.length ? Math.min(...lossArr.map(t => t.netPnL)) : null,
    expectancy: n ? trades.reduce((s, t) => s + t.netPnL, 0) / n : null,
    expectancyR: avg(rs), totalR: rs.reduce((a, b) => a + b, 0),
    maxDrawdown: dd.maxDD, maxDrawdownPct: dd.maxDDPct, compliance: n ? (followed / n) * 100 : null,
    avgHold: avg(holds), medianHold: median(holds), longestHold: n ? Math.max(...holds) : null, shortestHold: n ? Math.min(...holds) : null,
    avgRiskPct: avg(trades.map(t => t.riskPercent)), maxRiskPct: n ? Math.max(...trades.map(t => t.riskPercent)) : null,
  };
}

export interface EquityPoint { date: string; ts: number; balance: number; cumPnL: number; dailyPnL: number; drawdown: number; drawdownPct: number; trades: number; cumR: number }

export function equityCurve(trades: Trade[], startingBalance: number): EquityPoint[] {
  const sorted = sortByTime(trades);
  const byDay = new Map<string, { pnl: number; n: number; r: number }>();
  for (const t of sorted) {
    const k = dayKey(t.exitTime); const cur = byDay.get(k) ?? { pnl: 0, n: 0, r: 0 };
    cur.pnl += t.netPnL; cur.n += 1; cur.r += t.rMultiple; byDay.set(k, cur);
  }
  let bal = startingBalance, peak = startingBalance, cum = 0, cumR = 0;
  const pts: EquityPoint[] = [];
  for (const [k, v] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    bal += v.pnl; cum += v.pnl; cumR += v.r; peak = Math.max(peak, bal);
    pts.push({ date: k, ts: new Date(k).getTime(), balance: bal, cumPnL: cum, dailyPnL: v.pnl, drawdown: bal - peak, drawdownPct: peak ? ((bal - peak) / peak) * 100 : 0, trades: v.n, cumR });
  }
  return pts;
}

export function drawdownSeries(trades: Trade[], startingBalance: number) {
  const sorted = sortByTime(trades);
  let bal = startingBalance, peak = startingBalance, maxDD = 0, maxDDPct = 0, curDD = 0;
  const dds: number[] = []; let inDD = false, ddStart = 0, longest = 0, curLen = 0;
  const periods: { start: string; end: string; depth: number }[] = [];
  let pStart = "", pDepth = 0;
  for (const t of sorted) {
    bal += t.netPnL;
    if (bal >= peak) {
      if (inDD) { periods.push({ start: pStart, end: t.exitTime, depth: pDepth }); longest = Math.max(longest, curLen); }
      peak = bal; inDD = false; curLen = 0; pDepth = 0;
    } else {
      if (!inDD) { inDD = true; ddStart = 0; pStart = t.exitTime; }
      curLen += 1;
    }
    const dd = bal - peak; curDD = dd; dds.push(dd);
    pDepth = Math.min(pDepth, dd);
    if (dd < maxDD) { maxDD = dd; maxDDPct = peak ? (dd / peak) * 100 : 0; }
  }
  void ddStart;
  if (inDD) { longest = Math.max(longest, curLen); periods.push({ start: pStart, end: "", depth: pDepth }); }
  const neg = dds.filter(d => d < 0);
  return { maxDD, maxDDPct, currentDD: curDD, avgDD: neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : 0, longestRecovery: longest, periods };
}

export function streaks(trades: Trade[]) {
  const sorted = sortByTime(trades);
  let cur = 0, curType: "W" | "L" | null = null, bestW = 0, worstL = 0;
  const wRuns: number[] = [], lRuns: number[] = [];
  let run = 0, runType: "W" | "L" | null = null;
  let maxConsecWinPnL = 0, maxConsecLossPnL = 0, runPnL = 0;
  for (const t of sorted) {
    const ty: "W" | "L" | null = t.netPnL > 0 ? "W" : t.netPnL < 0 ? "L" : null;
    if (!ty) continue;
    if (ty === runType) { run++; runPnL += t.netPnL; } else {
      if (runType === "W") { wRuns.push(run); maxConsecWinPnL = Math.max(maxConsecWinPnL, runPnL); }
      if (runType === "L") { lRuns.push(run); maxConsecLossPnL = Math.min(maxConsecLossPnL, runPnL); }
      run = 1; runType = ty; runPnL = t.netPnL;
    }
    if (ty === "W") bestW = Math.max(bestW, run); else worstL = Math.max(worstL, run);
  }
  if (runType === "W") { wRuns.push(run); maxConsecWinPnL = Math.max(maxConsecWinPnL, runPnL); }
  if (runType === "L") { lRuns.push(run); maxConsecLossPnL = Math.min(maxConsecLossPnL, runPnL); }
  cur = run; curType = runType;
  return { current: cur, currentType: curType, bestWin: bestW, worstLoss: worstL, avgWin: avg(wRuns), avgLoss: avg(lRuns), maxConsecWinPnL, maxConsecLossPnL };
}

export interface GroupRow { key: string; trades: Trade[]; m: Metrics }
export function groupBy(trades: Trade[], keyFn: (t: Trade) => string | string[]): GroupRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = keyFn(t); const keys = Array.isArray(k) ? k : [k];
    for (const kk of keys) { if (!map.has(kk)) map.set(kk, []); map.get(kk)!.push(t); }
  }
  return [...map.entries()].map(([key, ts]) => ({ key, trades: ts, m: computeMetrics(ts) })).sort((a, b) => b.m.netPnL - a.m.netPnL);
}

export const DIMENSIONS: { id: string; label: string; fn: (t: Trade) => string }[] = [
  { id: "symbol", label: "Symbol", fn: t => t.symbol },
  { id: "market", label: "Market", fn: t => t.market },
  { id: "setup", label: "Setup", fn: t => t.setup },
  { id: "strategy", label: "Strategy", fn: t => t.strategy },
  { id: "side", label: "Side", fn: t => t.side },
  { id: "session", label: "Session", fn: t => t.session },
  { id: "timeframe", label: "Timeframe", fn: t => t.timeframe },
  { id: "dow", label: "Day of week", fn: t => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(t.entryTime).getDay()] },
  { id: "hour", label: "Hour", fn: t => `${String(new Date(t.entryTime).getHours()).padStart(2, "0")}:00` },
  { id: "ruleStatus", label: "Rule status", fn: t => t.ruleStatus },
  { id: "emotion", label: "Emotion", fn: t => t.emotion },
  { id: "confidence", label: "Confidence", fn: t => `${t.confidence}/5` },
  { id: "htfBias", label: "HTF Bias", fn: t => t.htfBias },
  { id: "marketCondition", label: "Market condition", fn: t => t.marketCondition },
  { id: "grade", label: "Trade grade", fn: t => t.grade || "Ungraded" },
  { id: "riskPct", label: "Risk %", fn: t => t.riskPercent <= 0.5 ? "≤0.5%" : t.riskPercent <= 1 ? "0.5–1%" : t.riskPercent <= 1.5 ? "1–1.5%" : ">1.5%" },
  { id: "rBucket", label: "R multiple", fn: t => t.rMultiple <= -1 ? "≤ −1R" : t.rMultiple < 0 ? "−1R to 0" : t.rMultiple < 1 ? "0 to 1R" : t.rMultiple < 2 ? "1R to 2R" : "≥ 2R" },
  { id: "hold", label: "Holding time", fn: t => t.holdingMinutes < 30 ? "< 30m" : t.holdingMinutes < 120 ? "30m–2h" : t.holdingMinutes < 480 ? "2h–8h" : "> 8h" },
  { id: "mistake", label: "Mistake", fn: t => t.mistake || "None" },
];
export const dimById = (id: string) => DIMENSIONS.find(d => d.id === id)!;

export function ruleStats(rule: Rule, trades: Trade[]) {
  const evaluated = trades.filter(t => t.ruleReviews.some(r => r.ruleId === rule.id));
  const followed = evaluated.filter(t => t.ruleReviews.find(r => r.ruleId === rule.id)!.status === "FOLLOWED");
  const broken = evaluated.filter(t => t.ruleReviews.find(r => r.ruleId === rule.id)!.status === "BROKEN");
  return { evaluated: evaluated.length, followed: followed.length, broken: broken.length, compliance: evaluated.length ? (followed.length / evaluated.length) * 100 : null, mF: computeMetrics(followed), mB: computeMetrics(broken), brokenTrades: sortByTime(broken).reverse() };
}

export function edgeCombos(trades: Trade[], dimA: string, dimB: string, dimC?: string): GroupRow[] {
  const a = dimById(dimA), b = dimById(dimB), c = dimC ? dimById(dimC) : null;
  return groupBy(trades, t => [a.fn(t), b.fn(t), ...(c ? [c.fn(t)] : [])].join(" + "));
}

export interface Pattern { text: string; sample: number; kind: "pos" | "neg" | "neutral" }
export function detectPatterns(trades: Trade[], rules: Rule[], minSample: number): Pattern[] {
  const out: Pattern[] = [];
  if (trades.length < 5) return out;
  const bySession = groupBy(trades, t => t.session).filter(g => g.trades.length >= minSample);
  if (bySession.length) { const best = [...bySession].sort((x, y) => (y.m.avgR ?? 0) - (x.m.avgR ?? 0))[0]; out.push({ text: `Your highest historical average R (${best.m.avgR!.toFixed(2)}R) occurred during the ${best.key} session.`, sample: best.trades.length, kind: "pos" }); }
  const aligned = trades.filter(t => (t.side === "LONG" && t.htfBias === "Bullish") || (t.side === "SHORT" && t.htfBias === "Bearish"));
  const notAligned = trades.filter(t => !aligned.includes(t));
  if (aligned.length >= minSample && notAligned.length >= minSample) {
    const ma = computeMetrics(aligned), mn = computeMetrics(notAligned);
    out.push({ text: `Trades aligned with HTF bias averaged ${ma.avgR!.toFixed(2)}R vs ${mn.avgR!.toFixed(2)}R without alignment.`, sample: aligned.length + notAligned.length, kind: (ma.avgR ?? 0) > (mn.avgR ?? 0) ? "pos" : "neutral" });
  }
  const violations = trades.filter(t => t.ruleStatus === "BROKEN");
  if (violations.length >= 3) {
    const hours = groupBy(violations, t => `${new Date(t.entryTime).getHours()}`).sort((x, y) => y.trades.length - x.trades.length)[0];
    const h = Number(hours.key);
    out.push({ text: `Most rule violations occurred between ${String(h).padStart(2, "0")}:00–${String(h + 2).padStart(2, "0")}:00 (${hours.trades.length} of ${violations.length}).`, sample: violations.length, kind: "neg" });
  }
  const rs = rules.map(r => ({ r, s: ruleStats(r, trades) })).filter(x => x.s.broken > 0).sort((x, y) => y.s.broken - x.s.broken);
  if (rs[0]) out.push({ text: `"${rs[0].r.name}" has been broken ${rs[0].s.broken} times. Average result when broken: ${rs[0].s.mB.avgR?.toFixed(2)}R; when followed: ${rs[0].s.mF.avgR?.toFixed(2)}R.`, sample: rs[0].s.evaluated, kind: "neg" });
  const bySetup = groupBy(trades, t => t.setup).filter(g => g.trades.length >= minSample);
  if (bySetup.length > 1) { const best = [...bySetup].sort((x, y) => (y.m.expectancyR ?? 0) - (x.m.expectancyR ?? 0))[0]; const worst = bySetup[bySetup.length - 1]; out.push({ text: `${best.key} produced your highest historical R expectancy (${best.m.expectancyR!.toFixed(2)}R). ${worst.key} produced the lowest net result (${worst.m.netPnL < 0 ? "−" : "+"}${Math.abs(worst.m.totalR).toFixed(1)}R).`, sample: best.trades.length, kind: "neutral" }); }
  const byEmotion = groupBy(trades, t => t.emotion).filter(g => g.trades.length >= Math.max(5, Math.floor(minSample / 2)));
  const badEmo = byEmotion.filter(g => ["FOMO","Revenge","Frustrated","Impatient"].includes(g.key));
  if (badEmo.length) { const worst = badEmo.sort((x, y) => (x.m.avgR ?? 0) - (y.m.avgR ?? 0))[0]; out.push({ text: `Trades logged with the emotion "${worst.key}" averaged ${worst.m.avgR!.toFixed(2)}R across ${worst.trades.length} trades.`, sample: worst.trades.length, kind: "neg" }); }
  const mF = computeMetrics(trades.filter(t => t.ruleStatus === "FOLLOWED")), mB = computeMetrics(trades.filter(t => t.ruleStatus === "BROKEN"));
  if (mF.trades >= minSample && mB.trades >= 3) out.push({ text: `Process-compliant trades show a ${mF.winRate!.toFixed(1)}% win rate and ${mF.avgR!.toFixed(2)}R average; trades with violations show ${mB.winRate!.toFixed(1)}% and ${mB.avgR!.toFixed(2)}R.`, sample: trades.length, kind: "pos" });
  return out;
}

export function mistakeLibrary(trades: Trade[]) {
  const withMistake = trades.filter(t => t.mistake && t.mistake !== "None");
  return groupBy(withMistake, t => t.mistake!).map(g => {
    const session = groupBy(g.trades, t => t.session).sort((x, y) => y.trades.length - x.trades.length)[0]?.key ?? "—";
    const setup = groupBy(g.trades, t => t.setup).sort((x, y) => y.trades.length - x.trades.length)[0]?.key ?? "—";
    const ruleIds = new Set<string>(); g.trades.forEach(t => t.ruleReviews.filter(r => r.status === "BROKEN").forEach(r => ruleIds.add(r.ruleId)));
    return { ...g, session, setup, ruleIds: [...ruleIds] };
  }).sort((a, b) => a.m.netPnL - b.m.netPnL);
}

export function processScore(t: Trade) {
  const broken = t.ruleReviews.filter(r => r.status === "BROKEN").length;
  let score = broken === 0 ? 100 : broken === 1 ? 80 : broken === 2 ? 60 : 40;
  if (t.ruleReviews.some(r => r.status === "BROKEN" && !r.lesson)) score -= 5;
  if (!t.entryReason) score -= 3; if (!t.exitReason) score -= 2;
  return Math.max(0, score);
}

export function calcTrade(input: { side: Side; entryPrice: number; exitPrice: number; quantity: number; fees: number; riskAmount: number; entryTime: string; exitTime: string; balance: number }) {
  const dir = input.side === "LONG" ? 1 : -1;
  const gross = (input.exitPrice - input.entryPrice) * dir * input.quantity;
  const net = gross - (input.fees || 0);
  const r = input.riskAmount > 0 ? net / input.riskAmount : 0;
  const hold = Math.max(0, (new Date(input.exitTime).getTime() - new Date(input.entryTime).getTime()) / 60000);
  const riskPct = input.balance > 0 ? (input.riskAmount / input.balance) * 100 : 0;
  return { grossPnL: round2(gross), netPnL: round2(net), rMultiple: Math.round(r * 100) / 100, holdingMinutes: Math.round(hold), riskPercent: Math.round(riskPct * 100) / 100 };
}
export const round2 = (v: number) => Math.round(v * 100) / 100;

// ---------- Safe formula evaluator ----------
type Tok = { t: "num" | "str" | "id" | "op" | "lp" | "rp" | "comma"; v: string };
function tokenize(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; out.push({ t: "num", v: src.slice(i, j) }); i = j; continue; }
    if (c === '"' || c === "'") { const j = src.indexOf(c, i + 1); if (j < 0) throw new Error("Unterminated string"); out.push({ t: "str", v: src.slice(i + 1, j) }); i = j + 1; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++; out.push({ t: "id", v: src.slice(i, j) }); i = j; continue; }
    if (c === "(") { out.push({ t: "lp", v: c }); i++; continue; }
    if (c === ")") { out.push({ t: "rp", v: c }); i++; continue; }
    if (c === ",") { out.push({ t: "comma", v: c }); i++; continue; }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "==", "!=", "<>"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/<>=".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Unexpected character "${c}"`);
  }
  return out;
}
type Val = number | string | boolean;
const FUNCS: Record<string, (...a: Val[]) => Val> = {
  IF: (c, a, b) => (c ? a : b), AND: (...a) => a.every(Boolean), OR: (...a) => a.some(Boolean),
  SUM: (...a) => a.reduce<number>((s, v) => s + Number(v), 0), AVERAGE: (...a) => a.reduce<number>((s, v) => s + Number(v), 0) / (a.length || 1),
  MIN: (...a) => Math.min(...a.map(Number)), MAX: (...a) => Math.max(...a.map(Number)), ABS: a => Math.abs(Number(a)),
  ROUND: (a, d) => { const f = Math.pow(10, Number(d ?? 0)); return Math.round(Number(a) * f) / f; }, NOT: a => !a,
};
export const FORMULA_FIELDS = ["entryPrice","exitPrice","quantity","fees","riskAmount","riskPercent","grossPnL","netPnL","rMultiple","holdingMinutes","confidence","plannedRR","stopLoss","takeProfit","side","setup","session","symbol","ruleStatus","emotion","grade"];
export function evalFormula(src: string, ctx: Record<string, Val | undefined>): Val {
  const toks = tokenize(src); let p = 0;
  const peek = () => toks[p], next = () => toks[p++];
  function primary(): Val {
    const t = next(); if (!t) throw new Error("Unexpected end");
    if (t.t === "num") return parseFloat(t.v);
    if (t.t === "str") return t.v;
    if (t.t === "lp") { const v = expr(); if (next()?.t !== "rp") throw new Error("Expected )"); return v; }
    if (t.t === "op" && t.v === "-") return -Number(primary());
    if (t.t === "id") {
      if (peek()?.t === "lp") {
        next(); const args: Val[] = [];
        if (peek()?.t !== "rp") { args.push(expr()); while (peek()?.t === "comma") { next(); args.push(expr()); } }
        if (next()?.t !== "rp") throw new Error("Expected )");
        const f = FUNCS[t.v.toUpperCase()]; if (!f) throw new Error(`Unknown function ${t.v}`); return f(...args);
      }
      if (t.v.toUpperCase() === "TRUE") return true; if (t.v.toUpperCase() === "FALSE") return false;
      if (!(t.v in ctx)) throw new Error(`Unknown field "${t.v}"`); return ctx[t.v] ?? 0;
    }
    throw new Error(`Unexpected token "${t.v}"`);
  }
  function mul(): Val { let l = primary(); while (peek()?.t === "op" && (peek().v === "*" || peek().v === "/")) { const o = next().v; const r = primary(); l = o === "*" ? Number(l) * Number(r) : Number(r) === 0 ? 0 : Number(l) / Number(r); } return l; }
  function add(): Val { let l = mul(); while (peek()?.t === "op" && (peek().v === "+" || peek().v === "-")) { const o = next().v; const r = mul(); l = o === "+" ? Number(l) + Number(r) : Number(l) - Number(r); } return l; }
  function cmp(): Val { let l = add(); while (peek()?.t === "op" && ["<",">","<=",">=","=","==","!=","<>"].includes(peek().v)) { const o = next().v; const r = add(); l = o === "<" ? l < r : o === ">" ? l > r : o === "<=" ? l <= r : o === ">=" ? l >= r : o === "!=" || o === "<>" ? l != r : l == r; } return l; }
  function expr(): Val { return cmp(); }
  const v = expr(); if (p < toks.length) throw new Error("Unexpected trailing input"); return v;
}
export function tradeCtx(t: Trade): Record<string, Val | undefined> {
  const c: Record<string, Val | undefined> = {};
  for (const f of FORMULA_FIELDS) c[f] = (t as unknown as Record<string, Val | undefined>)[f] ?? 0;
  for (const [k, v] of Object.entries(t.customFields)) if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") c[k] = v;
  return c;
}
