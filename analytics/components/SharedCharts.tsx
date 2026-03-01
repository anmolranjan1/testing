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
      <div className="row g-3">
        <div className="col-lg-6">
          {/* Audit Task Status — Donut */}
          {errors["audit"] ? (
            <ChartError title="Audit Tasks" message={errors["audit"]} />
          ) : auditChart?.slices?.length ? (
            <ChartCard
              title="Audit Tasks"
              subtitle={`${formatNumber(auditChart?.total)} total`}
            >
              <ResponsiveContainer width="100%" height={220}>
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
        </div>

        <div className="col-lg-6">
          {/* Quiz Coverage — Pie */}
          {errors["withQuiz"] ? (
            <ChartError
              title="Quiz Availability"
              message={errors["withQuiz"]}
            />
          ) : policiesWithQuiz?.slices?.length ? (
            <ChartCard
              title="Quiz Availability"
              subtitle={`${formatNumber(policiesWithQuiz?.total)} policies`}
            >
              <ResponsiveContainer width="100%" height={220}>
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
              title="Quiz Availability"
              hint="Attach quizzes to policies to see availability."
            />
          )}
        </div>
      </div>

      {/* ── Row 2: Average Quiz Scores (full width) ────────────── */}
      <div className="row g-3 mt-3">
        <div className="col-12">
          {errors["avgQuiz"] ? (
            <ChartError
              title="Average Quiz Scores"
              message={errors["avgQuiz"]}
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
                    Exclude zero scores
                  </span>
                </label>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={avgQuizScores.data}
                  margin={{ left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis
                    dataKey="policyTitle"
                    angle={-20}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    tickFormatter={(v: string) => truncate(v)}
                    label={{
                      value: "Policy",
                      position: "insideBottom",
                      offset: 0,
                      fontSize: 11,
                      fill: "#6c757d",
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}%`}
                    label={{
                      value: "Avg Score (%)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 15,
                      fontSize: 11,
                      fill: "#6c757d",
                    }}
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
      </div>

      {/* ── Row 3: Compliance Trend (full width) ───────────────── */}
      <div className="row g-3 mt-3">
        <div className="col-12">
          {errors["trend"] ? (
            <ChartError title="Compliance Trend" message={errors["trend"]} />
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
                      Weekly
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
                <LineChart
                  data={complianceTrend.buckets}
                  margin={{ left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Period",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: "#6c757d",
                    }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => formatNumber(v)}
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
      </div>
    </>
  );
}
