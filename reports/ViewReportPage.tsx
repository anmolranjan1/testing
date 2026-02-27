import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import type { RootState } from "../../app/store/store";
import type { Report } from "../../shared/types/report";
import type {
  DashboardSummary,
  AuditTaskStatusChart,
  AverageQuizScoreResponse,
  PoliciesWithQuizPieResponse,
  ComplianceTrendResponse,
  MostAssignedPolicy,
  PoliciesByCategoryResponse,
  DepartmentComplianceBar,
  MonthlyRollout,
  ChecklistItemsBubble,
  TeamQuizHistogram,
  TeamPendingPolicy,
  TeamTopPerformer,
} from "../../shared/types/analytics";
import { getReportById } from "./reportApi";
import { parseError } from "../../shared/utils/errorParser";
import { formatDateTime } from "../../shared/utils/dateFormatter";
import LoadingSpinner from "../../shared/ui/LoadingSpinner";
import ChartErrorBoundary from "../../shared/ui/ChartErrorBoundary";
import { ROUTES } from "../../shared/constants/routes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (num: number | undefined | null): string =>
  new Intl.NumberFormat("en-US").format(num ?? 0);

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#ffc107",
  INPROGRESS: "#0d6efd",
  COMPLETED: "#198754",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  INPROGRESS: "In Progress",
  COMPLETED: "Completed",
};
const QUIZ_PIE_COLORS = ["#198754", "#dc3545"];

const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{ "error": "Unable to serialize metrics data" }';
  }
};

// Reusable chart card — wraps children in an error boundary so one
// broken chart never crashes the entire page.
function RCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <h6 className="card-title mb-3">{title}</h6>
        <ChartErrorBoundary>{children}</ChartErrorBoundary>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViewReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getReportById(Number(id));
        setReport(data);
      } catch (error) {
        toast.error(parseError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <LoadingSpinner />
      </div>
    );

  if (!report)
    return (
      <div className="p-4">
        <div className="alert alert-danger">
          Report not found or failed to load.
          <button
            className="btn btn-link"
            onClick={() => navigate(ROUTES.MANAGE_REPORTS)}
          >
            Back to Reports
          </button>
        </div>
      </div>
    );

  // ── Extract metrics ──────────────────────────────────────
  const m = report.metrics ?? {};
  const summary = m.summary as DashboardSummary | undefined;
  const auditChart = m.auditChart as AuditTaskStatusChart | undefined;
  const averageQuizScores = m.averageQuizScores as
    | AverageQuizScoreResponse
    | undefined;
  const policiesWithQuiz = m.policiesWithQuiz as
    | PoliciesWithQuizPieResponse
    | undefined;
  const complianceTrend = m.complianceTrend as
    | ComplianceTrendResponse
    | undefined;
  const mostAssignedPolicies = m.mostAssignedPolicies as
    | MostAssignedPolicy[]
    | undefined;
  const policiesByCategory = m.policiesByCategory as
    | PoliciesByCategoryResponse
    | undefined;
  const departmentCompliance = m.departmentCompliance as
    | DepartmentComplianceBar[]
    | undefined;
  const monthlyRollout = m.monthlyRollout as MonthlyRollout[] | undefined;
  const checklistBubble = m.checklistBubble as
    | ChecklistItemsBubble[]
    | undefined;
  const teamQuizHistogram = m.teamQuizHistogram as
    | TeamQuizHistogram
    | undefined;
  const teamPendingPolicies = m.teamPendingPolicies as
    | TeamPendingPolicy[]
    | undefined;
  const teamTopPerformers = m.teamTopPerformers as
    | TeamTopPerformer[]
    | undefined;
  const savedAt = m.savedAt as string | undefined;
  const reportRole = m.userRole as string | undefined;

  const creatorName = report.createdBy?.name ?? "Unknown";
  const creatorRole = report.createdBy?.role ?? "N/A";
  const isViewingOtherRole =
    user?.role === "ADMIN" && creatorRole === "MANAGER";

  // Check which shared sections exist
  const hasShared =
    auditChart || averageQuizScores || policiesWithQuiz || complianceTrend;
  const hasAdmin =
    mostAssignedPolicies ||
    policiesByCategory ||
    departmentCompliance ||
    monthlyRollout ||
    checklistBubble;
  const hasManager =
    teamQuizHistogram || teamPendingPolicies || teamTopPerformers;

  return (
    <ChartErrorBoundary
      fallback={
        <div className="p-4">
          <div className="alert alert-danger">
            Something went wrong while rendering this report.
            <button
              className="btn btn-link"
              onClick={() => navigate(ROUTES.MANAGE_REPORTS)}
            >
              Back to Reports
            </button>
          </div>
        </div>
      }
    >
      <div className="p-4" style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* ── Header ──────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <button
              className="btn btn-sm btn-outline-secondary mb-2"
              onClick={() => navigate(ROUTES.MANAGE_REPORTS)}
            >
              <ArrowLeft size={14} className="me-1" /> Back to Reports
            </button>
            <h3 className="mb-1">{report.title || "Untitled Report"}</h3>
            <div className="d-flex flex-wrap gap-3 text-muted small">
              <span>
                <User size={13} className="me-1" />
                {creatorName}
              </span>
              <span>
                <Shield size={13} className="me-1" />
                {creatorRole}
              </span>
              <span>
                <Calendar size={13} className="me-1" />
                {formatDateTime(report.createdAt) || "N/A"}
              </span>
              {savedAt ? (
                <span className="text-info">
                  Snapshot: {formatDateTime(savedAt) || "N/A"}
                </span>
              ) : null}
            </div>
            {isViewingOtherRole && (
              <span className="badge bg-info mt-2">
                Viewing {creatorRole} report as {user?.role}
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{" "}
              Raw JSON
            </button>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => window.print()}
            >
              <Printer size={14} className="me-1" /> Print
            </button>
          </div>
        </div>

        {/* Raw JSON toggle */}
        {showRaw && (
          <div className="card mb-4">
            <div className="card-body">
              <pre
                className="mb-0"
                style={{
                  maxHeight: 300,
                  overflow: "auto",
                  fontSize: "0.75rem",
                }}
              >
                {safeStringify(m)}
              </pre>
            </div>
          </div>
        )}

        {/* ── Summary Cards ───────────────────────────── */}
        {summary && (
          <>
            <h5 className="text-muted text-uppercase small fw-semibold mb-3 mt-4">
              Dashboard Summary
            </h5>
            <div className="row g-3 mb-4">
              {[
                {
                  label: "Policy Compliance",
                  value: `${(summary.overallPolicyCompliancePercent ?? 0).toFixed(1)}%`,
                  icon: TrendingUp,
                  color: "success",
                },
                {
                  label: "Pending Policies",
                  value: String(summary.pendingPolicyAcceptancesCount ?? 0),
                  icon: Clock,
                  color: "warning",
                },
                {
                  label: "Audit Completion",
                  value: `${(summary.auditTaskCompletionPercent ?? 0).toFixed(1)}%`,
                  icon: CheckCircle,
                  color: "primary",
                },
                {
                  label: "Overdue Audits",
                  value: String(summary.overdueAuditTasksCount ?? 0),
                  icon: AlertCircle,
                  color: "danger",
                },
              ].map((c) => (
                <div key={c.label} className="col-md-6 col-lg-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div
                          className={`p-2 bg-${c.color} bg-opacity-10 rounded`}
                        >
                          <c.icon className={`text-${c.color}`} size={20} />
                        </div>
                        <small className="text-muted">{c.label}</small>
                      </div>
                      <h3 className="mb-0">{c.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Shared Charts ───────────────────────────── */}
        {hasShared && (
          <>
            <h5 className="text-muted text-uppercase small fw-semibold mb-3 mt-4">
              {reportRole === "MANAGER"
                ? "Overview Analytics (Team)"
                : "Overview Analytics"}
            </h5>
            <div className="row g-4 mb-4">
              {/* Audit Donut */}
              {auditChart?.slices?.length ? (
                <div className="col-lg-6">
                  <RCard
                    title={`Audit Task Status (${fmt(auditChart.total)} total)`}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={auditChart.slices.map((s) => ({
                            name:
                              STATUS_LABELS[s.status] ?? s.status ?? "Unknown",
                            value: s.count ?? 0,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {auditChart.slices.map((s, i) => (
                            <Cell
                              key={i}
                              fill={STATUS_COLORS[s.status] ?? "#6c757d"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${fmt(value)} task(s)`,
                            "Tasks",
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Quiz Coverage Pie */}
              {policiesWithQuiz?.slices?.length ? (
                <div className="col-lg-6">
                  <RCard
                    title={`Quiz Coverage (${fmt(policiesWithQuiz.total)} policies)`}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={policiesWithQuiz.slices.map((s) => ({
                            name: s.label ?? "Unknown",
                            value: s.count ?? 0,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {QUIZ_PIE_COLORS.map((c, i) => (
                            <Cell key={i} fill={c} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${fmt(value)} policy/policies`,
                            "Count",
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Avg Quiz Scores */}
              {averageQuizScores?.data?.length ? (
                <div className="col-12">
                  <RCard title="Average Quiz Scores by Policy">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={averageQuizScores.data}
                        margin={{ bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="policyTitle"
                          angle={-15}
                          textAnchor="end"
                          height={60}
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, 100]}
                          label={{
                            value: "Avg Score (%)",
                            angle: -90,
                            position: "insideLeft",
                            offset: 10,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${(value ?? 0).toFixed(1)}%`,
                            "Avg Score",
                          ]}
                          labelFormatter={(l) => `Policy: ${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="averageScore"
                          fill="#17a2b8"
                          radius={[4, 4, 0, 0]}
                          name="Avg Score"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Compliance Trend */}
              {complianceTrend?.buckets?.length ? (
                <div className="col-12">
                  <RCard
                    title={`Compliance Trend (${fmt(complianceTrend.total)} accepted)`}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={complianceTrend.buckets}
                        margin={{ bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis
                          allowDecimals={false}
                          label={{
                            value: "Accepted Records",
                            angle: -90,
                            position: "insideLeft",
                            offset: 10,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            fmt(value),
                            "Accepted",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#0d6efd"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#0d6efd" }}
                          activeDot={{ r: 6 }}
                          name="Accepted"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* ── Admin Charts ────────────────────────────── */}
        {hasAdmin && (
          <>
            <h5 className="text-muted text-uppercase small fw-semibold mb-3 mt-4">
              Administration Insights
            </h5>
            <div className="row g-4 mb-4">
              {/* Most Assigned Policies */}
              {mostAssignedPolicies?.length ? (
                <div className="col-lg-6">
                  <RCard title="Most Assigned Policies">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={mostAssignedPolicies}
                        layout="vertical"
                        margin={{ left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                          label={{
                            value: "No. of Assignments",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          dataKey="policyTitle"
                          type="category"
                          width={130}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            fmt(value),
                            "Assignments",
                          ]}
                          labelFormatter={(l) => `Policy: ${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="assignmentCount"
                          fill="#6f42c1"
                          radius={[0, 4, 4, 0]}
                          name="Assignments"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Policies by Category */}
              {policiesByCategory?.data?.length ? (
                <div className="col-lg-6">
                  <RCard title="Policies by Category">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={policiesByCategory.data}
                        layout="vertical"
                        margin={{ left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          allowDecimals={false}
                          label={{
                            value: "No. of Policies",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          dataKey="categoryName"
                          type="category"
                          width={130}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            fmt(value),
                            "Policies",
                          ]}
                          labelFormatter={(l) => `Category: ${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="count"
                          fill="#fd7e14"
                          radius={[0, 4, 4, 0]}
                          name="Policies"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Dept Compliance */}
              {departmentCompliance?.length ? (
                <div className="col-lg-6">
                  <RCard title="Compliance by Department">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={departmentCompliance}
                        layout="vertical"
                        margin={{ left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                          label={{
                            value: "Compliance Records",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          dataKey="depName"
                          type="category"
                          width={130}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(
                            value: number | undefined,
                            name: string | undefined,
                          ) => [`${fmt(value)} record(s)`, name ?? ""]}
                          labelFormatter={(l) => `Dept: ${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="accepted"
                          stackId="dept"
                          fill="#198754"
                          name="Accepted"
                        />
                        <Bar
                          dataKey="pending"
                          stackId="dept"
                          fill="#ffc107"
                          name="Pending"
                          radius={[0, 4, 4, 0]}
                        />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Monthly Rollout */}
              {monthlyRollout?.length ? (
                <div className="col-lg-6">
                  <RCard title="Monthly Policy Rollout">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyRollout} margin={{ bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis
                          allowDecimals={false}
                          label={{
                            value: "Policies Rolled Out",
                            angle: -90,
                            position: "insideLeft",
                            offset: 10,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            fmt(value),
                            "Policies",
                          ]}
                          labelFormatter={(l) => `Month: ${l ?? "Unknown"}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#20c997"
                          fill="#20c997"
                          fillOpacity={0.3}
                          name="Policies"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Checklist Bubble */}
              {checklistBubble?.length ? (
                <div className="col-12">
                  <RCard title="Checklist Items per Policy">
                    {(() => {
                      const bubbleData = checklistBubble.map((item, idx) => ({
                        x: idx + 1,
                        itemCount: item.itemCount ?? 0,
                        bubbleSize: item.bubbleSize || item.itemCount || 1,
                        policyTitle:
                          item.policyTitle ??
                          `Policy #${item.policyId ?? idx + 1}`,
                      }));
                      return (
                        <ResponsiveContainer width="100%" height={340}>
                          <ScatterChart
                            margin={{
                              left: 20,
                              bottom: 40,
                              right: 20,
                              top: 20,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                            />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name="Policy"
                              domain={[0.5, bubbleData.length + 0.5]}
                              ticks={bubbleData.map((_, i) => i + 1)}
                              tickFormatter={(v: number) => {
                                const item = bubbleData[v - 1];
                                if (!item) return "";
                                const t = item.policyTitle ?? "";
                                return t.length > 18
                                  ? t.substring(0, 18) + "\u2026"
                                  : t;
                              }}
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "Policy",
                                position: "insideBottom",
                                offset: -30,
                                fontSize: 11,
                                fill: "#6c757d",
                              }}
                            />
                            <YAxis
                              type="number"
                              dataKey="itemCount"
                              name="Checklist Items"
                              allowDecimals={false}
                              label={{
                                value: "No. of Checklist Items",
                                angle: -90,
                                position: "insideLeft",
                                offset: 10,
                                fontSize: 11,
                                fill: "#6c757d",
                              }}
                            />
                            <ZAxis
                              type="number"
                              dataKey="bubbleSize"
                              range={[300, 2000]}
                              name="Size"
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0]
                                  .payload as (typeof bubbleData)[0];
                                return (
                                  <div
                                    style={{
                                      background: "#fff",
                                      border: "1px solid #dee2e6",
                                      padding: "8px 12px",
                                      borderRadius: 6,
                                      fontSize: 13,
                                    }}
                                  >
                                    <strong>
                                      {d?.policyTitle ?? "Unknown Policy"}
                                    </strong>
                                    <br />
                                    Checklist Items: {d?.itemCount ?? 0}
                                  </div>
                                );
                              }}
                            />
                            <Scatter
                              name="Policies"
                              data={bubbleData}
                              fill="#e83e8c"
                              fillOpacity={0.7}
                              stroke="#c2185b"
                              strokeWidth={1}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </RCard>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* ── Manager Charts ──────────────────────────── */}
        {hasManager && (
          <>
            <h5 className="text-muted text-uppercase small fw-semibold mb-3 mt-4">
              {isViewingOtherRole
                ? `Team Performance (${creatorName}'s Team)`
                : "Team Performance"}
            </h5>
            <div className="row g-4 mb-4">
              {/* Quiz Histogram */}
              {teamQuizHistogram?.bins?.length ? (
                <div className="col-lg-6">
                  <RCard title="Team Quiz Score Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={teamQuizHistogram.bins.map((b) => ({
                          range: `${b.lowerBound ?? 0}\u2013${b.upperBound ?? 0}`,
                          count: b.count ?? 0,
                        }))}
                        margin={{ left: 5, bottom: 20 }}
                        barCategoryGap={0}
                        barGap={0}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "Score Range",
                            position: "insideBottom",
                            offset: -12,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          label={{
                            value: "No. of Submissions",
                            angle: -90,
                            position: "insideLeft",
                            offset: 0,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            fmt(value),
                            "Submissions",
                          ]}
                          labelFormatter={(l) => `Score: ${l ?? "?"}`}
                        />
                        <Bar
                          dataKey="count"
                          fill="#6610f2"
                          radius={0}
                          name="Submissions"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Top Performers */}
              {teamTopPerformers?.length ? (
                <div className="col-lg-6">
                  <RCard title="Top Team Performers">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={teamTopPerformers}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "Avg Score (%)",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${(value ?? 0).toFixed(1)}%`,
                            "Avg Score",
                          ]}
                          labelFormatter={(l) => `${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="averageScore"
                          fill="#198754"
                          radius={[0, 4, 4, 0]}
                          name="Avg Score"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}

              {/* Pending Policies */}
              {teamPendingPolicies?.length ? (
                <div className="col-12">
                  <RCard title="Team Pending Policies">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={teamPendingPolicies}
                        layout="vertical"
                        margin={{ left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          allowDecimals={false}
                          label={{
                            value: "Pending Assignments",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                            fill: "#6c757d",
                          }}
                        />
                        <YAxis
                          dataKey="policyTitle"
                          type="category"
                          width={150}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${fmt(value)} employee(s)`,
                            "Pending",
                          ]}
                          labelFormatter={(l) => `Policy: ${l ?? "Unknown"}`}
                        />
                        <Bar
                          dataKey="pendingCount"
                          fill="#ffc107"
                          radius={[0, 4, 4, 0]}
                          name="Pending"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </RCard>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* ── Key Insights ────────────────────────────── */}
        {summary && (
          <ChartErrorBoundary>
            <h5 className="text-muted text-uppercase small fw-semibold mb-3 mt-4">
              Key Insights
            </h5>
            <div className="row g-3 mb-4">
              {/* Compliance Health */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="card-title text-muted mb-3">
                      Compliance Health
                    </h6>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className={`display-6 fw-bold ${
                          (summary.overallPolicyCompliancePercent ?? 0) >= 80
                            ? "text-success"
                            : (summary.overallPolicyCompliancePercent ?? 0) >=
                                50
                              ? "text-warning"
                              : "text-danger"
                        }`}
                      >
                        {(summary.overallPolicyCompliancePercent ?? 0).toFixed(
                          0,
                        )}
                        %
                      </div>
                      <div className="small text-muted">
                        {(summary.overallPolicyCompliancePercent ?? 0) >= 80
                          ? "Healthy — compliance is on track"
                          : (summary.overallPolicyCompliancePercent ?? 0) >= 50
                            ? "Moderate — needs attention"
                            : "Critical — immediate action required"}
                      </div>
                    </div>
                    <div className="progress mt-3" style={{ height: 8 }}>
                      <div
                        className={`progress-bar ${
                          (summary.overallPolicyCompliancePercent ?? 0) >= 80
                            ? "bg-success"
                            : (summary.overallPolicyCompliancePercent ?? 0) >=
                                50
                              ? "bg-warning"
                              : "bg-danger"
                        }`}
                        style={{
                          width: `${Math.min(summary.overallPolicyCompliancePercent ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Progress */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="card-title text-muted mb-3">
                      Audit Progress
                    </h6>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className={`display-6 fw-bold ${
                          (summary.auditTaskCompletionPercent ?? 0) >= 80
                            ? "text-success"
                            : (summary.auditTaskCompletionPercent ?? 0) >= 50
                              ? "text-warning"
                              : "text-danger"
                        }`}
                      >
                        {(summary.auditTaskCompletionPercent ?? 0).toFixed(0)}%
                      </div>
                      <div className="small text-muted">
                        {(summary.overdueAuditTasksCount ?? 0) > 0
                          ? `${summary.overdueAuditTasksCount} overdue task(s) need attention`
                          : "No overdue tasks — great job!"}
                      </div>
                    </div>
                    <div className="progress mt-3" style={{ height: 8 }}>
                      <div
                        className={`progress-bar ${
                          (summary.auditTaskCompletionPercent ?? 0) >= 80
                            ? "bg-success"
                            : (summary.auditTaskCompletionPercent ?? 0) >= 50
                              ? "bg-warning"
                              : "bg-danger"
                        }`}
                        style={{
                          width: `${Math.min(summary.auditTaskCompletionPercent ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Actions */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="card-title text-muted mb-3">
                      Pending Actions
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="small text-muted">
                          Policy Acceptances
                        </span>
                        <span className="badge bg-warning">
                          {summary.pendingPolicyAcceptancesCount ?? 0}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="small text-muted">Overdue Audits</span>
                        <span
                          className={`badge ${(summary.overdueAuditTasksCount ?? 0) > 0 ? "bg-danger" : "bg-success"}`}
                        >
                          {summary.overdueAuditTasksCount ?? 0}
                        </span>
                      </div>
                      {(departmentCompliance?.length ?? 0) > 0 && (
                        <div className="d-flex justify-content-between">
                          <span className="small text-muted">Departments</span>
                          <span className="badge bg-info">
                            {departmentCompliance?.length ?? 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ChartErrorBoundary>
        )}

        {/* ── No content fallback ─────────────────────── */}
        {!summary && !hasShared && !hasAdmin && !hasManager && (
          <div className="alert alert-info">
            No analytics data found in this report.
          </div>
        )}
      </div>
    </ChartErrorBoundary>
  );
}
