import { useState, useEffect, useCallback } from "react";
import { parseError } from "../../../shared/utils/errorParser";
import {
  fetchSummary,
  fetchAuditStatus,
  fetchAvgQuizScores,
  fetchPoliciesWithQuiz,
  fetchComplianceTrend,
  fetchMostAssigned,
  fetchPoliciesByCategory,
  fetchDeptCompliance,
  fetchMonthlyRollout,
  fetchChecklistBubble,
  fetchTeamHistogram,
  fetchTeamPending,
  fetchTeamTopPerformers,
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

/** Shape of everything the dashboard needs. */
export interface AnalyticsState {
  loading: boolean;
  summary: DashboardSummary | null;

  // Shared (ADMIN + MANAGER)
  auditChart: AuditTaskStatusChart | null;
  avgQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;

  // Admin only
  mostAssigned: MostAssignedPolicy[];
  policiesByCategory: PoliciesByCategoryResponse | null;
  deptCompliance: DepartmentComplianceBar[];
  monthlyRollout: MonthlyRollout[];
  checklistBubble: ChecklistItemsBubble[];

  // Manager only
  teamHistogram: TeamQuizHistogram | null;
  teamPending: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];

  // Per-chart errors (key = chart name)
  errors: Record<string, string>;

  // Per-chart reloading flags (key = chart name)
  reloading: Record<string, boolean>;

  // When the dashboard last completed loading
  lastUpdated: Date | null;
}

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "USER";

const INITIAL: AnalyticsState = {
  loading: true,
  summary: null,
  auditChart: null,
  avgQuizScores: null,
  policiesWithQuiz: null,
  complianceTrend: null,
  mostAssigned: [],
  policiesByCategory: null,
  deptCompliance: [],
  monthlyRollout: [],
  checklistBubble: [],
  teamHistogram: null,
  teamPending: [],
  teamTopPerformers: [],
  errors: {},
  reloading: {},
  lastUpdated: null,
};

/**
 * Central hook that fetches ALL analytics data for the dashboard.
 *
 * Each API is wrapped in `safe()` so one failure never blocks others.
 * Data loads in phases: summary → shared → role-specific.
 */
export function useAnalyticsData(userId: number, role: Role) {
  const [state, setState] = useState<AnalyticsState>(INITIAL);

  // Merge partial updates into state
  const patch = useCallback(
    (partial: Partial<AnalyticsState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    [],
  );

  /**
   * Safely run an API call. Returns data on success, null on failure.
   * Error gets stored in state.errors[key] so the chart can show it.
   */
  const safe = useCallback(
    async <T>(key: string, loader: () => Promise<T>): Promise<T | null> => {
      try {
        const data = await loader();
        // Clear any previous error for this chart
        setState((prev) => {
          const errors = { ...prev.errors };
          delete errors[key];
          return { ...prev, errors };
        });
        return data;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [key]: parseError(err) },
        }));
        return null;
      }
    },
    [],
  );

  // Helper: mark a chart as reloading (used by filter changes)
  const setReloading = useCallback(
    (key: string, value: boolean) =>
      setState((prev) => ({
        ...prev,
        reloading: { ...prev.reloading, [key]: value },
      })),
    [],
  );

  // ─── Initial Load ─────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!userId) return;
    patch({ loading: true, errors: {}, reloading: {} });

    // Phase 1: Summary
    const summary = await safe("summary", () => fetchSummary(userId));
    patch({ summary });

    const isAdmin = role === "ADMIN";
    const isManager = role === "MANAGER";

    // Phase 2: Shared charts (ADMIN + MANAGER)
    if (isAdmin || isManager) {
      const [audit, avgQuiz, withQuiz, trend] = await Promise.all([
        safe("audit", () => fetchAuditStatus(userId)),
        safe("avgQuiz", () => fetchAvgQuizScores(userId, true)),
        safe("withQuiz", () => fetchPoliciesWithQuiz(userId)),
        safe("trend", () => fetchComplianceTrend(userId, "month")),
      ]);
      patch({
        auditChart: audit,
        avgQuizScores: avgQuiz,
        policiesWithQuiz: withQuiz,
        complianceTrend: trend,
      });
    }

    // Phase 3a: Admin-only charts
    if (isAdmin) {
      const [most, byCat, dept, rollout, bubble] = await Promise.all([
        safe("mostAssigned", () => fetchMostAssigned(10, false)),
        safe("byCategory", () => fetchPoliciesByCategory(userId)),
        safe("deptCompliance", () => fetchDeptCompliance()),
        safe("rollout", () => fetchMonthlyRollout()),
        safe("bubble", () => fetchChecklistBubble()),
      ]);
      patch({
        mostAssigned: most ?? [],
        policiesByCategory: byCat,
        deptCompliance: dept ?? [],
        monthlyRollout: rollout ?? [],
        checklistBubble: bubble ?? [],
      });
    }

    // Phase 3b: Manager-only charts
    if (isManager) {
      const [hist, pending, topPerf] = await Promise.all([
        safe("histogram", () => fetchTeamHistogram(userId, 10)),
        safe("pending", () => fetchTeamPending(userId, 10)),
        safe("topPerf", () => fetchTeamTopPerformers(userId, 10, 1)),
      ]);
      patch({
        teamHistogram: hist,
        teamPending: pending ?? [],
        teamTopPerformers: topPerf ?? [],
      });
    }

    patch({ loading: false, lastUpdated: new Date() });
  }, [userId, role, safe, patch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Reload Functions (called when filters change) ────────────

  const reloadTrend = useCallback(
    async (mode: string, year?: number) => {
      setReloading("trend", true);
      const d = await safe("trend", () =>
        fetchComplianceTrend(userId, mode, year),
      );
      patch({ complianceTrend: d });
      setReloading("trend", false);
    },
    [userId, safe, patch, setReloading],
  );

  const reloadQuizScores = useCallback(
    async (excludeZero: boolean) => {
      setReloading("avgQuiz", true);
      const d = await safe("avgQuiz", () =>
        fetchAvgQuizScores(userId, excludeZero),
      );
      patch({ avgQuizScores: d });
      setReloading("avgQuiz", false);
    },
    [userId, safe, patch, setReloading],
  );

  const reloadMostAssigned = useCallback(
    async (top: number, includeInactive: boolean) => {
      setReloading("mostAssigned", true);
      const d = await safe("mostAssigned", () =>
        fetchMostAssigned(top, includeInactive),
      );
      patch({ mostAssigned: d ?? [] });
      setReloading("mostAssigned", false);
    },
    [safe, patch, setReloading],
  );

  const reloadRollout = useCallback(
    async (start?: Date, end?: Date) => {
      setReloading("rollout", true);
      const d = await safe("rollout", () => fetchMonthlyRollout(start, end));
      patch({ monthlyRollout: d ?? [] });
      setReloading("rollout", false);
    },
    [safe, patch, setReloading],
  );

  const reloadHistogram = useCallback(
    async (binSize: number, policyId?: number) => {
      setReloading("histogram", true);
      const d = await safe("histogram", () =>
        fetchTeamHistogram(userId, binSize, policyId),
      );
      patch({ teamHistogram: d });
      setReloading("histogram", false);
    },
    [userId, safe, patch, setReloading],
  );

  const reloadTopPerformers = useCallback(
    async (top: number, minAttempts: number, policyId?: number) => {
      setReloading("topPerf", true);
      const d = await safe("topPerf", () =>
        fetchTeamTopPerformers(userId, top, minAttempts, policyId),
      );
      patch({ teamTopPerformers: d ?? [] });
      setReloading("topPerf", false);
    },
    [userId, safe, patch, setReloading],
  );

  return {
    ...state,
    reloadTrend,
    reloadQuizScores,
    reloadMostAssigned,
    reloadRollout,
    reloadHistogram,
    reloadTopPerformers,
    refreshAll: loadAll,
  };
}
