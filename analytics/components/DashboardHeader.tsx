import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { DashboardSummary } from "../../../shared/types/analytics";

interface Props {
  summary?: DashboardSummary | null;
  errorCount?: number;
  userName?: string;
  role?: string;
}

function getGreeting(): string {
  const hour = new Date()?.getHours() ?? 0;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHeader({
  summary,
  errorCount = 0,
  userName,
  role,
}: Props) {
  const firstName = userName?.split(" ")?.[0] ?? "there";

  const cards = [
    {
      label: "Policy Compliance",
      value: `${(summary?.overallPolicyCompliancePercent ?? 0).toFixed(1)}%`,
      Icon: TrendingUp,
      color: "success",
    },
    {
      label: "Pending Policies",
      value: String(summary?.pendingPolicyAcceptancesCount ?? 0),
      Icon: Clock,
      color: "warning",
    },
    {
      label: "Audit Completion",
      value: `${(summary?.auditTaskCompletionPercent ?? 0).toFixed(1)}%`,
      Icon: CheckCircle,
      color: "primary",
    },
    {
      label: "Overdue Audits",
      value: String(summary?.overdueAuditTasksCount ?? 0),
      Icon: AlertCircle,
      color: "danger",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    success: { bg: "rgba(25, 135, 84, 0.12)", text: "#198754" },
    warning: { bg: "rgba(255, 193, 7, 0.15)", text: "#cc9a06" },
    primary: { bg: "rgba(13, 110, 253, 0.12)", text: "#0d6efd" },
    danger: { bg: "rgba(220, 53, 69, 0.12)", text: "#dc3545" },
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="fw-bold mb-0">
          {getGreeting()}, {firstName}
          <span className="dashboard__wave" aria-hidden="true">
            👋
          </span>
        </h2>
        <p className="small text-muted mt-2">
          {role === "MANAGER"
            ? "You see data for your team only."
            : "Organization-wide compliance summary."}
          {errorCount > 0 && (
            <span className="badge bg-warning-subtle text-warning ms-2">
              {errorCount} chart{errorCount > 1 ? "s" : ""} couldn't load
            </span>
          )}
        </p>
      </div>

      <div className="row g-3 mb-3">
        {cards?.map((c, i) => {
          const colors = colorMap?.[c?.color] ?? colorMap?.primary;
          return (
            <div
              key={c?.label}
              className="col-lg-3 col-md-6"
              style={{
                animation: `fadeIn 0.4s ease both`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="card h-100 p-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded p-2 mb-2"
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    backgroundColor: colors?.bg,
                    color: colors?.text,
                  }}
                >
                  <c.Icon size={20} />
                </div>
                <p className="small fw-600 text-uppercase text-muted mb-1">
                  {c?.label}
                </p>
                <p className="h5 fw-bold mb-1">{c?.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
