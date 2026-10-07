# Project Conventions – EduCore Single-School Management System

These rules apply to all work in this repository.

## Architecture & API Standards
- **Single-school system.** No `school_id`, no multi-tenancy. School identity lives in `school_settings`.
- **IDs:** always native PostgreSQL `UUID` (`gen_random_uuid()`). Never auto-increment integers in URLs or APIs.
- **Universal API Contract:** All endpoints must adhere strictly to `.agents/rules/api-standards.md` using `sendSuccess`, `sendPaginated`, and `sendError` from `server/src/utils/response.ts`.
- Humans use business identifiers (e.g. `admission_number`), which must have a unique index.

## Folder structure: feature-based
Group code by feature (module). Only truly shared code lives in type-based folders.

### Backend (`server/src/`)
- `modules/<feature>/<feature>.routes.ts` – URLs + permission checks
- `modules/<feature>/<feature>.controller.ts` – request/response handling
- `modules/<feature>/<feature>.service.ts` – business logic + DB queries
- Mount every new module in `server/src/routes/index.ts`.
- Shared only: `middleware/`, `config/`, `db/`, `types/`, `utils/`.

### Frontend (`src/`)
- `modules/<feature>/` – all views/modals for that feature.
- Shared only: `components/common/` (Button, Modal, Table, Input), `components/layout/`, `hooks/`, `lib/`, `types/`.
- Add a tab for each module in `components/layout/Sidebar.tsx` and wire it in `DashboardShell.tsx`.

### Database (`database/`)
- One numbered, re-runnable SQL file per part: `schema.sql` (part 1), `part2_students_enrollment.sql`, `part3_<name>.sql`, ...
- Use `IF NOT EXISTS` / `DROP ... IF EXISTS` so scripts can be re-run safely.
- Index foreign keys and frequently filtered columns; enable RLS on every table.
- Follow the `supabase-postgres-best-practices` skill for any schema change.

## Build workflow (per module)
1. **Database** tables (SQL file + run on Supabase)
2. **Backend** routes, controller, service, validation, permissions
3. **Frontend** screens using those endpoints
4. **Test** end to end

Backend first for each module, then its frontend. Never build all backends before any frontend.

## Modular Monolith Architecture & Fault Isolation
- **Monolith Deployment:** Single unified backend and frontend build. No microservices network splits or distributed point-of-failure overhead.
- **Frontend Fault Isolation (`ErrorBoundary`):**
  - Wrap top-level tab views and high-risk widgets in `<ErrorBoundary>` from `src/components/common/ErrorBoundary.tsx`.
  - An unexpected render error in one module must **never** cause a blank white screen across the application. The sidebar, header, and other modules must remain operational.
- **Backend Process Resilience:**
  - The Express server process in `server.ts` must maintain top-level `process.on('unhandledRejection')` and `process.on('uncaughtException')` guards.
  - An unexpected error in an asynchronous task, IoT gate endpoint, or database query must log diagnostic details without terminating the Node.js server.
- **Database ACID Isolation:**
  - Wrap multi-row operations (e.g. bulk attendance, exam markups, fee allocations) in PostgreSQL transactions. Failures must roll back cleanly without leaving partial records or locking schemas.

## Component Decomposition & Code Size Rules
- **No Monolithic "God Components":** Never write 800+ lines in a single `.tsx` file.
- **Target File Size:** Keep components under **250–300 lines**.
- **Feature Subcomponent Folder:** When a module grows beyond a basic view, extract presentational pieces into `src/modules/<feature>/components/`:
  - Separate toolbar/filter strips, statistics bars, modal dialogs, and segmented action pickers.
  - The main module file (`<Feature>Management.tsx`) should act as a clean, lean orchestrator (< 350 lines) managing state and mutations.
- **Reusable Primitives First:** Always use standard components in `src/components/common/`:
  - Generic `<Table<T>>` with typed `Column<T>`, `keyExtractor`, and `rowClassName`.
  - `<Button>`, `<Badge>`, `<Modal>`, `<ErrorBoundary>`, `<Input>`, and `<Toast>`.

## Dev environment
- Package manager: `npm` (do not add `esbuild` to package.json; it conflicts with Vite).
- **Package Security:** Always audit before/after adding packages with `npm audit`. Zero vulnerabilities permitted on the main project (never use `--no-audit`).
- Run: `npm run dev` (Express + Vite on http://localhost:3000). Type check: `npm run lint`.
- Secrets live only in `.env` (git-ignored). Never commit keys or DB passwords.
- The app falls back to an in-memory store (`server/src/db/store.ts`) when Supabase is not configured; keep new modules working in both modes.

## Mobile app (planned)
- **Platforms:** Android and iOS, built with **React Native + Expo** (TypeScript) in a `mobile/` folder at the repo root, next to `src/` and `server/`.
- **Users (v1):** Parents and Teachers only. Admin/staff stay on web.
- **Offline:** not required in v1. Show a "no connection, retry" state instead.
- **Order:** finish each module on web first, then add its mobile screens (parent: attendance, fees, notices, homework, results; teacher: mark attendance, homework, marks).
- **Backend must stay mobile-ready (API-first):**
  - New endpoints go under `/api/v1/...`; never break an existing version (installed apps can't be force-updated).
  - Keep the `{ success, data, message, code }` response shape; paginate every list endpoint and support `?limit=` / `?fields=` for small payloads.
  - Enforce all permissions server-side; never trust the client. Parents see only their own children; teachers only their assigned classes.
  - Auth must work with access + refresh tokens (no cookie/browser-only assumptions); rate-limit login.
  - Uploads go to Cloudinary/Supabase Storage via signed URLs, not through the API server.
  - Push notifications: add a `device_tokens` table when building the Communication module.
  - **In-App Force Update:** Implemented under `/api/v1/app/check-update?platform=android|ios&version=x.x.x&build_number=x`. Supports force updates, optional updates, and maintenance mode. Configurable via `mobile_app_versions` table and admin `/api/v1/app/settings`.
  - Put shared TypeScript types in a form that `mobile/` can reuse.

## Roadmap (from `sys desgin.md`)
- Done:
  - Part 1: Auth, RBAC, users, settings, audit trail.
  - Part 2: Academic years, classes, sections, students, parents, enrollments.
  - Part 3: Mobile in-app force updates, versioning table, admin management.
  - Part 4: Hybrid Student Attendance (Classroom roll-call, RFID & biometric gate taps, live daily stats, student monthly history logs).
- Next up:
  - Option A: **Homework / Assignments Module** (`homework` table, submissions, teacher review, attachments).
  - Option B: **Examinations & Grading Module** (terms, schedules, grade scales, marks entry, report card generation).
  - Option C: **Fees & Payments Module** (fee structures, student fee allocations, receipts, payment gateway).


