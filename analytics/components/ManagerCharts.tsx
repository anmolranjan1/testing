import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard, ChartEmpty, ChartError } from "./ChartComponents";
import { formatNumber } from "../../../shared/utils/formatNumber";
import type {
  TeamQuizHistogram,
  TeamPendingPolicy,
  TeamTopPerformer,
} from "../../../shared/types/analytics";

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  teamHistogram: TeamQuizHistogram | null;
  teamPending: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];
  errors: Record<string, string>;
  reloading: Record<string, boolean>;
  reloadHistogram: (binSize: number, policyId?: number) => Promise<void>;
  reloadTopPerformers: (
    top: number,
    minAttempts: number,
    policyId?: number,
  ) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────

export default function ManagerCharts({
  teamHistogram,
  teamPending,
  teamTopPerformers,
  errors,
  reloading,
  reloadHistogram,
  reloadTopPerformers,
}: Props) {
  const [histPolicy, setHistPolicy] = useState<number | undefined>();
  const [perfPolicy, setPerfPolicy] = useState<number | undefined>();

  const onHistPolicyChange = (v: string) => {
    const id = v === "" ? undefined : Number(v);
    setHistPolicy(id);
    reloadHistogram(10, id);
  };

  const onPerfPolicyChange = (v: string) => {
    const id = v === "" ? undefined : Number(v);
    setPerfPolicy(id);
    reloadTopPerformers(10, 1, id);
  };

  // Build policy options from pending list
  const policyOptions = (teamPending ?? []).map((p) => ({
    id: p?.policyId ?? 0,
    title: p?.policyTitle ?? `Policy #${p?.policyId ?? "?"}`,
  }));

  // Reusable policy filter dropdown
  const renderPolicySelect = (
    value: number | undefined,
    onChange: (v: string) => void,
    disabled?: boolean,
  ) =>
    policyOptions.length > 0 ? (
      <select
        className="form-select form-select-sm"
        style={{ width: "auto" }}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">All Policies</option>
        {policyOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <>
      {/* ── Row 1: Histogram + Top Performers ──────────────────── */}
      <div className="chart-grid chart-grid--two">
        {/* Quiz Score Distribution */}
        {errors["histogram"] ? (
          <ChartError
            title="Quiz Score Distribution"
            message={errors["histogram"]}
          />
        ) : teamHistogram?.bins?.length ? (
          <ChartCard
            title="Quiz Score Distribution"
            subtitle={`${formatNumber(teamHistogram?.totalAssignments)} submissions`}
            description="Shows how your team's quiz scores are spread — most bars should lean right"
            isLoading={reloading["histogram"]}
            controls={renderPolicySelect(
              histPolicy,
              onHistPolicyChange,
              reloading["histogram"],
            )}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={(teamHistogram.bins ?? []).map((b) => ({
                  range: `${b?.lowerBound ?? 0}–${b?.upperBound ?? 0}%`,
                  count: b?.count ?? 0,
                }))}
                margin={{ bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Score Range",
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
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} submissions`,
                    "Count",
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
          <ChartEmpty
            title="Quiz Score Distribution"
            hint="Team members need to take quizzes for this histogram."
          />
        )}

        {/* Top Performers — Table */}
        {errors["topPerf"] ? (
          <ChartError title="Top Performers" message={errors["topPerf"]} />
        ) : teamTopPerformers?.length ? (
          <ChartCard
            title="Top Performers"
            description="Team members with the highest average quiz scores"
            isLoading={reloading["topPerf"]}
            controls={renderPolicySelect(
              perfPolicy,
              onPerfPolicyChange,
              reloading["topPerf"],
            )}
          >
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Avg Score</th>
                    <th>Attempts</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {(teamTopPerformers ?? []).map((p, i) => (
                    <tr key={p?.userId ?? i}>
                      <td className="perf-table__rank">{i + 1}</td>
                      <td>
                        <div className="fw-medium">{p?.name ?? "—"}</div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {p?.email ?? ""}
                        </div>
                      </td>
                      <td className="fw-semibold">
                        {(p?.averageScore ?? 0).toFixed(1)}%
                      </td>
                      <td>{p?.attempts ?? 0}</td>
                      <td>
                        <div className="perf-table__score-bar">
                          <div
                            className="perf-table__score-fill"
                            style={{
                              width: `${Math.min(p?.averageScore ?? 0, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        ) : (
          <ChartEmpty
            title="Top Performers"
            hint="Encourage your team to take quizzes to see top scorers."
          />
        )}
      </div>

      {/* ── Row 2: Pending Policies (full width) ───────────────── */}
      <div className="chart-grid chart-grid--one">
        {errors["pending"] ? (
          <ChartError
            title="Pending Policy Acceptances"
            message={errors["pending"]}
          />
        ) : teamPending?.length ? (
          <ChartCard
            title="Pending Policy Acceptances"
            description="Policies your team members haven't accepted yet — longer bars need attention"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={teamPending}
                layout="vertical"
                margin={{ left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Employees Pending",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <YAxis
                  dataKey="policyTitle"
                  type="category"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} employees haven't accepted yet`,
                    "Pending",
                  ]}
                  labelFormatter={(label) => `${label ?? "—"}`}
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
          <ChartEmpty
            title="Pending Policy Acceptances"
            hint="No pending acceptances found — your team is up to date!"
          />
        )}
      </div>
    </>
  );
}
