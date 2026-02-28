import apiClient from "../../shared/api/apiClient";
import { API_ENDPOINTS } from "../../shared/constants/apiEndpoints";
import { toISOString } from "../../shared/utils/dateFormatter";
import type {
  DashboardSummary,
  MostAssignedPolicy,
  PoliciesByCategoryResponse,
  DepartmentComplianceBar,
  MonthlyRollout,
  ChecklistItemsBubble,
  AverageQuizScoreResponse,
  AuditTaskStatusChart,
  PoliciesWithQuizPieResponse,
  ComplianceTrendResponse,
  TeamQuizHistogram,
  TeamPendingPolicy,
  TeamTopPerformer,
} from "../../shared/types/analytics";

// ─── General ──────────────────────────────────────────────────────

export const fetchSummary = (userId: number): Promise<DashboardSummary> =>
  apiClient
    .get<DashboardSummary>(API_ENDPOINTS.ANALYTICS_SUMMARY, {
      params: { userId },
    })
    .then((r) => r.data);

// ─── Admin Only ───────────────────────────────────────────────────

export const fetchMostAssigned = (
  top = 10,
  includeInactive = false,
): Promise<MostAssignedPolicy[]> =>
  apiClient
    .get<MostAssignedPolicy[]>(API_ENDPOINTS.ANALYTICS_MOST_ASSIGNED_POLICIES, {
      params: { top, includeInactive },
    })
    .then((r) => r.data);

export const fetchPoliciesByCategory = (
  userId: number,
): Promise<PoliciesByCategoryResponse> =>
  apiClient
    .get<PoliciesByCategoryResponse>(
      API_ENDPOINTS.ANALYTICS_POLICIES_BY_CATEGORY,
      { params: { userId } },
    )
    .then((r) => r.data);

export const fetchDeptCompliance = (): Promise<DepartmentComplianceBar[]> =>
  apiClient
    .get<
      DepartmentComplianceBar[]
    >(API_ENDPOINTS.ANALYTICS_COMPLIANCE_DEPARTMENT)
    .then((r) => r.data);

export const fetchMonthlyRollout = (
  start?: Date,
  end?: Date,
): Promise<MonthlyRollout[]> => {
  const params: Record<string, string> = {};
  if (start) params.start = toISOString(start);
  if (end) params.end = toISOString(end);
  return apiClient
    .get<MonthlyRollout[]>(API_ENDPOINTS.ANALYTICS_MONTHLY_ROLLOUT, { params })
    .then((r) => r.data);
};

export const fetchChecklistBubble = (): Promise<ChecklistItemsBubble[]> =>
  apiClient
    .get<ChecklistItemsBubble[]>(API_ENDPOINTS.ANALYTICS_CHECKLIST_BUBBLE)
    .then((r) => r.data);

// ─── Admin & Manager ─────────────────────────────────────────────

export const fetchAvgQuizScores = (
  userId: number,
  excludeZero = true,
): Promise<AverageQuizScoreResponse> =>
  apiClient
    .get<AverageQuizScoreResponse>(API_ENDPOINTS.ANALYTICS_AVG_QUIZ_SCORE, {
      params: { userId, excludeZero },
    })
    .then((r) => r.data);

export const fetchAuditStatus = (
  userId: number,
): Promise<AuditTaskStatusChart> =>
  apiClient
    .get<AuditTaskStatusChart>(API_ENDPOINTS.ANALYTICS_AUDIT_STATUS, {
      params: { userId },
    })
    .then((r) => r.data);

export const fetchPoliciesWithQuiz = (
  userId: number,
): Promise<PoliciesWithQuizPieResponse> =>
  apiClient
    .get<PoliciesWithQuizPieResponse>(
      API_ENDPOINTS.ANALYTICS_POLICIES_WITH_QUIZ,
      { params: { userId } },
    )
    .then((r) => r.data);

export const fetchComplianceTrend = (
  userId: number,
  mode = "month",
  year?: number,
): Promise<ComplianceTrendResponse> =>
  apiClient
    .get<ComplianceTrendResponse>(API_ENDPOINTS.ANALYTICS_COMPLIANCE_TREND, {
      params: { userId, mode, ...(year ? { year } : {}) },
    })
    .then((r) => r.data);

// ─── Manager Only ────────────────────────────────────────────────

export const fetchTeamHistogram = (
  userId: number,
  binSize = 10,
  policyId?: number,
): Promise<TeamQuizHistogram> =>
  apiClient
    .get<TeamQuizHistogram>(API_ENDPOINTS.ANALYTICS_TEAM_QUIZ_HISTOGRAM, {
      params: { userId, binSize, ...(policyId ? { policyId } : {}) },
    })
    .then((r) => r.data);

export const fetchTeamPending = (
  userId: number,
  top = 10,
): Promise<TeamPendingPolicy[]> =>
  apiClient
    .get<TeamPendingPolicy[]>(API_ENDPOINTS.ANALYTICS_TEAM_PENDING_POLICIES, {
      params: { userId, top },
    })
    .then((r) => r.data);

export const fetchTeamTopPerformers = (
  userId: number,
  top = 10,
  minAttempts = 1,
  policyId?: number,
): Promise<TeamTopPerformer[]> =>
  apiClient
    .get<TeamTopPerformer[]>(API_ENDPOINTS.ANALYTICS_TEAM_TOP_PERFORMERS, {
      params: {
        userId,
        top,
        minAttempts,
        ...(policyId ? { policyId } : {}),
      },
    })
    .then((r) => r.data);
