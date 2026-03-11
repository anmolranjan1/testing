# Employee Type: Frontend to Backend Flow (Interview Prep)

This guide explains the complete `Employee Type` flow in your project, from UI click to database write, including auth, validations, pagination, errors, and common interview questions.

---

## 1. Big Picture Architecture

Employee Type management is implemented as a typical layered flow:

1. React UI (`EmployeeTypeTab`) triggers CRUD actions.
2. Frontend API layer (`employeeTypeApi.ts`) calls backend endpoints via Axios.
3. Shared Axios client (`apiClient.ts`) injects auth token and handles 401/403 globally.
4. Spring Boot controller (`EmployeeTypeController`) receives requests and applies role-based restrictions.
5. Service layer (`EmployeeTypeService`) handles business rules and validation.
6. Repository layer (`IEmployeeTypeRepository`) executes JPA operations on `employee_type` table.
7. Exceptions are converted to HTTP responses by `GlobalExceptionHandler`.

---

## 2. Where Employee Type Lives in Frontend

### 2.1 Route and page access

- Route: `ROUTES.ADMIN_MASTER_DATA` renders `MasterDataPage`.
- `PrivateRoute` requires authentication token for protected routes.
- Route-level role check for admin pages: `allowedRoles={["ADMIN"]}`.
- `MasterDataPage` does a second check: if `user?.role !== "ADMIN"`, redirect to dashboard.
- Sidebar shows Master Data menu only for ADMIN users.

This is defense in depth on frontend: route gate + page gate + nav visibility.

### 2.2 Tab component

`src/features/master-data/tabs/EmployeeTypeTab.tsx` does:

- Initial fetch with pagination on mount.
- Add employee type form.
- Edit modal flow.
- Delete confirmation modal flow.
- Infinite scroll list loading.
- Toast-based success/error feedback.

---

## 3. Authentication and Token Flow

### 3.1 Login

- Login page calls `authApi.login()` (`POST /auth/v2/login`).
- On success:
  - Redux auth state is set.
  - Auth is saved to `localStorage`.
  - `setAuthToken(token)` sets Axios default `Authorization: Bearer <token>` header.

### 3.2 App reload resilience

- On app bootstrap (`main.tsx`), token is restored from Redux persisted data and set again on Axios defaults.

### 3.3 Auto handling expired token

Axios response interceptor in `apiClient.ts`:

- If response is `401`:
  - clear Redux auth
  - clear localStorage auth
  - remove auth header
  - redirect to `/login`
- If `403`, logs forbidden error.

So Employee Type API calls automatically benefit from this behavior.

---

## 4. API Endpoints for Employee Type

From `apiEndpoints.ts`:

- Create: `POST /employeeType/create`
- Get by id: `GET /employeeType/{id}`
- Update: `PUT /employeeType/update`
- Delete: `DELETE /employeeType/delete/{id}`
- List: `GET /employeeType/list?page=&size=&search=`

Base URL in Axios:

- `VITE_API_BASE_URL` or fallback `http://localhost:8082/api`

So complete URL example:

- `http://localhost:8082/api/employeeType/list?page=1&size=20`

---

## 5. Frontend Data Contracts (TypeScript)

`employeeType.ts`:

- `EmployeeType`: `{ empTypeId: number; empTypeName: string }`
- `CreateEmployeeTypeDTO`: `{ empTypeName: string }`
- `UpdateEmployeeTypeDTO`: `{ empTypeId: number; empTypeName: string }`
- `EmployeeTypeListResponse`: `{ items: EmployeeType[]; page: number; size: number; total: number }`

These contracts keep UI and API payload shapes consistent.

---

## 6. Employee Type UI Flow in Detail

## 6.1 Initial load + pagination

Initial load and filter refresh are driven by debounced search effect:

- `useEffect` waits `350ms` and then calls `loadData(1, search.trim())`.
- With empty search, this becomes the initial list fetch.

`loadData(pageNum)` logic:

- If first page: show full-page spinner.
- Call API.
- If first page: replace items.
- If next page: append items (`prev + new`)
- Set `total` from backend.
- Set `hasMore = pageNum * PAGE_SIZE < total`.

Infinite scroll:

- `next={loadMore}`
- `loadMore` increments local `page` and fetches next page for current search.

## 6.2 Create flow

1. User enters name and clicks Add.
2. `handleCreate` checks `name.trim()` client-side.
3. Calls `createEmployeeType({ empTypeName: name })`.
4. On success:
   - success toast
   - reset input
   - reload page 1 (`loadData()`)
5. On error:
   - `parseError(error)` converts API/axios/network errors to friendly message
   - error toast shown

## 6.3 Edit flow

1. User clicks edit icon.
2. Selected row is stored in `selectedItem`, modal opens.
3. Modal has local state and `onSave(id, newName)`.
4. Parent calls `updateEmployeeType({ empTypeId: id, empTypeName: newName })`.
5. On success: close modal, clear selection, refresh list.
6. On failure: toast + modal remains open for correction.

## 6.4 Delete flow

1. User clicks delete icon.
2. Confirmation modal opens.
3. On confirm, parent calls `deleteEmployeeType(id)`.
4. On success: close modal, clear selection, refresh list.
5. If backend blocks delete (in use), conflict message is shown via toast.

---

## 7. Backend Request Lifecycle (Per Operation)

All Employee Type endpoints in `EmployeeTypeController` are protected with:

- `@PreAuthorize("hasRole('ADMIN')")`

So only authenticated ADMIN can call them.

## 7.1 CREATE (`POST /employeeType/create`)

Path:

1. Controller accepts `@Valid CreateEmployeeTypeDTO`.
2. Service `create(empTypeName)`:
   - null/blank check -> `BadRequestException` (400)
   - trim whitespace
   - duplicate check via `existsByEmpTypeNameIgnoreCase`
   - if duplicate -> `ConflictException` (409)
   - save new entity
3. Controller returns `201 Created` + message string.

## 7.2 GET BY ID (`GET /employeeType/{id}`)

Path:

1. Controller calls `service.getById(id)`.
2. Service fetches with `findById`.
3. If missing -> `NotFoundException` (404).
4. Returns `EmployeeTypeDTO`.

## 7.3 UPDATE (`PUT /employeeType/update`)

Path:

1. Controller accepts `EmployeeTypeDTO`.
2. Service validates:
   - dto and id required
   - name required + trim
3. Fetch existing by id.
4. If missing -> 404.
5. If changing name, check duplicate case-insensitive.
6. If duplicate -> 409.
7. Save updated entity.
8. Controller returns `200 OK` + message string.

## 7.4 DELETE (`DELETE /employeeType/delete/{id}`)

Path:

1. Service first ensures employee type exists (`existsById`).
2. Referential guards before delete:
   - if any user uses this type (`usersRepo.existsByEmpType_EmpTypeId`) -> 409 "Employee type in use"
   - if any policy uses this type (`policyRepo.existsByEmployeeTypes_EmpTypeId`) -> 409
3. If safe, `deleteById(id)`.
4. Controller returns `200 OK` + success message.

This is important interview point: delete is protected against orphaning related data.

## 7.5 LIST (`GET /employeeType/list`)

Path:

1. Accepts optional `page`, `size`, `search`.
2. Service defaults:
   - page -> 1 if missing/invalid
   - size -> 20 if missing/invalid
3. Converts client page (1-based) to Spring page (0-based).
4. Sorts by `empTypeName ASC`.
5. If search exists:
   - trimmed
   - capped to length 200
   - query: `findByEmpTypeNameContainingIgnoreCase`
6. Else `findAll(pageable)`.
7. Maps entity list to DTO list.
8. Returns `EmployeeTypeListResponseDTO { items, page, size, total }`.

Repository methods involved:

- `findAll(Pageable pageable)`
- `findByEmpTypeNameContainingIgnoreCase(String name, Pageable pageable)`
- `existsByEmpTypeNameIgnoreCase(String empTypeName)`
- `existsById(Integer id)`
- `deleteById(Integer id)`

---

## 8. Error Handling End-to-End

## 8.1 Backend

`GlobalExceptionHandler` maps domain exceptions:

- `BadRequestException` -> 400
- `NotFoundException` -> 404
- `ConflictException` -> 409
- `AccessDeniedException` -> 403
- generic exception -> 500

Many handlers return plain string body.

## 8.2 Frontend

`parseError()` order:

1. `response.data.message` (if JSON object has message)
2. if `response.data` is string, use it directly
3. map by status code (400,401,403,404,500...)
4. network fallback

Because backend often returns plain string, step 2 is commonly used for Employee Type flows.

---

## 9. Security Flow in Backend

From `SecurityConfig` and JWT filter:

- Any path except `/auth/**` requires authentication.
- JWT filter reads `Authorization` header.
- Extracts username from token.
- Loads user details.
- Validates token.
- Sets authentication in Spring Security context.
- Method security (`@PreAuthorize`) enforces ADMIN role at controller method level.

This means even if frontend is bypassed, backend still blocks non-admin users.

---

## 10. Database Layer and Relationship Impact

Entity:

- Table: `employee_type`
- Columns:
  - `emp_type_id` (PK, identity)
  - `emp_type_name` (not null)

Cross-module impact:

- `Users` has `empType` relation.
- `Policy` has `Set<EmployeeType>` relation.
- Hence delete guard checks both users and policies before delete.

Interview line:

"Employee Type is master data referenced by users and policies, so we enforce referential safety at service level before deletion."

JPA specifics you can mention:

- `EmployeeType` is a JPA entity mapped to table `employee_type`.
- ID strategy is `GenerationType.IDENTITY`.
- Repository extends `JpaRepository<EmployeeType, Integer>` for CRUD + pagination.
- Query derivation is used for case-insensitive checks/search (`existsBy...IgnoreCase`, `findBy...ContainingIgnoreCase`).

---

## 11. Important Design Choices You Can Defend

1. Layer separation:
- UI state, API calls, business rules, persistence are clearly separated.

2. Dual authorization checks:
- Frontend UX restriction + backend hard enforcement.

3. Pagination + infinite scroll:
- Scales better than loading all rows at once.

4. Case-insensitive duplicate prevention:
- avoids `Manager` and `manager` both existing.

5. Friendly error surface:
- backend exceptions become user toast messages.

6. Deletion integrity checks:
- prevents breaking linked records.

7. Builder pattern usage in API layer:
- `EmployeeType.builder()` used in create path.
- `EmployeeTypeDTO.builder()` used in entity-to-DTO mapping.
- `EmployeeTypeListResponseDTO.builder()` used for paged response construction.

---

## 12. Potential Gaps / Improvements (Great Interview Add-on)

1. CORS origin in backend is `http://localhost:4200`, but Vite usually runs on `5173`.
- In production, this should be environment-driven and include actual frontend origin.

2. Backend and frontend both validate update payload.
- DTO uses validation annotations and service still keeps defensive checks (good for robustness).

3. Controller returns string for create/update/delete.
- Could return standardized JSON response envelope for consistency.

4. After create/update/delete, UI reloads first page.
- Could do optimistic update to avoid full refresh and preserve scroll position.

5. Search is implemented with a debounced input in `EmployeeTypeTab`.
- Next improvement can be request-cancel logic (to avoid stale response race in very fast typing/network lag cases).

---

## 13. Interview-Ready End-to-End Narration (60-90 sec)

"In our React frontend, Employee Type is managed inside Master Data, which is admin-only at route, page, and sidebar levels. The tab loads paginated data with infinite scroll and supports create, edit, and delete via modal workflows. API calls are centralized in `employeeTypeApi.ts` and use a shared Axios client that automatically attaches JWT and handles session expiration.

On backend, all Employee Type endpoints are under `/api/employeeType` and protected with `@PreAuthorize('hasRole('ADMIN')')`. Controller methods delegate to a service layer where we enforce business rules like non-empty names, case-insensitive uniqueness, and safe deletion checks against user and policy references. Repository uses Spring Data JPA for CRUD and case-insensitive search with pagination. Exceptions are normalized by a global exception handler and surfaced on frontend as user-friendly toast messages."

---

## 14. Follow-Up Interview Questions and Strong Answers

## Q1. Why both frontend and backend role checks?
A: Frontend checks improve UX by hiding/restricting access early, but backend checks are mandatory for security because frontend can be bypassed. We use both for defense in depth.

## Q2. Why use service-level validations if DTO has `@Valid`?
A: Annotation validation catches structural issues, while service validations enforce business rules (duplicate check, related-entity checks before delete, trim logic, conditional duplicate on update).

## Q3. Why case-insensitive duplicate check?
A: It prevents semantic duplicates (`HR` vs `hr`) and keeps master data clean.

## Q4. How does infinite scroll know when to stop?
A: Backend returns `total`, and frontend computes `hasMore` as `page * size < total`.

## Q5. How is paging index mismatch handled between UI and Spring Data?
A: UI is 1-based for user-friendly semantics; backend converts to 0-based before creating `PageRequest`.

## Q6. What happens if token expires during an Employee Type API call?
A: Axios interceptor catches `401`, clears auth state and storage, removes header, and redirects user to login.

## Q7. Why block delete when employee type is used by users or policies?
A: To preserve data integrity and avoid orphan references or broken business mappings.

## Q8. How are backend errors shown to users?
A: Frontend `parseError()` prioritizes backend message, then status-based fallback, then network/generic messages, and displays via toast.

## Q9. Why not use optimistic updates instead of refetch after create/update/delete?
A: Refetch guarantees consistency and simpler correctness. Optimistic updates can be added later for better UX/performance.

## Q10. How would you improve this module for production?
A: Standardize response contract, improve CORS/env config, add request-cancel logic for search, and add tests for conflict/not-found/in-use delete scenarios.

## Q11. Where exactly is role enforcement on backend?
A: At method level in `EmployeeTypeController` using `@PreAuthorize("hasRole('ADMIN')")`, enabled through `@EnableMethodSecurity` in `SecurityConfig`.

## Q12. Why trim input values?
A: To avoid storing accidental whitespace and to make duplicate checks meaningful.

## Q13. What is returned in list response and why?
A: `items`, `page`, `size`, `total` so frontend can render rows and drive pagination/infinite-scroll state correctly.

## Q16. Where exactly are interceptors used and why?
A: In `apiClient.ts`, Axios response interceptor handles `401`/`403` globally. `401` clears Redux/localStorage auth and redirects to login, preventing stale sessions across all modules including Employee Type.

## Q17. How does JWT authentication work for Employee Type endpoints?
A: Frontend sends `Authorization: Bearer <token>`. Backend `JwtAuthenticationFilter` extracts username, validates token, loads user details, sets security context, then `@PreAuthorize("hasRole('ADMIN')")` enforces admin role.

## Q18. Which calls are made for one full create cycle?
A: `POST /employeeType/create` then `GET /employeeType/list?page=1&size=20&search=<current search>`. This ensures UI is synced with server state.

## Q14. Can non-admin hit Employee Type endpoint directly via Postman?
A: They can attempt, but backend security will reject with 403/401 depending on auth state/role.

## Q15. Why keep API endpoint constants in one file?
A: Single source of truth, easier maintenance, fewer hardcoded string mistakes.

---

## 15. Quick Reference: Files You Should Mention

Frontend:

- `src/features/master-data/tabs/EmployeeTypeTab.tsx`
- `src/features/employee-type/employeeTypeApi.ts`
- `src/shared/types/employeeType.ts`
- `src/shared/api/apiClient.ts`
- `src/shared/utils/errorParser.ts`
- `src/features/master-data/modals/EditEmployeeTypeModal.tsx`
- `src/features/master-data/modals/DeleteConfirmModal.tsx`
- `src/features/master-data/MasterDataPage.tsx`
- `src/app/routes/AppRouter.tsx`
- `src/app/routes/PrivateRoute.tsx`

Backend:

- `src/main/java/com/compliance/main/controller/EmployeeTypeController.java`
- `src/main/java/com/compliance/main/service/EmployeeTypeService.java`
- `src/main/java/com/compliance/main/repository/IEmployeeTypeRepository.java`
- `src/main/java/com/compliance/main/data/EmployeeType.java`
- `src/main/java/com/compliance/main/dto/EmployeeTypeDTO.java`
- `src/main/java/com/compliance/main/dto/EmployeeTypeListResponseDTO.java`
- `src/main/java/com/compliance/main/dto/CreateEmployeeTypeDTO.java`
- `src/main/java/com/compliance/main/repository/IUsersRepository.java`
- `src/main/java/com/compliance/main/config/SecurityConfig.java`
- `src/main/java/com/compliance/main/config/JwtAuthenticationFilter.java`
- `src/main/java/com/compliance/main/config/JwtUtils.java`
- `src/main/java/com/compliance/main/repository/PolicyRepository.java`
- `src/main/java/com/compliance/main/exception/GlobalExceptionHandler.java`
- `src/main/java/com/compliance/main/config/SecurityConfig.java`
- `src/main/java/com/compliance/main/config/JwtAuthenticationFilter.java`

---

## 16. Final Interview Tip

When asked "Explain flow", answer in this order:

1. user action in UI
2. API call and payload
3. backend auth and controller
4. service business validations
5. repository/db action
6. response and UI update
7. failure scenarios and handling

That sequence sounds senior and structured.
