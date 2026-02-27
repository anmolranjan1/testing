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
import { useState } from "react";
import {
  ErrorCard,
  EmptyCard,
  ChartCard,
  ChartRow,
  ChartColumn,
} from "./ChartComponents";
import { formatNumber } from "../../../shared/utils/formatNumber";
import type {
  AuditTaskStatusChart,
  AverageQuizScoreResponse,
  PoliciesWithQuizPieResponse,
  ComplianceTrendResponse,
} from "../../../shared/types/analytics";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SharedChartsProps {
  auditChart: AuditTaskStatusChart | null;
  averageQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;
  errors: Record<string, string>;
  reloadTrend: (mode: string, year?: number) => Promise<void>;
  reloadQuizScores: (excludeZero: boolean) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

const QUIZ_PIE_COLORS = ["#198754", "#dc3545"]; // With Quiz, Without Quiz

// ─── Component ────────────────────────────────────────────────────────────────

/** Generate year options for the trend year picker (current year back 4 years) */
const buildYearOptions = (): number[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
};

/**
 * Charts visible to both ADMIN and MANAGER roles:
 * Audit Donut, Quiz Coverage Pie, Average Quiz Scores, Compliance Trend.
 *
 * Filters exposed (matching backend params):
 *  - Avg Quiz Scores: `excludeZero` toggle (boolean)
 *  - Compliance Trend: `mode` toggle ("month" / "year") + `year` picker
 */
export function SharedCharts({
  auditChart,
  averageQuizScores,
  policiesWithQuiz,
  complianceTrend,
  errors,
  reloadTrend,
  reloadQuizScores,
}: SharedChartsProps) {
  const [trendMode, setTrendMode] = useState<"month" | "year">("month");
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
  const [excludeZero, setExcludeZero] = useState(true);

  /**
   * Switch between "month" (current month, weekly buckets) and
   * "year" (selected year, monthly buckets).
   * Backend mode: "month" = this month weekly, "year" = year-to-date monthly.
   */
  const handleTrendModeChange = (mode: "month" | "year") => {
    setTrendMode(mode);
    // Pass year only in "year" mode — backend uses it for yearToDateMonthly
    reloadTrend(mode, mode === "year" ? trendYear : undefined);
  };

  /** Change the year for yearly trend view — backend `year` param */
  const handleTrendYearChange = (year: number) => {
    setTrendYear(year);
    reloadTrend("year", year);
  };

  // Toggle whether zero-score quiz results are included
  const handleExcludeZeroChange = (exclude: boolean) => {
    setExcludeZero(exclude);
    reloadQuizScores(exclude);
  };

  return (
    <>
      {/* ── Row 1: Audit Donut + Quiz Pie (side by side) ───────────── */}
      <ChartRow>
        {/* Donut — breakdown of audit tasks: Pending / In Progress / Completed */}
        <ChartColumn size="col-lg-6">
          {errors["audit"] ? (
            <ErrorCard title="Audit Task Status" error={errors["audit"]} />
          ) : auditChart?.slices?.length ? (
            <ChartCard
              title={`Audit Task Status (${formatNumber(auditChart.total)} total)`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={auditChart.slices.map((s) => ({
                      name: STATUS_LABELS[s.status] ?? s.status ?? "Unknown",
                      value: s.count ?? 0,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
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
                      `${formatNumber(value)} task(s)`,
                      "Tasks",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Audit Task Status" />
          )}
        </ChartColumn>

        {/* Pie — policies with quiz vs without quiz */}
        <ChartColumn size="col-lg-6">
          {errors["withQuiz"] ? (
            <ErrorCard
              title="Policies With vs Without Quiz"
              error={errors["withQuiz"]}
            />
          ) : policiesWithQuiz?.slices?.length ? (
            <ChartCard
              title={`Quiz Coverage (${formatNumber(policiesWithQuiz.total)} policies)`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={policiesWithQuiz.slices.map((s) => ({
                      name: s.label ?? "Unknown",
                      value: s.count ?? 0,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {QUIZ_PIE_COLORS.map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `${formatNumber(value)} policy/policies`,
                      "Count",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Policies With vs Without Quiz" />
          )}
        </ChartColumn>
      </ChartRow>

      {/* ── Row 2: Average Quiz Scores by Policy (full width) ──────── */}
      <ChartRow>
        <ChartColumn>
          {errors["avgQuiz"] ? (
            <ErrorCard
              title="Average Quiz Scores by Policy"
              error={errors["avgQuiz"]}
            />
          ) : averageQuizScores?.data?.length ? (
            <ChartCard
              title="Average Quiz Scores by Policy"
              controls={
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="excludeZeroSwitch"
                    checked={excludeZero}
                    onChange={(e) => handleExcludeZeroChange(e.target.checked)}
                  />
                  <label
                    className="form-check-label small"
                    htmlFor="excludeZeroSwitch"
                  >
                    Exclude Zero Scores
                  </label>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={averageQuizScores.data} margin={{ bottom: 5 }}>
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
                    labelFormatter={(label) => `Policy: ${label ?? "Unknown"}`}
                  />
                  <Bar
                    dataKey="averageScore"
                    fill="#17a2b8"
                    radius={[4, 4, 0, 0]}
                    name="Avg Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Average Quiz Scores by Policy" />
          )}
        </ChartColumn>
      </ChartRow>

      {/* ── Row 3: Compliance Trend (area chart, full width) ───────── */}
      <ChartRow>
        <ChartColumn>
          {errors["trend"] ? (
            <ErrorCard title="Compliance Trend" error={errors["trend"]} />
          ) : complianceTrend?.buckets?.length ? (
            <ChartCard
              title={`Compliance Trend${complianceTrend?.total != null ? ` (${formatNumber(complianceTrend.total)} accepted)` : ""}`}
              controls={
                <div className="d-flex align-items-center gap-2">
                  {/* Mode toggle — "month" = weekly view of current month,
                      "year" = monthly view of a selected year */}
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${trendMode === "month" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => handleTrendModeChange("month")}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className={`btn ${trendMode === "year" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => handleTrendModeChange("year")}
                    >
                      By Year
                    </button>
                  </div>
                  {/* Year picker — only visible when in "year" mode.
                      Backend param: `year` (Integer, optional) */}
                  {trendMode === "year" && (
                    <select
                      className="form-select form-select-sm"
                      style={{ width: "auto" }}
                      value={trendYear}
                      onChange={(e) =>
                        handleTrendYearChange(parseInt(e.target.value))
                      }
                    >
                      {buildYearOptions().map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={320}>
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
                      `${formatNumber(value)}`,
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
            </ChartCard>
          ) : (
            <EmptyCard title="Compliance Trend" />
          )}
        </ChartColumn>
      </ChartRow>
    </>
  );
}
