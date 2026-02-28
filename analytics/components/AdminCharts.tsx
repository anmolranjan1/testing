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
      {/* Row 1: Popular Policies + Policy Categories */}
      <div className="chart-grid chart-grid--two">
        {errors["mostAssigned"] ? (
          <ChartError
            title="Popular Policies"
            message={errors["mostAssigned"]}
          />
        ) : mostAssigned?.length ? (
          <ChartCard
            title="Popular Policies"
            description="Most frequently assigned across the organization"
            controls={
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={topCount}
                  onChange={(e) => onTopChange(e.target.value)}
                >
                  <option value={5}>Show 5</option>
                  <option value={10}>Show 10</option>
                  <option value={20}>Show 20</option>
                </select>
                <label className="d-flex align-items-center gap-1 mb-0 text-nowrap">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => onInactiveToggle(e.target.checked)}
                  />
                  <span className="small text-muted">Include archived</span>
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
                />
                <YAxis
                  dataKey="policyTitle"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Employees assigned",
                  ]}
                  labelFormatter={(l) => `${l ?? "—"}`}
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
          <ChartEmpty title="Popular Policies" />
        )}

        {errors["byCategory"] ? (
          <ChartError
            title="Policy Categories"
            message={errors["byCategory"]}
          />
        ) : policiesByCategory?.data?.length ? (
          <ChartCard
            title="Policy Categories"
            description="How policies are grouped by category"
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
                />
                <YAxis
                  dataKey="categoryName"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Policies",
                  ]}
                  labelFormatter={(l) => `${l ?? "—"}`}
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
          <ChartEmpty title="Policy Categories" />
        )}
      </div>

      {/* Row 2: Department Progress + New Policies Over Time */}
      <div className="chart-grid chart-grid--two">
        {errors["deptCompliance"] ? (
          <ChartError
            title="Department Progress"
            message={errors["deptCompliance"]}
          />
        ) : deptCompliance?.length ? (
          <ChartCard
            title="Department Progress"
            description="Accepted vs pending policies in each department"
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
                  ) => [formatNumber(v), name ?? ""]}
                  labelFormatter={(l) => `${l ?? "—"}`}
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
          <ChartEmpty title="Department Progress" />
        )}

        {errors["rollout"] ? (
          <ChartError
            title="New Policies Over Time"
            message={errors["rollout"]}
          />
        ) : monthlyRollout?.length ? (
          <ChartCard
            title="New Policies Over Time"
            description="Monthly trend of newly created policies"
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
                  label={{
                    value: "Policies",
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
                    "Policies",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#20c997"
                  fill="#20c997"
                  fillOpacity={0.25}
                  name="Policies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartEmpty title="New Policies Over Time" />
        )}
      </div>

      {/* Row 3: Policy Checklists */}
      <div className="chart-grid chart-grid--one">
        {errors["bubble"] ? (
          <ChartError title="Policy Checklists" message={errors["bubble"]} />
        ) : checklistBubble?.length ? (
          <ChartCard
            title="Policy Checklists"
            description="Number of checklist items attached to each policy"
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
                />
                <YAxis
                  dataKey="policyTitle"
                  type="category"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number | undefined) => [
                    formatNumber(v),
                    "Items",
                  ]}
                  labelFormatter={(l) => `${l ?? "—"}`}
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
          <ChartEmpty title="Policy Checklists" />
        )}
      </div>
    </>
  );
}
