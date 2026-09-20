import React, { useEffect, useState } from "react";
import {
  Download,
  Monitor,
  Smartphone,
  Check,
  Sparkles,
  X,
  Share,
  PlusSquare,
  Copy,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { Modal, Button } from "./ui";

interface PwaInstallModalProps {
  open: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export function PwaInstallModal({
  open,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}: PwaInstallModalProps) {
  const [platform, setPlatform] = useState<"desktop" | "ios" | "android">("desktop");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
        setPlatform("ios");
      } else if (/android/i.test(ua)) {
        setPlatform("android");
      } else {
        setPlatform("desktop");
      }
    }
  }, []);

  if (!open) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          onInstallSuccess();
          onClose();
        }
      } catch (err) {
        console.warn("PWA install error:", err);
      }
    }
  };

  const copyAppUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Download & Install EDGELOG" width="max-w-[500px]">
      <div className="space-y-4">
        {/* App Hero Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface-2/80 border border-border">
          <img
            src="/pwa-192x192.png"
            alt="EDGELOG App"
            className="w-14 h-14 rounded-2xl shadow-lg border border-border/80 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[15px] text-fg tracking-tight">EDGELOG OS</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent uppercase tracking-wider">
                PWA Application
              </span>
            </div>
            <p className="text-xs text-fg-3 mt-1 leading-relaxed">
              Fast, offline-ready standalone desktop & mobile trading workspace.
            </p>
          </div>
        </div>

        {/* Value Proposition Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-surface-2/50 border border-border/60 flex items-start gap-2">
            <Check size={14} className="text-pos shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-fg">Direct Launch</div>
              <div className="text-[11px] text-fg-3">Launches directly from dock/desktop</div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-2/50 border border-border/60 flex items-start gap-2">
            <Check size={14} className="text-pos shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-fg">Offline Cached</div>
              <div className="text-[11px] text-fg-3">Instant loading without delays</div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-2/50 border border-border/60 flex items-start gap-2">
            <Check size={14} className="text-pos shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-fg">Distraction-Free</div>
              <div className="text-[11px] text-fg-3">Native app window without browser tabs</div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-2/50 border border-border/60 flex items-start gap-2">
            <Check size={14} className="text-pos shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-fg">Live Cloud Sync</div>
              <div className="text-[11px] text-fg-3">Real-time sync to MongoDB vault</div>
            </div>
          </div>
        </div>

        {/* 1-Click Direct Install Button if Browser Supported */}
        {deferredPrompt && (
          <div className="pt-1">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent hover:brightness-110 text-white font-semibold text-xs shadow-lg transition-all active:scale-[0.99]"
            >
              <Download size={16} />
              <span>Click to Install EDGELOG App Directly</span>
            </button>
          </div>
        )}

        {/* Platform Instruction Switcher */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-fg">Installation Guide</span>
            <div className="flex gap-1 bg-surface-2 p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setPlatform("desktop")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  platform === "desktop"
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-3 hover:text-fg"
                }`}
              >
                <Laptop size={12} />
                Desktop
              </button>
              <button
                onClick={() => setPlatform("android")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  platform === "android"
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-3 hover:text-fg"
                }`}
              >
                <Smartphone size={12} />
                Android
              </button>
              <button
                onClick={() => setPlatform("ios")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  platform === "ios"
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-3 hover:text-fg"
                }`}
              >
                <Smartphone size={12} />
                iPhone / iPad
              </button>
            </div>
          </div>

          {platform === "desktop" && (
            <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-fg-2">
                  Look at the right side of your browser's address (URL) bar at the top.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-fg-2">
                  Click the <Download size={13} className="inline text-accent mx-0.5" /> <strong>Install EDGELOG</strong> icon (or Browser Menu ➜ "Install EDGELOG").
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-fg-2">
                  Click <strong>Install</strong> to add it to your Desktop, Dock, and Applications menu.
                </span>
              </div>
            </div>
          )}

          {platform === "android" && (
            <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-fg-2">
                  Tap the <strong>three dots (⋮)</strong> menu in Chrome at the top right.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-fg-2">
                  Select <Download size={13} className="inline text-accent mx-0.5" /> <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-fg-2">
                  The app will download and install with full offline and standalone features.
                </span>
              </div>
            </div>
          )}

          {platform === "ios" && (
            <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-fg-2">
                  Tap the <Share size={13} className="inline text-accent mx-0.5" /> <strong>Share</strong> button in Safari's bottom toolbar.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-fg-2">
                  Scroll down and tap <PlusSquare size={13} className="inline text-accent mx-0.5" /> <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-fg-2">
                  Tap <strong>Add</strong> at the top right to create a native icon on your home screen.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Direct Download Options */}
        <div className="p-3 rounded-lg bg-surface-2 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-fg">Direct Desktop Shortcut File</div>
              <div className="text-[11px] text-fg-3">Download a 1-click launcher file directly to your computer</div>
            </div>
            <button
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
                const content = `[InternetShortcut]\nURL=${origin}/\nIconIndex=0\nIconFile=${origin}/favicon.ico\n`;
                const blob = new Blob([content], { type: "application/internet-shortcut" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "EDGELOG.url";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-fg shadow-sm transition-all"
            >
              <Download size={13} className="text-accent" />
              Download .url
            </button>
          </div>
        </div>

        {/* Quick Share / Open in Mobile helper */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={copyAppUrl}
            className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg transition-colors"
          >
            {copied ? <Check size={13} className="text-pos" /> : <Copy size={13} />}
            <span>{copied ? "App URL Copied to Clipboard!" : "Copy App Link"}</span>
          </button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
