# EduCore Single-School Management System — Threat Model

**Project:** EduCore Single-School Management System  
**Architecture:** Single-School Monolith (React 19 SPA + Vite + Node.js/Express + Supabase PostgreSQL)  
**Document Location:** `brain/security/threat-model.md`  
**Assessment Date:** 2026-10-07  
**Scope:** Complete project codebase (`server.ts`, `server/src/**`, `src/**`, `database/**`, dependencies, runtime configuration)

---

## 1. System Overview & Architecture Context

EduCore is an educational management platform built for a single school institution (explicitly removing multi-tenant overhead such as `school_id` partitioning). The architecture consists of:
1. **Frontend Client:** React 19 single-page application built with Vite, Tailwind CSS 4, Lucide icons, and Motion. Communicates via REST APIs (`/api` and `/api/v1`) using bearer token authorization.
2. **Backend API Server:** Node.js Express application running in ESM mode (`server.ts`) providing unified modular routing for Authentication, Users, Roles, School Settings, Audit Logs, Academic Years, Classes, Sections, Students, Parents, Enrollments, and Mobile App Versioning.
3. **Database & Identity Layer:** Supabase PostgreSQL (`https://<project-ref>.supabase.co`) hosting identity management (`auth.users`) and application relational tables in the `public` schema.
4. **Third-Party Integrations:** Cloudinary CDN for student photo and document storage; pending integrations for Razorpay payment processing, Twilio/SMS, WhatsApp Business API, and SMTP email delivery.

---

## 2. Asset Identification

The system processes and stores critical assets classified by sensitivity:

| Asset Name | Sensitivity | Storage Location | Description & Impact of Compromise |
|---|---|---|---|
| **Student PII & Academic History** | High / Regulated (FERPA/COPPA equivalent) | PostgreSQL `public.students`, `public.student_enrollments` | Names, dates of birth, blood groups, addresses, phone numbers, roll numbers, category, nationality. Compromise leads to severe privacy violations and identity theft of minors. |
| **Parent / Guardian Contact Directory** | High / PII | PostgreSQL `public.parents`, `public.student_parents` | Parent names, phone numbers, emergency contact flags, pickup authorization flags. Compromise enables social engineering or unauthorized child pickup risks. |
| **Student Verification Documents & Photos** | High / PII | Cloudinary CDN / PostgreSQL `public.student_documents` | Scanned identity proofs, birth certificates, medical forms, photographs. Compromise exposes minors' sensitive legal and biometric-adjacent data. |
| **Administrative Credentials & Access Tokens** | Critical | Supabase `auth.users`, Browser `localStorage` (`educore_auth_token`) | Super Administrator and Principal passwords/tokens. Compromise enables total system takeover. |
| **Database Connection & Service Keys** | Critical | Server `.env` (`SUPABASE_SERVICE_ROLE_KEY`, Database Password) | Supabase Service Role key that bypasses Row Level Security (RLS) entirely. Exposure provides root read/write access to the database. |
| **Audit Logs** | High | PostgreSQL `public.audit_logs` | Immutable audit trail of administrative modifications, student archiving, role assignments, and authentications. Tampering ruins non-repudiation and forensic investigations. |
| **Mobile App Versioning Controls** | Medium / Integrity | PostgreSQL `public.mobile_app_versions` | Controls `force_update`, `store_url`, and `maintenance_mode`. Tampering enables redirection of mobile app users to malicious APK/IPA downloads or forced DoS. |
| **School Master Settings** | Medium | PostgreSQL `public.school_settings` | School address, principal name, grading rules, currency, academic session configuration. |

---

## 3. Trust Boundaries

The system is demarcated by four principal trust boundaries:

```
[ Untrusted Public Internet ]
              │ (HTTPS / REST)
      [ Trust Boundary 1: Client ↔ Express API Gateway ]
              │
      ┌───────┴────────────────────────┐
      ▼                                ▼
[ Express API Server ]       [ Browser Direct to Supabase ]
 (Service Role Key)           (Anon Key + User JWT)
      │                                │
      ├────────────────────────────────┤
      ▼                                ▼
[ Trust Boundary 2: Express / Client ↔ Supabase Postgres / PostgREST ]
              │
      [ Trust Boundary 3: Express Backend ↔ Cloudinary Storage ]
              │
      [ Trust Boundary 4: Local Memory Fallback vs Production Live DB ]
```

1. **Trust Boundary 1: External Client (Browser / Mobile App) ↔ Express API (`server.ts`):**
   - Untrusted JSON payloads, query parameters, multipart file uploads, and HTTP headers cross into Node.js.
   - Enforced by: `helmet`, `cors`, `express-rate-limit`, `authenticateToken`, and `requirePermission`.
2. **Trust Boundary 2: Supabase PostgREST & Auth ↔ Client Browser / External Network:**
   - Supabase exposes public endpoints (`/rest/v1/*`, `/auth/v1/*`) protected solely by the public `anon` key and PostgreSQL Row Level Security (RLS).
   - *Critical Trust Hazard:* If RLS policies in PostgreSQL are too permissive, clients can bypass the Express backend entirely and query PostgreSQL directly using their user JWT and the public anon key.
3. **Trust Boundary 3: Express Backend ↔ Cloudinary API:**
   - Outbound HTTPS communication transmitting student photos and PDF documents using `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
4. **Trust Boundary 4: Node.js Memory Space (In-Memory Simulator vs. Live Supabase):**
   - When Supabase credentials are missing or in dev fallback, system drops to `memoryDb` in-memory state. Transition logic must guarantee demo mechanisms can never execute in live or production mode.

---

## 4. Threat Actors

1. **Unauthenticated Public External Attacker:** An external entity on the internet seeking to scrape data, flood endpoints, bypass authentication, or abuse public routes.
2. **Authenticated Student / Student User:** A minor or student user with minimal permissions attempting to view other students' records, alter attendance, or escalate privileges.
3. **Authenticated Parent / Guardian:** A guardian attempting to view records of other students or modify family links.
4. **Authenticated Teacher / Staff Member:** A staff member with academic permissions attempting to access financial records, modify audit logs, or alter permissions.
5. **Malicious Insider / Compromised Administrator:** An administrator attempting to erase audit logs, tamper with settings, or exfiltrate complete student directories.

---

## 5. Entry Points & Attack Vectors

| Entry Point | Method / Protocol | Target Component | Authentication Required | Existing Gate |
|---|---|---|---|---|
| `/api/v1/auth/status` | GET | `auth.controller.ts` | None (Public) | General Rate Limiter (300/15m) |
| `/api/v1/auth/initial-admin` | POST | `auth.service.ts` | None (Public) | Auth Rate Limiter (30/15m) + One-time Check |
| `/api/v1/auth/demo-login` | POST | `auth.controller.ts` | None (Public) | Auth Rate Limiter + Live Supabase check |
| `/api/v1/app/check-update` | GET | `app-version.controller.ts` | None (Public) | General Rate Limiter |
| `/database/schema.sql` | GET | `server.ts` (Static file) | None (Public) | None |
| `/api/v1/students/:id/photo` | POST (Multipart) | `students.controller.ts` | Yes (`students.update`) | Multer 5MB + MIME whitelist |
| `/api/v1/students/:id/documents` | POST (Multipart) | `students.controller.ts` | Yes (`documents.create`) | Multer 10MB + MIME whitelist |
| `/api/v1/users/:id/roles` | POST | `users.controller.ts` | Yes (`users.manage_roles`) | RBAC Check |
| `https://<supabase>.supabase.co/rest/v1/*` | Direct PostgREST | PostgreSQL Direct | Anon Key + Bearer JWT | PostgreSQL RLS Policies |

---

## 6. Threat Analysis (STRIDE Model)

### 6.1 Spoofing (Identity Tampering)
- **T-SPOOF-1: Supabase Profile Identity Impersonation via Client Body:**
  - *Scenario:* In early revisions of `/api/auth/profile`, clients sent `authUserId` in the JSON request body.
  - *Current Mitigation:* [auth.controller.ts:40-54](file:///d:/school-management-systems/server/src/modules/auth/auth.controller.ts#L40-L54) now derives identity exclusively from verified JWT `req.user.auth_user_id` and explicitly strips any client-provided role.
  - *Residual Risk:* Low.
- **T-SPOOF-2: Demo Token Reuse on Production:**
  - *Scenario:* Attacker sends `Authorization: Bearer demo-admin-token` to bypass Supabase.
  - *Current Mitigation:* [auth.middleware.ts:38-41](file:///d:/school-management-systems/server/src/middleware/auth.middleware.ts#L38-L41) rejects demo tokens with `401 Unauthorized` whenever `isUsingLiveSupabase()` is true or `NODE_ENV === 'production'`.
  - *Residual Risk:* Low.

### 6.2 Tampering (Data Modification)
- **T-TAMP-1: Direct Supabase PostgREST Modification via Permissive RLS:**
  - *Scenario:* An authenticated student or parent obtains their Supabase JWT from `localStorage`, looks up the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the client bundle, and issues direct HTTP PATCH/POST calls to Supabase PostgREST endpoints.
  - *Code Evidence:* [database/schema.sql:494-509](file:///d:/school-management-systems/database/schema.sql#L494-L509) contains:
    `CREATE POLICY "Allow authenticated insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);`
    `CREATE POLICY "Allow authenticated update students" ON public.students FOR UPDATE TO authenticated USING (true);`
  - *Impact:* Complete bypass of Express RBAC. Any authenticated user can modify student names, attendance, grades, and enrollments directly.
  - *Severity:* **CRITICAL**.

### 6.3 Repudiation (Denial of Actions)
- **T-REP-1: Unlogged Read Operations on Sensitive Student Data:**
  - *Scenario:* A staff member exfiltrates 1,000 student records using `GET /api/v1/students`.
  - *Current Mitigation:* Audit logs capture write actions (`CREATE_STUDENT`, `UPDATE_STUDENT`, `ARCHIVE_STUDENT`, `UPLOAD_STUDENT_DOCUMENT`), but read access on student directories is not logged.
  - *Residual Risk:* Medium.

### 6.4 Information Disclosure (Privacy Breaches)
- **T-INFO-1: Public Exposure of Database Schema:**
  - *Scenario:* Attacker calls `GET /database/schema.sql`.
  - *Code Evidence:* [server.ts:92-94](file:///d:/school-management-systems/server.ts#L92-L94) serves the raw SQL schema file publicly without authentication.
  - *Impact:* Discloses all database structures, table names, RLS rules, foreign keys, and seed configurations.
  - *Severity:* **HIGH**.
- **T-INFO-2: Database Error & Stack Trace Leaks in Production:**
  - *Current Mitigation:* [error.middleware.ts:24-27](file:///d:/school-management-systems/server/src/middleware/error.middleware.ts#L24-L27) sanitizes 500 errors to a generic message in production. Stack traces are kept server-side.
  - *Residual Risk:* Low in production; moderate in dev mode.
- **T-INFO-3: Insecure Token Storage in Browser `localStorage`:**
  - *Code Evidence:* [src/lib/api.ts:13](file:///d:/school-management-systems/src/lib/api.ts#L13) stores bearer tokens in `localStorage.setItem('educore_auth_token', token)`.
  - *Impact:* Any XSS vulnerability enables immediate exfiltration of active administrative tokens.
  - *Severity:* **HIGH**.

### 6.5 Denial of Service (Availability Loss)
- **T-DOS-1: Memory Heap Exhaustion via Concurrent File Uploads:**
  - *Scenario:* Attacker sends 20 concurrent 10MB document uploads to `/api/v1/students/:id/documents`.
  - *Code Evidence:* [students.routes.ts:36-46](file:///d:/school-management-systems/server/src/modules/students/students.routes.ts#L36-L46) uses `multer.memoryStorage()`.
  - *Impact:* 200MB+ allocated directly into the Node.js V8 heap, causing garbage collection spikes and eventual OOM crash.
  - *Severity:* **HIGH**.
- **T-DOS-2: Rate Limiting State Reset in Multi-Instance Deployments:**
  - *Code Evidence:* [server.ts:53-76](file:///d:/school-management-systems/server.ts#L53-L76) uses the default in-memory store for `express-rate-limit`.
  - *Impact:* Rate limits are per-process. Scaling to 4 instances allows an attacker 4x the request budget.
  - *Severity:* **MEDIUM**.

### 6.6 Elevation of Privilege
- **T-ELEV-1: Lack of Object-Level Ownership Checks (IDOR on Sub-Resources):**
  - *Scenario:* An authenticated user with permission to view documents accesses `GET /api/v1/students/:id/documents` for a student outside their assigned class or family.
  - *Code Evidence:* [students.controller.ts:134-142](file:///d:/school-management-systems/server/src/modules/students/students.controller.ts#L134-L142) checks only `requirePermission('documents.read')` and takes `:id` directly without verifying teacher-class or parent-student ownership.
  - *Severity:* **HIGH**.
- **T-ELEV-2: Supabase Client Fallback to Anon Key for Admin Operations:**
  - *Code Evidence:* [server/src/config/supabase.ts:21](file:///d:/school-management-systems/server/src/config/supabase.ts#L21):
    `const adminKey = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;`
  - *Impact:* If `SUPABASE_SERVICE_ROLE_KEY` is accidentally omitted in `.env`, the server falls back to `SUPABASE_ANON_KEY` for `supabaseAdmin`. Backend administrative operations will fail or operate under anon restrictions.
  - *Severity:* **MEDIUM**.

---

## 7. Findings & Gap Classification

### Confirmed Vulnerabilities
1. **Compromised Database Credential in Conversation History:**
   - **Severity:** High
   - **Evidence:** Plaintext database password was pasted into development conversation.
   - **Risk:** Anyone with access to the chat logs or shared context can access the Supabase PostgreSQL cluster directly.
   - **Affected Location:** External configuration / Supabase Project DB settings.
   - **Why It Matters:** Bypasses all application firewalls, CORS, and API routing.
   - **Recommended Fix:** Rotate database password immediately in Supabase Project Settings > Database.

### Security Weaknesses
1. **Permissive Row Level Security Policies on Relational Tables:**
   - **Severity:** Critical
   - **Evidence:** `database/schema.sql` lines 494–509 (`WITH CHECK (true)` and `USING (true)` for all authenticated roles on `students`, `parents`, `student_enrollments`, `student_documents`).
   - **Risk:** Any user with a valid Supabase JWT can use the exposed `anon` key to write directly to Supabase PostgREST, bypassing Express RBAC.
   - **Affected Location:** `database/schema.sql` (and `database/part2_students_enrollment.sql`).
   - **Why It Matters:** Direct database access nullifies application-layer authorization.
   - **Recommended Fix:** Restrict direct PostgREST modification. Set write policies to `TO service_role USING (true)` or enforce specific role claims via `auth.jwt()`.
2. **Public Unauthenticated Database Schema Endpoint:**
   - **Severity:** High
   - **Evidence:** `server.ts` lines 92–94 (`app.get('/database/schema.sql')`).
   - **Risk:** Complete reconnaissance information disclosure.
   - **Affected Location:** `server.ts`.
   - **Why It Matters:** Exposes table structure, constraint names, and data model to unauthorized parties.
   - **Recommended Fix:** Remove the public static route or restrict it to authenticated administrators in development mode only.
3. **In-Memory File Upload Buffering via Multer:**
   - **Severity:** High
   - **Evidence:** `server/src/modules/students/students.routes.ts` lines 24–46 (`multer.memoryStorage()`).
   - **Risk:** Node.js memory exhaustion denial of service.
   - **Affected Location:** `server/src/modules/students/students.routes.ts`.
   - **Why It Matters:** Enables remote attackers to crash the server with concurrent large uploads.
   - **Recommended Fix:** Stream uploads directly to Cloudinary or use disk storage / Supabase Storage signed URLs.
4. **Authentication Tokens Persisted in `localStorage`:**
   - **Severity:** High
   - **Evidence:** `src/lib/api.ts` lines 13 & 21 (`localStorage.setItem('educore_auth_token', token)`).
   - **Risk:** Session hijacking via XSS.
   - **Affected Location:** `src/lib/api.ts` and `src/hooks/useAuth.tsx`.
   - **Why It Matters:** Browser scripts have unrestricted read access to `localStorage`.
   - **Recommended Fix:** Migrate to `HttpOnly`, `SameSite=Strict`, `Secure` cookies for web sessions.

### Missing Controls
1. **Object-Level Ownership Validation (IDOR Control):**
   - **Severity:** High
   - **Evidence:** `students.controller.ts` and `parents.controller.ts` verify only functional permission names (`students.read`), not data ownership.
   - **Risk:** Parents and students can view any peer record by changing UUIDs in the request URL.
   - **Affected Location:** `server/src/modules/students/students.service.ts`, `parents.service.ts`.
   - **Why It Matters:** Multi-role school systems require horizontal access control.
   - **Recommended Fix:** Implement ownership verification middleware or service checks (e.g. `verifyParentStudentRelationship(parentId, studentId)`).
2. **Distributed Rate Limiting Store:**
   - **Severity:** Medium
   - **Evidence:** `server.ts` lines 53–76 (memory store).
   - **Risk:** Rate limits circumvented across clustered processes.
   - **Affected Location:** `server.ts`.
   - **Why It Matters:** Ineffective brute-force protection in multi-instance production environments.
   - **Recommended Fix:** Connect `express-rate-limit` to a Redis store (`rate-limit-redis`).

### Potential Risks Requiring Verification
1. **Fallback Base64 Storage in Database:**
   - **Severity:** Medium
   - **Evidence:** `server/src/utils/cloudinary.service.ts` lines 57–63 and 96–102 store base64 data URLs in PostgreSQL when Cloudinary is not configured.
   - **Risk:** Multi-megabyte rows in PostgreSQL causing storage bloat and slow queries.
   - **Affected Location:** `server/src/utils/cloudinary.service.ts`.
   - **Why It Matters:** Degrades database performance and scalability.
   - **Recommended Fix:** Require Cloudinary or Supabase Storage bucket in production; reject uploads if storage is unconfigured.
