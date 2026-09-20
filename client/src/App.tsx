import { StoreProvider, useStore } from "./store";
import { AppShell, CommandPalette, GlobalSearch, Logo } from "./components/AppShell";
import { ToastSystem, ConfirmDialog } from "./components/ui";
import { TradeDrawer } from "./components/TradeDrawer";
import { TradeForm } from "./components/TradeForm";
import { AuthModal } from "./components/AuthModal";
import { Overview } from "./pages/Overview";
import { Trades } from "./pages/Trades";
import { Rules } from "./pages/Rules";
import { Analytics } from "./pages/Analytics";
import { Edge } from "./pages/Edge";
import { Journal } from "./pages/Journal";
import { Cashbook } from "./pages/Cashbook";
import { DataWorkspace } from "./pages/Data";
import { ErrorBoundary } from "./components/ErrorBoundary";

function Loading() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-bg text-fg anim-fade select-none">
      <div className="scale-125 mb-4">
        <Logo />
      </div>
      <div className="mt-6 h-[2px] w-36 bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full w-full bg-accent animate-pulse" />
      </div>
      <p className="mt-4 text-[11.5px] text-fg-3 font-mono">Process before outcome.</p>
    </div>
  );
}

function Router() {
  const { page, ready, formState } = useStore();
  if (!ready) return <Loading />;
  return (
    <ErrorBoundary fallbackTitle="Application Shell Error">
      <AppShell>
        <ErrorBoundary fallbackTitle="Page Error">
          {page === "overview" && <Overview />}
          {page === "trades" && <Trades />}
          {page === "rules" && <Rules />}
          {page === "analytics" && <Analytics />}
          {page === "edge" && <Edge />}
          {page === "journal" && <Journal />}
          {page === "cashbook" && <Cashbook />}
          {page === "data" && <DataWorkspace />}
        </ErrorBoundary>
      </AppShell>
      <TradeDrawer />
      {formState.open && <TradeForm />}
      <AuthModal />
      <CommandPalette />
      <GlobalSearch />
      <ConfirmDialog />
      <ToastSystem />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
