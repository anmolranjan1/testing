import type { ReactNode } from "react";
import { AlertTriangle, BarChart3, Info } from "lucide-react";

// ─── Error State ──────────────────────────────────────────────────
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
        <p className="chart-error__title">Could not load {title}</p>
        <p className="chart-error__msg">{message}</p>
        <p className="chart-error__hint">Try refreshing the page.</p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
export function ChartEmpty({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <div className="chart-empty">
        <BarChart3 size={32} className="chart-empty__icon" />
        <p className="chart-empty__title">No data yet</p>
        <p className="chart-empty__text">
          {title} will appear here once there is enough data.
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
}: {
  title: string;
  subtitle?: string;
  description?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
          {description && (
            <p className="chart-card__desc">
              <Info size={13} className="chart-card__desc-icon" />
              {description}
            </p>
          )}
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
export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
    </div>
  );
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
