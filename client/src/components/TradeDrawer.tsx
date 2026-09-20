import { Check, X, Pencil, Copy, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { Drawer, Button, RuleBadge, SideBadge, Badge, StatRow } from "./ui";
import { fmtMoney, fmtR, fmtPrice, fmtNum, fmtDuration, fmtDate, fmtTime, fmtPct, signClass } from "../lib/format";
import { processScore } from "../lib/analytics";
import { cn } from "../utils/cn";
import { formatCustom } from "./TradeTable";

export function TradeDrawer() {
  const { openTradeId, setOpenTradeId, trades, rules, openForm, duplicateTrade, deleteTrades, askConfirm, settings, columns, customValue } = useStore();
  const t = trades.find(x => x.id === openTradeId);
  if (!t) return null;
  const close = () => setOpenTradeId(null);
  const outcome = t.netPnL > 0 ? "Win" : t.netPnL < 0 ? "Loss" : "Breakeven";
  const verdict = t.ruleStatus === "FOLLOWED" ? (t.netPnL < 0 ? "Valid loss" : t.netPnL > 0 ? "Clean win" : "Process followed") : t.netPnL > 0 ? "Profitable mistake" : "Process broken";
  const brokenReviews = t.ruleReviews.filter(r => r.status === "BROKEN");
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="px-4 md:px-5 py-3.5 md:py-4 border-b border-border"><h4 className="panel-title mb-3">{title}</h4>{children}</section>;
  const Grid = ({ items }: { items: [string, React.ReactNode][] }) => <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[10.5px] uppercase tracking-wider text-fg-3">{k}</dt><dd className="text-[12.5px] mt-0.5 truncate">{v ?? "—"}</dd></div>)}</dl>;
  return (
    <Drawer open onClose={close} width="max-w-[680px]"
      header={
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><span className="mono text-[17px] font-semibold">{t.symbol}</span><SideBadge side={t.side} /><RuleBadge status={t.ruleStatus} /><span className="mono text-[11px] text-fg-3">{t.id}</span></div>
          <div className="flex items-baseline gap-3 mt-1.5">
            <span className={cn("num text-[24px] font-medium leading-none", signClass(t.netPnL))}>{fmtMoney(t.netPnL, { sign: true })}</span>
            <span className={cn("num text-[15px]", signClass(t.rMultiple))}>{fmtR(t.rMultiple)}</span>
            <Badge tone={t.ruleStatus === "FOLLOWED" ? (t.netPnL < 0 ? "accent" : "pos") : "warn"}>{outcome} — {verdict}</Badge>
          </div>
        </div>
      }
      footer={<>
        <Button variant="ghost" icon={Trash2} onClick={() => askConfirm({ title: "Delete trade?", body: `${t.symbol} ${t.side} on ${fmtDate(t.exitTime)} will be permanently removed.`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteTrades([t.id]) })}>Delete</Button>
        <Button variant="ghost" icon={Copy} onClick={() => { duplicateTrade(t.id); }}>Duplicate</Button>
        <Button variant="primary" icon={Pencil} onClick={() => { openForm(t); }}>Edit</Button>
      </>}>
      <Section title="Trade summary">
        <Grid items={[["Entry", <span className="mono">{fmtPrice(t.entryPrice)}</span>], ["Exit", <span className="mono">{fmtPrice(t.exitPrice)}</span>], ["Quantity", <span className="mono">{fmtNum(t.quantity, t.quantity % 1 ? 2 : 0)}</span>], ["Stop loss", <span className="mono">{fmtPrice(t.stopLoss)}</span>], ["Take profit", <span className="mono">{fmtPrice(t.takeProfit)}</span>], ["Planned R:R", <span className="mono">{t.plannedRR ? `1 : ${t.plannedRR.toFixed(2)}` : "—"}</span>], ["Risk", <span className="mono">{fmtMoney(t.riskAmount)} · {fmtPct(t.riskPercent)}</span>], ["Duration", <span className="mono">{fmtDuration(t.holdingMinutes)}</span>], ["Entered", <span className="mono">{fmtDate(t.entryTime, settings.dateFormat)} {fmtTime(t.entryTime, settings.timeFormat)}</span>], ["Exited", <span className="mono">{fmtDate(t.exitTime, settings.dateFormat)} {fmtTime(t.exitTime, settings.timeFormat)}</span>], ["Gross P&L", <span className={cn("mono", signClass(t.grossPnL))}>{fmtMoney(t.grossPnL, { sign: true })}</span>], ["Fees", <span className="mono">{fmtMoney(t.fees)}</span>]]} />
      </Section>
      <Section title="Context">
        <Grid items={[["Setup", t.setup], ["Strategy", t.strategy], ["Timeframe", <span className="mono">{t.timeframe}</span>], ["Session", t.session], ["HTF bias", t.htfBias], ["Market condition", t.marketCondition], ["Entry model", t.entryModel], ["Exit model", t.exitModel], ["Market", t.market]]} />
      </Section>
      <Section title="Execution">
        <Grid items={[["Confidence", <span className="mono">{t.confidence}/5</span>], ["Emotion", t.emotion], ["Grade", <span className="mono">{t.grade || "Ungraded"}</span>], ["Mistake", t.mistake ?? "None"], ["Process score", <span className="mono">{processScore(t)}/100</span>], ["Tags", t.tags.length ? t.tags.map(x => "#" + x).join(" ") : "—"]]} />
        {(t.entryReason || t.exitReason || t.notes) && (
          <div className="mt-4 space-y-3">
            {t.entryReason && <div><div className="text-[10.5px] uppercase tracking-wider text-fg-3 mb-1">Entry reason</div><p className="text-[12.5px] text-fg-2 leading-relaxed">{t.entryReason}</p></div>}
            {t.exitReason && <div><div className="text-[10.5px] uppercase tracking-wider text-fg-3 mb-1">Exit reason</div><p className="text-[12.5px] text-fg-2 leading-relaxed">{t.exitReason}</p></div>}
            {t.notes && <div><div className="text-[10.5px] uppercase tracking-wider text-fg-3 mb-1">Notes</div><p className="text-[12.5px] text-fg-2 leading-relaxed whitespace-pre-wrap">{t.notes}</p></div>}
          </div>
        )}
        {t.screenshots.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">{t.screenshots.map((s, i) => <img key={i} src={s} alt={`Screenshot ${i + 1}`} className="rounded-[6px] border border-border w-full object-cover max-h-[200px]" />)}</div>}
      </Section>
      {columns.length > 0 && (
        <Section title="Custom fields"><Grid items={columns.map(c => [c.label, <span className={c.type === "text" ? "" : "mono"}>{formatCustom(customValue(t, c), c)}</span>])} /></Section>
      )}
      <Section title={`Rule review · ${t.ruleReviews.length - brokenReviews.length}/${t.ruleReviews.length} followed`}>
        {t.ruleReviews.length === 0 && <p className="text-[12px] text-fg-3">No rule review recorded for this trade.</p>}
        <div className="space-y-1">
          {t.ruleReviews.map(rv => { const rule = rules.find(r => r.id === rv.ruleId); return (
            <div key={rv.ruleId} className={cn("rounded-[6px] border px-3 py-2", rv.status === "BROKEN" ? "border-neg/30 bg-neg-soft/40" : "border-border")}>
              <div className="flex items-center gap-2 text-[12.5px]">{rv.status === "FOLLOWED" ? <Check size={13} className="text-pos" /> : <X size={13} className="text-neg" />}<span className="mono text-fg-3 text-[11px]">{String(rule?.order ?? 0).padStart(2, "0")}</span><span className={cn(rv.status === "BROKEN" && "font-medium")}>{rule?.name ?? "Deleted rule"}</span></div>
              {rv.status === "BROKEN" && (
                <div className="mt-2 grid gap-1.5 text-[12px] pl-5">
                  {rv.why && <div><span className="text-fg-3">Why · </span>{rv.why}</div>}
                  {rv.whatHappened && <div><span className="text-fg-3">What happened · </span>{rv.whatHappened}</div>}
                  {rv.lesson && <div><span className="text-fg-3">Lesson · </span>{rv.lesson}</div>}
                  {rv.change && <div><span className="text-fg-3">Change · </span>{rv.change}</div>}
                </div>
              )}
            </div>
          ); })}
        </div>
        {t.ruleReviews.length > 0 && brokenReviews.length === 0 && <p className="mt-3 text-[12px] text-pos flex items-center gap-1.5"><Check size={13} /> Process followed.</p>}
      </Section>
      <div className="px-5 py-4">
        <StatRow label="Created" value={<span className="text-fg-3">{fmtDate(t.createdAt)} {fmtTime(t.createdAt)}</span>} />
        <StatRow label="Last updated" value={<span className="text-fg-3">{fmtDate(t.updatedAt)} {fmtTime(t.updatedAt)}</span>} />
      </div>
    </Drawer>
  );
}
