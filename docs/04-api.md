# 04 — API Requirements

## 1. Principles

- **Two entry styles, one service layer.** UI forms use Server Actions; programmatic clients use
  REST under `/api/v1`. Both call the same services, so validation and authorization rules are
  identical.
- **Authenticate first.** Browser: session cookie. MCP/programmatic: `Authorization: Bearer <token>`.
- **Validate everything** with Zod (body, query params, route params).
- **Never leak internals.** Errors are mapped to a safe shape; details are logged server-side.
- **Ownership = existence.** A record owned by someone else returns `404`, not `403`.

### Error shape

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Job title is required", "details": { "fieldErrors": { "jobTitle": ["Required"] } } } }
```

### Status codes

| Code | When |
|------|------|
| 200 | Successful read / update |
| 201 | Created (with `Location` header) |
| 204 | Deleted |
| 400 | Malformed request (bad JSON, bad query param) |
| 401 | Not authenticated |
| 404 | Not found *or not yours* |
| 409 | Conflict (e.g. duplicate company name) |
| 413 / 415 | Upload too large / wrong file type |
| 422 | Valid JSON but fails business validation |
| 429 | Rate limited (`Retry-After` header) |
| 500 | Unexpected error (generic message only) |
| 502 / 504 | Upstream AI failure / timeout |

## 2. Endpoints

### Auth (handled by the auth library)
| Method | Path | Notes |
|--------|------|-------|
| `*` | `/api/auth/*` | sign-up, sign-in, sign-out, session — rate limited |

### Applications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/applications?status=&q=&sort=&page=&pageSize=` | Paginated list |
| POST | `/api/v1/applications` | Create (creates/reuses company by name) |
| GET | `/api/v1/applications/:id` | Detail incl. company, interviews, notes, status history |
| PATCH | `/api/v1/applications/:id` | Partial update |
| PATCH | `/api/v1/applications/:id/status` | Status change (writes `StatusChange`) |
| DELETE | `/api/v1/applications/:id` | Delete (cascades) |
| GET/POST | `/api/v1/applications/:id/notes` | List / add notes |
| PATCH/DELETE | `/api/v1/notes/:id` | Edit / delete note |

### Companies
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/companies?q=` | For autocomplete |
| PATCH/DELETE | `/api/v1/companies/:id` | Edit / delete (blocked if referenced) |

### Interviews
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/interviews?from=&to=&status=` | List (e.g. upcoming) |
| POST | `/api/v1/interviews` | Create for an application the user owns |
| GET/PATCH/DELETE | `/api/v1/interviews/:id` | Read / update / delete |

### Resumes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/resumes` | List metadata |
| POST | `/api/v1/resumes` | `multipart/form-data` upload (PDF, ≤ 5 MB), rate limited |
| GET | `/api/v1/resumes/:id/file` | Authenticated stream / signed-URL redirect |
| PATCH | `/api/v1/resumes/:id` | Rename, set primary |
| DELETE | `/api/v1/resumes/:id` | Delete metadata + file |

### Dashboard, analytics, reminders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/stats/summary` | Dashboard KPIs + status breakdown |
| GET | `/api/v1/stats/analytics?from=&to=` | Analytics metrics/series |
| GET | `/api/v1/reminders?status=` | Reminder inbox |
| PATCH | `/api/v1/reminders/:id` | Dismiss / complete |
| POST | `/api/cron/reminders` | Generates reminders — protected by `CRON_SECRET`, not user-callable |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/analyze` | `{ resumeId?, applicationId?, jobDescription? }` → validated analysis; per-user daily limit |
| GET | `/api/ai/analyses` | Past analyses |
| POST | `/api/chat` | Streaming assistant response with tool use |

### Settings & MCP
| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/api/v1/me` | Profile, timezone |
| DELETE | `/api/v1/me` | Delete account + data + files |
| GET/POST | `/api/v1/tokens` | List / create MCP token (plaintext shown once) |
| DELETE | `/api/v1/tokens/:id` | Revoke |
| POST/GET | `/api/mcp` | MCP Streamable HTTP endpoint (Bearer token) |

## 3. MCP tools (Phase 10)

| Tool | Input (Zod) | Output |
|------|-------------|--------|
| `get_applications` | `{ status?, q?, limit? }` | list of summaries |
| `get_application` | `{ id }` | full detail |
| `create_application` | application fields | created record |
| `update_application` | `{ id, ...partial }` | updated record |
| `delete_application` | `{ id }` | confirmation |
| `get_interviews` | `{ from?, to?, status? }` | list |
| `get_statistics` | `{ from?, to? }` | KPI object |
| `get_follow_up_candidates` | `{ days? = 7 }` | applications needing follow-up |

Every tool handler receives the `userId` resolved from the token — **never** from tool arguments.
Destructive tools are annotated so clients ask the user to confirm.
