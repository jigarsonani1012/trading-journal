let currencyCode = "USD";
export function setCurrency(c: string) { currencyCode = c; }
export function getCurrency() { return currencyCode; }

const symbols: Record<string, string> = { USD: "$", INR: "₹", EUR: "€", GBP: "£" };

export function fmtMoney(v: number | null | undefined, opts: { sign?: boolean; compact?: boolean; decimals?: number } = {}) {
  if (v == null || !isFinite(v)) return "—";
  const sym = symbols[currencyCode] ?? currencyCode + " ";
  const abs = Math.abs(v);
  let body: string;
  if (opts.compact && abs >= 100000) body = (abs / 1000).toFixed(1) + "k";
  else body = abs.toLocaleString("en-US", { minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 });
  const sign = v < 0 ? "−" : opts.sign && v > 0 ? "+" : "";
  return `${sign}${sym}${body}`;
}

export function fmtR(v: number | null | undefined, decimals = 2) {
  if (v == null || !isFinite(v)) return "—";
  const sign = v < 0 ? "−" : v > 0 ? "+" : "";
  return `${sign}${Math.abs(v).toFixed(decimals)}R`;
}

export function fmtPct(v: number | null | undefined, decimals = 1, sign = false) {
  if (v == null || !isFinite(v)) return "—";
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${s}${Math.abs(v).toFixed(decimals)}%`;
}

export function fmtNum(v: number | null | undefined, decimals = 2) {
  if (v == null || !isFinite(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPrice(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  const d = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 10 ? 2 : Math.abs(v) >= 1 ? 4 : 5;
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPF(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return v.toFixed(2);
}

export function fmtDuration(mins: number | null | undefined) {
  if (mins == null || !isFinite(mins)) return "—";
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return r ? `${h}h ${r}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDate(iso: string | Date, format: string = "DD MMM YYYY") {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0"), mm = String(d.getMonth() + 1).padStart(2, "0"), yyyy = d.getFullYear();
  if (format === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (format === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  return `${dd} ${MONTHS[d.getMonth()]} ${yyyy}`;
}
export function fmtDateShort(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}
export function fmtTime(iso: string | Date, format: string = "24h") {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  if (format === "12h") return `${((h + 11) % 12) + 1}:${m} ${h >= 12 ? "PM" : "AM"}`;
  return `${String(h).padStart(2, "0")}:${m}`;
}
export function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDateShort(iso);
}
export function dayKey(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function uid(prefix = "t") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
export function signClass(v: number | null | undefined) {
  if (v == null || !isFinite(v) || v === 0) return "text-fg-2";
  return v > 0 ? "text-pos" : "text-neg";
}
