import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  TeamQuizHistogram,
  TeamPendingPolicy,
  TeamTopPerformer,
} from "../../../shared/types/analytics";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ManagerChartsProps {
  teamQuizHistogram: TeamQuizHistogram | null;
  teamPendingPolicies: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];
  errors: Record<string, string>;
  reloadHistogram: (binSize: number, policyId?: number) => Promise<void>;
  reloadTopPerformers: (
    top: number,
    minAttempts: number,
    policyId?: number,
  ) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Manager-only charts: Quiz Histogram, Top Performers, and Pending Policies.
 *
 * Filters exposed (matching backend params):
 *  - Histogram: `policyId` dropdown (optional)
 *  - Top Performers: `policyId` dropdown (optional)
 *  Backend also supports `binSize`, `top`, `minAttempts` — kept at sensible defaults.
 */
export function ManagerCharts({
  teamQuizHistogram,
  teamPendingPolicies,
  teamTopPerformers,
  errors,
  reloadHistogram,
  reloadTopPerformers,
}: ManagerChartsProps) {
  // Per-chart filter state — lives here, not in the parent
  const [histogramPolicyFilter, setHistogramPolicyFilter] = useState<
    number | undefined
  >();
  const [topPerfPolicyFilter, setTopPerfPolicyFilter] = useState<
    number | undefined
  >();

  // Reload histogram when user picks a different policy filter
  const handleHistogramPolicyChange = (policyId: string) => {
    const id = policyId === "" ? undefined : parseInt(policyId);
    setHistogramPolicyFilter(id);
    reloadHistogram(10, id);
  };

  // Reload top-performers when user picks a different policy filter
  const handleTopPerfPolicyChange = (policyId: string) => {
    const id = policyId === "" ? undefined : parseInt(policyId);
    setTopPerfPolicyFilter(id);
    reloadTopPerformers(10, 1, id);
  };

  /** Reusable policy dropdown — used for histogram & top performers charts.
   *  Uses teamPendingPolicies as a source of known team-relevant policies. */
  const policyDropdown = (
    value: number | undefined,
    onChange: (val: string) => void,
  ) =>
    teamPendingPolicies?.length ? (
      <select
        className="form-select form-select-sm"
        style={{ width: "auto" }}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All Policies</option>
        {teamPendingPolicies.map((p) => (
          <option key={p.policyId ?? 0} value={p.policyId ?? 0}>
            {p.policyTitle ?? `Policy #${p.policyId ?? "?"}`}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <>
      {/* ── Row 1: Quiz Score Histogram + Top Performers ─────────── */}
      <ChartRow>
        {/* Histogram — score ranges on X-axis, count on Y-axis */}
        <ChartColumn size="col-lg-6">
          {errors["histogram"] ? (
            <ErrorCard
              title="Team Quiz Score Distribution"
              error={errors["histogram"]}
            />
          ) : teamQuizHistogram?.bins?.length ? (
            <ChartCard
              title="Team Quiz Score Distribution"
              controls={policyDropdown(
                histogramPolicyFilter,
                handleHistogramPolicyChange,
              )}
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={teamQuizHistogram.bins.map((b) => ({
                    range: `${b.lowerBound}-${b.upperBound}`,
                    count: b.count,
                  }))}
                  margin={{ left: 5, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Score Range",
                      position: "insideBottom",
                      offset: -2,
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
                      offset: 10,
                      fontSize: 11,
                      fill: "#6c757d",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      formatNumber(value),
                      "Submissions",
                    ]}
                    labelFormatter={(label) => `Score: ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="#6610f2"
                    radius={[4, 4, 0, 0]}
                    name="Submissions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Team Quiz Score Distribution" />
          )}
        </ChartColumn>

        {/* Horizontal bar — team members ranked by average quiz score */}
        <ChartColumn size="col-lg-6">
          {errors["topPerf"] ? (
            <ErrorCard title="Top Team Performers" error={errors["topPerf"]} />
          ) : teamTopPerformers?.length ? (
            <ChartCard
              title="Top Team Performers"
              controls={policyDropdown(
                topPerfPolicyFilter,
                handleTopPerfPolicyChange,
              )}
            >
              <ResponsiveContainer width="100%" height={320}>
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
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar
                    dataKey="averageScore"
                    fill="#198754"
                    radius={[0, 4, 4, 0]}
                    name="Avg Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Top Team Performers" />
          )}
        </ChartColumn>
      </ChartRow>

      {/* ── Row 2: Team Pending Policies (full width) ──────────────── */}
      <ChartRow>
        <ChartColumn>
          {errors["pending"] ? (
            <ErrorCard
              title="Team Pending Policies"
              error={errors["pending"]}
            />
          ) : teamPendingPolicies?.length ? (
            <ChartCard title="Team Pending Policies">
              <ResponsiveContainer width="100%" height={320}>
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
                      `${formatNumber(value)} employee(s)`,
                      "Pending",
                    ]}
                    labelFormatter={(label) => `Policy: ${label ?? "Unknown"}`}
                  />
                  <Bar
                    dataKey="pendingCount"
                    fill="#ffc107"
                    radius={[0, 4, 4, 0]}
                    name="Pending"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Team Pending Policies" />
          )}
        </ChartColumn>
      </ChartRow>
    </>
  );
}
