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

// ==================== GENERAL ====================

export const getDashboardSummary = async (
  userId: number,
): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>(
    `${API_ENDPOINTS.ANALYTICS_SUMMARY}?userId=${userId}`,
  );
  return response.data;
};

// ==================== ADMIN ONLY ====================

export const getMostAssignedPolicies = async (
  top: number = 10,
  includeInactive: boolean = false,
): Promise<MostAssignedPolicy[]> => {
  const response = await apiClient.get<MostAssignedPolicy[]>(
    `${API_ENDPOINTS.ANALYTICS_MOST_ASSIGNED_POLICIES}?top=${top}&includeInactive=${includeInactive}`,
  );
  return response.data;
};

export const getPoliciesByCategory = async (
  userId: number,
): Promise<PoliciesByCategoryResponse> => {
  const response = await apiClient.get<PoliciesByCategoryResponse>(
    `${API_ENDPOINTS.ANALYTICS_POLICIES_BY_CATEGORY}?userId=${userId}`,
  );
  return response.data;
};

export const getDepartmentCompliance = async (): Promise<
  DepartmentComplianceBar[]
> => {
  const response = await apiClient.get<DepartmentComplianceBar[]>(
    API_ENDPOINTS.ANALYTICS_COMPLIANCE_DEPARTMENT,
  );
  return response.data;
};

export const getMonthlyRollout = async (
  start?: Date,
  end?: Date,
): Promise<MonthlyRollout[]> => {
  let url = API_ENDPOINTS.ANALYTICS_MONTHLY_ROLLOUT;
  const params = new URLSearchParams();

  if (start) {
    params.append("start", toISOString(start));
  }
  if (end) {
    params.append("end", toISOString(end));
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiClient.get<MonthlyRollout[]>(url);
  return response.data;
};

export const getChecklistItemsBubble = async (): Promise<
  ChecklistItemsBubble[]
> => {
  const response = await apiClient.get<ChecklistItemsBubble[]>(
    API_ENDPOINTS.ANALYTICS_CHECKLIST_BUBBLE,
  );
  return response.data;
};

// ==================== ADMIN & MANAGER ====================

export const getAverageQuizScores = async (
  userId: number,
  excludeZero: boolean = true,
): Promise<AverageQuizScoreResponse> => {
  const response = await apiClient.get<AverageQuizScoreResponse>(
    `${API_ENDPOINTS.ANALYTICS_AVG_QUIZ_SCORE}?userId=${userId}&excludeZero=${excludeZero}`,
  );
  return response.data;
};

export const getAuditTaskStatus = async (
  userId: number,
): Promise<AuditTaskStatusChart> => {
  const response = await apiClient.get<AuditTaskStatusChart>(
    `${API_ENDPOINTS.ANALYTICS_AUDIT_STATUS}?userId=${userId}`,
  );
  return response.data;
};

export const getPoliciesWithQuiz = async (
  userId: number,
): Promise<PoliciesWithQuizPieResponse> => {
  const response = await apiClient.get<PoliciesWithQuizPieResponse>(
    `${API_ENDPOINTS.ANALYTICS_POLICIES_WITH_QUIZ}?userId=${userId}`,
  );
  return response.data;
};

export const getComplianceTrend = async (
  userId: number,
  mode: string = "month",
  year?: number,
): Promise<ComplianceTrendResponse> => {
  let url = `${API_ENDPOINTS.ANALYTICS_COMPLIANCE_TREND}?userId=${userId}&mode=${mode}`;
  if (year) {
    url += `&year=${year}`;
  }

  const response = await apiClient.get<ComplianceTrendResponse>(url);
  return response.data;
};

// ==================== MANAGER ONLY ====================

export const getTeamQuizHistogram = async (
  userId: number,
  binSize: number = 10,
  policyId?: number,
): Promise<TeamQuizHistogram> => {
  let url = `${API_ENDPOINTS.ANALYTICS_TEAM_QUIZ_HISTOGRAM}?userId=${userId}&binSize=${binSize}`;
  if (policyId) {
    url += `&policyId=${policyId}`;
  }

  const response = await apiClient.get<TeamQuizHistogram>(url);
  return response.data;
};

export const getTeamPendingPolicies = async (
  userId: number,
  top: number = 10,
): Promise<TeamPendingPolicy[]> => {
  const response = await apiClient.get<TeamPendingPolicy[]>(
    `${API_ENDPOINTS.ANALYTICS_TEAM_PENDING_POLICIES}?userId=${userId}&top=${top}`,
  );
  return response.data;
};

export const getTeamTopPerformers = async (
  userId: number,
  top: number = 10,
  minAttempts: number = 1,
  policyId?: number,
): Promise<TeamTopPerformer[]> => {
  let url = `${API_ENDPOINTS.ANALYTICS_TEAM_TOP_PERFORMERS}?userId=${userId}&top=${top}&minAttempts=${minAttempts}`;
  if (policyId) {
    url += `&policyId=${policyId}`;
  }

  const response = await apiClient.get<TeamTopPerformer[]>(url);
  return response.data;
};
