import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  type LucideIcon,
} from "lucide-react";
import type { DashboardSummary } from "../../../shared/types/analytics";

interface SummaryCardConfig {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: "success" | "warning" | "primary" | "danger";
}

interface DashboardHeaderProps {
  summary: DashboardSummary;
  errorCount: number;
  onSaveReport: () => void;
}

const buildSummaryCards = (summary: DashboardSummary): SummaryCardConfig[] => [
  {
    label: "Policy Compliance",
    value: `${(summary.overallPolicyCompliancePercent ?? 0).toFixed(1)}%`,
    subtitle: "Overall compliance rate",
    icon: TrendingUp,
    color: "success",
  },
  {
    label: "Pending Policies",
    value: String(summary.pendingPolicyAcceptancesCount ?? 0),
    subtitle: "Awaiting acceptance",
    icon: Clock,
    color: "warning",
  },
  {
    label: "Audit Completion",
    value: `${(summary.auditTaskCompletionPercent ?? 0).toFixed(1)}%`,
    subtitle: "Tasks completed",
    icon: CheckCircle,
    color: "primary",
  },
  {
    label: "Overdue Audits",
    value: String(summary.overdueAuditTasksCount ?? 0),
    subtitle: "Tasks past due date",
    icon: AlertCircle,
    color: "danger",
  },
];

export function DashboardHeader({
  summary,
  errorCount,
  onSaveReport,
}: DashboardHeaderProps) {
  const cards = buildSummaryCards(summary);

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="flex-grow-1">
          <h2 className="h3 mb-1">Dashboard</h2>
          <p className="text-muted mb-0">Overview of compliance metrics</p>
          {errorCount > 0 && (
            <small className="text-warning d-block mt-1">
              {errorCount} chart(s) failed to load.
            </small>
          )}
        </div>
        <button
          className="btn btn-success d-flex align-items-center gap-2"
          onClick={onSaveReport}
        >
          <Save size={16} />
          Save as Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        {cards.map((card) => (
          <div key={card.label} className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className={`p-2 bg-${card.color} bg-opacity-10 rounded`}>
                    <card.icon className={`text-${card.color}`} size={24} />
                  </div>
                  <h6 className="mb-0 text-muted">{card.label}</h6>
                </div>
                <h2 className="h1 mb-2">{card.value}</h2>
                <p className="text-muted small mb-0">{card.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
