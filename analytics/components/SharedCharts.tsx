import { useState } from "react";
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
} from "recharts";
import { ChartCard, ChartEmpty, ChartError } from "./ChartComponents";
import { formatNumber } from "../../../shared/utils/formatNumber";
import type {
  AuditTaskStatusChart,
  AverageQuizScoreResponse,
  PoliciesWithQuizPieResponse,
  ComplianceTrendResponse,
} from "../../../shared/types/analytics";

// ─── Constants ────────────────────────────────────────────────────

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
const QUIZ_COLORS = ["#198754", "#dc3545"];

const yearOptions = (): number[] => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => y - i);
};

// Shorten long policy names for X-axis readability
const truncate = (text: string, max = 18) =>
  text?.length > max ? text.slice(0, max) + "…" : (text ?? "");

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  auditChart: AuditTaskStatusChart | null;
  avgQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;
  errors: Record<string, string>;
  reloading: Record<string, boolean>;
  reloadTrend: (mode: string, year?: number) => Promise<void>;
  reloadQuizScores: (excludeZero: boolean) => Promise<void>;
  onRetry: () => void;
}

// ─── Component ────────────────────────────────────────────────────

export default function SharedCharts({
  auditChart,
  avgQuizScores,
  policiesWithQuiz,
  complianceTrend,
  errors,
  reloading,
  reloadTrend,
  reloadQuizScores,
  onRetry,
}: Props) {
  const [trendMode, setTrendMode] = useState<"month" | "year">("month");
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
  const [excludeZero, setExcludeZero] = useState(true);

  const onTrendMode = (m: "month" | "year") => {
    setTrendMode(m);
    reloadTrend(m, m === "year" ? trendYear : undefined);
  };
  const onTrendYear = (y: number) => {
    setTrendYear(y);
    reloadTrend("year", y);
  };
  const onExcludeZero = (v: boolean) => {
    setExcludeZero(v);
    reloadQuizScores(v);
  };

  return (
    <>
      {/* ── Row 1: Donut + Pie (side by side) ──────────────────── */}
      <div className="chart-grid chart-grid--two">
        {/* Audit Task Status — Donut */}
        {errors["audit"] ? (
          <ChartError
            title="Audit Tasks"
            message={errors["audit"]}
            onRetry={onRetry}
          />
        ) : auditChart?.slices?.length ? (
          <ChartCard
            title="Audit Tasks"
            subtitle={`${formatNumber(auditChart?.total)} total`}
            description="Shows how many audit tasks are pending, in progress, or completed"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={(auditChart.slices ?? []).map((s) => ({
                    name: STATUS_LABELS[s?.status] ?? s?.status ?? "Unknown",
                    value: s?.count ?? 0,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(auditChart.slices ?? []).map((s, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[s?.status] ?? "#6c757d"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    v: number | undefined,
                    name: string | undefined,
                  ) => [`${formatNumber(v)} tasks`, name ?? ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--bs-body-color)",
                      }}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty
            title="Audit Tasks"
            hint="Create audit tasks to see their status here."
          />
        )}

        {/* Quiz Coverage — Pie */}
        {errors["withQuiz"] ? (
          <ChartError
            title="Quiz Coverage"
            message={errors["withQuiz"]}
            onRetry={onRetry}
          />
        ) : policiesWithQuiz?.slices?.length ? (
          <ChartCard
            title="Quiz Coverage"
            subtitle={`${formatNumber(policiesWithQuiz?.total)} policies`}
            description="How many policies have a quiz attached vs. those that don't"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={(policiesWithQuiz.slices ?? []).map((s) => ({
                    name: s?.label ?? "Unknown",
                    value: s?.count ?? 0,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {QUIZ_COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    v: number | undefined,
                    name: string | undefined,
                  ) => [`${formatNumber(v)} policies`, name ?? ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--bs-body-color)",
                      }}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty
            title="Quiz Coverage"
            hint="Attach quizzes to policies to see coverage."
          />
        )}
      </div>

      {/* ── Row 2: Average Quiz Scores (full width) ────────────── */}
      <div className="chart-grid chart-grid--one">
        {errors["avgQuiz"] ? (
          <ChartError
            title="Average Quiz Scores"
            message={errors["avgQuiz"]}
            onRetry={onRetry}
          />
        ) : avgQuizScores?.data?.length ? (
          <ChartCard
            title="Average Quiz Scores"
            description="Average score employees achieved on each policy's quiz — higher is better"
            isLoading={reloading["avgQuiz"]}
            controls={
              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={excludeZero}
                  onChange={(e) => onExcludeZero(e.target.checked)}
                  disabled={reloading["avgQuiz"]}
                />
                <span className="small text-muted text-nowrap">
                  Hide policies with no attempts
                </span>
              </label>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgQuizScores.data} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="policyTitle"
                  angle={-20}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  tickFormatter={(v: string) => truncate(v)}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${(v ?? 0).toFixed(1)}%`,
                    "Average Score",
                  ]}
                  labelFormatter={(label) => `Policy: ${label ?? "—"}`}
                />
                <Bar
                  dataKey="averageScore"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  name="Average Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty
            title="Average Quiz Scores"
            hint="Employees need to complete quizzes for scores to appear."
          />
        )}
      </div>

      {/* ── Row 3: Compliance Trend (full width) ───────────────── */}
      <div className="chart-grid chart-grid--one">
        {errors["trend"] ? (
          <ChartError
            title="Compliance Trend"
            message={errors["trend"]}
            onRetry={onRetry}
          />
        ) : complianceTrend?.buckets?.length ? (
          <ChartCard
            title="Compliance Trend"
            subtitle={`${formatNumber(complianceTrend?.total)} total accepted`}
            description="How many policy acceptances happened over time — helps spot trends"
            isLoading={reloading["trend"]}
            controls={
              <div className="d-flex align-items-center gap-2">
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${trendMode === "month" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => onTrendMode("month")}
                    disabled={reloading["trend"]}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    className={`btn ${trendMode === "year" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => onTrendMode("year")}
                    disabled={reloading["trend"]}
                  >
                    Monthly
                  </button>
                </div>
                {trendMode === "year" && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={trendYear}
                    onChange={(e) => onTrendYear(Number(e.target.value))}
                    disabled={reloading["trend"]}
                  >
                    {yearOptions().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={complianceTrend.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatNumber(v)}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Policies Accepted",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#4f46e5" }}
                  activeDot={{ r: 6 }}
                  name="Policies Accepted"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty
            title="Compliance Trend"
            hint="Policy acceptances will be charted over time."
          />
        )}
      </div>
    </>
  );
}
