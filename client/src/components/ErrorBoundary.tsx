import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] p-6 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-lg m-4 anim-fade">
          <div className="w-12 h-12 rounded-full bg-neg/10 text-neg flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-semibold text-fg mb-1">
            {this.props.fallbackTitle || "Something went wrong in this section"}
          </h2>
          <p className="text-xs text-fg-3 max-w-md mb-4">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={this.handleReset}>
              <RefreshCw size={13} /> Reload Application
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
            >
              <Home size={13} /> Try Recovering
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
