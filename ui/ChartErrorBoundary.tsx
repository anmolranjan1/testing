import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

const DefaultFallback = () => (
  <div className="alert alert-warning small mb-0">
    <strong>Render error</strong> — this section could not be displayed. The
    saved data may be in an unexpected format.
  </div>
);

/**
 * Lightweight wrapper around react-error-boundary.
 * Prevents a single broken chart / card from crashing the entire page.
 */
export default function ChartErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback ?? <DefaultFallback />}
      onError={(error, info) =>
        console.error("[ChartErrorBoundary]", error, info.componentStack)
      }
    >
      {children}
    </ErrorBoundary>
  );
}
