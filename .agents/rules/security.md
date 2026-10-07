# Security Rules – EduCore School Management System

Check this list for **every** new module and endpoint before calling it done.
Student data is sensitive (children's records, fees, contact details), so treat security as a requirement, not a polish step.

## Mandatory checklist for every endpoint
1. **Authenticate:** route uses `authenticateToken`. No unauthenticated data routes (only `/auth/status`, `/auth/initial-admin`, `/health`).
2. **Authorize:** route checks a specific permission (e.g. `attendance.create`). Do not rely on the frontend hiding buttons.
3. **Scope data by role (anti-IDOR):**
   - Parents may read only their own children's data.
   - Teachers may read/write only their assigned classes/sections.
   - Students may read only their own data.
   - Verify ownership in the service layer, not just permission names.
4. **Validate input** with `zod` on body, query and params (types, lengths, enums, UUID format). Reject unknown fields.
5. **Use parameterized access only** (Supabase client / bound params). Never build SQL by string concatenation.
6. **Paginate** every list endpoint with a hard maximum `limit` (e.g. 100).
7. **Return minimal fields.** Never return `password_hash`, tokens, service keys or internal flags.
8. **Audit-log** create/update/delete of sensitive records (students, fees, marks, attendance edits, roles).
9. **Safe errors:** no stack traces or SQL errors to the client; log details server-side only.

## Database
- Enable **RLS on every new table**. Do not add `USING (true)` / `WITH CHECK (true)` write policies for broad roles; scope policies to the real rule.
- The Express API uses the service-role key, so RLS does not protect API routes: **authorization in code is the real control**. RLS protects against direct access with the public anon key.
- Foreign keys and indexes on every relation; soft-delete (`deleted_at`) instead of hard delete for people and financial records.
- Never put secrets or personal data in SQL seed files.

## Secrets and config
- Secrets only in `.env` (ignored via `.gitignore`: `.env*` except `.env.example`). Never commit keys, DB passwords or tokens. Never print them in logs or chat.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it via `VITE_*` or `NEXT_PUBLIC_*`.
- `JWT_SECRET` must be set to a long random value in production; never rely on a default.
- Rotate any credential that has been pasted into a chat, ticket or screenshot.

## Authentication
- Demo/in-memory tokens (`demo-*`) must **never** work when live Supabase is configured or when `NODE_ENV=production`.
- Rate-limit login and any public endpoint; lock out or slow repeated failures.
- Support access + refresh tokens for the mobile app; short-lived access tokens.
- Deactivated users (`status != ACTIVE` or `deleted_at` set) must be rejected on every request.

## HTTP hardening (apply to the Express app)
- Add `helmet` security headers.
- Restrict CORS to known origins (web app URL, mobile uses no browser origin) instead of open `cors()`.
- Limit JSON body size; limit upload size and allowed MIME types (validate server-side).
- Use HTTPS only in production.

## Uploads
- Validate type and size on the server. Store via Cloudinary/Supabase Storage with signed URLs. Never trust file names.

## Dependency & Package Security (Mandatory Before Installing Any Package)
- **Vulnerability Check Required:** Whenever installing any new npm package, **always run `npm audit`** and verify **0 vulnerabilities**.
- **No Bypassing Audits:** Never use `--no-audit` on the main project.
- **Package Vetting:**
  - Verify the package is actively maintained, well-adopted, and has no known CVEs.
  - Avoid bloated packages that pull in hundreds of unneeded transitive dependencies.
  - Prefer native Node.js / browser APIs when possible instead of micro-packages.
- **Zero-Tolerance for Known Vulnerabilities:** If `npm audit` flags moderate, high, or critical vulnerabilities upon adding a package, immediately find an alternative or update to a patched version before proceeding.

## 6 Pre-Production Security Gates (Strictly Enforced)

1. **Rate Limiting:** Stricter limits on authentication routes (`/api/auth/*`), moderate limits on public endpoints, and configurable thresholds on general API actions via `express-rate-limit`.
2. **Input Validation:** Validate every input against strict Zod schemas (type, length, format) and reject non-matching payloads.
3. **Secrets Scanning:** Zero hardcoded secrets, API keys, or tokens in source code. All secrets in `.env` (git-ignored); `SUPABASE_SERVICE_ROLE_KEY` is server-only; `JWT_SECRET` guarded with fatal production check.
4. **Dependency Vulnerabilities:** Regular audit using `npm audit`. Zero-tolerance for packages with known CVEs (currently 0 vulnerabilities).
5. **Error Handling & Information Leakage:** Never leak stack traces, internal file paths, or raw database errors to clients in production. Always log full details server-side only via `errorHandler`.
6. **File Upload Safety:** Strict MIME whitelisting on all Multer endpoints (photos: JPG/PNG/WEBP; documents: PDF/DOC/DOCX/Images). Memory/isolated storage only; files can never be executed as code.

## Security fixes applied & tracked
- [x] **CRITICAL FIXED:** Blocked `demo-*` tokens in `server/src/middleware/auth.middleware.ts` whenever live Supabase is configured or in production (`401 Unauthorized`).
- [x] **FIXED:** Blocked `/api/auth/demo-login` route when live Supabase is configured or in production (`403 Forbidden`).
- [x] **FIXED:** Secured `/api/auth/profile` so user identity is derived strictly from the verified JWT token (`req.user`), preventing impersonation or client-side self-assigned roles.
- [x] **FIXED:** Guarded `JWT_SECRET` in `server/src/config/env.ts` with fatal production enforcement (must be explicitly set and >= 32 chars).
- [x] **FIXED:** Restricted CORS in `server.ts` to allowed origins (`http://localhost:*` and `APP_URL`).
- [x] **FIXED:** Installed `helmet` security headers and `express-rate-limit` (brute-force protection on auth endpoints and general API rate limiting).
- [x] **FIXED (Gate #5):** Sanitized 500 error messages in `server/src/middleware/error.middleware.ts` to prevent database error and stack trace leakage in production.
- [x] **FIXED (Gate #6):** Added strict MIME type whitelists (`ALLOWED_PHOTO_MIMES`, `ALLOWED_DOCUMENT_MIMES`) and 5MB/10MB size limits to all Multer uploads in `students.routes.ts`.
- [ ] Review broad RLS insert/update policies in `database/part2_students_enrollment.sql` before public internet launch.
- [ ] Database password was shared in chat on 2026-10-07: reset it in Supabase (Project Settings -> Database).

