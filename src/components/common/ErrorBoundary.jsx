import React from "react";
import { ErrorFallback } from "@/components/common/ErrorFallback";
import { isChunkLoadError, newErrorId, reloadOnceForChunkError } from "@/lib/recovery";
import { resetFailedLazyComponents } from "@/lib/lazyWithRetry";

/**
 * ErrorBoundary: catches errors thrown while rendering its children (and while their lazy code loads) and shows a
 * recovery screen instead of letting React unmount the whole app into a blank page.
 *
 * Props:
 * - variant {"page"|"section"} default "section": size of the default fallback (see ErrorFallback)
 * - scope {string}: name used in the console log, e.g. "route" or "camera"
 * - resetKeys {any[]}: when any value changes the error is cleared (pass the pathname so leaving a broken page works)
 * - fallback {({ error, errorId, kind, reset, retryCount }) => node}: custom fallback for a small feature
 * - autoReloadChunks {boolean}: after a code-loading failure, reload once automatically (never twice in a minute)
 * - onReset {() => void}: called when "Try again" is pressed (e.g. to clean up the failed feature)
 *
 * "Try again" clears the error and renders the children again; for a failed lazy page it first re-creates the lazy
 * component so the import really runs again.
 */
export class ErrorBoundary extends React.Component {
  state = { error: null, errorId: null, retryCount: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const errorId = newErrorId();
    this.setState({ errorId });
    // The details go to the console for developers only; users only ever see the reference.
    console.error(`[${this.props.scope || "app"}] ${errorId}`, error, info?.componentStack);
    if (this.props.autoReloadChunks && isChunkLoadError(error)) reloadOnceForChunkError();
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    if (this.state.error && resetKeys && prevProps.resetKeys && resetKeys.some((k, i) => !Object.is(k, prevProps.resetKeys[i]))) {
      this.setState({ error: null, errorId: null, retryCount: 0 });
    }
  }

  reset = () => {
    if (isChunkLoadError(this.state.error)) resetFailedLazyComponents();
    this.props.onReset?.();
    this.setState((s) => ({ error: null, errorId: null, retryCount: s.retryCount + 1 }));
  };

  render() {
    const { error, errorId, retryCount } = this.state;
    if (!error) return this.props.children;
    const kind = isChunkLoadError(error) ? "chunk" : "render";
    if (this.props.fallback) return this.props.fallback({ error, errorId, kind, reset: this.reset, retryCount });
    return <ErrorFallback variant={this.props.variant || "section"} kind={kind} errorId={errorId} retryCount={retryCount} onRetry={this.reset} />;
  }
}

export default ErrorBoundary;
