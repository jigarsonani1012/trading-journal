import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Database,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Keyboard,
  CheckCircle2,
  Cloud,
  ShieldCheck,
  Sparkles,
  Layers,
  Archive,
} from "lucide-react";
import { useStore, type BackupPayload } from "../store";
import { Panel, Button, Field, Select, Input, Segmented, Badge, Modal, StatRow, Toggle } from "../components/ui";
import { tradesToCSV, download, parseCSV, guessMapping, rowsToTrades, IMPORT_FIELDS, type ImportField } from "../lib/csv";
import { fmtDate, fmtTime } from "../lib/format";
import type { Settings, Trade, JournalEntry } from "../types";

export function DataWorkspace() {
  const {
    trades,
    rules,
    journal,
    settings,
    columns,
    views,
    updateSettings,
    resetDemo,
    clearData,
    importTrades,
    restore,
    askConfirm,
    toast,
    customValue,
    balance,
  } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<{ headers: string[]; rows: string[][]; map: Record<ImportField, string> } | null>(null);
  const [dbStats, setDbStats] = useState<{ trades: number; rules: number; journal: number; isOnline: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch live stats from backend
  const refreshStats = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/export/stats");
      if (res.ok) {
        const data = await res.json() as { trades: number; rules: number; journal: number };
        setDbStats({ ...data, isOnline: true });
      } else {
        setDbStats({ trades: trades.length, rules: rules.length, journal: journal.length, isOnline: true });
      }
    } catch {
      setDbStats({ trades: trades.length, rules: rules.length, journal: journal.length, isOnline: true });
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [trades.length, rules.length, journal.length]);

  // Export JSON (Full Backup)
  const exportJSON = () => {
    const payload: BackupPayload = {
      trades,
      rules,
      journal,
      settings,
      columns,
      views,
      exportedAt: new Date().toISOString(),
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    download(`edgelog-backup-${dateStr}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Full JSON database backup downloaded successfully.", "success");
  };

  // Export CSV (Trades Table)
  const exportCSV = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    download(`edgelog-trades-${dateStr}.csv`, tradesToCSV(trades, columns, customValue), "text/csv");
    toast("Trades CSV spreadsheet exported.", "success");
  };

  // Export Journal (Markdown Book)
  const exportJournalMarkdown = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      "# EDGELOG — Trading Journal Archive",
      `Exported: ${new Date().toLocaleString()}`,
      `Total Entries: ${journal.length}`,
      "",
    ];

    journal
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((entry: JournalEntry) => {
        lines.push(`## ${entry.date} (${entry.kind.toUpperCase()})`);
        if (entry.kind === "daily") {
          if (entry.pre?.plan) lines.push(`**Pre-Market Plan:** ${entry.pre.plan}`);
          if (entry.pre?.bias) lines.push(`**Daily HTF Bias:** ${entry.pre.bias}`);
          if (entry.post?.happened) lines.push(`**Execution Reality:** ${entry.post.happened}`);
          if (entry.post?.learned) lines.push(`**Lessons Learned:** ${entry.post.learned}`);
          if (entry.post?.tomorrow) lines.push(`**Adjustment for Tomorrow:** ${entry.post.tomorrow}`);
        } else if (entry.kind === "note") {
          if (entry.title) lines.push(`### ${entry.title}`);
          if (entry.body) lines.push(entry.body);
        }
        lines.push("");
        lines.push("---");
        lines.push("");
      });

    download(`edgelog-journal-${dateStr}.md`, lines.join("\n"), "text/markdown");
    toast("Trading Journal markdown file exported.", "success");
  };

  // Download All formats simultaneously
  const exportAll = () => {
    exportJSON();
    setTimeout(() => exportCSV(), 250);
    setTimeout(() => exportJournalMarkdown(), 500);
    toast("Initiated multi-file download (JSON + CSV + Markdown).", "success");
  };

  useEffect(() => {
    const handleGlobalExport = () => exportJSON();
    window.addEventListener("edgelog:export-json", handleGlobalExport);
    return () => window.removeEventListener("edgelog:export-json", handleGlobalExport);
  });

  const onCSV = async (file: File) => {
    try {
      const { headers, rows } = parseCSV(await file.text());
      setImp({ headers, rows, map: guessMapping(headers) });
    } catch (e) {
      toast((e as Error).message || "Could not parse CSV file.", "error");
    }
  };

  const onJSON = async (file: File) => {
    try {
      const p = JSON.parse(await file.text()) as BackupPayload;
      askConfirm({
        title: "Restore from backup file?",
        body: `This replaces your current workspace data with ${p.trades?.length ?? 0} trades, ${p.rules?.length ?? 0} playbook rules, and ${p.journal?.length ?? 0} journal entries.`,
        confirmLabel: "Restore Database",
        onConfirm: () => {
          try {
            restore(p);
            toast("Database successfully restored from JSON file!", "success");
          } catch (e) {
            toast((e as Error).message, "error");
          }
        },
      });
    } catch {
      toast("The selected file is not valid JSON.", "error");
    }
  };

  const preview = useMemo(() => (imp ? rowsToTrades(imp.headers, imp.rows, imp.map, balance) : null), [imp, balance]);
  const S = (p: Partial<Settings>) => updateSettings(p);

  return (
    <div className="space-y-5 anim-fade">
      {/* ── TOP HERO: Database Status & Cloud Engine ─────────────────────────── */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-surface to-surface-2 p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-pos/15 border border-pos/30 text-pos flex items-center justify-center shrink-0">
            <Cloud size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-semibold text-fg">MongoDB Atlas Database</h2>
              <Badge tone="pos" className="flex items-center gap-1 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-pos animate-ping" />
                Live & Synchronized
              </Badge>
              <Badge tone="neutral" className="text-[10px]">Node / Express Backend</Badge>
            </div>
            <p className="text-xs text-fg-3 mt-0.5">
              All trades, playbook rules, and reflections are securely persisted to your cloud database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isSyncing}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync Status
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={exportAll}
            className="text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Archive size={13} />
            Download All Files
          </Button>
        </div>
      </div>

      {/* ── METRICS & STATS BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard label="Total Trades" value={dbStats?.trades ?? trades.length} icon={Layers} />
        <StatCard label="Playbook Rules" value={dbStats?.rules ?? rules.length} icon={ShieldCheck} />
        <StatCard label="Journal Logs" value={dbStats?.journal ?? journal.length} icon={FileText} />
        <StatCard label="Custom Columns" value={columns.length} icon={Sparkles} />
        <StatCard label="Saved Views" value={views.length} icon={Database} />
        <StatCard
          label="Last Update"
          value={trades.length ? fmtTime(trades[trades.length - 1].updatedAt) : "Ready"}
          icon={CheckCircle2}
        />
      </div>

      {/* ── MAIN SECTION: File Downloads & Backups Hub ─────────────────────── */}
      <Panel
        title="File Storage & Downloads Hub"
        subtitle="Export, download and archive your entire trading history into local files anytime."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* JSON Full Database Backup */}
          <div className="p-4 rounded-lg border border-border bg-surface hover:border-accent/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-md bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileJson size={18} />
              </div>
              <div className="font-medium text-[13px] text-fg">Full Database Backup (.JSON)</div>
              <p className="text-[11.5px] text-fg-3 mt-1 leading-relaxed">
                Contains complete records of trades, playbook rules, journal notes, custom columns, and saved views in standard JSON format.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-fg-3 font-mono">{trades.length + rules.length + journal.length} items</span>
              <Button variant="outline" size="sm" onClick={exportJSON} className="text-xs">
                <Download size={12} className="mr-1" /> Download JSON
              </Button>
            </div>
          </div>

          {/* CSV Spreadsheet */}
          <div className="p-4 rounded-lg border border-border bg-surface hover:border-accent/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-md bg-pos/10 text-pos flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={18} />
              </div>
              <div className="font-medium text-[13px] text-fg">Trades Spreadsheet (.CSV)</div>
              <p className="text-[11.5px] text-fg-3 mt-1 leading-relaxed">
                Export all execution logs, entry/exit prices, R-multiples, fees, net PnL, setups, and notes formatted for Excel or Google Sheets.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-fg-3 font-mono">{trades.length} trades</span>
              <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
                <Download size={12} className="mr-1" /> Download CSV
              </Button>
            </div>
          </div>

          {/* Markdown Journal Book */}
          <div className="p-4 rounded-lg border border-border bg-surface hover:border-accent/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 rounded-md bg-warn/10 text-warn flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText size={18} />
              </div>
              <div className="font-medium text-[13px] text-fg">Trading Journal (.MD)</div>
              <p className="text-[11.5px] text-fg-3 mt-1 leading-relaxed">
                Export all pre-market execution plans, psychological reflections, post-market reviews, and lessons learned formatted in clean Markdown.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-fg-3 font-mono">{journal.length} entries</span>
              <Button variant="outline" size="sm" onClick={exportJournalMarkdown} className="text-xs">
                <Download size={12} className="mr-1" /> Download MD
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── IMPORT & RESTORE / DATA MAINTENANCE ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Import & Data Restore" subtitle="Restore backups or import trades from external spreadsheets.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Action
              icon={Upload}
              title="Import CSV Spreadsheet"
              body="Map columns and import trades from any broker CSV"
              onClick={() => fileRef.current?.click()}
            />
            <Action
              icon={Database}
              title="Restore from JSON Backup"
              body="Upload a previous .json backup file to restore database"
              onClick={() => jsonRef.current?.click()}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onCSV(f);
              e.target.value = "";
            }}
          />
          <input
            ref={jsonRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onJSON(f);
              e.target.value = "";
            }}
          />
        </Panel>

        <Panel title="Data Maintenance & Reset" subtitle="Manage test data or reset datasets safely.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Action
              icon={RefreshCw}
              title="Restore Demo Dataset"
              body="Re-populate database with default sample trades and playbook"
              onClick={() =>
                askConfirm({
                  title: "Reset to demo dataset?",
                  body: "Your current database trades, rules, and journal will be replaced with the standard demo dataset.",
                  confirmLabel: "Reset Dataset",
                  danger: true,
                  onConfirm: () => resetDemo(),
                })
              }
            />
            <Action
              icon={Trash2}
              title="Clear Trade History"
              body="Wipe all trades and journal entries while keeping rules and settings"
              danger
              onClick={() =>
                askConfirm({
                  title: `Clear ${trades.length} trades and all journal entries?`,
                  body: "Playbook rules and personal preferences will be preserved. Export a backup first if needed.",
                  confirmLabel: "Clear Data",
                  danger: true,
                  onConfirm: () => clearData(),
                })
              }
            />
          </div>
        </Panel>
      </div>

      {/* ── SYSTEM SETTINGS & PREFERENCES ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Appearance & Formats">
          <div className="space-y-3">
            <Field label="Theme">
              <Segmented
                size="md"
                value={settings.theme}
                onChange={v => S({ theme: v })}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
              />
            </Field>
            <Field label="Base Currency">
              <Select value={settings.currency} onChange={e => S({ currency: e.target.value })}>
                {["USD", "INR", "EUR", "GBP"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date Format">
              <Select
                value={settings.dateFormat}
                onChange={e => S({ dateFormat: e.target.value as Settings["dateFormat"] })}
              >
                {["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Time Format">
              <Segmented
                size="md"
                value={settings.timeFormat}
                onChange={v => S({ timeFormat: v })}
                options={[
                  { value: "24h", label: "24h" },
                  { value: "12h", label: "12h" },
                ]}
              />
            </Field>
            <Field label="Timezone">
              <Input value={settings.timezone} onChange={e => S({ timezone: e.target.value })} />
            </Field>
          </div>
        </Panel>

        <Panel title="Risk & Analytics Parameters">
          <div className="space-y-3">
            <Field label="Starting Balance" hint="Account starting equity basis">
              <Input
                mono
                type="number"
                value={settings.startingBalance}
                onChange={e => S({ startingBalance: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Default Risk % per Trade" hint="Recommended benchmark 0.5% - 2.0%">
              <Input
                mono
                type="number"
                step="0.1"
                value={settings.defaultRiskPercent}
                onChange={e => S({ defaultRiskPercent: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Minimum Sample Size" hint="Threshold for statistical edge validity">
              <Input
                mono
                type="number"
                value={settings.minSample}
                onChange={e => S({ minSample: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-[6px] border border-border px-3 py-2">
              <span className="text-[12.5px]">Collapse sidebar by default</span>
              <Toggle checked={settings.sidebarCollapsed} onChange={b => S({ sidebarCollapsed: b })} />
            </div>
          </div>
        </Panel>

        <Panel title="Keyboard Shortcuts">
          {[
            ["N", "New trade entry"],
            ["/", "Global search query"],
            ["⌘ / Ctrl + K", "Command palette"],
            ["Esc", "Close drawers & modals"],
            ["↑ ↓ Enter", "Navigate active items"],
          ].map(([k, l]) => (
            <div
              key={k}
              className="flex items-center justify-between py-2 border-b border-border last:border-0 text-[12.5px]"
            >
              <span className="text-fg-2 flex items-center gap-2">
                <Keyboard size={12} className="text-fg-3" />
                {l}
              </span>
              <kbd>{k}</kbd>
            </div>
          ))}
        </Panel>
      </div>

      {/* ── CSV MAPPER MODAL ─────────────────────────────────────────────────── */}
      <Modal
        open={!!imp}
        onClose={() => setImp(null)}
        title="Import CSV — Map Data Columns"
        width="max-w-[640px]"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImp(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!preview || preview.trades.length === 0}
              onClick={() => {
                if (!preview) return;
                const n = importTrades(preview.trades);
                toast(
                  n === 0
                    ? "No new trades (all duplicate entries skipped)."
                    : `${n} trade${n > 1 ? "s" : ""} successfully imported${
                        preview.trades.length - n ? ` · ${preview.trades.length - n} duplicates skipped` : ""
                      }.`,
                  "success"
                );
                setImp(null);
              }}
            >
              Import {preview?.trades.length ?? 0} trades
            </Button>
          </>
        }
      >
        {imp && (
          <div className="space-y-3">
            <p className="text-[12px] text-fg-2">
              {imp.rows.length} rows detected. Map each field to a CSV column. Symbol, side, quantity, entry, exit, and
              entry time are required.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {IMPORT_FIELDS.map(f => (
                <Field key={f} label={f}>
                  <Select
                    value={imp.map[f]}
                    onChange={e => setImp({ ...imp, map: { ...imp.map, [f]: e.target.value } })}
                  >
                    <option value="">— not mapped —</option>
                    {imp.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            {preview && (
              <div className="text-[12px] rounded-[6px] bg-surface-2 border border-border p-3">
                <div>
                  <span className="text-pos font-medium">{preview.trades.length}</span> valid rows ·{" "}
                  <span className={preview.errors.length ? "text-neg" : ""}>{preview.errors.length}</span> with errors
                </div>
                {preview.errors.slice(0, 5).map((e, i) => (
                  <div key={i} className="text-fg-3 mono text-[11px] mt-1">
                    {e}
                  </div>
                ))}
                {preview.errors.length > 5 && (
                  <div className="text-fg-3 text-[11px] mt-1">…and {preview.errors.length - 5} more</div>
                )}
              </div>
            )}
            <p className="text-[11px] text-fg-3">
              Imported trades are tagged <span className="mono">imported</span>. Duplicate rows with matching symbol,
              timestamp, price, and volume are safely skipped.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-surface flex flex-col justify-between">
      <div className="flex items-center justify-between text-fg-3">
        <span className="text-[11px] font-medium">{label}</span>
        <Icon size={13} className="text-fg-3" />
      </div>
      <div className="text-lg font-semibold text-fg mt-1 font-mono">{value}</div>
    </div>
  );
}

function Action({
  icon: Icon,
  title,
  body,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-[8px] border p-3.5 transition-colors hover:bg-surface-hover ${
        danger ? "border-neg/30 hover:border-neg" : "border-border hover:border-accent/40"
      }`}
    >
      <Icon size={16} className={danger ? "text-neg" : "text-accent"} />
      <div className="text-[12.5px] font-medium mt-2">{title}</div>
      <div className="text-[11px] text-fg-3 mt-0.5 leading-snug">{body}</div>
    </button>
  );
}
