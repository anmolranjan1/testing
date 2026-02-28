import { useSelector } from "react-redux";
import type { RootState } from "../../app/store/store";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import DashboardHeader from "./components/DashboardHeader";
import SharedCharts from "./components/SharedCharts";
import AdminCharts from "./components/AdminCharts";
import ManagerCharts from "./components/ManagerCharts";
import {
  SectionTitle,
  SkeletonCards,
  SkeletonChart,
  SkeletonTitle,
} from "./components/ChartComponents";
import { RefreshCw } from "lucide-react";
import "./dashboard.css";

/**
 * Analytics Dashboard — visible to ADMIN and MANAGER.
 *
 * Renders KPI summary cards, shared charts, and role-specific charts.
 */
export default function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user);

  const userId = user?.id ?? 0;
  const role = user?.role ?? "EMPLOYEE";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  const data = useAnalyticsData(userId, role);

  // Loading skeleton — mirrors the real layout so there's no jump
  if (data.loading) {
    return (
      <div className="dashboard dashboard--loading">
        <div className="skeleton skeleton--header" />
        <SkeletonCards />
        <SkeletonTitle />
        <div className="chart-grid chart-grid--two">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="chart-grid chart-grid--one">
          <SkeletonChart />
        </div>
      </div>
    );
  }

  // Fatal error — no summary at all
  if (!data.summary) {
    return (
      <div className="dashboard">
        <div className="dashboard__fatal">
          <RefreshCw size={32} className="dashboard__fatal-icon" />
          <h2 className="dashboard__fatal-title">Dashboard unavailable</h2>
          <p className="dashboard__fatal-text">
            We couldn't load your dashboard data. This is usually a temporary
            issue.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={data.refreshAll}
          >
            <RefreshCw size={14} className="me-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(data.errors).length;

  return (
    <div className="dashboard">
      <DashboardHeader
        summary={data.summary}
        errorCount={errorCount}
        userName={user?.name}
        lastUpdated={data.lastUpdated}
        onRefresh={data.refreshAll}
        isRefreshing={data.loading}
      />

      {(isAdmin || isManager) && (
        <>
          <SectionTitle
            title="Overview"
            description="High-level charts shared across your organization"
          />
          <SharedCharts
            auditChart={data.auditChart}
            avgQuizScores={data.avgQuizScores}
            policiesWithQuiz={data.policiesWithQuiz}
            complianceTrend={data.complianceTrend}
            errors={data.errors}
            reloading={data.reloading}
            reloadTrend={data.reloadTrend}
            reloadQuizScores={data.reloadQuizScores}
            onRetry={data.refreshAll}
          />
        </>
      )}

      {isAdmin && (
        <>
          <SectionTitle
            title="Admin Insights"
            description="Organization-wide policy and department data visible only to admins"
          />
          <AdminCharts
            mostAssigned={data.mostAssigned}
            policiesByCategory={data.policiesByCategory}
            deptCompliance={data.deptCompliance}
            monthlyRollout={data.monthlyRollout}
            checklistBubble={data.checklistBubble}
            errors={data.errors}
            reloading={data.reloading}
            reloadMostAssigned={data.reloadMostAssigned}
            reloadRollout={data.reloadRollout}
            onRetry={data.refreshAll}
          />
        </>
      )}

      {isManager && (
        <>
          <SectionTitle
            title="Team Performance"
            description="Quiz scores, pending work, and top performers across your team"
          />
          <ManagerCharts
            teamHistogram={data.teamHistogram}
            teamPending={data.teamPending}
            teamTopPerformers={data.teamTopPerformers}
            errors={data.errors}
            reloading={data.reloading}
            reloadHistogram={data.reloadHistogram}
            reloadTopPerformers={data.reloadTopPerformers}
            onRetry={data.refreshAll}
          />
        </>
      )}
    </div>
  );
}
