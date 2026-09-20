import { useState, useEffect, useRef } from "react";
import { LogIn, UserPlus, Lock, Mail, User as UserIcon, X, Sparkles, Shield, Eye, EyeOff } from "lucide-react";
import { useStore } from "../store";
import { Button, Input, Field } from "./ui";

export function AuthModal() {
  const { authModalOpen, closeAuthModal, login, register, loginWithGoogle, toast } = useStore();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services (GIS) on mount / modal open
  useEffect(() => {
    if (!authModalOpen) return;

    const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (typeof window !== "undefined" && (window as any).google?.accounts?.id && googleClientId && googleBtnRef.current) {
      try {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              setGoogleLoading(true);
              await loginWithGoogle({ credential: response.credential });
              toast("Signed in with Google successfully!", "success");
              closeAuthModal();
            } catch (err: any) {
              setError(err.message || "Google authentication failed.");
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      } catch (err) {
        console.warn("GIS render error:", err);
      }
    }
  }, [authModalOpen, loginWithGoogle, closeAuthModal, toast]);

  if (!authModalOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

      // If Google Identity Services library is loaded and client ID exists, trigger GIS prompt
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id && googleClientId) {
        const google = (window as any).google;
        google.accounts.id.prompt();
        return;
      }

      // If user typed an email, use it directly
      let googleEmail = email.trim();
      let googleName = name.trim();

      if (!googleEmail) {
        setError("Please enter your email address in the field below to continue with Google.");
        setGoogleLoading(false);
        return;
      }

      if (!googleName) {
        googleName = googleEmail.split("@")[0];
      }

      await loginWithGoogle({
        email: googleEmail,
        name: googleName,
        googleId: `goog_${Date.now()}`,
      });

      toast(`Signed in as ${googleEmail}!`, "success");
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "signup") {
        if (!name.trim()) throw new Error("Please enter your name.");
        if (!email.trim()) throw new Error("Please enter your email.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await register(name, email, password);
        toast(`Welcome to EDGELOG, ${name}! Your account is ready.`, "success");
      } else {
        if (!email.trim() || !password) throw new Error("Please enter your email and password.");
        await login(email, password);
        toast("Welcome back! Logged in successfully.", "success");
      }
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade">
      <div className="relative w-full max-w-[420px] rounded-2xl bg-surface border border-border/80 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent via-cyan-400 to-accent" />

        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/25 text-accent flex items-center justify-center mb-3">
            <Shield size={24} />
          </div>
          <h2 className="text-lg font-bold text-fg">
            {tab === "login" ? "Sign in to EDGELOG" : "Create your Account"}
          </h2>
          <p className="text-xs text-fg-3 mt-1">
            {tab === "login"
              ? "Access your private trading portfolios & cashbook"
              : "Start tracking trades and finances with institutional edge"}
          </p>
        </div>

        {/* Native Google GIS button target or fallback */}
        <div className="flex flex-col items-center justify-center mb-1">
          <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden mb-2" />
          
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-surface-2 hover:bg-surface-hover hover:border-border-strong text-fg text-xs font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-semibold">
            <span className="bg-surface px-2 text-fg-3">Or continue with email</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-lg mb-4 border border-border/60">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === "login"
                ? "bg-surface text-fg shadow-sm border border-border/50"
                : "text-fg-3 hover:text-fg"
            }`}
          >
            <LogIn size={13} /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === "signup"
                ? "bg-surface text-fg shadow-sm border border-border/50"
                : "text-fg-3 hover:text-fg"
            }`}
          >
            <UserPlus size={13} /> Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-neg/10 border border-neg/30 text-neg text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "signup" && (
            <Field label="Full Name">
              <div className="relative flex items-center">
                <UserIcon size={15} className="absolute left-3 text-fg-3 pointer-events-none z-10" />
                <Input
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="!pl-9.5"
                  required
                />
              </div>
            </Field>
          )}

          <Field label="Email Address">
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3 text-fg-3 pointer-events-none z-10" />
              <Input
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!pl-9.5"
                required
              />
            </div>
          </Field>

          <Field label="Password" hint={tab === "signup" ? "Min. 6 characters" : undefined}>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3 text-fg-3 pointer-events-none z-10" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!pl-9.5 !pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 p-1 rounded-md text-fg-3 hover:text-fg hover:bg-surface-hover transition-colors z-10"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 py-2 text-xs font-semibold shadow-md"
            disabled={loading || googleLoading}
          >
            {loading ? (
              "Processing..."
            ) : tab === "login" ? (
              "Sign In to Vault"
            ) : (
              "Create Account & Portfolios"
            )}
          </Button>
        </form>

        {/* Guest Demo note */}
        <div className="mt-4 pt-3 border-t border-border/60 text-center">
          <button
            type="button"
            onClick={closeAuthModal}
            className="text-[11px] text-fg-3 hover:text-accent transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <Sparkles size={12} /> Continue as Guest Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}
