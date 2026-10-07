# EduCore Single-School Management System — Security Checklist & Audit Matrix

**Project:** EduCore Single-School Management System  
**Document Location:** `brain/security/security-checklist.md`  
**Assessment Date:** 2026-10-07  
**Scope:** Complete project codebase (`server.ts`, `server/src/**`, `src/**`, `database/**`, environment configuration, dependencies)

---

## 1. Domain-by-Domain Security Checklist

| Domain | Status | Key Code Evidence | Summary of Finding |
|---|---|---|---|
| **1. Authentication** | ⚠️ Partial | `auth.middleware.ts:22`, `auth.controller.ts:63` | Real Supabase JWT validation active; demo tokens blocked in prod; password complexity check on initial admin is minimal (length >= 8 only). |
| **2. Authorization / RBAC** | ⚠️ Partial | `rbac.middleware.ts:13`, `database/schema.sql:494` | Express RBAC is strictly enforced; however, Supabase PostgreSQL RLS policies permit all authenticated users to perform direct writes via PostgREST. |
| **3. Session / Token Security** | ⚠️ Partial | `src/lib/api.ts:13`, `useAuth.tsx:148` | Session tokens stored in browser `localStorage` under `educore_auth_token` instead of `HttpOnly` cookies. |
| **4. Input Validation** | ⚠️ Partial | `validation.ts:8-84`, `students.controller.ts:59` | Zod validation applied to creation payloads; update routes (`updateStudent`, `updateSettings`) lack comprehensive Zod schema enforcement. |
| **5. Injection** | ✅ Pass | `students.service.ts:44-77` | Parameterized access via Supabase JS client; zero raw SQL string concatenation or string interpolation in query paths. |
| **6. XSS / CSRF** | ⚠️ Partial | `server.ts:24`, `index.html` | React 19 escapes rendered JSX; Helmet security headers active. CSP disabled in development mode for Vite HMR. |
| **7. API Security** | ✅ Pass | `response.ts:12-42`, `server.ts:88` | Standardized API envelope (`sendSuccess`, `sendPaginated`, `sendError`); dual `/api` and `/api/v1` routes; sensitive fields excluded. |
| **8. Rate Limiting / Abuse** | ⚠️ Partial | `server.ts:53-76` | `express-rate-limit` active on API (300/15m) and Auth (30/15m); uses in-memory store (not shared across clustered instances). |
| **9. File Uploads** | ⚠️ Partial | `students.routes.ts:14-46` | Strict MIME whitelisting and file size caps enforced; in-memory storage buffer (`multer.memoryStorage()`) poses memory exhaustion risk under load. |
| **10. Database Security** | ⚠️ Partial | `schema.sql:16`, `schema.sql:485-509` | Native UUID primary keys; soft deletion enabled; RLS enabled on all tables, but write policies are overly broad for authenticated users. |
| **11. Secrets** | ⚠️ Partial | `env.ts:28-39`, `.gitignore:7` | Secrets git-ignored; production assertion on `JWT_SECRET`; database password was previously shared in conversation history; fallback to anon key in `supabase.ts:21`. |
| **12. Encryption** | ⚠️ Partial | `server.ts:122`, `supabase.ts:14` | HTTPS enforced for all external Supabase and Cloudinary calls; internal server runs on plain HTTP (relies on reverse proxy for TLS). |
| **13. CORS** | ⚠️ Partial | `server.ts:38-47` | Restricted CORS origin check; wildcard `http://localhost:*` allows arbitrary local ports to connect with credentials. |
| **14. Dependency Security** | ✅ Pass | `package.json`, `npm audit` | `npm audit` verified **0 vulnerabilities** across 15 production dependencies; policy strictly prohibits `--no-audit`. |
| **15. Logging / Monitoring** | ⚠️ Partial | `auditLog.ts:17`, `audit.routes.ts:15` | Immutable audit log table tracks all administrative write mutations; bulk read operations on student directories are not logged. |
| **16. Admin Security** | ⚠️ Partial | `auth.service.ts:56`, `server.ts:92` | Initial admin setup locked once created; static database schema (`/database/schema.sql`) exposed publicly without authentication. |
| **17. Deployment / Infrastructure** | ⚠️ Partial | `server.ts:122` | Binds to `0.0.0.0`; Dockerfile / container isolation configuration pending. |
| **18. Data Privacy** | ⚠️ Partial | `schema.sql:375`, `cloudinary.service.ts:57` | Sensitive student PII isolated; base64 fallback strings stored directly in PostgreSQL columns when Cloudinary is not configured. |
| **19. Error Handling** | ✅ Pass | `error.middleware.ts:23-28` | Production 500 errors sanitized to generic message; raw database error codes and stack traces suppressed to clients in production. |
| **20. Backup / Recovery** | ⚠️ Partial | Supabase Cloud Console | Relies on Supabase automated cloud backups; no scheduled automated SQL dump script within application operations. |

---

## 2. Classified Security Findings

---

### A. Confirmed Vulnerability

#### 1. Plaintext Database Connection Password Shared in Chat History
- **Severity:** High
- **Evidence:** Plaintext database password was pasted into the development chat session on 2026-10-07.
- **Risk:** Anyone with access to the conversation record, transcripts, or shared workspace can establish a direct TCP connection to the PostgreSQL database on port 5432, completely bypassing application firewalls, CORS, Express middleware, and RBAC.
- **Affected Location:** Supabase Project Infrastructure (`ehimlxnyueqqebhkrkzy.supabase.co:5432`).
- **Why It Matters:** Direct database credentials represent unconditional superuser access to all student records, user accounts, and audit logs.
- **Recommended Fix:** Navigate to Supabase Dashboard > Project Settings > Database > Database Password, click **Reset Database Password**, generate a 32+ character random secret, and update external connection strings.

---

### B. Security Weaknesses

#### 1. Permissive PostgreSQL Row Level Security (RLS) Write Policies
- **Severity:** Critical
- **Evidence:** [database/schema.sql:494-509](file:///d:/school-management-systems/database/schema.sql#L494-L509):
  ```sql
  CREATE POLICY "Allow authenticated insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow authenticated update students" ON public.students FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Allow authenticated insert parents" ON public.parents FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow authenticated update parents" ON public.parents FOR UPDATE TO authenticated USING (true);
  ```
- **Risk:** Any user holding a valid Supabase JWT (including a student or parent account) can use the publicly available `anon` key to call Supabase PostgREST endpoints directly (`https://<project-ref>.supabase.co/rest/v1/students`), inserting or updating any student record, grades, or documents without passing through Express RBAC.
- **Affected Location:** `database/schema.sql` and `database/part2_students_enrollment.sql`.
- **Why It Matters:** While Express enforces permissions, Supabase PostgREST is exposed on the public internet. Permissive RLS write policies render the database vulnerable to direct modification.
- **Recommended Fix:** Change all write policies on public tables to restrict direct PostgREST writes:
  ```sql
  DROP POLICY "Allow authenticated insert students" ON public.students;
  CREATE POLICY "Restrict student writes to service role" ON public.students
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```

#### 2. Public Static Database Schema Route
- **Severity:** High
- **Evidence:** [server.ts:92-94](file:///d:/school-management-systems/server.ts#L92-L94):
  ```typescript
  app.get('/database/schema.sql', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'database', 'schema.sql'));
  });
  ```
- **Risk:** Any unauthenticated external client can download the complete schema file containing table layouts, column names, foreign keys, triggers, constraints, and default administrative usernames.
- **Affected Location:** `server.ts`.
- **Why It Matters:** Exposes complete internal architectural blueprints to malicious actors, facilitating targeted SQL and parameter attacks.
- **Recommended Fix:** Remove the public static file route from `server.ts` before production deployment.

#### 3. In-Memory Multipart File Upload Buffering via Multer
- **Severity:** High
- **Evidence:** [server/src/modules/students/students.routes.ts:24-46](file:///d:/school-management-systems/server/src/modules/students/students.routes.ts#L24-L46):
  ```typescript
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  ```
- **Risk:** Uploaded files are buffered directly in Node.js V8 heap memory. Concurrent 10MB document uploads can cause Node.js heap exhaustion and trigger an Out-Of-Memory (OOM) crash.
- **Affected Location:** `server/src/modules/students/students.routes.ts`.
- **Why It Matters:** Creates an easily exploitable Denial of Service vector against the API server.
- **Recommended Fix:** Stream file buffers directly to Cloudinary via `upload_stream` or use temporary disk storage with automatic cleanup.

#### 4. Session Tokens Stored in Browser `localStorage`
- **Severity:** High
- **Evidence:** [src/lib/api.ts:13 & 21](file:///d:/school-management-systems/src/lib/api.ts#L13):
  ```typescript
  localStorage.setItem('educore_auth_token', token);
  ```
- **Risk:** Browser `localStorage` is accessible to any script executing on the same origin. Any Cross-Site Scripting (XSS) vulnerability will result in immediate exfiltration of administrative bearer tokens.
- **Affected Location:** `src/lib/api.ts` and `src/hooks/useAuth.tsx`.
- **Why It Matters:** Breaches user sessions without requiring network eavesdropping or brute force.
- **Recommended Fix:** Store authentication tokens in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.

#### 5. Silent Fallback from Service Role Key to Anon Key
- **Severity:** Medium
- **Evidence:** [server/src/config/supabase.ts:21](file:///d:/school-management-systems/server/src/config/supabase.ts#L21):
  ```typescript
  const adminKey = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;
  ```
- **Risk:** If `SUPABASE_SERVICE_ROLE_KEY` is accidentally omitted in production `.env`, the backend silently initializes `supabaseAdmin` with the restricted anonymous key. Administrative backend queries then fail unexpectedly under RLS.
- **Affected Location:** `server/src/config/supabase.ts`.
- **Why It Matters:** Obscures configuration errors and degrades backend administrative reliability.
- **Recommended Fix:** Throw a fatal error if `SUPABASE_SERVICE_ROLE_KEY` is missing when `ENV.isSupabaseConfigured()` is true.

---

### C. Missing Controls

#### 1. Horizontal Object-Level Ownership Checks (IDOR Prevention)
- **Severity:** High
- **Evidence:** `students.controller.ts` endpoints (`GET /students/:id/documents`, `GET /students/:id/parents`, `GET /students/:id/enrollments`) enforce only functional permission names (`documents.read`), not ownership links.
- **Risk:** An authenticated parent or student user can view records belonging to any other student in the school by replacing `:id` with another UUID.
- **Affected Location:** `server/src/modules/students/students.routes.ts` & `students.service.ts`.
- **Why It Matters:** Violates student privacy regulations and horizontal authorization principles.
- **Recommended Fix:** Implement ownership middleware verifying that the requesting parent is linked in `student_parents` or that the teacher is assigned to the student's class.

#### 2. Distributed Rate Limiting Store for Production Clusters
- **Severity:** Medium
- **Evidence:** [server.ts:53-76](file:///d:/school-management-systems/server.ts#L53-L76) relies on `express-rate-limit` default in-memory storage.
- **Risk:** When deployed behind a load balancer with multiple Node.js workers or containers, each process maintains an independent counter, effectively multiplying the allowed request quota.
- **Affected Location:** `server.ts`.
- **Why It Matters:** Compromises brute-force protection against login and public endpoints.
- **Recommended Fix:** Connect `express-rate-limit` to a shared Redis instance using `rate-limit-redis`.

#### 3. Automated Secret Scanning in Repository Pipeline
- **Severity:** Medium
- **Evidence:** No pre-commit hooks (`husky` / `gitleaks`) configured to scan commits for accidental credential inclusions.
- **Risk:** Developers may inadvertently commit `.env` or API keys during local git operations.
- **Affected Location:** Repository root / Git hooks.
- **Why It Matters:** Proactive prevention of credential leaks before code is pushed to remote repositories.
- **Recommended Fix:** Install `gitleaks` or a pre-commit hook scanning for high-entropy tokens and secrets.

---

### D. Potential Risks Requiring Verification

#### 1. Base64 Media Storage Fallback in PostgreSQL
- **Severity:** Medium
- **Evidence:** [server/src/utils/cloudinary.service.ts:57-63 & 96-102](file:///d:/school-management-systems/server/src/utils/cloudinary.service.ts#L57-L63):
  Stores multi-megabyte base64 strings in `photo_url` and `file_url` when Cloudinary credentials are not provided.
- **Risk:** Database table bloat, extreme memory consumption during SELECT queries, and slow API response times.
- **Affected Location:** `server/src/utils/cloudinary.service.ts`.
- **Why It Matters:** Directly degrades database query performance and storage costs.
- **Recommended Fix:** Enforce valid Cloudinary credentials or Supabase Storage in production; reject uploads if storage is not configured.

#### 2. Permissive Localhost CORS Origin Matching
- **Severity:** Medium
- **Evidence:** [server.ts:40](file:///d:/school-management-systems/server.ts#L40) (`origin.startsWith('http://localhost:')`).
- **Risk:** In development or shared staging environments, any malicious local web server or extension listening on any local port can issue authenticated cross-origin requests with credentials.
- **Affected Location:** `server.ts`.
- **Why It Matters:** Weakens browser origin boundary protection.
- **Recommended Fix:** Replace wildcard prefix check with an exact array of allowed origins (`['http://localhost:3000', 'http://localhost:5173']`).

---

### E. Recommendations & Best Practices

1. **Implement Content Security Policy (CSP) in Development:** Enable a development-safe CSP in `server.ts` rather than disabling it entirely (`contentSecurityPolicy: false`).
2. **Enforce Password Complexity Rules:** Require at least one uppercase letter, one number, and one special character for user and initial admin passwords.
3. **Audit Sensitive Read Operations:** Log bulk student directory exports (`GET /api/v1/students?limit=100`) in `public.audit_logs`.
4. **Automated Scheduled Database Backups:** Configure daily logical backups (`pg_dump`) retained in an encrypted off-site storage bucket.
5. **Zero-Vulnerability Dependency Maintenance:** Continue running `npm audit` on every build to maintain the current 0-vulnerability baseline.
