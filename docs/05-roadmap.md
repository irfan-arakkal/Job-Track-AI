# 05 — Development Milestones

Each phase ends with: what was built → how to test → a verification checklist → **your
confirmation** before the next phase starts.

| Milestone                       | Phases                                      | Outcome                                                                                                 | Stories  |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| **M0 — Plan**                   | 0                                           | Requirements, architecture, data model, API contract (these docs)                                       | —        |
| **M1 — Foundation**             | 1 Setup · 2 Auth · 3 Database               | App runs locally with Docker Postgres; users can register/login/logout; full schema migrated and seeded | US-01–03 |
| **M2 — Core tracker**           | 4 Applications · 5 Dashboard · 6 Interviews | A genuinely useful job tracker with a SaaS-style dashboard                                              | US-10–31 |
| **M3 — Files & AI**             | 7 Resumes · 8 AI analysis · 9 AI assistant  | Private resume uploads, structured AI analysis, grounded chat assistant                                 | US-40–51 |
| **M4 — Integrations & insight** | 10 MCP · 11 Reminders · 12 Analytics        | External AI clients via MCP, follow-up reminders, analytics charts                                      | US-52–70 |
| **M5 — Hardening**              | 13 Testing · 14 Security                    | Unit/integration/E2E suites in CI; documented security review                                           | NFRs     |
| **M6 — Ship**                   | 15 Deployment · 16 Portfolio                | Deployed demo, CI/CD, README, diagrams, screenshots, resume/LinkedIn blurbs                             | G5       |

> Testing is not saved for Phase 13 only: from Phase 3 onward we add small unit/integration
> tests for the logic we write (especially authorization). Phase 13 fills gaps and adds E2E.

## Status

All phases are complete. Each one has its own document in this folder (06–19), written when the
phase was built: what was implemented, why, how it works, and how it was verified.

| Phase                         | Doc         |
| ----------------------------- | ----------- |
| 0 Requirements & architecture | 01–05       |
| 1 Setup                       | README · 02 |
| 2 Authentication              | 06          |
| 3 Database                    | 03          |
| 4 Applications                | 07          |
| 5 Dashboard                   | 08          |
| 6 Interviews                  | 09          |
| 7 Resumes                     | 10          |
| 8 AI analysis                 | 11          |
| 9 AI assistant                | 12          |
| 10 MCP server                 | 13          |
| 11 Reminders                  | 14          |
| 12 Analytics                  | 15          |
| 13 Testing                    | 16          |
| 14 Security                   | 17          |
| 15 Deployment                 | 18          |
| 16 Portfolio                  | 19          |
