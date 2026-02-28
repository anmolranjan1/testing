import type { ReactNode } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";

/** Shown when a chart API fails. */
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
        <p className="chart-error__title">Couldn't load {title}</p>
        <p className="chart-error__msg">{message}</p>
        <p className="chart-error__hint">Try refreshing the page</p>
      </div>
    </div>
  );
}

/** Shown when the API returns no data. */
export function ChartEmpty({ title }: { title: string }) {
  return (
    <div className="chart-card">
      <div className="chart-empty">
        <BarChart3 size={32} className="chart-empty__icon" />
        <p className="chart-empty__title">No data yet</p>
        <p className="chart-empty__text">
          {title} will appear here once data is available
        </p>
      </div>
    </div>
  );
}

/** Card wrapper for each chart — title + description + optional controls. */
export function ChartCard({
  title,
  description,
  subtitle,
  controls,
  children,
}: {
  title: string;
  description?: string;
  subtitle?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {description && <p className="chart-card__desc">{description}</p>}
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

/** Section divider with optional description. */
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
      {description && <p className="section-header__desc">{description}</p>}
    </div>
  );
}

/** Loading placeholder for KPI cards. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="summary-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

/** Loading placeholder for a chart. */
export function SkeletonChart() {
  return <div className="skeleton skeleton--chart" />;
}
