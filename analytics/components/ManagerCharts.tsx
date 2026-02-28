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

interface Props {
  teamHistogram: TeamQuizHistogram | null;
  teamPending: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];
  errors: Record<string, string>;
  reloadHistogram: (binSize: number, policyId?: number) => Promise<void>;
  reloadTopPerformers: (
    top: number,
    minAttempts: number,
    policyId?: number,
  ) => Promise<void>;
}

export default function ManagerCharts({
  teamHistogram,
  teamPending,
  teamTopPerformers,
  errors,
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

  const policyOptions = (teamPending ?? []).map((p) => ({
    id: p?.policyId ?? 0,
    title: p?.policyTitle ?? `Policy #${p?.policyId ?? "?"}`,
  }));

  const renderPolicySelect = (
    value: number | undefined,
    onChange: (v: string) => void,
  ) =>
    policyOptions.length > 0 ? (
      <select
        className="form-select form-select-sm"
        style={{ width: "auto" }}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
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
      {/* Row 1: Score Distribution + Top Performers */}
      <div className="chart-grid chart-grid--two">
        {errors["histogram"] ? (
          <ChartError
            title="Score Distribution"
            message={errors["histogram"]}
          />
        ) : teamHistogram?.bins?.length ? (
          <ChartCard
            title="Score Distribution"
            description="How your team scored across quizzes"
            subtitle={`${formatNumber(teamHistogram?.totalAssignments)} submissions`}
            controls={renderPolicySelect(histPolicy, onHistPolicyChange)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={(teamHistogram.bins ?? []).map((b) => ({
                  range: `${b?.lowerBound ?? 0}\u2013${b?.upperBound ?? 0}`,
                  count: b?.count ?? 0,
                }))}
                margin={{ bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Score Range",
                    position: "insideBottom",
                    offset: -5,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  label={{
                    value: "People",
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
                    "Submissions",
                  ]}
                  labelFormatter={(l) => `Score: ${l}`}
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
          <ChartEmpty title="Score Distribution" />
        )}

        {errors["topPerf"] ? (
          <ChartError title="Top Performers" message={errors["topPerf"]} />
        ) : teamTopPerformers?.length ? (
          <ChartCard
            title="Top Performers"
            description="Team members with the highest quiz scores"
            controls={renderPolicySelect(perfPolicy, onPerfPolicyChange)}
          >
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Avg Score</th>
                    <th>Quizzes</th>
                    <th style={{ minWidth: 80 }}></th>
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
          <ChartEmpty title="Top Performers" />
        )}
      </div>

      {/* Row 2: Pending Approvals */}
      <div className="chart-grid chart-grid--one">
        {errors["pending"] ? (
          <ChartError title="Pending Approvals" message={errors["pending"]} />
        ) : teamPending?.length ? (
          <ChartCard
            title="Pending Approvals"
            description="Policies your team hasn't accepted yet"
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
                />
                <YAxis
                  dataKey="policyTitle"
                  type="category"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} employee(s)`,
                    "Still pending",
                  ]}
                  labelFormatter={(l) => `${l ?? "—"}`}
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
          <ChartEmpty title="Pending Approvals" />
        )}
      </div>
    </>
  );
}
