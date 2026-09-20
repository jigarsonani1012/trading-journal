import type { Trade, Rule, JournalEntry, Side, RuleReview, Grade, CustomColumn } from "../types";
import { calcTrade, round2 } from "./analytics";

export const STARTING_BALANCE = 25000;
export const SETUPS = ["Breakout", "Pullback", "Liquidity Sweep", "Trend Continuation", "Reversal", "Range Expansion"];
export const CONDITIONS = ["Trending", "Ranging", "High Volatility", "Low Volatility", "News", "Choppy", "Transition"];
export const EMOTIONS = ["Calm", "Confident", "Neutral", "Fearful", "FOMO", "Frustrated", "Revenge", "Impatient"];
export const SESSIONS = ["Asia", "London", "New York", "London/NY Overlap"];
export const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H"];
export const MISTAKES = ["Chasing", "Late entry", "Oversizing", "Early exit", "Moved stop", "Revenge trade", "Overtrading", "Ignored setup condition"];
export const STRATEGIES = ["Momentum", "Mean Reversion", "Smart Money", "Trend Following"];
export const MARKETS: Record<string, { market: string; price: number; tick: number; qty: [number, number]; vol: number }> = {
  XAUUSD: { market: "Forex/Metals", price: 2380, tick: 0.1, qty: [0.5, 3], vol: 6 },
  EURUSD: { market: "Forex", price: 1.085, tick: 0.0001, qty: [50000, 200000], vol: 0.004 },
  GBPUSD: { market: "Forex", price: 1.27, tick: 0.0001, qty: [50000, 150000], vol: 0.005 },
  NIFTY: { market: "Index Futures", price: 24500, tick: 0.05, qty: [25, 100], vol: 70 },
  BTCUSD: { market: "Crypto", price: 64000, tick: 1, qty: [0.05, 0.4], vol: 700 },
  NAS100: { market: "Index CFD", price: 18500, tick: 0.25, qty: [1, 5], vol: 60 },
  ES: { market: "Index Futures", price: 5300, tick: 0.25, qty: [1, 4], vol: 14 },
};

export function seedRules(): Rule[] {
  const now = new Date(Date.now() - 250 * 86400000).toISOString();
  const defs: [string, string, string, Rule["priority"]][] = [
    ["HTF bias must be aligned", "Only take trades in the direction of the higher-timeframe bias defined in the pre-market plan.", "Analysis", "High"],
    ["Wait for confirmation", "Do not enter until the trigger candle closes and the LTF structure confirms the idea.", "Execution", "High"],
    ["Risk within planned limit", "Risk per trade must not exceed 1% of account balance. Position size is calculated before entry.", "Risk", "High"],
    ["Never chase extended price", "If price has already moved more than 50% of the expected range, the trade is missed. Do not enter late.", "Execution", "Medium"],
    ["Trade only approved setups", "Only take setups from the playbook. No improvised trades.", "Analysis", "Medium"],
    ["Respect the stop loss", "The stop is placed at entry and never widened. Partial profits are allowed; moving stop further is not.", "Risk", "High"],
    ["No revenge entries", "After a loss, wait at least 15 minutes and re-check the plan before the next entry.", "Psychology", "Medium"],
    ["Stop after daily loss limit", "Stop trading for the day after −2R or two consecutive rule violations.", "Risk", "Low"],
  ];
  return defs.map((d, i) => ({ id: `rule_${i + 1}`, order: i + 1, name: d[0], description: d[1], category: d[2], priority: d[3], active: true, createdAt: now }));
}

export function seedColumns(): CustomColumn[] {
  return [
    { id: "col_setupq", key: "setupQuality", label: "Setup Quality", type: "rating", visible: true },
    { id: "col_conf", key: "confluenceCount", label: "Confluence", type: "number", visible: false },
    { id: "col_news", key: "newsEnv", label: "News Env.", type: "dropdown", options: ["Quiet", "Scheduled", "Surprise"], visible: false },
    { id: "col_rr", key: "rewardRisk", label: "Reward/Risk", type: "formula", formula: "IF(riskAmount > 0, ROUND(ABS(grossPnL) / riskAmount, 2), 0)", visible: false },
    { id: "col_wl", key: "winLoss", label: "Win/Loss", type: "formula", formula: 'IF(netPnL > 0, "Win", IF(netPnL < 0, "Loss", "BE"))', visible: false },
  ];
}

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const gauss = (r: () => number) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const SESSION_HOURS: Record<string, [number, number]> = { Asia: [1, 6], London: [8, 12], "London/NY Overlap": [13, 16], "New York": [16, 20] };

export function seedTrades(rules: Rule[]): Trade[] {
  const r = rng(20260913);
  const trades: Trade[] = [];
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 215 * 86400000);
  let balance = STARTING_BALANCE;
  let regime = 0; // shift over time to create drawdown/recovery periods
  let idx = 0;
  const symbols = Object.keys(MARKETS);
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
    const dow = d.getDay(); if (dow === 0 || dow === 6) continue;
    const dayIndex = Math.floor((d.getTime() - start.getTime()) / 86400000);
    // regime: good, drawdown around day 70-100, recovery, mild chop around 150-165
    regime = dayIndex > 68 && dayIndex < 98 ? -0.35 : dayIndex > 148 && dayIndex < 166 ? -0.15 : dayIndex > 98 && dayIndex < 130 ? 0.25 : 0.08;
    const nTrades = r() < 0.22 ? 0 : r() < 0.55 ? 1 : r() < 0.85 ? 2 : 3;
    let dayLoss = 0, prevLoss = false;
    for (let k = 0; k < nTrades; k++) {
      const symbol = pick(r, symbols); const mk = MARKETS[symbol];
      const session = symbol === "NIFTY" ? pick(r, ["Asia", "London"]) : pick(r, SESSIONS.concat(["London", "New York"]));
      const [h0, h1] = SESSION_HOURS[session];
      const hour = h0 + Math.floor(r() * (h1 - h0)); const minute = Math.floor(r() * 60);
      const entry = new Date(d); entry.setHours(hour, minute, 0, 0);
      const setup = pick(r, SETUPS.concat(["Breakout", "Pullback", "Liquidity Sweep"]));
      const side: Side = r() < 0.55 ? "LONG" : "SHORT";
      const htfBias = r() < 0.62 ? (side === "LONG" ? "Bullish" : "Bearish") : pick(r, ["Bullish", "Bearish", "Neutral"] as const);
      const aligned = (side === "LONG" && htfBias === "Bullish") || (side === "SHORT" && htfBias === "Bearish");
      const condition = pick(r, CONDITIONS);
      const timeframe = pick(r, ["5m", "15m", "15m", "1H", "5m", "4H", "1m"]);
      // emotions and violations
      let emotion = pick(r, ["Calm", "Calm", "Confident", "Neutral", "Neutral", "Confident", "Fearful", "Impatient"]);
      if (prevLoss && r() < 0.35) emotion = pick(r, ["Revenge", "Frustrated", "FOMO"]);
      if (dayIndex > 68 && dayIndex < 98 && r() < 0.3) emotion = pick(r, ["FOMO", "Frustrated", "Impatient"]);
      const badEmotion = ["FOMO", "Revenge", "Frustrated", "Impatient"].includes(emotion);
      const violationProb = 0.12 + (badEmotion ? 0.45 : 0) + (!aligned ? 0.12 : 0) + (condition === "Choppy" ? 0.1 : 0) + (session === "London/NY Overlap" ? 0.05 : 0);
      const brokenIds: string[] = [];
      if (r() < violationProb) {
        if (!aligned && r() < 0.7) brokenIds.push("rule_1");
        if (emotion === "FOMO" || r() < 0.3) brokenIds.push(pick(r, ["rule_2", "rule_4"]));
        if (emotion === "Revenge") brokenIds.push("rule_7");
        if (r() < 0.2) brokenIds.push("rule_3");
        if (r() < 0.12) brokenIds.push("rule_6");
        if (r() < 0.1) brokenIds.push("rule_5");
        if (dayLoss < -2 * balance * 0.01 && r() < 0.6) brokenIds.push("rule_8");
        if (!brokenIds.length) brokenIds.push(pick(r, ["rule_2", "rule_4", "rule_7"]));
      }
      const broken = new Set(brokenIds);
      // edge: setup/session quality determines outcome distribution
      let edge = regime;
      if (setup === "Breakout" && session === "London") edge += 0.35;
      if (setup === "Liquidity Sweep") edge += 0.2;
      if (setup === "Pullback" && condition === "Trending") edge += 0.25;
      if (setup === "Reversal") edge -= 0.2;
      if (setup === "Range Expansion" && condition === "Choppy") edge -= 0.3;
      if (aligned) edge += 0.2; else edge -= 0.15;
      if (session === "Asia") edge -= 0.1;
      if (session === "New York") edge += 0.05;
      if (condition === "Choppy" || condition === "Low Volatility") edge -= 0.15;
      if (broken.size) edge -= 0.35 * broken.size;
      if (badEmotion) edge -= 0.15;
      if (symbol === "BTCUSD" && side === "SHORT") edge -= 0.15;
      if (symbol === "XAUUSD") edge += 0.1;
      if (dow === 5 && session === "New York") edge -= 0.15;
      // outcome in R
      const winP = Math.min(0.78, Math.max(0.28, 0.5 + edge * 0.28));
      const isWin = r() < winP;
      let R: number;
      if (isWin) { R = round2(Math.max(0.3, 0.8 + Math.abs(gauss(r)) * 1.1 + (setup === "Breakout" ? 0.3 : 0) + (setup === "Liquidity Sweep" ? 0.4 : 0))); if (R > 5) R = 5; }
      else if (r() < 0.12) R = round2((r() - 0.5) * 0.3);
      else R = round2(-(0.7 + r() * 0.4 + (broken.has("rule_6") ? 0.9 : 0)));
      if (broken.has("rule_6") && R < 0) R = round2(R - 0.5);
      // sizing/risk
      let riskPct = 0.5 + r() * 0.6; if (broken.has("rule_3")) riskPct = 1.4 + r() * 1.2;
      const riskAmount = round2(balance * riskPct / 100);
      const qty = mk.qty[0] + r() * (mk.qty[1] - mk.qty[0]);
      const quantity = symbol === "NIFTY" ? Math.round(qty / 25) * 25 : symbol === "EURUSD" || symbol === "GBPUSD" ? Math.round(qty / 1000) * 1000 : round2(qty);
      const stopDist = riskAmount / quantity;
      const priceDrift = 1 + (dayIndex / 215) * (symbol === "BTCUSD" ? 0.5 : symbol === "XAUUSD" ? 0.2 : 0.03) + gauss(r) * 0.01;
      const base = mk.price * priceDrift;
      const entryPrice = roundTick(base + gauss(r) * mk.vol, mk.tick);
      const dir = side === "LONG" ? 1 : -1;
      const grossTarget = R * riskAmount + Math.max(0, riskAmount * 0.02);
      const exitPrice = roundTick(entryPrice + dir * (grossTarget / quantity), mk.tick);
      const stopLoss = roundTick(entryPrice - dir * stopDist, mk.tick);
      const plannedRR = round2(1.5 + r() * 1.5);
      const takeProfit = roundTick(entryPrice + dir * stopDist * plannedRR, mk.tick);
      const holdMin = timeframe === "1m" ? 5 + r() * 40 : timeframe === "5m" ? 15 + r() * 90 : timeframe === "15m" ? 40 + r() * 240 : timeframe === "1H" ? 120 + r() * 600 : 600 + r() * 2400;
      const exitT = new Date(entry.getTime() + holdMin * 60000);
      const fees = round2(symbol === "NIFTY" ? 40 + quantity * 0.9 : symbol === "BTCUSD" ? Math.abs(entryPrice * quantity) * 0.0005 : symbol.startsWith("E") || symbol.startsWith("G") ? quantity * 0.00006 : 4 + quantity * 2.2);
      const calc = calcTrade({ side, entryPrice, exitPrice, quantity, fees, riskAmount, entryTime: entry.toISOString(), exitTime: exitT.toISOString(), balance });
      const ruleReviews: RuleReview[] = rules.filter(rl => rl.id !== "rule_8" || dayLoss < 0).map(rl => broken.has(rl.id) ? { ruleId: rl.id, status: "BROKEN", ...violationText(r, rl.id, emotion) } : { ruleId: rl.id, status: "FOLLOWED" });
      const mistake = broken.size ? mistakeFor(r, [...broken]) : (calc.netPnL < 0 && r() < 0.15 ? "Early exit" : undefined);
      const grade: Grade = broken.size === 0 ? (r() < 0.75 ? "A" : "B") : broken.size === 1 ? (r() < 0.6 ? "B" : "C") : r() < 0.5 ? "C" : "D";
      const confidence = Math.min(5, Math.max(1, Math.round(3 + (aligned ? 0.6 : -0.4) + gauss(r) * 0.9)));
      const t: Trade = {
        id: `T${String(1000 + idx++)}`, symbol, market: mk.market, side, quantity, entryPrice, exitPrice,
        entryTime: entry.toISOString(), exitTime: exitT.toISOString(), stopLoss, takeProfit, riskAmount, plannedRR,
        ...calc, riskPercent: round2(riskPct), fees, setup, strategy: strategyFor(setup), timeframe, session, htfBias, marketCondition: condition,
        entryModel: pick(r, ["Candle close", "Limit at level", "Market on break", "Retest"]), exitModel: pick(r, ["Fixed TP", "Trailing", "Time stop", "Manual", "Stop hit"]),
        entryReason: entryReasonFor(r, setup, htfBias), exitReason: calc.netPnL > 0 ? pick(r, ["Target reached", "Trailed out at structure", "Partial at 1R, rest at target"]) : pick(r, ["Stop loss hit", "Invalidated structure, exited early", "Time-based exit"]),
        emotion, confidence, mistake, grade, ruleStatus: broken.size ? "BROKEN" : "FOLLOWED", ruleReviews,
        notes: r() < 0.35 ? pick(r, NOTES) : undefined, screenshots: [], tags: tagsFor(r, setup, broken.size > 0),
        customFields: { setupQuality: Math.min(5, Math.max(1, Math.round(confidence + gauss(r) * 0.6))), confluenceCount: 1 + Math.floor(r() * 4), newsEnv: condition === "News" ? "Scheduled" : pick(r, ["Quiet", "Quiet", "Scheduled"]) },
        createdAt: exitT.toISOString(), updatedAt: exitT.toISOString(),
      };
      trades.push(t);
      balance += t.netPnL; dayLoss += t.netPnL; prevLoss = t.netPnL < 0;
    }
  }
  // Two illustrative sample trades (recent)
  const y = new Date(end.getTime() - 2 * 86400000); y.setHours(9, 40, 0, 0);
  const s1Calc = calcTrade({ side: "LONG", entryPrice: 24820, exitPrice: 24760, quantity: 50, fees: 120, riskAmount: 3000, entryTime: y.toISOString(), exitTime: new Date(y.getTime() + 47 * 60000).toISOString(), balance });
  trades.push({ id: `T${String(1000 + idx++)}`, symbol: "NIFTY", market: "Index Futures", side: "LONG", quantity: 50, entryPrice: 24820, exitPrice: 24760, entryTime: y.toISOString(), exitTime: new Date(y.getTime() + 47 * 60000).toISOString(), stopLoss: 24760, takeProfit: 24960, riskAmount: 3000, plannedRR: 2.33, ...s1Calc, fees: 120, setup: "Breakout", strategy: "Momentum", timeframe: "5m", session: "London", htfBias: "Bullish", marketCondition: "Trending", entryModel: "Market on break", exitModel: "Stop hit", entryReason: "Clean break of the opening range high with HTF bullish structure and volume expansion.", exitReason: "Stop loss hit. Break failed and price returned into the range.", emotion: "Calm", confidence: 4, grade: "A", ruleStatus: "FOLLOWED", ruleReviews: seedRules().slice(0, 7).map(rl => ({ ruleId: rl.id, status: "FOLLOWED" as const })), notes: "Valid loss. Setup was textbook; the break simply failed. Nothing to change.", screenshots: [], tags: ["valid-loss", "opening-range"], customFields: { setupQuality: 5, confluenceCount: 3, newsEnv: "Quiet" }, createdAt: y.toISOString(), updatedAt: y.toISOString() });
  balance += s1Calc.netPnL;
  const y2 = new Date(end.getTime() - 1 * 86400000); y2.setHours(14, 5, 0, 0);
  const s2Calc = calcTrade({ side: "LONG", entryPrice: 2412.4, exitPrice: 2421.9, quantity: 1, fees: 6.2, riskAmount: 450, entryTime: y2.toISOString(), exitTime: new Date(y2.getTime() + 118 * 60000).toISOString(), balance });
  trades.push({ id: `T${String(1000 + idx++)}`, symbol: "XAUUSD", market: "Forex/Metals", side: "LONG", quantity: 1, entryPrice: 2412.4, exitPrice: 2421.9, entryTime: y2.toISOString(), exitTime: new Date(y2.getTime() + 118 * 60000).toISOString(), stopLoss: 2407.9, takeProfit: 2423.0, riskAmount: 450, plannedRR: 2.36, ...s2Calc, fees: 6.2, setup: "Liquidity Sweep", strategy: "Smart Money", timeframe: "15m", session: "London/NY Overlap", htfBias: "Bullish", marketCondition: "High Volatility", entryModel: "Market on break", exitModel: "Fixed TP", entryReason: "Sweep of Asian low into HTF demand. Entered as price reclaimed the level.", exitReason: "Target reached near prior day high.", emotion: "FOMO", confidence: 3, mistake: "Chasing", grade: "C", ruleStatus: "BROKEN", ruleReviews: seedRules().slice(0, 7).map(rl => rl.id === "rule_4" ? { ruleId: rl.id, status: "BROKEN" as const, why: "Entered before confirmation. Price had already reclaimed and moved 60% toward target.", whatHappened: "Trade worked, but the entry was late and the stop had to be placed wider than planned.", lesson: "The result masks a process error. Late entries reduce R even when they win.", change: "If the reclaim candle has closed more than halfway to target, mark the trade as missed." } : { ruleId: rl.id, status: "FOLLOWED" as const }), notes: "Profitable mistake. Good read, poor execution.", screenshots: [], tags: ["profitable-mistake"], customFields: { setupQuality: 4, confluenceCount: 3, newsEnv: "Quiet" }, createdAt: y2.toISOString(), updatedAt: y2.toISOString() });
  return trades;
}

function roundTick(v: number, tick: number) { const d = tick < 0.001 ? 5 : tick < 0.1 ? 2 : tick < 1 ? 2 : 0; return Number((Math.round(v / tick) * tick).toFixed(d)); }
function strategyFor(setup: string) { return setup === "Breakout" || setup === "Range Expansion" ? "Momentum" : setup === "Liquidity Sweep" ? "Smart Money" : setup === "Reversal" ? "Mean Reversion" : "Trend Following"; }
function mistakeFor(r: () => number, broken: string[]) {
  const map: Record<string, string> = { rule_1: "Ignored setup condition", rule_2: "Late entry", rule_3: "Oversizing", rule_4: "Chasing", rule_5: "Ignored setup condition", rule_6: "Moved stop", rule_7: "Revenge trade", rule_8: "Overtrading" };
  return map[pick(r, broken)];
}
function violationText(r: () => number, ruleId: string, emotion: string) {
  const whys: Record<string, string[]> = {
    rule_1: ["Took a counter-trend idea because the LTF looked strong.", "Bias was Neutral in the plan; took the trade anyway."],
    rule_2: ["Entered on the wick instead of waiting for the close.", "Anticipated the trigger to get a better price."],
    rule_3: ["Sized up after two wins.", "Miscalculated position size on the fly."],
    rule_4: ["Price had already run; entered anyway out of " + emotion.toLowerCase() + ".", "Missed the initial entry and chased the second leg."],
    rule_5: ["Took a pattern that is not in the playbook.", "Improvised a setup mid-session."],
    rule_6: ["Widened the stop when price approached it.", "Removed stop temporarily around news."],
    rule_7: ["Re-entered 4 minutes after a stop-out.", "Wanted to make back the previous loss immediately."],
    rule_8: ["Continued trading past the daily loss limit.", "Ignored the limit because the setup looked clean."],
  };
  return { why: pick(r, whys[ruleId] ?? ["Deviated from plan."]), whatHappened: pick(r, ["Entry was worse than planned; the R was reduced.", "Trade was outside the plan; result was not representative of the process.", "Position was mismanaged after entry."]), lesson: pick(r, ["The plan exists for exactly this moment.", "Waiting costs less than being early.", "A late entry changes the risk profile completely.", "Emotion was the trigger, not the setup."]), change: pick(r, ["Add a 15-minute cooldown after every loss.", "Pre-calculate size before the session.", "Mark missed trades as missed and log them.", "Use alerts instead of watching price."]) };
}
function entryReasonFor(r: () => number, setup: string, bias: string) {
  const m: Record<string, string[]> = {
    Breakout: ["Break of session range high with expansion candle.", "Compression at key level resolved with volume."],
    Pullback: ["Retrace to 20 EMA in established trend.", "Pullback to prior breakout level with rejection wick."],
    "Liquidity Sweep": ["Sweep of equal lows followed by displacement back inside range.", "Stop hunt below session low into HTF demand."],
    "Trend Continuation": ["Higher low formed after impulse leg.", "Flag continuation aligned with " + bias.toLowerCase() + " bias."],
    Reversal: ["Divergence at HTF resistance with failed breakout.", "Exhaustion candle at weekly level."],
    "Range Expansion": ["Volatility contraction after Asia; entered on first expansion.", "Inside-bar break at open."],
  };
  return pick(r, m[setup]);
}
function tagsFor(r: () => number, setup: string, broken: boolean) { const t = [setup.toLowerCase().replace(/ /g, "-")]; if (broken) t.push("violation"); if (r() < 0.2) t.push("a-plus"); if (r() < 0.15) t.push("news-day"); return t; }
const NOTES = ["Executed per plan.", "Hesitated slightly on entry but the fill was fine.", "Good read of the session structure.", "Should have taken partials earlier.", "Volatility was higher than expected.", "Clean setup, clean execution.", "Spread widened at the open; took a worse fill.", "Mind was elsewhere. Should have skipped the session."];

export function seedJournal(trades: Trade[]): JournalEntry[] {
  const days = [...new Set(trades.map(t => t.exitTime.slice(0, 10)))].sort().slice(-6);
  const now = new Date().toISOString();
  const entries: JournalEntry[] = days.map((date, i) => ({
    id: `j_${date}`, date, kind: "daily", updatedAt: now,
    pre: { expectations: ["Expect continuation after yesterday's expansion.", "Range day likely into the data release.", "Trend day potential if London breaks the Asian range."][i % 3], levels: ["2405 / 2418 / 2432", "24,650 / 24,820 / 24,960", "1.0820 / 1.0865 / 1.0900"][i % 3], bias: ["Bullish above 2405", "Neutral until range resolves", "Bearish below 1.0865"][i % 3], plan: "Wait for the London open. Only A/B setups. Maximum two trades.", rulesFocus: "Wait for confirmation. No chasing.", riskLimit: "−2R daily" },
    post: i === days.length - 1 ? { happened: "", well: "", poorly: "", learned: "", changes: "" } : { happened: ["Clean session. One trade, followed the plan.", "Chopped around the level and gave back the morning gains.", "Missed the first move, then took a late second entry."][i % 3], well: "Sizing and stop placement were correct.", poorly: i % 3 === 2 ? "Entered late on the second leg." : "Nothing significant.", learned: "The first clean signal is usually the best one.", changes: "Set alerts at the levels instead of watching every candle." },
  }));
  entries.push({ id: "j_note_1", date: days[0], kind: "note", title: "Observations on London breakouts", body: "Breakouts in the first 90 minutes of London have been my most consistent setup. Most failures happen when the Asian range is unusually wide (> 1.5× average). Consider adding a range-width filter to the playbook.", pre: emptyPre(), post: emptyPost(), updatedAt: now });
  return entries;
}
export const emptyPre = () => ({ expectations: "", levels: "", bias: "", plan: "", rulesFocus: "", riskLimit: "" });
export const emptyPost = () => ({ happened: "", well: "", poorly: "", learned: "", changes: "" });
