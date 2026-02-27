import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import type { RootState } from "../../app/store/store";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { DashboardHeader } from "./components/DashboardHeader";
import { SharedCharts } from "./components/SharedCharts";
import { AdminCharts } from "./components/AdminCharts";
import { ManagerCharts } from "./components/ManagerCharts";
import { SectionTitle } from "./components/ChartComponents";
import { parseError } from "../../shared/utils/errorParser";
import LoadingSpinner from "../../shared/ui/LoadingSpinner";
import CreateReportModal from "../reports/CreateReportModal";
import { createReport } from "../reports/reportApi";
import type { CreateReportDTO } from "../../shared/types/report";

/**
 * Analytics dashboard — visible to ADMIN and MANAGER roles.
 *
 * Layout:
 *  1. Summary cards (top KPIs)
 *  2. Shared charts (audit donut, quiz pie, avg scores, compliance trend)
 *  3. Admin-only charts (most assigned, by category, dept compliance, rollout, checklist)
 *  4. Manager-only charts (histogram, top performers, pending policies)
 *
 * Each chart section is lazy-rendered based on role.
 * "Save as Report" snapshots all current analytics into a stored report.
 */
export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [showReportModal, setShowReportModal] = useState(false);

  // Fetch all analytics data — each API is independently error-handled
  const analytics = useAnalyticsData({
    userId: user?.id ?? 0,
    role: user?.role ?? "USER",
  });

  // Stable reference so CreateReportModal doesn't re-render unnecessarily
  const metricsMap = useMemo<Record<string, unknown>>(
    () => ({
      summary: analytics.summary,
      auditChart: analytics.auditChart,
      averageQuizScores: analytics.averageQuizScores,
      policiesWithQuiz: analytics.policiesWithQuiz,
      complianceTrend: analytics.complianceTrend,
      mostAssignedPolicies: analytics.mostAssignedPolicies,
      policiesByCategory: analytics.policiesByCategory,
      departmentCompliance: analytics.departmentCompliance,
      monthlyRollout: analytics.monthlyRollout,
      checklistBubble: analytics.checklistBubble,
      teamQuizHistogram: analytics.teamQuizHistogram,
      teamPendingPolicies: analytics.teamPendingPolicies,
      teamTopPerformers: analytics.teamTopPerformers,
    }),
    [
      analytics.summary,
      analytics.auditChart,
      analytics.averageQuizScores,
      analytics.policiesWithQuiz,
      analytics.complianceTrend,
      analytics.mostAssignedPolicies,
      analytics.policiesByCategory,
      analytics.departmentCompliance,
      analytics.monthlyRollout,
      analytics.checklistBubble,
      analytics.teamQuizHistogram,
      analytics.teamPendingPolicies,
      analytics.teamTopPerformers,
    ],
  );

  // True when at least one metric has data
  const hasAnyMetrics = Object.values(metricsMap).some((v) => v != null);

  const openReportModal = () => {
    if (!user?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }
    if (!hasAnyMetrics) {
      toast.error("No analytics data to save. Wait for dashboard to load.");
      return;
    }
    setShowReportModal(true);
  };

  /** Snapshot current dashboard metrics into a stored report */
  const handleSaveReport = async (data: CreateReportDTO) => {
    try {
      await createReport(data);
      toast.success("Report saved successfully");
    } catch (error) {
      toast.error(parseError(error));
      throw error;
    }
  };

  // Loading gate — show spinner until initial fetch completes
  if (analytics.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <LoadingSpinner />
      </div>
    );
  }

  // Fatal error — summary is required for a meaningful dashboard
  if (!analytics.summary) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">
          Failed to load dashboard summary. Please refresh and try again.
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const errorCount = Object.keys(analytics.errors).length;

  return (
    <div className="p-4">
      <DashboardHeader
        summary={analytics.summary}
        errorCount={errorCount}
        onSaveReport={openReportModal}
      />

      {/* Shared Charts (ADMIN & MANAGER) */}
      {(isAdmin || isManager) && (
        <>
          <SectionTitle title="Overview Analytics" />
          <SharedCharts
            auditChart={analytics.auditChart}
            averageQuizScores={analytics.averageQuizScores}
            policiesWithQuiz={analytics.policiesWithQuiz}
            complianceTrend={analytics.complianceTrend}
            errors={analytics.errors}
            reloadTrend={analytics.reloadTrend}
            reloadQuizScores={analytics.reloadQuizScores}
          />
        </>
      )}

      {/* Admin-Only Charts */}
      {isAdmin && (
        <>
          <SectionTitle title="Administration Insights" />
          <AdminCharts
            mostAssignedPolicies={analytics.mostAssignedPolicies}
            policiesByCategory={analytics.policiesByCategory}
            departmentCompliance={analytics.departmentCompliance}
            monthlyRollout={analytics.monthlyRollout}
            checklistBubble={analytics.checklistBubble}
            errors={analytics.errors}
            reloadMonthlyRollout={analytics.reloadMonthlyRollout}
            reloadMostAssigned={analytics.reloadMostAssigned}
          />
        </>
      )}

      {/* Manager-Only Charts */}
      {isManager && (
        <>
          <SectionTitle title="Team Performance" />
          <ManagerCharts
            teamQuizHistogram={analytics.teamQuizHistogram}
            teamPendingPolicies={analytics.teamPendingPolicies}
            teamTopPerformers={analytics.teamTopPerformers}
            errors={analytics.errors}
            reloadHistogram={analytics.reloadTeamHistogram}
            reloadTopPerformers={analytics.reloadTeamTopPerformers}
          />
        </>
      )}

      {/* Save Report Modal */}
      <CreateReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSaveReport}
        metrics={metricsMap}
        userId={user?.id ?? 0}
        userRole={user?.role ?? "USER"}
      />
    </div>
  );
}
