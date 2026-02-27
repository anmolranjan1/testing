import { useState, useEffect } from "react";
import { parseError } from "../../../shared/utils/errorParser";
import {
  getDashboardSummary,
  getAuditTaskStatus,
  getAverageQuizScores,
  getPoliciesWithQuiz,
  getComplianceTrend,
  getMostAssignedPolicies,
  getPoliciesByCategory,
  getDepartmentCompliance,
  getMonthlyRollout,
  getChecklistItemsBubble,
  getTeamQuizHistogram,
  getTeamPendingPolicies,
  getTeamTopPerformers,
} from "../analyticsApi";
import type {
  DashboardSummary,
  AuditTaskStatusChart,
  AverageQuizScoreResponse,
  PoliciesWithQuizPieResponse,
  ComplianceTrendResponse,
  MostAssignedPolicy,
  PoliciesByCategoryResponse,
  DepartmentComplianceBar,
  MonthlyRollout,
  ChecklistItemsBubble,
  TeamQuizHistogram,
  TeamPendingPolicy,
  TeamTopPerformer,
} from "../../../shared/types/analytics";

// ─── State shape ──────────────────────────────────────────────────────────────
export interface AnalyticsState {
  // General
  summary: DashboardSummary | null;
  loading: boolean;

  // Shared Charts
  auditChart: AuditTaskStatusChart | null;
  averageQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;

  // Admin Charts
  mostAssignedPolicies: MostAssignedPolicy[];
  policiesByCategory: PoliciesByCategoryResponse | null;
  departmentCompliance: DepartmentComplianceBar[];
  monthlyRollout: MonthlyRollout[];
  checklistBubble: ChecklistItemsBubble[];

  // Manager Charts
  teamQuizHistogram: TeamQuizHistogram | null;
  teamPendingPolicies: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];

  // Error tracking — key matches the API name (e.g. "audit", "rollout")
  errors: Record<string, string>;
}

interface UseAnalyticsDataOptions {
  userId: number;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "USER";
}

/**
 * Central hook that fetches ALL analytics data for the dashboard.
 *
 * Design decisions:
 * - Each API is wrapped in `loadSafely` so one failure never blocks others.
 * - Data loads in 3 phases: summary → shared charts → role-specific charts.
 * - Reload functions let child components re-fetch a single chart without
 *   re-loading the entire dashboard (e.g. when user changes a filter).
 */
export const useAnalyticsData = ({ userId, role }: UseAnalyticsDataOptions) => {
  const [state, setState] = useState<AnalyticsState>({
    summary: null,
    loading: true,
    auditChart: null,
    averageQuizScores: null,
    policiesWithQuiz: null,
    complianceTrend: null,
    mostAssignedPolicies: [],
    policiesByCategory: null,
    departmentCompliance: [],
    monthlyRollout: [],
    checklistBubble: [],
    teamQuizHistogram: null,
    teamPendingPolicies: [],
    teamTopPerformers: [],
    errors: {},
  });

  /**
   * Wrap an API call so it never throws.
   * On failure the error message is stored in `state.errors[key]`.
   * On success any previous error for that key is cleared.
   */
  const loadSafely = async <T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      const result = await loader();
      // Clear any previous error for this key
      setState((prev) => {
        const errors = { ...prev.errors };
        delete errors[key];
        return { ...prev, errors };
      });
      return result;
    } catch (error) {
      const msg = parseError(error);
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [key]: msg,
        },
      }));
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  };

  const loadDashboardData = async () => {
    if (!userId) return;

    setState((prev) => ({
      ...prev,
      loading: true,
    }));

    try {
      // Phase 1: Summary cards (shown for all roles)
      const summaryData = await loadSafely("summary", () =>
        getDashboardSummary(userId),
      );
      setState((prev) => ({ ...prev, summary: summaryData }));

      // Phase 2: Shared charts visible to both ADMIN and MANAGER
      if (role === "ADMIN" || role === "MANAGER") {
        const [auditData, avgQuiz, withQuiz, trend] = await Promise.all([
          loadSafely("audit", () => getAuditTaskStatus(userId)),
          loadSafely("avgQuiz", () => getAverageQuizScores(userId, true)),
          loadSafely("withQuiz", () => getPoliciesWithQuiz(userId)),
          loadSafely("trend", () => getComplianceTrend(userId, "month")),
        ]);

        setState((prev) => ({
          ...prev,
          auditChart: auditData,
          averageQuizScores: avgQuiz,
          policiesWithQuiz: withQuiz,
          complianceTrend: trend,
        }));
      }

      // Phase 3a: Admin-only charts (org-wide data)
      if (role === "ADMIN") {
        const [mostAssigned, byCategory, deptCompliance, rollout, bubble] =
          await Promise.all([
            loadSafely("mostAssigned", () =>
              getMostAssignedPolicies(10, false),
            ),
            loadSafely("byCategory", () => getPoliciesByCategory(userId)),
            loadSafely("deptCompliance", () => getDepartmentCompliance()),
            loadSafely("rollout", () => getMonthlyRollout()),
            loadSafely("bubble", () => getChecklistItemsBubble()),
          ]);

        setState((prev) => ({
          ...prev,
          mostAssignedPolicies: mostAssigned || [],
          policiesByCategory: byCategory,
          departmentCompliance: deptCompliance || [],
          monthlyRollout: rollout || [],
          checklistBubble: bubble || [],
        }));
      }

      // Phase 3b: Manager-only charts (team-scoped data)
      if (role === "MANAGER") {
        const [histogram, pending, topPerf] = await Promise.all([
          loadSafely("histogram", () => getTeamQuizHistogram(userId, 10)),
          loadSafely("pending", () => getTeamPendingPolicies(userId, 10)),
          loadSafely("topPerf", () => getTeamTopPerformers(userId, 10, 1)),
        ]);

        setState((prev) => ({
          ...prev,
          teamQuizHistogram: histogram,
          teamPendingPolicies: pending || [],
          teamTopPerformers: topPerf || [],
        }));
      }
    } catch (error) {
      console.error("Dashboard critical error:", error);
    } finally {
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // ─── Individual chart reload functions ──────────────────────────────────────
  // Let child components re-fetch a single chart when the user changes a
  // filter (e.g. time range, policy, exclude-zero toggle, top count).
  // Each uses loadSafely so failures are isolated to their own error key.

  /** Re-fetch compliance trend with new mode and optional year */
  const reloadTrend = async (mode: string, year?: number) => {
    const trend = await loadSafely("trend", () =>
      getComplianceTrend(userId, mode, year),
    );
    setState((prev) => ({ ...prev, complianceTrend: trend }));
  };

  /** Re-fetch average quiz scores with updated excludeZero flag */
  const reloadQuizScores = async (excludeZero: boolean) => {
    const avgQuiz = await loadSafely("avgQuiz", () =>
      getAverageQuizScores(userId, excludeZero),
    );
    setState((prev) => ({ ...prev, averageQuizScores: avgQuiz }));
  };

  /** Re-fetch team histogram with new bin size or policy filter */
  const reloadTeamHistogram = async (binSize: number, policyId?: number) => {
    const histogram = await loadSafely("histogram", () =>
      getTeamQuizHistogram(userId, binSize, policyId),
    );
    setState((prev) => ({ ...prev, teamQuizHistogram: histogram }));
  };

  /** Re-fetch top performers with new limit, attempts threshold, or policy */
  const reloadTeamTopPerformers = async (
    top: number,
    minAttempts: number,
    policyId?: number,
  ) => {
    const topPerf = await loadSafely("topPerf", () =>
      getTeamTopPerformers(userId, top, minAttempts, policyId),
    );
    setState((prev) => ({ ...prev, teamTopPerformers: topPerf || [] }));
  };

  /** Re-fetch monthly rollout with new date range */
  const reloadMonthlyRollout = async (start?: Date, end?: Date) => {
    const rollout = await loadSafely("rollout", () =>
      getMonthlyRollout(start, end),
    );
    setState((prev) => ({ ...prev, monthlyRollout: rollout || [] }));
  };

  /** Re-fetch most-assigned chart with updated top count / inactive flag */
  const reloadMostAssigned = async (
    top: number,
    includeInactive: boolean,
  ) => {
    const data = await loadSafely("mostAssigned", () =>
      getMostAssignedPolicies(top, includeInactive),
    );
    setState((prev) => ({ ...prev, mostAssignedPolicies: data || [] }));
  };

  return {
    ...state,
    reloadTrend,
    reloadQuizScores,
    reloadTeamHistogram,
    reloadTeamTopPerformers,
    reloadMonthlyRollout,
    reloadMostAssigned,
  };
};
