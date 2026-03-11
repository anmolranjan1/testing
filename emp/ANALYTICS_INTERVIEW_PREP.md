# Analytics Dashboard — Full Interview Prep Guide

Full flow: Frontend → API layer → JWT → Backend → Services → JPA → DB → Response → Charts

---

## 1. Architecture Overview

The Analytics Dashboard is a **role-based read-only dashboard**. There is no paginated list, no CRUD — it loads charts based on who is logged in.

```
DashboardPage.tsx
  ├── reads role from Redux store (auth.user.role)
  ├── loads data in 3 phases sequentially (but each phase uses parallel Promise.allSettled)
  ├── renders DashboardHeader (summary cards)
  ├── renders SharedCharts    (ADMIN + MANAGER)
  ├── renders AdminCharts     (ADMIN only)
  └── renders ManagerCharts   (MANAGER only)
```

Two implementations exist:
- `DashboardPage.tsx` — self-contained (owns the state + data loading logic directly)
- `hooks/useAnalyticsData.ts` — extracted hook version (same logic, slightly different state update pattern)

`DashboardPage.tsx` is the **active** version used by the app.

---

## 2. Role-Driven Chart Visibility

| Section | Charts | Who Sees It |
|---|---|---|
| Summary Cards | Policy Compliance %, Pending Policies, Audit Completion %, Overdue Audits | ADMIN + MANAGER |
| SharedCharts | Audit Status Donut, Avg Quiz Score Bar, Policies With/Without Quiz Pie, Compliance Trend Line | ADMIN + MANAGER |
| AdminCharts | Most Assigned Policies, Policies by Category, Dept Compliance, Monthly Rollout, Checklist Bubble | ADMIN only |
| ManagerCharts | Team Quiz Histogram, Team Pending Policies, Team Top Performers | MANAGER only |

The frontend checks `role` from Redux to show/hide sections:
```tsx
const isAdmin   = role === "ADMIN";
const isManager = role === "MANAGER";

{isAdmin && <AdminCharts ... />}
{isManager && <ManagerCharts ... />}
```

---

## 3. Frontend: Data Loading Strategy

### Three-Phase Sequential + Parallel Inside Each Phase

```tsx
// Phase 1: Summary (single sequential call)
summary = await fetchSummary(userId);

// Phase 2: Shared charts — parallel for ADMIN & MANAGER
const sharedResults = await Promise.allSettled([
  fetchAuditStatus(userId),
  fetchAvgQuizScores(userId, true),
  fetchPoliciesWithQuiz(userId),
  fetchComplianceTrend(userId, "month"),
]);

// Phase 3a: Admin-only charts — parallel
const adminResults = await Promise.allSettled([
  fetchMostAssigned(10, false),
  fetchPoliciesByCategory(userId),
  fetchDeptCompliance(),
  fetchMonthlyRollout(),
  fetchChecklistBubble(),
]);

// Phase 3b: Manager-only charts — parallel
const managerResults = await Promise.allSettled([
  fetchTeamHistogram(userId, 10),
  fetchTeamPending(userId, 10),
  fetchTeamTopPerformers(userId, 10, 1),
]);
```

**Why sequential phases?** Summary is shown first so the header renders. Then the heavier charts come in behind it.

**Why `Promise.allSettled` instead of `Promise.all`?** `Promise.all` fails entirely if one request fails. `Promise.allSettled` gives you individual results — a failed chart shows an error message, but the rest still render.

```tsx
if (sharedResults[0]?.status === "fulfilled") {
  auditChart = sharedResults[0].value;
} else {
  nextErrors.audit = getErrorMessage(sharedResults[0]?.reason, "Failed to load audit chart");
}
```

### Cancelled Flag (Cleanup)

A `cancelled` boolean prevents state updates after the component unmounts:

```tsx
let cancelled = false;
// ...inside async:
if (cancelled) return;
// ...cleanup:
return () => { cancelled = true; };
```

This avoids React's "Can't perform state update on unmounted component" warning.

---

## 4. State Shape

```ts
interface DashboardData {
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
  errors: Record<string, string>;   // per-chart error messages
  reloading: Record<string, boolean>; // per-chart reload spinners
}
```

Key design: `errors` and `reloading` are plain objects keyed by chart name (e.g., `"audit"`, `"avgQuiz"`, `"trend"`). This lets each chart independently show an error or a loading spinner without blocking others.

---

## 5. Reload Functions (Interactive Charts)

Some charts have filters that trigger a fresh API call without reloading the whole dashboard. These are **partial reload** functions:

```tsx
const reloadTrend = async (mode: string, year?: number) => {
  setData(prev => ({ ...prev, reloading: { ...prev.reloading, trend: true } }));
  try {
    const complianceTrend = await fetchComplianceTrend(userId, mode, year);
    setData(prev => ({ ...prev, complianceTrend, reloading: { ...prev.reloading, trend: false } }));
  } catch (error) {
    setData(prev => ({
      ...prev,
      errors: { ...prev.errors, trend: getErrorMessage(error, "Failed to reload trend") },
      reloading: { ...prev.reloading, trend: false }
    }));
  }
};
```

The same pattern is used for:
- `reloadQuizScores(excludeZero)` — toggle "exclude zero" checkbox
- `reloadMostAssigned(top, includeInactive)` — change top N or include inactive toggle
- `reloadRollout(start?, end?)` — time period picker (6m / 12m / YTD / all)
- `reloadHistogram(binSize, policyId?)` — bin size and policy filter
- `reloadTopPerformers(top, minAttempts, policyId?)` — top N + policy filter

These are passed as **props** down to child chart components (AdminCharts, SharedCharts, ManagerCharts).

---

## 6. Frontend: analyticsApi.ts

All functions use the shared `apiClient` (Axios instance, base URL `/api`). They return typed promises.

```ts
export const fetchSummary = (userId: number): Promise<DashboardSummary> =>
  apiClient.get(API_ENDPOINTS.ANALYTICS_SUMMARY, { params: { userId } }).then(r => r.data);
```

### API Endpoints (from `apiEndpoints.ts`)

| Constant | URL | Auth |
|---|---|---|
| `ANALYTICS_SUMMARY` | `/analytics/summary` | ADMIN, MANAGER |
| `ANALYTICS_MOST_ASSIGNED_POLICIES` | `/analytics/policies/most-assigned` | ADMIN |
| `ANALYTICS_POLICIES_BY_CATEGORY` | `/analytics/policies/by-category` | ADMIN |
| `ANALYTICS_COMPLIANCE_DEPARTMENT` | `/analytics/compliance/department` | ADMIN |
| `ANALYTICS_MONTHLY_ROLLOUT` | `/analytics/policies/rollout/monthly` | ADMIN |
| `ANALYTICS_CHECKLIST_BUBBLE` | `/analytics/policies/checklists/bubble` | ADMIN |
| `ANALYTICS_AVG_QUIZ_SCORE` | `/analytics/quiz/avg-score-by-policy` | ADMIN, MANAGER |
| `ANALYTICS_AUDIT_STATUS` | `/analytics/audit/status` | ADMIN, MANAGER |
| `ANALYTICS_POLICIES_WITH_QUIZ` | `/analytics/policies/with-vs-without-quiz` | ADMIN, MANAGER |
| `ANALYTICS_COMPLIANCE_TREND` | `/analytics/compliance/trend` | ADMIN, MANAGER |
| `ANALYTICS_TEAM_QUIZ_HISTOGRAM` | `/analytics/team/quiz-scores/histogram` | MANAGER |
| `ANALYTICS_TEAM_PENDING_POLICIES` | `/analytics/team/pending-policies` | MANAGER |
| `ANALYTICS_TEAM_TOP_PERFORMERS` | `/analytics/team/top-performers` | MANAGER |

### Date Formatting

`fetchMonthlyRollout` uses a `toISOString` utility to format `Date` objects before sending as query params:
```ts
if (start) params.start = toISOString(start);
```
The backend reads them via `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)`.

---

## 7. JWT + Interceptor Flow

Every analytics request goes through the same auth chain:

1. **Redux store** holds `auth.user` (id, name, role, token) persisted in `localStorage` under key `"auth"`.
2. **`apiClient`** (Axios, baseURL = `http://localhost:8082/api`) has a **request interceptor** that reads the token from `localStorage` and attaches it:
   ```ts
   config.headers.Authorization = `Bearer ${token}`;
   ```
3. **`JwtAuthenticationFilter`** on the backend reads the `Authorization` header, validates the JWT using `JwtUtil`, and sets the `SecurityContextHolder` with a `UsernamePasswordAuthenticationToken`.
4. **`@PreAuthorize`** on each controller method checks the role from the security context.
5. If a 401 or 403 is returned, the **response interceptor** in `apiClient` dispatches `logout()` to Redux and redirects to `/login`.

---

## 8. Backend: Controller → Service Routing

`AnalyticsController` has three injected services:
- `AnalyticsService` — shared logic (summary, avg quiz score, audit donut, compliance trend, policies with/without quiz, policies by category)
- `AdminAnalyticsService` — admin-only logic (most assigned, dept compliance, monthly rollout, checklist bubble)
- `ManagerAnalyticsService` — manager-only logic (team histogram, team pending, team top performers)

The controller delegates based on endpoint; the services do internal role checks via `isAdmin(userId)` / `isManager(userId)` by loading the user from `IUsersRepository`.

---

## 9. Chart Breakdown — Backend Logic

### Chart 0: Summary Cards — `GET /analytics/summary`

- **Auth**: ADMIN or MANAGER
- **Service**: `AnalyticsService.getDashboardSummaryForCurrent(userId)`
- **ADMIN returns**: org-wide compliance %, pending count, audit task %, overdue audit count
- **MANAGER returns**: same metrics but scoped to manager's team via `managerUserId`
- **Key repos**: `ComplianceRecordRepository.count()`, `countByStatus(ACCEPTED)`, `AuditTaskRepository.countByStatus(COMPLETED)`, `countByDueDateBeforeAndStatusNotAndDueDateIsNotNull(now, COMPLETED)`

### Chart 1: Most Assigned Policies — `GET /analytics/policies/most-assigned`

- **Auth**: ADMIN only
- **Params**: `top` (default 10), `includeInactive` (default false)
- **Service**: `AdminAnalyticsService.getMostAssignedPolicies(top, includeInactive)`
- **Logic**: Loads all (or active-only) policies, counts compliance records per policy via `countByPolicyObj_PolicyId`, builds `MostAssignedPolicyDTO` using `@Builder`, sorts by count desc, limits to `top`.
- **Chart type**: Horizontal bar (most assigned = longest bar)

### Chart 2: Policies by Category — `GET /analytics/policies/by-category`

- **Auth**: ADMIN only
- **Service**: `AnalyticsService.getPoliciesByCategory(userId)`
- **ADMIN**: calls `policyRepository.countByCategoryAdmin()` — counts all policies grouped by category
- **MANAGER**: calls `complianceRecordRepository.countDistinctPoliciesByCategoryForManager(managerUserId)` — distinct policies in team's compliance records
- **Null handling**: `"Uncategorized"` is assigned when `categoryId == null` or name is blank
- **Sorting**: alphabetical by category name

### Chart 3: Average Quiz Score by Policy — `GET /analytics/quiz/avg-score-by-policy`

- **Auth**: ADMIN or MANAGER
- **Params**: `userId`, `excludeZero` (default true — hides employees who scored 0)
- **Logic**:
  1. Builds a `quizId → PolicyInfo(policyId, title)` map from `policyRepository.findByQuizObjIsNotNull()`
  2. Loads scoped `QuizAssignment` list (org-wide or team) using derived JPA methods
  3. Groups by `quizId` using `Collectors.summarizingInt(QuizAssignment::getQuizScore)` → `IntSummaryStatistics`
  4. Calculates `avg = sum / count`, builds `AverageQuizScoreDTO`, sorts by policy title

### Chart 4: Audit Task Status Donut — `GET /analytics/audit/status`

- **Auth**: ADMIN or MANAGER
- **Service**: `AnalyticsService.getAuditTaskStatusDonut(userId)`
- **ADMIN**: uses `auditTaskRepository.countByStatus(PENDING/INPROGRESS/COMPLETED)` — three fast count queries
- **MANAGER**: loads `ComplianceRecord` list for team (`findByUserObj_ManagerIdAndTaskObjIsNotNull`), iterates over `taskObj.getStatus()` and tallies manually — avoids needing a custom query
- **Response**: `{ scope, total, slices: [{status, count}] }`

### Chart 5: Policies With/Without Quiz — `GET /analytics/policies/with-vs-without-quiz`

- **Auth**: ADMIN or MANAGER
- **ADMIN**: `policyRepository.countByQuizObjIsNotNull()` and `countByQuizObjIsNull()` — two derived counts
- **MANAGER**: `complianceRecordRepository.countDistinctPoliciesWithQuizForManager(managerUserId)` — custom `@Query`
- **Response**: `{ scope, total, slices: [{ label: "With Quiz", count }, { label: "Without Quiz", count }] }`

### Chart 6: Compliance by Department — `GET /analytics/compliance/department`

- **Auth**: ADMIN only
- **Service**: `AdminAnalyticsService.getComplianceByDepartmentSimple()`
- **Logic**: Iterates all departments, counts ACCEPTED and PENDING compliance records per department using `countByUserObj_DepartmentType_DepIdAndStatus(depId, status)`, calculates `compliancePct = accepted / total * 100`
- **Uses `@Builder`**: `DepartmentComplianceBarDTO.builder()...build()`

### Chart 7: Monthly Policy Rollout — `GET /analytics/policies/rollout/monthly`

- **Auth**: ADMIN only
- **Params**: `start` and `end` as ISO datetime (optional — defaults to last 12 months)
- **Logic**:
  1. Normalizes range to month boundaries using `Util.monthYearRange(YearMonth)`
  2. Validates: start < end, max 120 months
  3. Loads active policies where `effectiveDate BETWEEN start AND end`
  4. Groups by `YearMonth.from(effectiveDate)` using streaming
  5. Fills buckets with zero for months that have no policies (zero-fill loop from start → end)
- **Response**: `[{ yearMonth: "2026-01", label: "Jan 2026", count: 5 }]`

### Chart 8: Checklist Items per Policy (Bubble) — `GET /analytics/policies/checklists/bubble`

- **Auth**: ADMIN only
- **Service**: `AdminAnalyticsService.getChecklistItemsPerPolicyBubble()`
- **Logic**: Loads active policies that have tasks (`hasTask = true`), counts checklist items per policy via `checklistRepo.countByPolicyObj_PolicyId(policyId)`, `bubbleSize = itemCount` (bubble chart radius = count)

### Chart 9: Compliance Trend — `GET /analytics/compliance/trend`

- **Auth**: ADMIN or MANAGER
- **Params**: `userId`, `mode` ("month" or "year"), optional `year`
- **Mode "month"**: Current month, grouped by week-of-month (Week 1, Week 2, ...). Uses `WeekFields.of(Locale.getDefault())`.
- **Mode "year"**: Year-to-date monthly (Jan → current month for current year, all 12 months for past years)
- **ADMIN queries**: `countAcceptedPerDayAdmin(ACCEPTED, from, to)` or `countAcceptedPerMonthOfYearAdmin(ACCEPTED, year)`
- **MANAGER queries**: same but with `managerUserId` filter
- **Response**: `{ mode, scope, total, buckets: [{ label: "Week 1", count: 12 }] }`

### Chart 10: Team Quiz Score Histogram — `GET /analytics/team/quiz-scores/histogram`

- **Auth**: MANAGER only
- **Params**: `userId`, `binSize` (default 10), optional `policyId`
- **Logic**:
  1. Validates user is MANAGER (throws `AccessDeniedException` otherwise)
  2. Clamps binSize to `[1, 100]`
  3. Optionally filters by policy's quizId
  4. Generates bins covering 0–100 (e.g., bin=10 → [0-9], [10-19], ..., [100-100])
  5. Iterates assignments, places each score in the right bin index: `idx = score / binSize`
  6. Score 100 is clamped to last bin
- **Response**: `{ binSize, totalAssignments, bins: [{ lowerBound, upperBound, count }] }`

### Chart 11: Team Pending Policies — `GET /analytics/team/pending-policies`

- **Auth**: MANAGER only
- **Params**: `userId`, `top` (default 10)
- **Logic**: Uses `PageRequest.of(0, top)` and `complianceRecordRepository.findTopPendingByPolicyForManager(managerUserId, PENDING, page)` — a `@Query` returning a `TeamPendingPolicyView` projection with `policyId, policyTitle, pendingCount`
- **Uses `@Builder`**: `TeamPendingPoliciesDTO.builder()...build()`

### Chart 12: Team Top Performers — `GET /analytics/team/top-performers`

- **Auth**: MANAGER only
- **Params**: `userId`, `top` (default 10), `minAttempts` (default 1), optional `policyId`
- **Logic** (refactored for low cognitive complexity):
  1. `loadScopedAssignments(managerUserId, policyId)` — all assignments or filtered to a specific quiz
  2. `groupAssignmentsByUser(assignments)` → `Map<userId, List<QuizAssignment>>`
  3. `buildPerformerRows(byUser, minAtt)` — filters by `minAttempts`, computes avg score per user with `clampScore(0–100)`
  4. `sortPerformers(rows)` — avg desc → attempts desc → name asc
  5. `applyLimit(rows, limit)` — returns subList if needed
- **Response**: `[{ userId, name, email, averageScore, attempts }]`

---

## 10. TypeScript Types (Frontend)

All types live in `src/shared/types/analytics.ts`. They map 1:1 to backend DTOs.

```ts
// Summary
interface DashboardSummary {
  overallPolicyCompliancePercent: number;
  pendingPolicyAcceptancesCount: number;
  auditTaskCompletionPercent: number;
  overdueAuditTasksCount: number;
}

// Responses with scope (ORG or TEAM)
interface AuditTaskStatusChart {
  scope: "ORG" | "TEAM";
  total: number;
  slices: AuditTaskStatusSlice[];
}

interface ComplianceTrendResponse {
  mode: string;
  scope: "ORG" | "TEAM";
  total: number;
  buckets: TrendBucket[]; // { label: string, count: number }
}

interface TeamQuizHistogram {
  binSize: number;
  totalAssignments: number;
  bins: HistogramBin[]; // { lowerBound, upperBound, count }
}
```

---

## 11. DashboardHeader Component

`DashboardHeader.tsx` receives `summary`, `errorCount`, `userName`, `role` as props.

- Shows a **greeting** ("Good morning/afternoon/evening") derived from current hour
- Renders **4 summary metric cards** (Policy Compliance %, Pending Policies, Audit Completion %, Overdue Audits) — each with an icon, colored background, and value
- If `errorCount > 0`, shows a warning badge: "2 charts couldn't load"
- Role text: MANAGER sees "You see data for your team only." / ADMIN sees "Organization-wide compliance summary."

---

## 12. Chart Libraries

All charts use **Recharts** (imported individually):
- `PieChart + Pie + Cell` → Donut (Audit Status) and Pie (With/Without Quiz)
- `BarChart + Bar` → Vertical bar (Most Assigned, Avg Quiz Score, Team Pending, Top Performers, Histogram)
- `AreaChart + Area` → Monthly Rollout area chart
- `LineChart + Line` → Compliance Trend

Recharts is wrapped in `<ResponsiveContainer width="100%" height={...}>` to be responsive.

`ChartCard`, `ChartEmpty`, `ChartError` are shared wrapper components from `ChartComponents.tsx` that handle loading state, empty state, and error display consistently across all charts.

---

## 13. Backend Utility Methods (`Util` class)

```java
// Percentage calculation: value/total * 100, rounded to `scale` decimal places
public static double percent(long value, long total, int scale)

// Round to 1 decimal place
public static double round1(double v)

// Round to 2 decimal places
public static double round2(double v)

// Clamp value to [min, max]
public static int clampPositive(Integer v, int def, int max)

// Clamp top to max 100 (default if null)
public static int clampTop(Integer v, int def)

// Get time range for a full YearMonth (inclusive start → exclusive end)
public static TimeRange monthYearRange(YearMonth ym)

// Get time range for the current month so far
public static TimeRange currentMonthDays()
```

---

## 14. Backend: `@Transactional(readOnly = true)`

All three analytics services are annotated with `@Transactional(readOnly = true)`.

- Tells Hibernate to **open a read-only transaction** — no dirty checking, no flushing
- Allows database driver to skip acquiring write locks → better performance
- Spring may route the query to a replica DB if one is configured
- Because all analytics methods only read data, this is correct and intentional

---

## 15. JPA Repository Methods Used

### `ComplianceRecordRepository`
- `count()` — total assigned policies org-wide
- `countByStatus(ACCEPTED)` — accepted org-wide
- `countByUserObj_ManagerIdAndStatus(managerId, status)` — team-scoped count
- `countByPolicyObj_PolicyId(policyId)` — assignment count per policy
- `countDistinctPoliciesWithQuizForManager(managerId)` — `@Query`
- `countDistinctPoliciesWithoutQuizForManager(managerId)` — `@Query`
- `countDistinctPoliciesByCategoryForManager(managerId)` — `@Query` returning projection
- `findTopPendingByPolicyForManager(managerId, status, pageable)` — `@Query` with `Pageable`
- `countAcceptedPerDayAdmin(status, from, to)` — `@Query` daily counts
- `countAcceptedPerMonthOfYearAdmin(status, year)` — `@Query` monthly counts
- `findByUserObj_ManagerIdAndTaskObjIsNotNull(managerId)` — derived

### `AuditTaskRepository`
- `countByStatus(status)` — derived count
- `countByDueDateBeforeAndStatusNotAndDueDateIsNotNull(deadline, excludeStatus)` — derived
- `countForManager(managerId)` — custom `@Query`
- `countByStatusForManager(managerId, status)` — custom `@Query`
- `countOverdueForManager(managerId, now, excludeStatus)` — custom `@Query`

### `PolicyRepository`
- `countByQuizObjIsNotNull()` / `countByQuizObjIsNull()` — derived
- `findByQuizObjIsNotNull()` — derived
- `countByCategoryAdmin()` — `@Query` returning `PolicyCategoryCountView` projection
- `findByStatus(Status.ACTIVE)` — derived
- `findByEffectiveDateBetweenAndStatus(start, end, status)` — derived
- `findByStatusAndHasTask(status, hasTask)` — derived

### `IQuizAssignmentRepository`
- `findByQuizObjIsNotNullAndQuizScoreGreaterThan(0)` — derived (org-wide, exclude zeros)
- `findByUserObj_ManagerIdAndQuizObjIsNotNullAndQuizScoreGreaterThan(managerId, 0)` — derived
- `findByUserObj_ManagerId(managerId)` — derived
- `findByUserObj_ManagerIdAndQuizObj_QuizId(managerId, quizId)` — derived

---

## 16. Key Interview Q&A

---

**Q1: Why does the dashboard load data sequentially in phases instead of all at once?**

A: Summary is shown first so the header (greeting + metric cards) appears immediately. The heavier chart data follows behind. If all 13 API calls were fired at once, the server could be overwhelmed and the user would stare at a blank skeleton for a long time. Sequential phases give progressive rendering.

---

**Q2: Why use `Promise.allSettled` instead of `Promise.all`?**

A: `Promise.all` rejects as soon as any single promise fails — you'd lose all charts if one endpoint is slow or errored. `Promise.allSettled` always resolves with an array of `{ status: "fulfilled" | "rejected", value? | reason? }` results. Each chart can independently show an error while the others render fine.

---

**Q3: How does the frontend know which charts to show ADMIN vs MANAGER?**

A: After login, the backend returns a JWT payload containing the user's `role`. The frontend decodes it and stores `{ id, name, role, token }` in Redux under `auth.user`. `DashboardPage` reads `user.role` and derives `isAdmin` and `isManager`. Sections conditionally render using `{isAdmin && <AdminCharts />}` and `{isManager && <ManagerCharts />}`.

---

**Q4: How does the backend enforce that a MANAGER cannot access admin endpoints?**

A: `@PreAuthorize("hasRole('ADMIN')")` on admin-only controller methods. If a MANAGER's JWT is used, Spring Security's method-level security will throw `AccessDeniedException` → HTTP 403, before the service is even called.

Additionally, each service has its own internal `isAdmin`/`isManager` guard that throws `AccessDeniedException` for an unexpected role.

---

**Q5: What is the `cancelled` flag and why is it needed?**

A: The data loading is async — the user might navigate away before all API calls finish. Without the `cancelled` flag, calling `setData(...)` on an unmounted component causes a React warning (and potential memory leaks). The cleanup function returned from `useEffect` sets `cancelled = true`, and every `.then()` / continuation checks `if (cancelled) return` before updating state.

---

**Q6: Walk me through what happens when a user opens the dashboard as MANAGER.**

A:
1. Browser loads `DashboardPage`. `userId` and `role = "MANAGER"` are read from Redux.
2. `useEffect` fires. Phase 1: `fetchSummary(userId)` → `GET /api/analytics/summary?userId=5`
3. Axios request interceptor adds `Authorization: Bearer <jwt>`
4. Backend: `JwtAuthenticationFilter` validates JWT → SecurityContext populated
5. `@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")` → passes
6. `AnalyticsService.getDashboardSummaryForCurrent(5)` → calls `isManager(5)` → queries `IUsersRepository` → role confirmed → runs TEAM-scoped queries
7. Response: `{ overallPolicyCompliancePercent: 72.5, ... }` → summary cards render
8. Phase 2: `Promise.allSettled([fetchAuditStatus, fetchAvgQuizScores, fetchPoliciesWithQuiz, fetchComplianceTrend])` — 4 parallel calls
9. `isAdmin = false`, so Phase 3a (admin charts) is skipped
10. Phase 3b: `Promise.allSettled([fetchTeamHistogram, fetchTeamPending, fetchTeamTopPerformers])` — 3 parallel calls
11. All data merged into state, `loading: false`, `ManagerCharts` renders.

---

**Q7: How does the Compliance Trend chart work in "month" mode vs "year" mode?**

A:
- **Month mode**: Backend takes compliance records accepted on each day of the current month. It groups them by week-of-month using `WeekFields.of(Locale.getDefault())`. Returns buckets like `[{label: "Week 1", count: 8}, ...]`.
- **Year mode**: Takes year param (defaults to current year). Groups by month (1–12) up to current month if current year. Returns `[{label: "Jan", count: 24}, ...]`.

The frontend `SharedCharts` has a toggle (Month / Year buttons) and a year dropdown. Changing them calls `reloadTrend(mode, year?)` which hits the API again and updates just the trend chart.

---

**Q8: How is the histogram built for the Team Quiz Score chart?**

A:
1. Backend generates bins based on `binSize` (default 10): `[0-9], [10-19], ..., [90-99], [100-100]`
2. Loads all quiz assignments for the manager's team
3. For each `quizScore`, index = `score / binSize` (integer division)
4. Score 100 is clamped to last bin (`if (idx >= bins.size()) idx = bins.size() - 1`)
5. Returns `{ binSize, totalAssignments, bins: [...] }`

On the frontend, bins are rendered as a bar chart with `range: "0–9%"` on the X-axis and count on the Y-axis.

---

**Q9: What is a JPA Projection and where is it used in analytics?**

A: A projection is an interface with getter methods that JPA maps query results to directly, without loading full entity objects. Used in analytics for:
- `PolicyCategoryCountView` — `getCategoryId()`, `getCategoryName()`, `getCnt()` (for policies-by-category)
- `TeamPendingPolicyView` — `getPolicyId()`, `getPolicyTitle()`, `getPendingCount()` (for team pending policies)
- `DailyCount` — `getDay()`, `getCnt()` (for compliance trend daily counts)
- `MonthlyCount` — `getMonthIdx()`, `getCnt()` (for compliance trend monthly counts)

Projections are more efficient than loading full entities because Hibernate only selects the columns you need.

---

**Q10: What does `@Transactional(readOnly = true)` do for analytics?**

A: It opens a database transaction in read-only mode. Hibernate skips dirty checking (it won't scan the entity graph for changes to flush on commit), no write locks are requested, and Spring can route the query to a read replica if your database is set up with one. All three analytics services use this since they only query data — never modify it.

---

**Q11: How does the Most Assigned chart handle the "include inactive" toggle?**

A: The frontend `AdminCharts` has a checkbox. When toggled, it calls `reloadMostAssigned(topCount, newValue)` → `fetchMostAssigned(top, includeInactive)` → `GET /analytics/policies/most-assigned?top=10&includeInactive=true`.

Backend: if `includeInactive = false`, only loads `policyRepository.findByStatus(Status.ACTIVE)`. If `true`, loads `policyRepository.findAll()`. This gives the admin insight into historical assignment data even for deactivated policies.

---

**Q12: Why does the Manager's audit donut use a different approach than the Admin's?**

A: For ADMIN, three direct `countByStatus()` queries on `AuditTaskRepository` are sufficient (org-wide counts). For MANAGER, the relationship is: a task belongs to a compliance record which belongs to a user who belongs to the manager's team. So the backend loads compliance records for the manager's team (`findByUserObj_ManagerIdAndTaskObjIsNotNull`), then iterates and tallies task statuses in-memory. This avoids needing a complex `@Query` with a join.

---

**Q13: How many API calls does the ADMIN dashboard make on load?**

A: On load, ADMIN triggers exactly **10 API calls** across 3 phases:
1. `fetchSummary` (1)
2. Shared phase: `fetchAuditStatus`, `fetchAvgQuizScores`, `fetchPoliciesWithQuiz`, `fetchComplianceTrend` (4)
3. Admin phase: `fetchMostAssigned`, `fetchPoliciesByCategory`, `fetchDeptCompliance`, `fetchMonthlyRollout`, `fetchChecklistBubble` (5)

MANAGER triggers **8 calls**: summary (1) + shared (4) + manager (3). Subsequent interactive reloads (filters, toggles) each trigger 1 additional call.

---

**Q14: What happens if the summary endpoint fails?**

A: The `try/catch` around `fetchSummary` catches the error and sets `nextErrors.summary`. In the JSX, there's a conditional:
```tsx
{!data?.summary && (
  <div className="alert alert-warning">Summary could not load. Other analytics are still available.</div>
)}
```
`DashboardHeader` receives `EMPTY_SUMMARY` (all zeros) as fallback. Other charts still load because the failure is isolated.

---

**Q15: How does the `scope` field in responses work?**

A: Many analytics responses include a `scope` field: `"ORG"` (admin viewing org-wide data) or `"TEAM"` (manager viewing their team only). The backend service determines scope by calling `isAdmin(userId)` or `isManager(userId)`. This field can be displayed in the chart subtitle (e.g., "Showing org-wide data" vs "Your team only") and helps the frontend know what context the data represents.

---

**Q16: How does the Monthly Rollout area chart handle date ranges?**

A:
- **No params**: Backend defaults to last 12 months (calculates `YearMonth.now().minusMonths(11)` → current month)
- **With params**: Snaps both dates to month boundaries (`monthYearRange(YearMonth.from(date))`)
- **Guards**: validates `start < end`, rejects ranges > 120 months
- **Zero-fill**: A loop from start to end generates a bucket for every month, defaulting to 0 if no policies were effective that month — ensures the chart has no gaps
- Frontend period picker sends `start`/`end` as ISO datetime strings via `toISOString(date)`

---

## 17. File Structure Summary

```
analytics/
  analyticsApi.ts          — 13 typed API functions
  DashboardPage.tsx        — main component: state, loading, reload fns, JSX
  dashboard.css            — chart/dashboard specific styles
  hooks/
    useAnalyticsData.ts    — extracted hook version (same logic as DashboardPage)
  components/
    DashboardHeader.tsx    — greeting + 4 summary metric cards
    SharedCharts.tsx       — Donut + Pie + AvgQuiz Bar + Trend Line (ADMIN+MANAGER)
    AdminCharts.tsx        — MostAssigned + ByCategory + DeptCompliance + Rollout + Bubble (ADMIN)
    ManagerCharts.tsx      — Histogram + Pending + TopPerformers (MANAGER)
    ChartComponents.tsx    — ChartCard, ChartEmpty, ChartError, Skeleton components
```

```
backend/
  controller/
    AnalyticsController.java     — 12 endpoints, delegates to 3 services
  service/
    AnalyticsService.java        — shared + scoped: summary, quiz avg, audit, trend, pie, by-category
    AdminAnalyticsService.java   — admin-only: most assigned, dept compliance, rollout, bubble
    ManagerAnalyticsService.java — manager-only: histogram, pending, top performers
```
