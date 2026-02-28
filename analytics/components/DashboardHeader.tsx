import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { DashboardSummary } from "../../../shared/types/analytics";

interface Props {
  summary: DashboardSummary;
  errorCount: number;
  userName?: string;
}

export default function DashboardHeader({
  summary,
  errorCount,
  userName,
}: Props) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const compliancePct = summary?.overallPolicyCompliancePercent ?? 0;
  const auditPct = summary?.auditTaskCompletionPercent ?? 0;

  const cards = [
    {
      label: "Policy Compliance",
      value: `${compliancePct.toFixed(1)}%`,
      hint: "Policies accepted across the organization",
      Icon: TrendingUp,
      color: "success",
      progress: compliancePct,
    },
    {
      label: "Pending Policies",
      value: String(summary?.pendingPolicyAcceptancesCount ?? 0),
      hint: "Policies waiting to be accepted",
      Icon: Clock,
      color: "warning",
    },
    {
      label: "Audit Completion",
      value: `${auditPct.toFixed(1)}%`,
      hint: "Audit tasks completed so far",
      Icon: CheckCircle,
      color: "primary",
      progress: auditPct,
    },
    {
      label: "Overdue Audits",
      value: String(summary?.overdueAuditTasksCount ?? 0),
      hint: "Audit tasks past their due date",
      Icon: AlertCircle,
      color: "danger",
    },
  ];

  return (
    <>
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            {greeting}
            {userName ? `, ${userName}` : ""}
          </h1>
          <p className="dashboard__subtitle">
            {today}
            {errorCount > 0 && (
              <span className="text-warning ms-2">
                · {errorCount} chart{errorCount > 1 ? "s" : ""} couldn't load
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
            {c.progress !== undefined && (
              <div className="summary-card__progress">
                <div
                  className={`summary-card__progress-fill summary-card__progress-fill--${c.color}`}
                  style={{ width: `${Math.min(c.progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
