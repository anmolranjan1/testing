import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { DashboardSummary } from "../../../shared/types/analytics";

interface Props {
  summary: DashboardSummary;
  errorCount: number;
}

export default function DashboardHeader({ summary, errorCount }: Props) {
  const cards = [
    {
      label: "Policy Compliance",
      value: `${(summary?.overallPolicyCompliancePercent ?? 0).toFixed(1)}%`,
      hint: "Overall acceptance rate",
      Icon: TrendingUp,
      color: "success",
    },
    {
      label: "Pending Policies",
      value: String(summary?.pendingPolicyAcceptancesCount ?? 0),
      hint: "Awaiting acceptance",
      Icon: Clock,
      color: "warning",
    },
    {
      label: "Audit Completion",
      value: `${(summary?.auditTaskCompletionPercent ?? 0).toFixed(1)}%`,
      hint: "Tasks completed",
      Icon: CheckCircle,
      color: "primary",
    },
    {
      label: "Overdue Audits",
      value: String(summary?.overdueAuditTasksCount ?? 0),
      hint: "Past due date",
      Icon: AlertCircle,
      color: "danger",
    },
  ];

  return (
    <>
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">
            Overview of compliance metrics
            {errorCount > 0 && (
              <span className="text-warning ms-2">
                ({errorCount} chart{errorCount > 1 ? "s" : ""} failed to load)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="summary-grid">
        {cards.map((c) => (
          <div key={c.label} className="summary-card">
            <div
              className={`summary-card__icon-wrap summary-card__icon-wrap--${c.color}`}
            >
              <c.Icon size={20} />
            </div>
            <p className="summary-card__label">{c.label}</p>
            <p className="summary-card__value">{c.value}</p>
            <p className="summary-card__hint">{c.hint}</p>
          </div>
        ))}
      </div>
    </>
  );
}
