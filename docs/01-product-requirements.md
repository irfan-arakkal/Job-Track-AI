# 01 — Product Requirements

> Phase 0 deliverable. This is the "what and why" of JobTrack AI. Architecture lives in
> [02-architecture.md](./02-architecture.md), the data model in [03-database.md](./03-database.md),
> the API contract in [04-api.md](./04-api.md) and the build plan in [05-roadmap.md](./05-roadmap.md).

## 1. Product summary

**JobTrack AI** is a personal job-search workspace. A job seeker tracks every application from
"I might apply" to "I accepted the offer", keeps interviews and resumes in one place, sees how
their search is going, and gets AI help: resume-vs-job-description analysis, a chat assistant
that answers questions about *their own* data, and an MCP server so external AI clients
(Claude Desktop, IDE agents) can work with the same data safely.

### Problem

Job seekers juggle dozens of applications across spreadsheets, email and notes. They lose track
of who hasn't responded, forget to follow up, miss interview prep, and can't tell which parts of
their search are working.

### Target user

A single individual managing their own job search (student, career switcher, experienced dev).
**Not** in scope for v1: recruiters, teams, or shared workspaces.

### Goals

| # | Goal | How we'll know |
|---|------|----------------|
| G1 | One source of truth for a job search | User can record and update every application in < 30 s |
| G2 | Nothing falls through the cracks | Follow-up and interview reminders appear without manual effort |
| G3 | Insight into the search | Dashboard + analytics answer "how am I doing?" at a glance |
| G4 | Useful, honest AI | AI answers are grounded in the user's data and say "I don't know" when data is missing |
| G5 | Portfolio quality | Clean architecture, tests, security review, deployed demo |

### Non-goals (v1)

- Scraping job boards or auto-applying
- Email inbox sync / browser extension
- Multi-user organisations, sharing, payments
- Native mobile apps (the web app is responsive instead)

## 2. User stories

Format: *As a job seeker, I want … so that …*. IDs are referenced from the roadmap.

### Account
- **US-01** Register with email + password so my data is private to me.
- **US-02** Log in and stay logged in across visits, and log out on shared machines.
- **US-03** Change my name/password and delete my account (and all my data).

### Applications
- **US-10** Add an application (company, title, URL, location, salary, status, date) so I have a record.
- **US-11** See all my applications in a list I can search, filter by status and sort.
- **US-12** Open one application and see its details, notes, interviews and status history.
- **US-13** Edit or delete an application when things change or I made a mistake.
- **US-14** Change status quickly (e.g. Applied → Interview) without opening a full form.
- **US-15** Reuse a company I've already entered instead of retyping it.
- **US-16** Add timestamped notes to an application (recruiter call, referral, etc.).

### Dashboard
- **US-20** See totals (all, this month, interviews, offers, rejections) the moment I log in.
- **US-21** See a status breakdown, my most recent applications and upcoming interviews.

### Interviews
- **US-30** Schedule an interview against an application (date/time, type, interviewer, link, notes).
- **US-31** See upcoming and past interviews and mark them completed/cancelled.

### Resumes
- **US-40** Upload PDF resumes, view/download them, delete old ones.
- **US-41** Mark one resume as primary so it's the default for AI analysis.
- **US-42** Be confident nobody else can access my resume files.

### AI
- **US-50** Paste a job description (or pick an application) and a resume and get a match score,
  matching/missing skills, weak areas and concrete suggestions.
- **US-51** Ask the assistant questions like "Which companies haven't responded?" and get answers
  based only on my data.
- **US-52** Connect an external AI client via MCP using a personal token I can revoke.

### Reminders & analytics
- **US-60** Get reminded when an application has had no response for 7 days, and about interviews today/tomorrow.
- **US-61** Dismiss or complete reminders.
- **US-70** See trends: applications per month, response/interview/offer/rejection rates,
  average response time, breakdowns by company and location.

## 3. Functional requirements

| ID | Area | Requirement |
|----|------|-------------|
| FR-1 | Auth | Email/password registration with server-side validation; passwords hashed (never stored in plain text). |
| FR-2 | Auth | Login, logout, persistent session (httpOnly secure cookie), session expiry. |
| FR-3 | Auth | All app pages and APIs require a session; unauthenticated users are redirected to `/login` (pages) or receive `401` (APIs). |
| FR-4 | AuthZ | Every read/write is scoped to the authenticated user. Accessing another user's record returns `404` (we don't reveal it exists). |
| FR-5 | Applications | Full CRUD. Fields: company, job title, job URL, location, work mode, salary range + currency, status, applied date, job description, created/updated timestamps. |
| FR-6 | Applications | Statuses: `WISHLIST, APPLIED, SCREENING, INTERVIEW, OFFER, ACCEPTED, REJECTED`. Every change is recorded in a status history. |
| FR-7 | Applications | List view with search (title/company), filter (status), sort (applied date, updated date), pagination. |
| FR-8 | Companies | Companies are per-user; created inline from the application form; name unique per user. |
| FR-9 | Notes | Add/edit/delete notes on an application, shown newest first. |
| FR-10 | Dashboard | KPIs, status breakdown chart, recent applications, upcoming interviews; loading, empty and error states. |
| FR-11 | Interviews | CRUD; fields: application, scheduled date-time (stored UTC, shown in user's timezone), duration, type, interviewer, meeting URL, notes, status. |
| FR-12 | Resumes | Upload PDF only, max 5 MB, validated by MIME type **and** file signature; stored privately; served only via an authenticated route. One primary resume per user. |
| FR-13 | AI analysis | Structured output (score 0–100, matching skills, missing skills, relevant experience, weak areas, resume suggestions, tailoring suggestions) validated with Zod before display/storage. Handles timeouts, rate limits, invalid output. |
| FR-14 | AI assistant | Chat UI; the model answers via tools that query the user's data; it must not fabricate data and must say when data is unavailable. |
| FR-15 | MCP | MCP server exposing tools (`get_applications`, `get_application`, `create_application`, `update_application`, `delete_application`, `get_interviews`, `get_statistics`, `get_follow_up_candidates`), authenticated by a per-user, revocable token. |
| FR-16 | Reminders | Rules: no response after 7 days, interview tomorrow, interview today, user-set follow-up date. Generated idempotently; user can dismiss/complete. Email delivery is a later add-on. |
| FR-17 | Analytics | Metrics listed in US-70 with charts and a date-range filter. |
| FR-18 | Settings | Profile, timezone, password change, API tokens (MCP), delete account. |

## 4. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| **Security** | Server-side validation (Zod) on every input; parameterised queries via Prisma; output escaped by React (no `dangerouslySetInnerHTML` with user data); CSRF protection on mutations; rate limiting on auth, AI and upload endpoints; secrets only in env vars; security headers (CSP etc.). |
| **Privacy** | Users only ever see their own data. Resume files are never publicly addressable. Deleting an account cascades to all data and files. |
| **Error handling** | Users see friendly messages; internal errors/stack traces are logged server-side only. Consistent API error shape. |
| **Performance** | Typical pages render server-side in < 1 s with a few hundred applications; DB queries use indexes on `userId` + filter columns; lists are paginated. |
| **Accessibility** | WCAG 2.1 AA target: semantic HTML, labelled form fields, keyboard navigation, visible focus, sufficient contrast, charts have text alternatives. |
| **Responsiveness** | Usable from 360 px wide (mobile) to desktop; sidebar collapses into a menu on small screens. |
| **Reliability** | AI/external failures degrade gracefully (the rest of the app keeps working). Reminder generation is idempotent. |
| **Maintainability** | Strict TypeScript, ESLint + Prettier, modular feature folders, a single service layer for business rules, tests in CI. |
| **Observability** | Structured server logs with request IDs; error tracking hook ready for production. |
| **Cost control** | Per-user daily limits on AI calls; cheaper model for chat, stronger model for analysis. |
| **Portability** | Runs locally with Docker Compose (Postgres); deployable to a managed platform; Dockerfile for container hosting. |
