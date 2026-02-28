import { useState, useEffect, useCallback, useRef } from "react";
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

// ─── Types ──────────────────────────────────────────────────────

/** Every piece of data the dashboard consumes. */
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

  /** Per-chart errors keyed by chart identifier. */
  errors: Record<string, string>;

  /** Per-chart loading flags for filter-driven reloads. */
  reloading: Record<string, boolean>;
}

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "USER";

// ─── Initial state ──────────────────────────────────────────────

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
};

// ─── Hook ───────────────────────────────────────────────────────

/**
 * Central data-fetching hook for the analytics dashboard.
 *
 * Design decisions:
 *  - Each API call is wrapped in `safe()` so one failure never blocks the rest.
 *  - Data loads in phases: **summary → shared → role-specific** to give the
 *    user something to see as fast as possible.
 *  - Filter-driven reloads (trend mode, year, top N, etc.) use `reloading`
 *    flags so chart cards can show inline loading overlays instead of replacing
 *    all content with a skeleton.
 *  - No refresh button — the data loads once on mount. If the user changes a
 *    filter, only that specific chart reloads.
 */
export function useAnalyticsData(userId: number, role: Role) {
  const [state, setState] = useState<AnalyticsState>(INITIAL);

  // Guard against state updates after unmount.
  // Must re-set to `true` on every mount so React Strict Mode's
  // unmount → remount cycle doesn't leave it permanently false.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ─── Helpers ────────────────────────────────────────────────

  /** Merge a partial update into state (no-op if unmounted). */
  const patch = useCallback((partial: Partial<AnalyticsState>) => {
    if (!mounted.current) return;
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Run an API call; store data on success, store a human-readable error on failure. */
  const safe = useCallback(
    async <T>(key: string, loader: () => Promise<T>): Promise<T | null> => {
      try {
        const data = await loader();
        setState((prev) => {
          if (!mounted.current) return prev;
          const { [key]: _, ...rest } = prev.errors;
          return { ...prev, errors: rest };
        });
        return data;
      } catch (err) {
        setState((prev) => {
          if (!mounted.current) return prev;
          return {
            ...prev,
            errors: { ...prev.errors, [key]: parseError(err) },
          };
        });
        return null;
      }
    },
    [],
  );

  /** Toggle the inline loading flag for a chart (used during filter changes). */
  const setReloading = useCallback(
    (key: string, busy: boolean) =>
      setState((prev) => ({
        ...prev,
        reloading: { ...prev.reloading, [key]: busy },
      })),
    [],
  );

  // ─── Initial Load ─────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const isAdmin = role === "ADMIN";
    const isManager = role === "MANAGER";

    (async () => {
      patch({ loading: true, errors: {}, reloading: {} });

      // Phase 1 — summary first so KPI cards appear quickly
      const summary = await safe("summary", () => fetchSummary(userId));
      if (cancelled) return;
      patch({ summary });

      // Phase 2 — shared charts (ADMIN + MANAGER)
      if (isAdmin || isManager) {
        const [audit, avgQuiz, withQuiz, trend] = await Promise.all([
          safe("audit", () => fetchAuditStatus(userId)),
          safe("avgQuiz", () => fetchAvgQuizScores(userId, true)),
          safe("withQuiz", () => fetchPoliciesWithQuiz(userId)),
          safe("trend", () => fetchComplianceTrend(userId, "month")),
        ]);
        if (cancelled) return;
        patch({
          auditChart: audit,
          avgQuizScores: avgQuiz,
          policiesWithQuiz: withQuiz,
          complianceTrend: trend,
        });
      }

      // Phase 3a — admin-only charts
      if (isAdmin) {
        const [most, byCat, dept, rollout, bubble] = await Promise.all([
          safe("mostAssigned", () => fetchMostAssigned(10, false)),
          safe("byCategory", () => fetchPoliciesByCategory(userId)),
          safe("deptCompliance", () => fetchDeptCompliance()),
          safe("rollout", () => fetchMonthlyRollout()),
          safe("bubble", () => fetchChecklistBubble()),
        ]);
        if (cancelled) return;
        patch({
          mostAssigned: most ?? [],
          policiesByCategory: byCat,
          deptCompliance: dept ?? [],
          monthlyRollout: rollout ?? [],
          checklistBubble: bubble ?? [],
        });
      }

      // Phase 3b — manager-only charts
      if (isManager) {
        const [hist, pending, topPerf] = await Promise.all([
          safe("histogram", () => fetchTeamHistogram(userId, 10)),
          safe("pending", () => fetchTeamPending(userId, 10)),
          safe("topPerf", () => fetchTeamTopPerformers(userId, 10, 1)),
        ]);
        if (cancelled) return;
        patch({
          teamHistogram: hist,
          teamPending: pending ?? [],
          teamTopPerformers: topPerf ?? [],
        });
      }

      patch({ loading: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, role, safe, patch]);

  // ─── Filter-driven Reload Helpers ─────────────────────────
  // Each reloads a single chart when the user changes a filter.
  // The inline loading overlay keeps prior data visible until the
  // new response arrives — better UX than replacing with a skeleton.

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
  };
}
