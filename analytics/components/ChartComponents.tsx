import type { ReactNode } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";

/** Shown when a chart's API call fails — other charts continue working */
export function ErrorCard({ title, error }: { title: string; error: string }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
        <AlertTriangle className="text-warning mb-3" size={32} />
        <h6 className="card-title mb-2">{title}</h6>
        <p className="text-muted small mb-0">Failed to load: {error}</p>
      </div>
    </div>
  );
}

/** Shown when the API returns empty / no data for a chart */
export function EmptyCard({ title }: { title: string }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
        <BarChart3 className="text-muted mb-3" size={32} />
        <h6 className="card-title mb-2">{title}</h6>
        <p className="text-muted small mb-0">No data available</p>
      </div>
    </div>
  );
}

/** Wrapper card for each chart — title + optional filter controls in header */
export function ChartCard({
  title,
  children,
  controls,
}: {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="card-title mb-0">{title}</h6>
          {controls && <div className="d-flex gap-2">{controls}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Section divider between chart groups */
export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mt-5 mb-3">
      <h5 className="fw-semibold text-muted text-uppercase small letter-spacing-2">
        {title}
      </h5>
      <hr className="mt-1 mb-0" />
    </div>
  );
}

/** Bootstrap grid row for chart layout */
export function ChartRow({ children }: { children: ReactNode }) {
  return <div className="row g-4 mt-0">{children}</div>;
}

/** Column wrapper — defaults to full-width; pass "col-lg-6" for half */
export function ChartColumn({
  children,
  size = "col-12",
}: {
  children: ReactNode;
  size?: string;
}) {
  return <div className={size}>{children}</div>;
}
