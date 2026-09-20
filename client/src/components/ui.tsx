import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Info, Check, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";
import { useStore } from "../store";
import { signClass } from "../lib/format";

// ---------- Button ----------
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export function Button({ variant = "secondary", size = "md", className, children, icon: Icon, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-[6px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";
  const sizes = { sm: "h-7 px-2.5 text-[12px]", md: "h-8 px-3 text-[12.5px]", lg: "h-10 px-4 text-[13px]" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-fg text-bg hover:opacity-90 shadow-sm",
    secondary: "bg-surface-2 border border-border-strong text-fg hover:bg-surface-hover",
    ghost: "text-fg-2 hover:text-fg hover:bg-surface-hover",
    subtle: "bg-accent-soft text-accent hover:brightness-110",
    danger: "bg-neg-soft text-neg border border-transparent hover:border-neg/40",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>{Icon && <Icon size={14} />}{children}</button>;
}
export function IconButton({ className, label, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cn("inline-flex items-center justify-center h-8 w-8 rounded-[6px] text-fg-2 hover:text-fg hover:bg-surface-hover transition-colors", className)} {...rest}>{children}</button>;
}

// ---------- Form fields ----------
export function Field({ label, hint, error, children, className, required }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      <span className="label flex items-center gap-1 mb-1.5">{label}{required && <span className="text-neg">*</span>}{hint && <Tooltip text={hint}><Info size={11} className="text-fg-3" /></Tooltip>}</span>
      {children}
      {error && <span className="block mt-1 text-[11px] text-neg">{error}</span>}
    </label>
  );
}
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; mono?: boolean }>(({ className, error, mono, ...rest }, ref) => (
  <input ref={ref} className={cn("input", error && "error", mono && "mono", className)} {...rest} />
));
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("input", className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input", className)} {...rest} />;
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label?: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[12.5px]">
      <span role="checkbox" aria-checked={checked} tabIndex={0} onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }} onClick={() => onChange(!checked)}
        className={cn("h-4 w-4 rounded-[4px] border flex items-center justify-center transition-colors", checked ? "bg-accent border-accent text-white" : "border-border-strong bg-surface-2")}>{checked && <Check size={11} strokeWidth={3} />}</span>
      {label && <span onClick={() => onChange(!checked)}>{label}</span>}
    </label>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-accent" : "bg-border-strong")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}
export function Segmented<T extends string>({ value, onChange, options, size = "sm", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-0.5 bg-surface-2 border border-border rounded-[6px] p-0.5", className)}>
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn("rounded-[4px] font-medium transition-colors whitespace-nowrap", size === "sm" ? "px-2 h-6 text-[11px]" : "px-3 h-7 text-[12px]", value === o.value ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg")}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------- Badges ----------
export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "pos" | "neg" | "neutral" | "accent" | "warn"; className?: string }) {
  const t = { pos: "bg-pos-soft text-pos", neg: "bg-neg-soft text-neg", neutral: "bg-surface-2 text-fg-2 border border-border", accent: "bg-accent-soft text-accent", warn: "bg-warn-soft text-warn" }[tone];
  return <span className={cn("inline-flex items-center gap-1 px-1.5 h-[18px] rounded-[4px] text-[10.5px] font-semibold tracking-wide uppercase", t, className)}>{children}</span>;
}
export function RuleBadge({ status }: { status: "FOLLOWED" | "BROKEN" }) {
  return <Badge tone={status === "FOLLOWED" ? "pos" : "neg"}>{status === "FOLLOWED" ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}{status}</Badge>;
}
export function SideBadge({ side }: { side: "LONG" | "SHORT" }) {
  return <span className={cn("inline-flex items-center px-1.5 h-[18px] rounded-[4px] text-[10.5px] font-semibold tracking-wide mono", side === "LONG" ? "bg-accent-soft text-accent" : "bg-surface-2 border border-border text-fg-2")}>{side}</span>;
}
export function Num({ v, format, className }: { v: number | null | undefined; format: (n: number | null | undefined) => string; className?: string }) {
  return <span className={cn("num", signClass(v), className)}>{format(v)}</span>;
}

// ---------- Tooltip ----------
export function Tooltip({ text, children, side = "top" }: { text: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" }) {
  const [open, setOpen] = useState(false); const id = useId();
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} tabIndex={0} aria-describedby={id}>
      {children}
      {open && <span role="tooltip" id={id} className={cn("absolute z-50 left-1/2 -translate-x-1/2 w-max max-w-[240px] px-2.5 py-1.5 rounded-[6px] text-[11px] leading-snug font-normal normal-case tracking-normal text-fg bg-surface border border-border-strong shadow-lg anim-fade pointer-events-none", side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5")}>{text}</span>}
    </span>
  );
}

// ---------- Panel ----------
export function Panel({ title, subtitle, actions, children, className, bodyClassName, hint }: { title?: React.ReactNode; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; hint?: string }) {
  return (
    <section className={cn("panel flex flex-col min-w-0", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
          <div className="min-w-0">
            <h3 className="panel-title flex items-center gap-1.5">{title}{hint && <Tooltip text={hint}><Info size={11} className="text-fg-3" /></Tooltip>}</h3>
            {subtitle && <p className="text-[11.5px] text-fg-3 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn("px-4 pb-4 min-w-0", !title && "pt-4", bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------- Metric card ----------
export function Metric({ label, value, sub, tone, hint, size = "md", className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: number | null; hint?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="label flex items-center gap-1 truncate">{label}{hint && <Tooltip text={hint}><Info size={11} className="text-fg-3" /></Tooltip>}</div>
      <div className={cn("num font-medium mt-1 leading-none truncate", size === "lg" ? "text-[26px]" : size === "md" ? "text-[18px]" : "text-[14px]", tone != null ? signClass(tone) : "text-fg")}>{value}</div>
      {sub && <div className="text-[11px] text-fg-3 mt-1.5 truncate">{sub}</div>}
    </div>
  );
}
export function StatRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: number | null }) {
  return <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0 gap-3"><span className="text-[12px] text-fg-2">{label}</span><span className={cn("num text-[12.5px]", tone != null ? signClass(tone) : "text-fg")}>{value}</span></div>;
}

// ---------- Drawer ----------
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-[640px]", header }: { open: boolean; onClose: () => void; title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string; header?: React.ReactNode }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; }; }, [open, onClose]);
  if (!open) return null;
  
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:flex-row md:justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 anim-fade" onClick={onClose} />
      {/* Mobile: full-screen bottom sheet | Desktop: right-side panel */}
      <div className={cn(
        "relative w-full bg-surface flex flex-col shadow-2xl",
        "md:h-full md:border-l md:border-border md:anim-slide-right",
        "h-[94dvh] rounded-t-[16px] border-t border-border anim-slide-up-full",
        "md:rounded-none md:border-t-0",
        width
      )}>
        {/* Mobile drag handle */}
        <div className="flex justify-center py-2 md:hidden shrink-0">
          <div className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-start justify-between gap-3 px-4 md:px-5 py-3 md:py-4 border-b border-border shrink-0">
          {header ?? <div><h2 className="text-[15px] font-semibold">{title}</h2>{subtitle && <p className="text-[12px] text-fg-3 mt-0.5">{subtitle}</p>}</div>}
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-4 md:px-5 py-3 bg-surface flex items-center justify-end gap-2 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-[520px]" }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; }; }, [open, onClose]);
  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs anim-fade" onClick={onClose} />
      <div className={cn("relative w-full bg-surface border border-border shadow-2xl max-h-[90vh] flex flex-col my-auto z-10", "rounded-t-[16px] sm:rounded-2xl anim-slide-up-full sm:anim-pop", width)}>
        {/* Mobile drag handle */}
        <div className="flex justify-center py-2 sm:hidden shrink-0"><div className="h-1 w-10 rounded-full bg-border-strong" /></div>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border shrink-0">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-120px)]">{children}</div>
        {footer && <div className="px-4 sm:px-5 py-3 border-t border-border flex justify-end gap-2 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-3 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---------- Popover / Menu ----------
export function Popover({ trigger, children, align = "left", className }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; className?: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", h); window.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); }; }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && <div className={cn("absolute top-full mt-1.5 z-50 min-w-[200px] bg-surface border border-border-strong rounded-[8px] shadow-xl p-1.5 anim-pop", align === "right" ? "right-0" : "left-0", className)}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
export function MenuItem({ children, onClick, danger, icon: Icon }: { children: React.ReactNode; onClick?: () => void; danger?: boolean; icon?: React.ComponentType<{ size?: number }> }) {
  return <button onClick={onClick} className={cn("w-full flex items-center gap-2 px-2.5 h-8 rounded-[5px] text-[12.5px] text-left hover:bg-surface-hover transition-colors", danger ? "text-neg" : "text-fg")}>{Icon && <Icon size={14} />}{children}</button>;
}
export function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Popover trigger={<button className={cn("inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[12px] transition-colors", value.length ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface-2 text-fg-2 hover:text-fg")}>{label}{value.length > 0 && <span className="mono text-[10.5px]">{value.length}</span>}<ChevronDown size={12} /></button>}>
      {() => (
        <div className="max-h-[260px] overflow-y-auto">
          {options.length === 0 && <div className="px-2 py-2 text-[12px] text-fg-3">No options</div>}
          {options.map(o => <div key={o} className="px-2 h-8 flex items-center rounded-[5px] hover:bg-surface-hover"><Checkbox checked={value.includes(o)} onChange={b => onChange(b ? [...value, o] : value.filter(x => x !== o))} label={o} /></div>)}
          {value.length > 0 && <button onClick={() => onChange([])} className="w-full mt-1 text-[11.5px] text-fg-3 hover:text-fg h-7">Clear</button>}
        </div>
      )}
    </Popover>
  );
}

// ---------- Empty / Skeleton ----------
export function EmptyState({ title, body, action, icon: Icon }: { title: string; body?: string; action?: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && <div className="h-10 w-10 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center mb-3"><Icon size={18} className="text-fg-3" /></div>}
      <h4 className="text-[13.5px] font-medium">{title}</h4>
      {body && <p className="text-[12px] text-fg-3 mt-1 max-w-[320px]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) { return <div className={cn("skeleton h-4 w-full", className)} />; }

// ---------- Toasts & Confirm ----------
export function ToastSystem() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-5 right-4 z-[90] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 bg-surface border border-border-strong shadow-xl rounded-[8px] px-3.5 h-10 text-[12.5px] anim-slide-up min-w-[220px]">
          {t.kind === "error" ? <AlertTriangle size={14} className="text-neg" /> : <Check size={14} className="text-pos" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-fg-3 hover:text-fg" aria-label="Dismiss"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}
export function ConfirmDialog() {
  const { confirm, closeConfirm } = useStore();
  if (!confirm) return null;
  return (
    <Modal open onClose={closeConfirm} title={confirm.title} width="max-w-[400px]" footer={<><Button variant="ghost" onClick={closeConfirm}>Cancel</Button><Button variant={confirm.danger ? "danger" : "primary"} onClick={() => { confirm.onConfirm(); closeConfirm(); }}>{confirm.confirmLabel ?? "Confirm"}</Button></>}>
      <p className="text-[13px] text-fg-2">{confirm.body ?? "This action cannot be undone."}</p>
    </Modal>
  );
}
export function SampleWarning({ n, min }: { n: number; min: number }) {
  if (n >= min) return null;
  return <span className="inline-flex items-center gap-1 text-[10.5px] text-warn"><AlertTriangle size={10} />{n < Math.max(5, min / 3) ? "Limited sample" : "Small sample — interpret cautiously"}</span>;
}
