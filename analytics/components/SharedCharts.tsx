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
const PIE_COLORS = ["#198754", "#dc3545"];

const yearOptions = (): number[] => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => y - i);
};

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  auditChart: AuditTaskStatusChart | null;
  avgQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;
  errors: Record<string, string>;
  reloadTrend: (mode: string, year?: number) => Promise<void>;
  reloadQuizScores: (excludeZero: boolean) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────

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
      {/* ── Row 1: Donut + Pie (side by side) ──────────────────── */}
      <div className="chart-grid chart-grid--two">
        {/* Audit Task Status — Donut */}
        {errors["audit"] ? (
          <ChartError title="Audit Task Status" message={errors["audit"]} />
        ) : auditChart?.slices?.length ? (
          <ChartCard
            title="Audit Task Status"
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
                  label={({ name, percent }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                    `${formatNumber(v)} task(s)`,
                    "Count",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Audit Task Status" />
        )}

        {/* Quiz Coverage — Pie */}
        {errors["withQuiz"] ? (
          <ChartError title="Quiz Coverage" message={errors["withQuiz"]} />
        ) : policiesWithQuiz?.slices?.length ? (
          <ChartCard
            title="Quiz Coverage"
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
                  label={({ name, percent }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {PIE_COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} policies`,
                    "Count",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Quiz Coverage" />
        )}
      </div>

      {/* ── Row 2: Average Quiz Scores (full width) ────────────── */}
      <div className="chart-grid chart-grid--one">
        {errors["avgQuiz"] ? (
          <ChartError
            title="Avg Quiz Scores by Policy"
            message={errors["avgQuiz"]}
          />
        ) : avgQuizScores?.data?.length ? (
          <ChartCard
            title="Average Quiz Scores by Policy"
            controls={
              <label className="d-flex align-items-center gap-2 mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={excludeZero}
                  onChange={(e) => onExcludeZero(e.target.checked)}
                />
                <span className="small text-muted text-nowrap">
                  Exclude zero scores
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
                    value: "Avg Score (%)",
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
                    "Score",
                  ]}
                  labelFormatter={(l) => `Policy: ${l ?? "—"}`}
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
          <ChartEmpty title="Average Quiz Scores by Policy" />
        )}
      </div>

      {/* ── Row 3: Compliance Trend (full width) ───────────────── */}
      <div className="chart-grid chart-grid--one">
        {errors["trend"] ? (
          <ChartError title="Compliance Trend" message={errors["trend"]} />
        ) : complianceTrend?.buckets?.length ? (
          <ChartCard
            title="Compliance Trend"
            subtitle={
              complianceTrend?.total != null
                ? `${formatNumber(complianceTrend.total)} accepted`
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
                    This Month
                  </button>
                  <button
                    type="button"
                    className={`btn ${trendMode === "year" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => onTrendMode("year")}
                  >
                    By Year
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
                    value: "Accepted Records",
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
          <ChartEmpty title="Compliance Trend" />
        )}
      </div>
    </>
  );
}
