import type { ReactNode } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";

// ─── Error State ──────────────────────────────────────────────────
/** Shown when a chart API fails — isolated so other charts still render. */
export function ChartError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="chart-card">
      <div className="chart-error">
        <AlertTriangle size={28} className="chart-error__icon" />
        <p className="chart-error__title">{title}</p>
        <p className="chart-error__msg">{message}</p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
/** Shown when the API returns no data for a chart. */
export function ChartEmpty({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <div className="chart-empty">
        <BarChart3 size={32} className="chart-empty__icon" />
        <p className="chart-empty__text">No data for "{title}"</p>
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ───────────────────────────────────────────
/** Card shell for each chart — title + optional filter controls. */
export function ChartCard({
  title,
  subtitle,
  controls,
  children,
}: {
  title: string;
  subtitle?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        {controls && (
          <div className="chart-card__controls chart-filter">{controls}</div>
        )}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────
export function SectionTitle({ title }: { title: string }) {
  return <h2 className="section-title">{title}</h2>;
}

// ─── Loading Skeleton ─────────────────────────────────────────────
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="summary-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <div className="skeleton skeleton--chart" />;
}
