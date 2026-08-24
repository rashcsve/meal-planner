import { Component, type ReactNode } from "react";
import { ErrorState } from "../shared/ui/ErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Uncaught render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-3.5">
          <ErrorState
            title="Something went wrong"
            message={this.state.error.message}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
