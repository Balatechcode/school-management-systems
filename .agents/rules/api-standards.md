# Universal API Standards & Contract – EduCore SMS

All backend APIs (serving Web and Mobile apps) must strictly follow these conventions.

---

## 1. Versioning & URL Structure
- **Base URL:** `/api/v1/...`
- **Resource naming:** Plural `kebab-case` or `snake_case` (e.g. `/api/v1/students`, `/api/v1/academic-years`, `/api/v1/app/check-update`).
- **HTTP Methods:**
  - `GET` – Read data (safe, idempotent, never alters state)
  - `POST` – Create resources or trigger actions (returns `201 Created` or `200 OK`)
  - `PUT` / `PATCH` – Full or partial update of an existing resource (returns `200 OK`)
  - `DELETE` – Soft-delete or archive a resource (returns `200 OK`)

---

## 2. Response Envelopes

### A. Single Object / Mutation Success (`sendSuccess`)
```json
{
  "success": true,
  "data": {
    "id": "c7b8d9e2-3f1a-4d92-b432-9c1234567890",
    "first_name": "Sarah",
    "created_at": "2026-10-07T07:00:00.000Z"
  },
  "message": "Resource successfully created"
}
```

### B. Paginated List Response (`sendPaginated`)
All list endpoints MUST be paginated. The response envelope MUST contain `data` (array) and `pagination`:
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "name": "Student A" },
    { "id": "uuid-2", "name": "Student B" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### C. Standard List Query Parameters
List queries MUST support and parse:
- `page`: integer $\ge 1$ (default `1`)
- `limit`: integer $\ge 1$ (default `20`, hard ceiling `100` to prevent DDoS/memory spikes)
- `search`: string (trimmed keyword search)
- `sort_by`: string (allowed indexed field names only)
- `sort_order`: `'asc'` | `'desc'` (default `'desc'`)

### D. Error Response (`sendError`)
```json
{
  "success": false,
  "message": "Student with admission number already exists",
  "code": "DUPLICATE_ENTRY",
  "details": [
    { "field": "admission_number", "issue": "Must be unique" }
  ]
}
```

---

## 3. Standard HTTP Status Codes

| Code | Usage |
| :--- | :--- |
| **`200 OK`** | Successful read, update, or action |
| **`201 Created`** | Successfully created a new resource |
| **`400 Bad Request`** | Input validation failure (Zod error), missing fields, malformed payload |
| **`401 Unauthorized`** | Missing, invalid, or expired JWT authentication token |
| **`403 Forbidden`** | Authenticated user lacks permission (RBAC) or attempted IDOR access |
| **`404 Not Found`** | Requested resource ID does not exist |
| **`409 Conflict`** | Unique constraint violation (e.g. duplicate email/admission number) |
| **`422 Unprocessable`** | Semantic validation error (e.g. end date before start date) |
| **`429 Too Many Requests`**| Exceeded rate limit window |
| **`500 Internal Error`**| Unhandled server exception (details hidden from client) |

---

## 4. Field Naming & Formatting Rules
- **Keys:** `snake_case` for all JSON properties (matches PostgreSQL schema and existing types).
- **IDs:** Always native 128-bit UUID strings (`"c7b8d9e2-3f1a-4d92-b432-9c1234567890"`). Never expose sequential integers.
- **Timestamps:** ISO 8601 UTC strings (`"2026-10-07T12:00:00.000Z"`).
- **Calendar Dates:** `YYYY-MM-DD` (`"2026-10-07"`) for daily attendance, birth dates, academic sessions.
- **Booleans:** Prefix with `is_`, `has_`, or `can_` (e.g. `is_active`, `is_current`, `can_pickup`).
- **Null vs Undefined:** Return `null` for empty database values; never omit keys in API responses.
