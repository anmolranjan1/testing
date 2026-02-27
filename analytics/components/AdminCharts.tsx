import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
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
  MostAssignedPolicy,
  PoliciesByCategoryResponse,
  DepartmentComplianceBar,
  MonthlyRollout,
  ChecklistItemsBubble,
} from "../../../shared/types/analytics";

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdminChartsProps {
  mostAssignedPolicies: MostAssignedPolicy[];
  policiesByCategory: PoliciesByCategoryResponse | null;
  departmentCompliance: DepartmentComplianceBar[];
  monthlyRollout: MonthlyRollout[];
  checklistBubble: ChecklistItemsBubble[];
  errors: Record<string, string>;
  reloadMonthlyRollout: (start?: Date, end?: Date) => Promise<void>;
  reloadMostAssigned: (top: number, includeInactive: boolean) => Promise<void>;
}

/** Convert a period label to a {start,end} range for the rollout API */
const getRolloutDateRange = (period: string): { start?: Date; end?: Date } => {
  const now = new Date();
  const end = now; // always "up to now"
  switch (period) {
    case "6months":
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end };
    case "12months":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 12, 1),
        end,
      };
    case "thisyear":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    default:
      return {}; // "all" → no filter, backend uses its own default
  }
};

/**
 * Admin-only charts: Most Assigned, By Category, Dept Compliance,
 * Monthly Rollout, and Checklist Items.
 *
 * Filters exposed (matching backend params):
 *  - Most Assigned: `top` count (5/10/20) + `includeInactive` toggle
 *  - Monthly Rollout: time-range dropdown (All / 6mo / 12mo / This Year)
 */
export function AdminCharts({
  mostAssignedPolicies,
  policiesByCategory,
  departmentCompliance,
  monthlyRollout,
  checklistBubble,
  errors,
  reloadMonthlyRollout,
  reloadMostAssigned,
}: AdminChartsProps) {
  // ── Filter state ────────────────────────────────────────────────
  const [rolloutPeriod, setRolloutPeriod] = useState("all");
  const [topCount, setTopCount] = useState(10);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Reload rollout chart when user picks a different time window
  const handleRolloutPeriodChange = (period: string) => {
    setRolloutPeriod(period);
    const { start, end } = getRolloutDateRange(period);
    reloadMonthlyRollout(start, end);
  };

  // Reload most-assigned when "Show Top" count changes
  const handleTopCountChange = (value: string) => {
    const count = parseInt(value) || 10;
    setTopCount(count);
    reloadMostAssigned(count, includeInactive);
  };

  // Reload most-assigned when "Include Inactive" is toggled
  const handleIncludeInactiveChange = (checked: boolean) => {
    setIncludeInactive(checked);
    reloadMostAssigned(topCount, checked);
  };

  return (
    <>
      {/* ── Row 1: Most Assigned Policies + Policies by Category ─────── */}
      <ChartRow>
        {/* Horizontal bar — long policy titles read easily on the Y‑axis */}
        <ChartColumn size="col-lg-6">
          {errors["mostAssigned"] ? (
            <ErrorCard
              title="Most Assigned Policies"
              error={errors["mostAssigned"]}
            />
          ) : mostAssignedPolicies?.length ? (
            <ChartCard
              title="Most Assigned Policies"
              controls={
                <div className="d-flex align-items-center gap-2">
                  {/* Top count selector — backend `top` param */}
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={topCount}
                    onChange={(e) => handleTopCountChange(e.target.value)}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                  </select>
                  {/* Include inactive toggle — backend `includeInactive` param */}
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includeInactiveSwitch"
                      checked={includeInactive}
                      onChange={(e) =>
                        handleIncludeInactiveChange(e.target.checked)
                      }
                    />
                    <label
                      className="form-check-label small text-nowrap"
                      htmlFor="includeInactiveSwitch"
                    >
                      Include Inactive
                    </label>
                  </div>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={320}>
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
                      formatNumber(value),
                      "Assignments",
                    ]}
                    labelFormatter={(label) => `Policy: ${label ?? "Unknown"}`}
                  />
                  <Bar
                    dataKey="assignmentCount"
                    fill="#6f42c1"
                    radius={[0, 4, 4, 0]}
                    name="Assignments"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Most Assigned Policies" />
          )}
        </ChartColumn>

        <ChartColumn size="col-lg-6">
          {errors["byCategory"] ? (
            <ErrorCard
              title="Policies by Category"
              error={errors["byCategory"]}
            />
          ) : policiesByCategory?.data?.length ? (
            <ChartCard title="Policies by Category">
              <ResponsiveContainer width="100%" height={320}>
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
                      formatNumber(value),
                      "Policies",
                    ]}
                    labelFormatter={(label) => `Category: ${label ?? "Unknown"}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="#fd7e14"
                    radius={[0, 4, 4, 0]}
                    name="Policies"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <EmptyCard title="Policies by Category" />
          )}
        </ChartColumn>
      </ChartRow>

      {/* ── Row 2: Department Compliance (stacked) + Monthly Rollout ──── */}
      <ChartRow>
        {/* Stacked horizontal bar — shows accepted vs pending per department */}
        <ChartColumn size="col-lg-6">
          {errors["deptCompliance"] ? (
            <ErrorCard
              title="Compliance by Department"
              error={errors["deptCompliance"]}
            />
          ) : departmentCompliance?.length ? (
            <ChartCard title="Compliance by Department">
              <ResponsiveContainer width="100%" height={320}>
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
                    ) => [`${formatNumber(value)} record(s)`, name ?? ""]}
                    labelFormatter={(label) => `Dept: ${label ?? "Unknown"}`}
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
            </ChartCard>
          ) : (
            <EmptyCard title="Compliance by Department" />
          )}
        </ChartColumn>

        {/* Area chart — monthly policy rollout with time‑range filter */}
        <ChartColumn size="col-lg-6">
          {errors["rollout"] ? (
            <ErrorCard
              title="Monthly Policy Rollout"
              error={errors["rollout"]}
            />
          ) : monthlyRollout?.length ? (
            <ChartCard
              title="Monthly Policy Rollout"
              controls={
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={rolloutPeriod}
                  onChange={(e) => handleRolloutPeriodChange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="thisyear">This Year</option>
                </select>
              }
            >
              <ResponsiveContainer width="100%" height={320}>
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
                      formatNumber(value),
                      "Policies",
                    ]}
                    labelFormatter={(label) => `Month: ${label ?? "Unknown"}`}
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
            </ChartCard>
          ) : (
            <EmptyCard title="Monthly Policy Rollout" />
          )}
        </ChartColumn>
      </ChartRow>

      {/* ── Row 3: Checklist Items per Policy (bubble chart) ────────── */}
      <ChartRow>
        <ChartColumn>
          {errors["bubble"] ? (
            <ErrorCard
              title="Checklist Items per Policy"
              error={errors["bubble"]}
            />
          ) : checklistBubble?.length ? (
            (() => {
              const bubbleData = checklistBubble.map((item, idx) => ({
                x: idx + 1,
                itemCount: item.itemCount ?? 0,
                bubbleSize: item.bubbleSize || item.itemCount || 1,
                policyTitle: item.policyTitle ?? `Policy #${item.policyId ?? idx + 1}`,
              }));
              return (
                <ChartCard title="Checklist Items per Policy">
                  <ResponsiveContainer width="100%" height={360}>
                    <ScatterChart
                      margin={{ left: 20, bottom: 40, right: 20, top: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Policy"
                        domain={[0.5, bubbleData.length + 0.5]}
                        ticks={bubbleData.map((_, i) => i + 1)}
                        tickFormatter={(value: number) => {
                          const item = bubbleData[value - 1];
                          if (!item) return "";
                          const title = item.policyTitle ?? "";
                          return title.length > 18
                            ? title.substring(0, 18) + "\u2026"
                            : title;
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
                          const d = payload[0].payload as (typeof bubbleData)[0];
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
                              <strong>{d?.policyTitle ?? "Unknown Policy"}</strong>
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
                </ChartCard>
              );
            })()
          ) : (
            <EmptyCard title="Checklist Items per Policy" />
          )}
        </ChartColumn>
      </ChartRow>
    </>
  );
}
