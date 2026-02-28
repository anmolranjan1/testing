import { useState } from "react";
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
} from "recharts";
import { ChartCard, ChartEmpty, ChartError } from "./ChartComponents";
import { formatNumber } from "../../../shared/utils/formatNumber";
import type {
  MostAssignedPolicy,
  PoliciesByCategoryResponse,
  DepartmentComplianceBar,
  MonthlyRollout,
  ChecklistItemsBubble,
} from "../../../shared/types/analytics";

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  mostAssigned: MostAssignedPolicy[];
  policiesByCategory: PoliciesByCategoryResponse | null;
  deptCompliance: DepartmentComplianceBar[];
  monthlyRollout: MonthlyRollout[];
  checklistBubble: ChecklistItemsBubble[];
  errors: Record<string, string>;
  reloadMostAssigned: (top: number, includeInactive: boolean) => Promise<void>;
  reloadRollout: (start?: Date, end?: Date) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────

const rolloutRange = (period: string): { start?: Date; end?: Date } => {
  const now = new Date();
  switch (period) {
    case "6m":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        end: now,
      };
    case "12m":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 12, 1),
        end: now,
      };
    case "ytd":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    default:
      return {};
  }
};

// ─── Component ────────────────────────────────────────────────────

export default function AdminCharts({
  mostAssigned,
  policiesByCategory,
  deptCompliance,
  monthlyRollout,
  checklistBubble,
  errors,
  reloadMostAssigned,
  reloadRollout,
}: Props) {
  const [topCount, setTopCount] = useState(10);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [rolloutPeriod, setRolloutPeriod] = useState("all");

  const onTopChange = (v: string) => {
    const n = parseInt(v) || 10;
    setTopCount(n);
    reloadMostAssigned(n, includeInactive);
  };
  const onInactiveToggle = (v: boolean) => {
    setIncludeInactive(v);
    reloadMostAssigned(topCount, v);
  };
  const onRolloutChange = (v: string) => {
    setRolloutPeriod(v);
    const { start, end } = rolloutRange(v);
    reloadRollout(start, end);
  };

  return (
    <>
      {/* ── Row 1: Most Assigned + Policies by Category ────────── */}
      <div className="chart-grid chart-grid--two">
        {/* Most Assigned */}
        {errors["mostAssigned"] ? (
          <ChartError
            title="Most Assigned Policies"
            message={errors["mostAssigned"]}
          />
        ) : mostAssigned?.length ? (
          <ChartCard
            title="Most Assigned Policies"
            description="Policies assigned to the most employees — helps identify high-impact policies"
            controls={
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={topCount}
                  onChange={(e) => onTopChange(e.target.value)}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
                <label className="d-flex align-items-center gap-1 mb-0 text-nowrap">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => onInactiveToggle(e.target.checked)}
                  />
                  <span className="small text-muted">Show inactive</span>
                </label>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={mostAssigned}
                layout="vertical"
                margin={{ left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Number of Employees Assigned",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <YAxis
                  dataKey="policyTitle"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} employees`,
                    "Assigned to",
                  ]}
                  labelFormatter={(label) => `${label ?? "—"}`}
                />
                <Bar
                  dataKey="assignmentCount"
                  fill="#6f42c1"
                  radius={[0, 4, 4, 0]}
                  name="Employees Assigned"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Most Assigned Policies" />
        )}

        {/* Policies by Category */}
        {errors["byCategory"] ? (
          <ChartError
            title="Policies by Category"
            message={errors["byCategory"]}
          />
        ) : policiesByCategory?.data?.length ? (
          <ChartCard
            title="Policies by Category"
            description="Number of policies grouped by their category"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={policiesByCategory.data}
                layout="vertical"
                margin={{ left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Number of Policies",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <YAxis
                  dataKey="categoryName"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} policies`,
                    "Count",
                  ]}
                  labelFormatter={(label) => `${label ?? "—"}`}
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
          <ChartEmpty title="Policies by Category" />
        )}
      </div>

      {/* ── Row 2: Dept Compliance + Monthly Rollout ───────────── */}
      <div className="chart-grid chart-grid--two">
        {/* Department Compliance — Stacked */}
        {errors["deptCompliance"] ? (
          <ChartError
            title="Compliance by Department"
            message={errors["deptCompliance"]}
          />
        ) : deptCompliance?.length ? (
          <ChartCard
            title="Compliance by Department"
            description="Accepted vs. pending policy acceptances in each department"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={deptCompliance}
                layout="vertical"
                margin={{ left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Number of Records",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "#6c757d",
                  }}
                />
                <YAxis
                  dataKey="depName"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(
                    v: number | undefined,
                    name: string | undefined,
                  ) => [`${formatNumber(v)} records`, name ?? ""]}
                  labelFormatter={(label) => `${label ?? "—"}`}
                />
                <Bar
                  dataKey="accepted"
                  stackId="dep"
                  fill="#198754"
                  name="Accepted"
                />
                <Bar
                  dataKey="pending"
                  stackId="dep"
                  fill="#ffc107"
                  name="Pending"
                  radius={[0, 4, 4, 0]}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Compliance by Department" />
        )}

        {/* Monthly Rollout — Area */}
        {errors["rollout"] ? (
          <ChartError
            title="New Policies Over Time"
            message={errors["rollout"]}
          />
        ) : monthlyRollout?.length ? (
          <ChartCard
            title="New Policies Over Time"
            description="How many new policies were created each month"
            controls={
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={rolloutPeriod}
                onChange={(e) => onRolloutChange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
                <option value="ytd">This Year</option>
              </select>
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyRollout}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatNumber(v)}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    `${formatNumber(v)} policies`,
                    "Created",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#20c997"
                  fill="#20c997"
                  fillOpacity={0.25}
                  name="Policies Created"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="New Policies Over Time" />
        )}
      </div>

      {/* ── Row 3: Checklist Items per Policy (full width) ─────── */}
      <div className="chart-grid chart-grid--one">
        {errors["bubble"] ? (
          <ChartError
            title="Checklist Items per Policy"
            message={errors["bubble"]}
          />
        ) : checklistBubble?.length ? (
          <ChartCard
            title="Checklist Items per Policy"
            description="How many checklist items each policy has — more items means more steps for employees"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={checklistBubble}
                layout="vertical"
                margin={{ left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Number of Checklist Items",
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
                    `${formatNumber(v)} items`,
                    "Checklist",
                  ]}
                  labelFormatter={(label) => `${label ?? "—"}`}
                />
                <Bar
                  dataKey="itemCount"
                  fill="#e83e8c"
                  radius={[0, 4, 4, 0]}
                  name="Checklist Items"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="Checklist Items per Policy" />
        )}
      </div>
    </>
  );
}
