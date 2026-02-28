import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { DashboardSummary } from "../../../shared/types/analytics";

interface Props {
  summary: DashboardSummary;
  errorCount: number;
  userName?: string;
}

/** Returns a time-of-day greeting. */
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export default function DashboardHeader({
  summary,
  errorCount,
  userName,
}: Props) {
  const firstName = userName?.split(" ")[0] ?? "there";

  const cards = [
    {
      label: "Policy Compliance",
      value: `${(summary?.overallPolicyCompliancePercent ?? 0).toFixed(1)}%`,
      hint: "How many policies have been accepted overall",
      Icon: TrendingUp,
      color: "success",
    },
    {
      label: "Pending Policies",
      value: String(summary?.pendingPolicyAcceptancesCount ?? 0),
      hint: "Policies waiting to be accepted by employees",
      Icon: Clock,
      color: "warning",
    },
    {
      label: "Audit Completion",
      value: `${(summary?.auditTaskCompletionPercent ?? 0).toFixed(1)}%`,
      hint: "Percentage of audit tasks marked complete",
      Icon: CheckCircle,
      color: "primary",
    },
    {
      label: "Overdue Audits",
      value: String(summary?.overdueAuditTasksCount ?? 0),
      hint: "Audit tasks that have passed their due date",
      Icon: AlertCircle,
      color: "danger",
    },
  ];

  return (
    <>
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            {getGreeting()}, {firstName}
          </h1>
          {errorCount > 0 && (
            <p className="dashboard__subtitle">
              <span className="text-warning">
                {errorCount} chart{errorCount > 1 ? "s" : ""} couldn't load —
                try refreshing the page
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="summary-grid">
        {cards.map((c) => (
          <div key={c.label} className="summary-card" title={c.hint}>
            <div
              className={`summary-card__icon-wrap summary-card__icon-wrap--${c.color}`}
            >
              <c.Icon size={20} />
            </div>
            <p className="summary-card__label">{c.label}</p>
            <p className="summary-card__value">{c.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}
