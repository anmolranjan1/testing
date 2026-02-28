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

interface Props {
  auditChart: AuditTaskStatusChart | null;
  avgQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;
  errors: Record<string, string>;
  reloadTrend: (mode: string, year?: number) => Promise<void>;
  reloadQuizScores: (excludeZero: boolean) => Promise<void>;
}

export default function SharedCharts({
  auditChart,
  avgQuizScores,
  policiesWithQuiz,
  complianceTrend,
  errors,
  reloadTrend,
  reloadQuizScores,
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
      {/* Row 1: Audit Tasks + Quiz Availability */}
      <div className="chart-grid chart-grid--two">
        {errors["audit"] ? (
          <ChartError title="Audit Tasks" message={errors["audit"]} />
        ) : auditChart?.slices?.length ? (
          <ChartCard
            title="Audit Tasks"
            description="How tasks are split across statuses"
            subtitle={`${formatNumber(auditChart?.total)} total tasks`}
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
                  label={({ percent }) =>
                    `${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {(auditChart.slices ?? []).map((s, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[s?.status] ?? "#6c757d"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Tasks",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Audit Tasks" />
        )}

        {errors["withQuiz"] ? (
          <ChartError title="Quiz Availability" message={errors["withQuiz"]} />
        ) : policiesWithQuiz?.slices?.length ? (
          <ChartCard
            title="Quiz Availability"
            description="Policies that include a quiz for employees"
            subtitle={`${formatNumber(policiesWithQuiz?.total)} policies`}
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
                  label={({ percent }) =>
                    `${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {QUIZ_COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Policies",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Quiz Availability" />
        )}
      </div>

      {/* Row 2: Quiz Performance */}
      <div className="chart-grid chart-grid--one">
        {errors["avgQuiz"] ? (
          <ChartError title="Quiz Performance" message={errors["avgQuiz"]} />
        ) : avgQuizScores?.data?.length ? (
          <ChartCard
            title="Quiz Performance"
            description="Average quiz score for each policy"
            controls={
              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={excludeZero}
                  onChange={(e) => onExcludeZero(e.target.checked)}
                />
                <span className="small text-muted text-nowrap">
                  Hide untested
                </span>
              </label>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgQuizScores.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
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
                    value: "Score (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${v?.toFixed(1) ?? 0}%`,
                    "Avg Score",
                  ]}
                  labelFormatter={(l) => `${l ?? "—"}`}
                />
                <Bar
                  dataKey="averageScore"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  name="Avg Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Quiz Performance" />
        )}
      </div>

      {/* Row 3: Acceptance Trend */}
      <div className="chart-grid chart-grid--one">
        {errors["trend"] ? (
          <ChartError title="Acceptance Trend" message={errors["trend"]} />
        ) : complianceTrend?.buckets?.length ? (
          <ChartCard
            title="Acceptance Trend"
            description="How quickly policies are being accepted"
            subtitle={
              complianceTrend?.total != null
                ? `${formatNumber(complianceTrend.total)} accepted so far`
                : undefined
            }
            controls={
              <div className="d-flex align-items-center gap-2">
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${trendMode === "month" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => onTrendMode("month")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={`btn ${trendMode === "year" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => onTrendMode("year")}
                  >
                    Yearly
                  </button>
                </div>
                {trendMode === "year" && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={trendYear}
                    onChange={(e) => onTrendYear(Number(e.target.value))}
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
                  label={{
                    value: "Accepted",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Accepted",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#4f46e5" }}
                  activeDot={{ r: 6 }}
                  name="Accepted"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Acceptance Trend" />
        )}
      </div>
    </>
  );
}
