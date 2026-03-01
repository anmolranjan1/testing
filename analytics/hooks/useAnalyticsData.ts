import { useState, useEffect } from "react";
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

export interface AnalyticsState {
  loading: boolean;
  summary: DashboardSummary | null;
  auditChart: AuditTaskStatusChart | null;
  avgQuizScores: AverageQuizScoreResponse | null;
  policiesWithQuiz: PoliciesWithQuizPieResponse | null;
  complianceTrend: ComplianceTrendResponse | null;
  mostAssigned: MostAssignedPolicy[];
  policiesByCategory: PoliciesByCategoryResponse | null;
  deptCompliance: DepartmentComplianceBar[];
  monthlyRollout: MonthlyRollout[];
  checklistBubble: ChecklistItemsBubble[];
  teamHistogram: TeamQuizHistogram | null;
  teamPending: TeamPendingPolicy[];
  teamTopPerformers: TeamTopPerformer[];
  errors: Record<string, string>;
  reloading: Record<string, boolean>;
}

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

export function useAnalyticsData(userId: number, role: string) {
  const [state, setState] = useState<AnalyticsState>(INITIAL);

  // Load all data when component mounts
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const isAdmin = role === "ADMIN";
    const isManager = role === "MANAGER";

    // Load all data (state already has loading: true from INITIAL)
    const loadData = async () => {
      try {
        // Phase 1: Get summary first
        try {
          const summary = await fetchSummary(userId);
          if (cancelled) return;
          setState((prev) => ({ ...prev, summary }));
        } catch (error) {
          console.error("Failed to load summary:", error);
        }

        // Phase 2: Get shared charts (admin + manager)
        if (isAdmin || isManager) {
          const results = await Promise.allSettled([
            fetchAuditStatus(userId),
            fetchAvgQuizScores(userId, true),
            fetchPoliciesWithQuiz(userId),
            fetchComplianceTrend(userId, "month"),
          ]);
          if (cancelled) return;
          const audit =
            results[0]?.status === "fulfilled" ? results[0]?.value : null;
          const avgQuiz =
            results[1]?.status === "fulfilled" ? results[1]?.value : null;
          const withQuiz =
            results[2]?.status === "fulfilled" ? results[2]?.value : null;
          const trend =
            results[3]?.status === "fulfilled" ? results[3]?.value : null;

          if (results[0]?.status === "rejected")
            console.error("Audit status failed:", results[0]?.reason);
          if (results[1]?.status === "rejected")
            console.error("Quiz scores failed:", results[1]?.reason);
          if (results[2]?.status === "rejected")
            console.error("Policies with quiz failed:", results[2]?.reason);
          if (results[3]?.status === "rejected")
            console.error("Compliance trend failed:", results[3]?.reason);

          setState((prev) => ({
            ...prev,
            auditChart: audit,
            avgQuizScores: avgQuiz,
            policiesWithQuiz: withQuiz,
            complianceTrend: trend,
          }));
        }

        // Phase 3a: Get admin-only charts
        if (isAdmin) {
          const results = await Promise.allSettled([
            fetchMostAssigned(10, false),
            fetchPoliciesByCategory(userId),
            fetchDeptCompliance(),
            fetchMonthlyRollout(),
            fetchChecklistBubble(),
          ]);
          if (cancelled) return;
          const most =
            results[0]?.status === "fulfilled" ? results[0]?.value : null;
          const byCat =
            results[1]?.status === "fulfilled" ? results[1]?.value : null;
          const dept =
            results[2]?.status === "fulfilled" ? results[2]?.value : null;
          const rollout =
            results[3]?.status === "fulfilled" ? results[3]?.value : null;
          const bubble =
            results[4]?.status === "fulfilled" ? results[4]?.value : null;

          if (results[0]?.status === "rejected")
            console.error("Most assigned failed:", results[0]?.reason);
          if (results[1]?.status === "rejected")
            console.error("Policies by category failed:", results[1]?.reason);
          if (results[2]?.status === "rejected")
            console.error("Dept compliance failed:", results[2]?.reason);
          if (results[3]?.status === "rejected")
            console.error("Monthly rollout failed:", results[3]?.reason);
          if (results[4]?.status === "rejected")
            console.error("Checklist bubble failed:", results[4]?.reason);

          setState((prev) => ({
            ...prev,
            mostAssigned: most ?? [],
            policiesByCategory: byCat,
            deptCompliance: dept ?? [],
            monthlyRollout: rollout ?? [],
            checklistBubble: bubble ?? [],
          }));
        }

        // Phase 3b: Get manager-only charts
        if (isManager) {
          const results = await Promise.allSettled([
            fetchTeamHistogram(userId, 10),
            fetchTeamPending(userId, 10),
            fetchTeamTopPerformers(userId, 10, 1),
          ]);
          if (cancelled) return;
          const hist =
            results[0]?.status === "fulfilled" ? results[0]?.value : null;
          const pending =
            results[1]?.status === "fulfilled" ? results[1]?.value : null;
          const topPerf =
            results[2]?.status === "fulfilled" ? results[2]?.value : null;

          if (results[0]?.status === "rejected")
            console.error("Team histogram failed:", results[0]?.reason);
          if (results[1]?.status === "rejected")
            console.error("Team pending failed:", results[1]?.reason);
          if (results[2]?.status === "rejected")
            console.error("Top performers failed:", results[2]?.reason);

          setState((prev) => ({
            ...prev,
            teamHistogram: hist,
            teamPending: pending ?? [],
            teamTopPerformers: topPerf ?? [],
          }));
        }

        // Done loading
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Analytics data loading error:", error);
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    loadData();

    // Cleanup: stop updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  // Reload compliance trend
  const reloadTrend = async (mode: string, year?: number) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, trend: true },
    }));
    try {
      const data = await fetchComplianceTrend(userId, mode, year);
      setState((prev) => ({
        ...prev,
        complianceTrend: data,
        reloading: { ...prev?.reloading, trend: false },
      }));
    } catch (error) {
      console.error("Failed to reload trend:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, trend: false },
      }));
    }
  };

  // Reload quiz scores
  const reloadQuizScores = async (excludeZero: boolean) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, avgQuiz: true },
    }));
    try {
      const data = await fetchAvgQuizScores(userId, excludeZero);
      setState((prev) => ({
        ...prev,
        avgQuizScores: data,
        reloading: { ...prev?.reloading, avgQuiz: false },
      }));
    } catch (error) {
      console.error("Failed to reload quiz:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, avgQuiz: false },
      }));
    }
  };

  // Reload most assigned
  const reloadMostAssigned = async (top: number, includeInactive: boolean) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, mostAssigned: true },
    }));
    try {
      const data = await fetchMostAssigned(top, includeInactive);
      setState((prev) => ({
        ...prev,
        mostAssigned: data ?? [],
        reloading: { ...prev?.reloading, mostAssigned: false },
      }));
    } catch (error) {
      console.error("Failed to reload assigned:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, mostAssigned: false },
      }));
    }
  };

  // Reload rollout
  const reloadRollout = async (start?: Date, end?: Date) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, rollout: true },
    }));
    try {
      const data = await fetchMonthlyRollout(start, end);
      setState((prev) => ({
        ...prev,
        monthlyRollout: data ?? [],
        reloading: { ...prev?.reloading, rollout: false },
      }));
    } catch (error) {
      console.error("Failed to reload rollout:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, rollout: false },
      }));
    }
  };

  // Reload histogram
  const reloadHistogram = async (binSize: number, policyId?: number) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, histogram: true },
    }));
    try {
      const data = await fetchTeamHistogram(userId, binSize, policyId);
      setState((prev) => ({
        ...prev,
        teamHistogram: data,
        reloading: { ...prev?.reloading, histogram: false },
      }));
    } catch (error) {
      console.error("Failed to reload histogram:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, histogram: false },
      }));
    }
  };

  // Reload top performers
  const reloadTopPerformers = async (
    top: number,
    minAttempts: number,
    policyId?: number,
  ) => {
    setState((prev) => ({
      ...prev,
      reloading: { ...prev?.reloading, topPerf: true },
    }));
    try {
      const data = await fetchTeamTopPerformers(
        userId,
        top,
        minAttempts,
        policyId,
      );
      setState((prev) => ({
        ...prev,
        teamTopPerformers: data ?? [],
        reloading: { ...prev?.reloading, topPerf: false },
      }));
    } catch (error) {
      console.error("Failed to reload top performers:", error);
      setState((prev) => ({
        ...prev,
        reloading: { ...prev?.reloading, topPerf: false },
      }));
    }
  };

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
