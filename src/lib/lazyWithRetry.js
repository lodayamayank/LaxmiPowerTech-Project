// src/lib/lazyWithRetry.js
// React.lazy remembers a failed import forever, so an ErrorBoundary reset alone would just throw the same error
// again. This wrapper behaves like lazy(), but a failed component can be re-created (resetFailedLazyComponents)
// and imported again, which is what the "Try again" button does.
import { createElement, lazy } from 'react';

const failed = new Set();

export function lazyWithRetry(factory) {
  const load = () =>
    factory().catch((error) => {
      failed.add(reset);
      throw error;
    });
  let Inner = lazy(load);
  const reset = () => {
    failed.delete(reset);
    Inner = lazy(load);
  };
  const LazyPage = (props) => createElement(Inner, props);
  return LazyPage;
}

/** Re-create every lazy component whose import failed, so the next render imports it again. */
export function resetFailedLazyComponents() {
  [...failed].forEach((reset) => reset());
}
