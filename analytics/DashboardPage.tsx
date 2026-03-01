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
  ErrorMessage,
} from "./components/ChartComponents";
import "./dashboard.css";

export default function DashboardPage() {
  const user = useSelector((s: RootState) => s?.auth?.user);
  const userId = user?.id ?? 0;
  const role = user?.role ?? "EMPLOYEE";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  const data = useAnalyticsData(userId, role);

  // Show loading state
  if (data?.loading) {
    return (
      <div
        className="container-fluid px-3 py-4 pe-md-0"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="skeleton"
          style={{ height: "56px", width: "340px", marginBottom: "1rem" }}
        />
        <SkeletonCards count={4} />
        <SkeletonTitle />
        <div className="row g-3 mb-3">
          <div className="col-lg-6">
            <SkeletonChart />
          </div>
          <div className="col-lg-6">
            <SkeletonChart />
          </div>
        </div>
      </div>
    );
  }

  // Show error if critical data missing
  if (!data?.summary) {
    return (
      <div className="container-fluid px-3 py-5">
        <ErrorMessage
          title="Dashboard unavailable"
          message="We couldn't load your dashboard. Please refresh the page."
        />
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 py-4 pe-md-0">
      <DashboardHeader
        summary={data?.summary}
        errorCount={Object.keys(data?.errors ?? {}).length}
        userName={user?.name}
        role={role}
      />

      {(isAdmin || isManager) && (
        <>
          <SectionTitle title="Overview" />
          <SharedCharts
            auditChart={data?.auditChart}
            avgQuizScores={data?.avgQuizScores}
            policiesWithQuiz={data?.policiesWithQuiz}
            complianceTrend={data?.complianceTrend}
            errors={data?.errors ?? {}}
            reloading={data?.reloading ?? {}}
            reloadTrend={data?.reloadTrend}
            reloadQuizScores={data?.reloadQuizScores}
          />
        </>
      )}

      {isAdmin && (
        <>
          <SectionTitle
            title="Admin Insights"
            description="Policy and department analytics"
          />
          <AdminCharts
            mostAssigned={data?.mostAssigned ?? []}
            policiesByCategory={data?.policiesByCategory}
            deptCompliance={data?.deptCompliance ?? []}
            monthlyRollout={data?.monthlyRollout ?? []}
            checklistBubble={data?.checklistBubble ?? []}
            errors={data?.errors ?? {}}
            reloading={data?.reloading ?? {}}
            reloadMostAssigned={data?.reloadMostAssigned}
            reloadRollout={data?.reloadRollout}
          />
        </>
      )}

      {isManager && (
        <>
          <SectionTitle
            title="Team Performance"
            description="Quiz scores and pending work in your team"
          />
          <ManagerCharts
            teamHistogram={data?.teamHistogram}
            teamPending={data?.teamPending ?? []}
            teamTopPerformers={data?.teamTopPerformers ?? []}
            errors={data?.errors ?? {}}
            reloading={data?.reloading ?? {}}
            reloadHistogram={data?.reloadHistogram}
            reloadTopPerformers={data?.reloadTopPerformers}
          />
        </>
      )}
    </div>
  );
}
