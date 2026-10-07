# EduCore Single-School Management System — Attack Surface Analysis

**Project:** EduCore Single-School Management System  
**Document Location:** `brain/security/attack-surface.md`  
**Assessment Date:** 2026-10-07  
**Scope:** Complete project codebase (`server.ts`, all routes in `server/src/modules/**`, frontend client, database interface, storage, dependencies)

---

## 1. Public (Unauthenticated) Surface

The following endpoints are accessible by external clients without bearer token authentication:

| Method | Path | Target Controller | Function / Intended Use | Existing Controls & Rate Limits |
|---|---|---|---|---|
| `GET` | `/api/health` & `/api/v1/health` | `server/src/routes/index.ts` | Service liveness probe returning JSON status | General Rate Limiter (300 req/15 min) |
| `GET` | `/api/auth/status` & `/api/v1/auth/status` | `auth.controller.ts:14` | Reports whether live Supabase is configured and admin account count | General Rate Limiter (300 req/15 min); URL truncated |
| `POST` | `/api/auth/initial-admin` & `/api/v1/auth/initial-admin` | `auth.controller.ts:63` | Creates initial root Administrator account on clean database installs | Auth Rate Limiter (30 req/15 min); blocked if admin count > 0; min 8 char password |
| `POST` | `/api/auth/demo-login` & `/api/v1/auth/demo-login` | `auth.controller.ts:104` | Issues demo token for local development evaluation | Auth Rate Limiter (30 req/15 min); **blocked (403 Forbidden)** in production or live Supabase mode |
| `GET` | `/api/app/check-update` & `/api/v1/app/check-update` | `app-version.controller.ts:13` | Mobile app startup check for minimum supported version and force update flag | General Rate Limiter (300 req/15 min); query params: `platform`, `version`, `build` |
| `GET` | `/api/app/version` & `/api/v1/app/version` | `app-version.routes.ts:19` | Alias for check-update | General Rate Limiter (300 req/15 min) |
| `GET` | `/database/schema.sql` | `server.ts:92` | Downloads complete SQL migration schema | **No authentication, no rate limit** (Static file download) |

---

## 2. Authenticated & Internal Endpoints Surface

All internal endpoints require `authenticateToken` middleware (`Authorization: Bearer <token>`). Endpoints with write or elevated access require `requirePermission(...)`:

### 2.1 Identity, Users & Roles
- `GET /api/v1/auth/me` — Returns authenticated user profile and permissions.
- `POST /api/v1/auth/profile` — Synchronizes user profile upon initial login (enforces identity from verified JWT).
- `POST /api/v1/auth/logout` — Creates audit log entry and closes session.
- `GET /api/v1/users/me` / `roles` / `permissions` — Self-inspection endpoints.
- `GET /api/v1/users` & `GET /api/v1/users/:id` — Protected by `users.read`.
- `POST /api/v1/users` — Protected by `users.create`.
- `PUT /api/v1/users/:id` — Protected by `users.update`.
- `DELETE /api/v1/users/:id` — Protected by `users.delete` (soft delete).
- `POST /api/v1/users/:id/roles` — Protected by `users.manage_roles`.
- `GET /api/v1/roles` & `GET /api/v1/roles/permissions` — Authenticated access.
- `PUT /api/v1/roles/:id/permissions` — Protected by `users.manage_roles`.

### 2.2 Academic Configuration & Settings
- `GET /api/v1/settings` — Authenticated access.
- `PUT /api/v1/settings` — Protected by `settings.update`.
- `GET /api/v1/audit-logs` — Protected by `audit_logs.read` (paginated to 100 recent entries).
- `GET /api/v1/academic-years` — Authenticated access.
- `POST /api/v1/academic-years` — Protected by `academic_years.create`.
- `PUT /api/v1/academic-years/:id` & `PATCH /api/v1/academic-years/:id/status` — Protected by `academic_years.update`.
- `DELETE /api/v1/academic-years/:id` — Protected by `academic_years.delete`.
- `GET /api/v1/classes` & `sections` — Authenticated access.
- `POST /api/v1/classes` & `sections` — Protected by `classes.create` / `sections.create`.
- `PUT /api/v1/classes/:id` & `sections/:id` — Protected by `classes.update` / `sections.update`.
- `DELETE /api/v1/classes/:id` & `sections/:id` — Protected by `classes.delete` / `sections.delete`.

### 2.3 Students, Parents & Enrollments
- `GET /api/v1/students` & `GET /api/v1/students/:id` — Protected by `students.read`.
- `POST /api/v1/students` — Protected by `students.create` (validated via Zod `StudentSchema`).
- `PUT /api/v1/students/:id` & `PATCH /api/v1/students/:id/status` — Protected by `students.update`.
- `DELETE /api/v1/students/:id` — Protected by `students.delete` (soft delete).
- `POST /api/v1/students/:id/photo` — Protected by `students.update` (Multer 5MB + MIME whitelist).
- `GET /api/v1/students/:id/documents` — Protected by `documents.read`.
- `POST /api/v1/students/:id/documents` — Protected by `documents.create` (Multer 10MB + MIME whitelist).
- `DELETE /api/v1/students/:id/documents/:documentId` — Protected by `documents.delete`.
- `GET /api/v1/students/:id/parents` — Protected by `parents.read`.
- `POST /api/v1/students/:id/parents` — Protected by `parents.create`.
- `DELETE /api/v1/students/:id/parents/:parentId` — Protected by `parents.delete`.
- `GET /api/v1/students/:id/enrollments` — Protected by `enrollment.read`.
- `POST /api/v1/students/:id/enrollments` — Protected by `enrollment.create`.
- `GET /api/v1/parents` & `GET /api/v1/parents/:id` — Protected by `parents.read`.
- `POST /api/v1/parents` — Protected by `parents.create`.
- `PUT /api/v1/parents/:id` — Protected by `parents.update`.
- `PUT /api/v1/enrollments/:id` & `PATCH /api/v1/enrollments/:id/status` & `POST /api/v1/enrollments/promote` — Protected by `enrollment.update`.

### 2.4 Mobile App Versioning Administration
- `GET /api/v1/app/settings` — Protected by `settings.read`.
- `PUT /api/v1/app/settings/:platform` — Protected by `settings.update`.

---

## 3. Authentication & Authorization Surfaces

### 3.1 Token Validation Flow
- Middleware: [server/src/middleware/auth.middleware.ts:22-111](file:///d:/school-management-systems/server/src/middleware/auth.middleware.ts#L22-L111).
- Extracts `Authorization: Bearer <token>`.
- Calls `supabaseAdmin.auth.getUser(token)` against Supabase Auth API.
- If valid, queries `public.users` table for `auth_user_id` matching user record.
- Verifies `status === 'ACTIVE'` and `deleted_at === null`.
- Queries `user_roles` and `role_permissions` to assemble effective permissions array.
- Injects `req.user: AuthUserProfile` into Express request context.

### 3.2 Authorization Bypass Risks (RBAC)
- **Admin Role Master Bypass:** [rbac.middleware.ts:46-49](file:///d:/school-management-systems/server/src/middleware/rbac.middleware.ts#L46-L49) explicitly bypasses all permission checks for users holding role code `'ADMIN'`.
- **Direct Supabase PostgREST Bypass:** As identified in the threat model, PostgreSQL RLS policies in `database/schema.sql` allow any authenticated role to perform direct writes via Supabase's public PostgREST API using the public `anon` key.

---

## 4. User Input & Parameter Surfaces

1. **JSON Request Body:**
   - Global parser: `express.json({ limit: '5mb' })` in `server.ts:50`.
   - Primary validation: Handled via Zod schemas (`StudentSchema`, `AcademicYearSchema`, `ClassSchema`, `SectionSchema`, `ParentSchema`, `EnrollmentSchema`) in `server/src/utils/validation.ts`.
   - *Gaps in Body Validation:* `updateStudent` in `students.controller.ts:81` passes `req.body` directly without full schema partial validation; `updateSettings` and `assignRoles` perform ad-hoc checks.
2. **Query String Parameters:**
   - Parsed on list endpoints: `page`, `limit`, `search`, `status`, `classId`, `sectionId`, `academicYearId`, `sortBy`, `sortOrder`.
   - Sanitized in `students.service.ts`: `page` forced to integer, `limit` capped at 100 (`Math.min(100, Math.max(1, limit))`).
3. **URL Path Parameters:**
   - Parameterized UUIDs (`:id`, `:documentId`, `:parentId`).
   - Platform string (`:platform`) validated against `['android', 'ios']`.

---

## 5. File Upload Surfaces

1. **Student Photos (`POST /api/v1/students/:id/photo`):**
   - Handler: Multer with `memoryStorage()`.
   - File size cap: 5MB.
   - MIME whitelist: `['image/jpeg', 'image/png', 'image/webp']`.
   - Execution risk: Safe from file execution; image is piped directly to Cloudinary or encoded as base64 string.
2. **Student Verification Documents (`POST /api/v1/students/:id/documents`):**
   - Handler: Multer with `memoryStorage()`.
   - File size cap: 10MB.
   - MIME whitelist: `['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']`.
   - Execution risk: Memory buffering vulnerability exists under concurrent load.

---

## 6. Database & Direct Access Surfaces

1. **Express Backend Database Channel:**
   - Uses Supabase JS Client (`@supabase/supabase-js`) initialized with `SUPABASE_SERVICE_ROLE_KEY`.
   - Executes parameterized query builder methods (`.from('students').select(...)`). No raw SQL string concatenation is used.
2. **Supabase Public Direct PostgREST Channel:**
   - Host: `https://<project-ref>.supabase.co/rest/v1`.
   - Reached via public internet.
   - Protected by: Supabase Anon Key and PostgreSQL Row Level Security (RLS).
   - *Vulnerability:* Permissive RLS write policies allow authenticated clients to bypass the Node.js backend.

---

## 7. Storage Surfaces

1. **Cloudinary CDN:**
   - Public image delivery via `res.cloudinary.com/<cloud-name>/image/upload/...`.
   - Folders: `school-management/students` and `school-management/student-documents`.
   - Deletion surface: `cloudinaryService.deleteAsset(publicId)` triggered on photo replacement.
2. **Database Base64 Fallback Simulator:**
   - Stores raw data URLs in PostgreSQL columns (`photo_url`, `file_url`).

---

## 8. Webhook & Integration Surfaces

- **Current Webhooks:** None currently mounted in `server.ts`.
- **Planned / Staged Webhooks:**
  - Razorpay payment callback verification (requires HMAC signature check with `RAZORPAY_KEY_SECRET`).
  - WhatsApp Business Cloud API incoming message webhooks (requires token verification).

---

## 9. Admin Surfaces

| Admin Feature | Route | Access Control | Sensitivity |
|---|---|---|---|
| Initial Root Administrator Setup | `POST /api/v1/auth/initial-admin` | Unauthenticated (One-time only when count=0) | **Critical** |
| User Provisioning & Lifecycle | `POST /api/v1/users`, `PUT /api/v1/users/:id` | `users.create`, `users.update` | **High** |
| Role & Permission Matrix Assignment | `POST /api/v1/users/:id/roles`, `PUT /api/v1/roles/:id/permissions` | `users.manage_roles` | **Critical** |
| Mobile App Force Update Controls | `PUT /api/v1/app/settings/:platform` | `settings.update` | **High** |
| Institutional School Master Settings | `PUT /api/v1/settings` | `settings.update` | **Medium** |
| System Audit Trail Inspection | `GET /api/v1/audit-logs` | `audit_logs.read` | **High** |

---

## 10. Network & Deployment Exposure

1. **Host & Port Binding:**
   - [server.ts:122](file:///d:/school-management-systems/server.ts#L122): `app.listen(PORT, '0.0.0.0')` binds to all network interfaces.
2. **Security Headers (Helmet):**
   - Configured in [server.ts:24-28](file:///d:/school-management-systems/server.ts#L24-L28).
   - `crossOriginEmbedderPolicy: false`.
   - `contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false`. In development, CSP is disabled to accommodate Vite HMR scripts.
3. **CORS Hardening:**
   - Configured in [server.ts:38-47](file:///d:/school-management-systems/server.ts#L38-L47).
   - Allows requests with no Origin (native mobile apps), configured `APP_URL`, and any origin starting with `http://localhost:`.

---

## 11. Dependencies & Vulnerability Status

- **Audit Result:** `npm audit` returned **0 vulnerabilities** across 15 production dependencies.
- **Key External Packages:**
  - `@supabase/supabase-js@2.117.2` — Database & Auth client.
  - `express@4.21.2` — Core HTTP routing.
  - `helmet@8.3.0` — HTTP security headers.
  - `express-rate-limit@8.7.1` — DoS and brute-force protection.
  - `multer@2.4.0` — Multipart form handling.
  - `cloudinary@2.11.0` — Media asset upload and management.
  - `zod@4.6.5` — Schema validation.
  - `@google/genai@2.4.0` — AI integrations.

---

## 12. Attack Surface Findings & Recommendations

### Confirmed Vulnerabilities
*(None currently active in application routes; database password rotation tracked separately)*

### Security Weaknesses
1. **Unprotected Static Schema Download Route:**
   - **Severity:** High
   - **Evidence:** `server.ts:92-94` (`app.get('/database/schema.sql')`).
   - **Risk:** Public disclosure of complete data schema, foreign keys, and administrative seed details.
   - **Affected Location:** `server.ts`.
   - **Why It Matters:** Gives attackers an exact structural roadmap of the database.
   - **Recommended Fix:** Delete the route or restrict it behind `authenticateToken` + `requireRole('ADMIN')`.
2. **Permissive CORS Localhost Wildcard Matching:**
   - **Severity:** Medium
   - **Evidence:** `server.ts:40` (`origin.startsWith('http://localhost:')`).
   - **Risk:** Any service running on the developer or server machine on any local port can make authenticated cross-origin requests.
   - **Affected Location:** `server.ts`.
   - **Why It Matters:** Violates strict origin isolation.
   - **Recommended Fix:** Use an exact whitelist of allowed origins (`http://localhost:3000`, `http://localhost:5173`).
3. **Incomplete Zod Schema Enforcement on Update Routes:**
   - **Severity:** Medium
   - **Evidence:** `students.controller.ts:81` (`updateStudent`), `settings.controller.ts:24` (`updateSettings`).
   - **Risk:** Unsanitized body fields can pass through to the database layer or cause runtime type errors.
   - **Affected Location:** `server/src/modules/students/students.controller.ts`, `settings.controller.ts`.
   - **Why It Matters:** Mass assignment or unexpected data structures could be stored.
   - **Recommended Fix:** Add `.partial()` Zod schemas for all update endpoints.

### Missing Controls
1. **Object-Level Ownership Validation Middleware:**
   - **Severity:** High
   - **Evidence:** `students.controller.ts` endpoints (`/:id/documents`, `/:id/parents`, `/:id/enrollments`) do not verify if the requesting actor owns or teaches the student.
   - **Risk:** Horizontal privilege escalation (IDOR).
   - **Affected Location:** `server/src/modules/students/students.routes.ts`.
   - **Why It Matters:** Essential for student and parent self-service security.
   - **Recommended Fix:** Implement an object authorization check before servicing sub-resource requests.
2. **Memory Limit on Multipart Upload Buffers:**
   - **Severity:** High
   - **Evidence:** `multer.memoryStorage()` across both photo and document upload endpoints.
   - **Risk:** Node.js process crash via heap exhaustion.
   - **Affected Location:** `server/src/modules/students/students.routes.ts`.
   - **Why It Matters:** Trivial Denial of Service vector.
   - **Recommended Fix:** Switch to disk storage or stream directly to Cloudinary via upload stream.
