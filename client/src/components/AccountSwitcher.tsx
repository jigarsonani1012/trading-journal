import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check, Briefcase, Trash2, Edit3, Shield, Globe } from "lucide-react";
import { useStore } from "../store";
import { Button, Modal, Field, Input, Select } from "./ui";
import type { TradingAccount } from "../types";

export function AccountSwitcher() {
  const {
    accounts,
    activeAccount,
    selectAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    toast,
    askConfirm,
    isAllAccountsMode,
    toggleAllAccountsMode,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<TradingAccount | null>(null);

  // Form states for creating / editing account
  const [name, setName] = useState("");
  const [broker, setBroker] = useState("");
  const [currency, setCurrency] = useState<"USD" | "INR" | "EUR" | "GBP">("USD");
  const [balance, setBalance] = useState("25000");
  const [riskPercent, setRiskPercent] = useState("1.0");
  const [color, setColor] = useState("#3b82f6");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingAcc(null);
    setName("");
    setBroker("");
    setCurrency("USD");
    setBalance("25000");
    setRiskPercent("1.0");
    setColor("#3b82f6");
    setOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (acc: TradingAccount) => {
    setEditingAcc(acc);
    setName(acc.name);
    setBroker(acc.broker || "");
    setCurrency(acc.currency);
    setBalance(String(acc.startingBalance));
    setRiskPercent(String(acc.defaultRiskPercent));
    setColor(acc.color || "#3b82f6");
    setOpen(false);
    setModalOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      toast("Please enter an account name.", "error");
      return;
    }

    try {
      if (editingAcc) {
        await updateAccount(editingAcc._id, {
          name: name.trim(),
          broker,
          currency,
          startingBalance: parseFloat(balance) || 0,
          defaultRiskPercent: parseFloat(riskPercent) || 1.0,
          color,
        });
        toast("Portfolio updated successfully.", "success");
      } else {
        await createAccount({
          name: name.trim(),
          broker,
          currency,
          startingBalance: parseFloat(balance) || 0,
          defaultRiskPercent: parseFloat(riskPercent) || 1.0,
          color,
        });
        toast(`Portfolio "${name}" created!`, "success");
      }
      setModalOpen(false);
    } catch (e: any) {
      toast(e.message || "Failed to save portfolio.", "error");
    }
  };

  const handleDelete = (acc: TradingAccount) => {
    if (accounts.length <= 1) {
      toast("You cannot delete your only trading account.", "error");
      return;
    }

    askConfirm({
      title: `Delete portfolio "${acc.name}"?`,
      body: "This will permanently remove this account and all associated trades. This action cannot be undone.",
      confirmLabel: "Delete Portfolio",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteAccount(acc._id);
          toast("Portfolio deleted.", "success");
        } catch (e: any) {
          toast(e.message || "Failed to delete portfolio.", "error");
        }
      },
    });
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 sm:gap-2 h-8 px-2 sm:px-2.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-hover hover:border-border-strong text-fg text-xs font-medium transition-all shadow-xs shrink-0"
      >
        {isAllAccountsMode ? (
          <>
            <Globe size={13} className="text-accent shrink-0" />
            <span className="max-w-[85px] sm:max-w-[130px] truncate">All Portfolios</span>
          </>
        ) : (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-border"
              style={{ backgroundColor: activeAccount?.color || "#3b82f6" }}
            />
            <span className="max-w-[85px] sm:max-w-[130px] truncate">{activeAccount?.name || "Primary Account"}</span>
          </>
        )}
        <ChevronDown size={12} className={`text-fg-3 transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-64 rounded-xl bg-surface border border-border shadow-xl z-50 p-1.5 anim-fade">
          <div className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-3 border-b border-border/60">
            Trading Portfolios ({accounts.length})
          </div>

          <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
            {/* All Accounts combined option */}
            <button
              onClick={() => {
                toggleAllAccountsMode(true);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                isAllAccountsMode ? "bg-accent/15 text-accent font-semibold" : "text-fg-2 hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-accent" />
                <span>All Accounts (Combined)</span>
              </div>
              {isAllAccountsMode && <Check size={13} />}
            </button>

            {/* Individual Accounts */}
            {accounts.map((acc) => {
              const isSelected = !isAllAccountsMode && activeAccount?._id === acc._id;
              return (
                <div
                  key={acc._id}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                    isSelected ? "bg-surface-2 text-fg font-semibold" : "text-fg-2 hover:bg-surface-hover hover:text-fg"
                  }`}
                >
                  <button
                    onClick={() => {
                      toggleAllAccountsMode(false);
                      selectAccount(acc._id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || "#3b82f6" }}
                    />
                    <div className="truncate">
                      <div className="truncate">{acc.name}</div>
                      <div className="text-[10px] text-fg-3 font-mono font-normal">
                        {acc.currency} · ${(acc.startingBalance).toLocaleString()}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(acc);
                      }}
                      className="p-1 rounded hover:bg-surface text-fg-3 hover:text-fg"
                      title="Edit Account"
                    >
                      <Edit3 size={11} />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(acc);
                        }}
                        className="p-1 rounded hover:bg-neg/10 text-fg-3 hover:text-neg"
                        title="Delete Account"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {isSelected && <Check size={12} className="text-accent ml-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1 mt-1 border-t border-border/60">
            <button
              onClick={openCreateModal}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              <Plus size={13} />
              <span>Create New Portfolio</span>
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Portfolio Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAcc ? "Edit Trading Portfolio" : "Create New Trading Portfolio"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAccount}>
              {editingAcc ? "Save Changes" : "Create Portfolio"}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Portfolio Name" hint="e.g. Apex 50k Prop Firm, Binance Scalping, Zerodha Swing">
            <Input
              placeholder="e.g. TopStep 100k Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Broker / Platform (Optional)">
              <Input
                placeholder="e.g. Tradovate / MT5"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
              />
            </Field>

            <Field label="Base Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting Balance" hint="Base capital for equity curves">
              <Input
                mono
                type="number"
                placeholder="50000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </Field>

            <Field label="Default Risk % per Trade" hint="Recommended 0.5% - 2%">
              <Input
                mono
                type="number"
                step="0.1"
                placeholder="1.0"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Color Tag (For Visual Identification)">
            <div className="flex items-center gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
