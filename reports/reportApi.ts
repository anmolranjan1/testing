import apiClient from "../../shared/api/apiClient";
import { API_ENDPOINTS } from "../../shared/constants/apiEndpoints";
import type {
  CreateReportDTO,
  UpdateReportTitleDTO,
  Report,
  ReportListResponse,
} from "../../shared/types/report";

export const listReports = async (
  userId: number,
  page?: number,
  size?: number,
  search?: string,
): Promise<ReportListResponse> => {
  const params: Record<string, unknown> = { userId };
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  if (search) params.search = search;

  const response = await apiClient.get<ReportListResponse>(
    API_ENDPOINTS.REPORTS_LIST,
    { params },
  );
  return response.data;
};

export const getReportById = async (id: number): Promise<Report> => {
  const response = await apiClient.get<Report>(API_ENDPOINTS.REPORTS_GET(id));
  return response.data;
};

export const createReport = async (data: CreateReportDTO): Promise<string> => {
  const response = await apiClient.post<string>(
    API_ENDPOINTS.REPORTS_CREATE,
    data,
  );
  return response.data;
};

export const updateReportTitle = async (
  id: number,
  data: UpdateReportTitleDTO,
): Promise<Report> => {
  const response = await apiClient.patch<Report>(
    API_ENDPOINTS.REPORTS_UPDATE(id),
    data,
  );
  return response.data;
};

export const deleteReport = async (id: number): Promise<string> => {
  const response = await apiClient.delete<string>(
    API_ENDPOINTS.REPORTS_DELETE(id),
  );
  return response.data;
};
