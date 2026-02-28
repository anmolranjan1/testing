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
} from "./components/ChartComponents";
import "./dashboard.css";

/**
 * Analytics Dashboard — visible to ADMIN and MANAGER.
 */
export default function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user);

  const userId = user?.id ?? 0;
  const role = user?.role ?? "EMPLOYEE";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  const data = useAnalyticsData(userId, role);

  if (data.loading) {
    return (
      <div className="dashboard">
        <SkeletonCards />
        <div className="chart-grid chart-grid--two">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (!data.summary) {
    return (
      <div className="dashboard">
        <div className="alert alert-danger">
          We couldn't load the dashboard. Please try refreshing the page.
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
      />

      {(isAdmin || isManager) && (
        <>
          <SectionTitle
            title="Overview"
            description="Key metrics about audits, quizzes, and policy compliance"
          />
          <SharedCharts
            auditChart={data.auditChart}
            avgQuizScores={data.avgQuizScores}
            policiesWithQuiz={data.policiesWithQuiz}
            complianceTrend={data.complianceTrend}
            errors={data.errors}
            reloadTrend={data.reloadTrend}
            reloadQuizScores={data.reloadQuizScores}
          />
        </>
      )}

      {isAdmin && (
        <>
          <SectionTitle
            title="Organization"
            description="Policy distribution, department progress, and rollout trends"
          />
          <AdminCharts
            mostAssigned={data.mostAssigned}
            policiesByCategory={data.policiesByCategory}
            deptCompliance={data.deptCompliance}
            monthlyRollout={data.monthlyRollout}
            checklistBubble={data.checklistBubble}
            errors={data.errors}
            reloadMostAssigned={data.reloadMostAssigned}
            reloadRollout={data.reloadRollout}
          />
        </>
      )}

      {isManager && (
        <>
          <SectionTitle
            title="Your Team"
            description="Quiz scores, top performers, and pending work for your team"
          />
          <ManagerCharts
            teamHistogram={data.teamHistogram}
            teamPending={data.teamPending}
            teamTopPerformers={data.teamTopPerformers}
            errors={data.errors}
            reloadHistogram={data.reloadHistogram}
            reloadTopPerformers={data.reloadTopPerformers}
          />
        </>
      )}
    </div>
  );
}
