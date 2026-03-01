import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ─── Error State ──────────────────────────────────────────────────

export function ChartError({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="card">
      <div
        className="d-flex flex-column align-items-center justify-content-center text-center p-5"
        style={{ minHeight: "240px" }}
      >
        <AlertTriangle size={28} className="text-danger mb-3" />
        <p className="h6 mb-2">Could not load {title}</p>
        {message && <p className="text-muted small mb-1">{message}</p>}
        <p className="text-muted small">Try refreshing the page.</p>
      </div>
    </div>
  );
}

// ─── Fatal Error Message ──────────────────────────────────────────

export function ErrorMessage({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center py-5"
      style={{ minHeight: "360px" }}
    >
      <AlertTriangle
        size={32}
        className="text-muted mb-3"
        style={{ opacity: 0.35 }}
      />
      <h3 className="fw-600 mb-2">{title}</h3>
      {message && (
        <p className="text-muted" style={{ maxWidth: "340px" }}>
          {message}
        </p>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
export function ChartEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card">
      <div
        className="d-flex flex-column align-items-center justify-content-center text-center p-5 border-bottom border-2 border-dashed"
        style={{ minHeight: "240px" }}
      >
        <BarChart3 size={32} className="mb-3" style={{ opacity: 0.25 }} />
        <p className="h6">No data yet</p>
        <p className="text-muted small" style={{ maxWidth: "280px" }}>
          {hint ?? `${title} will appear here once data is available.`}
        </p>
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ───────────────────────────────────────────
export function ChartCard({
  title,
  subtitle,
  description,
  controls,
  children,
  isLoading,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  controls?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div className="card" style={{ animation: "fadeIn 0.35s ease both" }}>
      <div className="card-header d-flex justify-content-between align-items-start flex-wrap gap-3 pb-2">
        <div>
          <h5 className="card-title fw-600 mb-0">
            {title}
            {description && (
              <span
                className="position-relative d-inline-flex align-items-center ms-2"
                style={{
                  cursor: "help",
                  marginLeft: "0.35rem",
                  opacity: 0.45,
                  transition: "opacity 0.2s",
                }}
              >
                <Info size={14} />
                <span
                  className="position-absolute bg-white border rounded p-2 small text-muted"
                  style={{
                    top: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "normal",
                    width: "max-content",
                    maxWidth: "260px",
                    zIndex: 10,
                    visibility: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                >
                  {description}
                </span>
              </span>
            )}
          </h5>
          {subtitle && <p className="small text-muted mb-0 mt-1">{subtitle}</p>}
        </div>
        {controls && (
          <div className="d-flex align-items-center gap-2 flex-wrap small">
            {controls}
          </div>
        )}
      </div>
      <div className="card-body position-relative">
        {isLoading && (
          <div
            className="position-absolute top-0 start-0 end-0 bottom-0 d-flex flex-column align-items-center justify-content-center"
            style={{
              background: "rgba(255,255,255,0.75)",
              zIndex: 2,
              borderRadius: "0 0 0.75rem 0.75rem",
              backdropFilter: "blur(1px)",
            }}
          >
            <Loader2 size={22} className="chart-card__spinner text-primary" />
            <span className="small text-muted mt-2">Updating…</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────
export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mt-4 mb-3 pb-2 border-bottom border-2">
      <h4 className="fw-600 mb-0">{title}</h4>
      {description && (
        <p className="small text-muted mb-0 mt-1">{description}</p>
      )}
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="row g-3 mb-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="col-lg-3 col-md-6">
          <div className="skeleton" style={{ height: "120px" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <div className="skeleton" style={{ height: "300px" }} />;
}

export function SkeletonTitle() {
  return (
    <div
      className="skeleton"
      style={{ height: "22px", width: "180px", margin: "2.25rem 0 1.25rem" }}
    />
  );
}
