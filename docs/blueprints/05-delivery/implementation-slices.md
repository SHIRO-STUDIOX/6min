# Implementation Slices — Agent Execution Plan

**Mode:** small vertical PRs, every PR compiles and preserves `/sandbox`. **Scope:** all ۱۷ blueprints are authored; do **not** implement them in one giant unsupervised change.

## Baseline rules
- Inspect current `AGENTS.md`, `CLAUDE.md`, `Workflow.md` and **live** files before touch; agent audit is source, not guarantee.
- Create feature branch. Before PR run `npx tsc --noEmit`, `npm run build`, and safe `npx eslint …` (currently reported broken); record baseline failure. Avoid `npm run lint` until confirming that it invokes `eslint --fix` and therefore edits code.
- Keep existing React components, FSMs, tokens and `/sandbox`. Delete or replace only after verifying parity and owner/product approval for behavior changes.
- Package additions (ORM, test runner, player) require a short ADR and dependency rationale.

## Slice map (estimated scope is not a deadline)
| Slice | Purpose | Proposed files/areas | Dependency | Acceptance gate |
|---|---|---|---|---|
| S0 | Baseline checks + lint/testing scaffold | `eslint.config.mjs`, `package.json`, `tests/`, CI | none | tsc/build/lint run; existing Sandbox intact |
| S1 | Domain + PostgreSQL persistence | `db/`, `lib/domain`, `lib/server`, migrations, `env.example` | ORM ADR | schema migrations, seeded fixture read from API |
| S2 | Curriculum/public lesson DTO | `lib/domain/content`, `app/api/v1/catalog`, `.../lessons`, fixture | S1 | stable 60 slots, 3 sample published lessons, public keys excluded |
| S3 | Exercise adapter and full attempt | existing FSM hooks + adapters, `api/v1/attempts` | S2 | deterministic correctness, persisted full attempt, idempotency |
| S4 | Video real playback and credit | selected player package, `VideoCard`, watch-session API | S2, S1 | 80% unique playback actual, resume, no fake timer |
| S5 | Weighted progression and mistakes | scoring pure funcs, mistake events/review APIs | S3, S4 | review amends best full, unlock never relocks, all tests |
| S6 | Guest and three-free access | browser guest store, guest ID, access policy | S5 | 1–3 valid guest, lesson 4 blocked, recovery after refresh |
| S7 | Auth, sessions and guest import | PhoneLogin adapter, auth APIs, guest merge | S6, SMS ADR | OTP/password/reset, import new auto, existing consent |
| S8 | Classroom Shell and App nav | Header, Action Center, Dock, stage indicator, routes | S2–S7 | responsive interaction/nav, no bypass; sandbox unaffected |
| S9 | My Path / Mistakes / Profile | new routes, list logic, edit name/avatar | S5, S7, S8 | 60 reverse list, review return, profile persisted |
| S10 | Checkout + entitlement | purchase schema/handlers/return page | S7–S9, payment ADR | verify real/sandbox, no redirect-based unlock |
| S11 | E2E & launch hardening | `tests/e2e`, provider config, monitoring | all | complete flows, backups, prod secrets checks, QC backlog |

Slices may be rearranged to enable early UI tests; **progress, identity, commerce** cannot be treated as complete based solely on visual mocks.

## S0 acceptance
- Record exact baseline node/npm versions, build and failing ESLint output; fix ESLint with minimal config change, preserve current lint rules as much as possible.
- Install selected testing stack (Vitest/Jest + Playwright/etc) via ADR; start pure scoring unit tests.
- Workbench `/sandbox` loads all baseline components, no visual redesign.

## S1 acceptance
- PostgreSQL local/staging configured; migrations reproducible; seed references stable.
- Models/unique constraints for content, learning, users and payment in schema **even if later endpoints not yet implemented**, without storing secret payment data.
- `GET /api/v1/health` nonsecret readiness checks appropriately constrained, and `GET /api/v1/catalog` can retrieve fixture/metadata after S2.
- Transaction rollback test on duplicate attempt record.

## S2/S3 acceptance
- Catalog ۶۰ metadata slots; ۳ real-looking *synthetic licensed* lesson fixture items published. Unknown content not marked playable.
- At least one existing deterministic FSM takes lesson DTO inputs rather than global constants; preserves old Sandbox sample separately.
- `POST attempts` grades with private server keys and logs stable immutable records. Single completed attempt but no partial score.

## S4/S5 acceptance
- Player `play/pause/currentTime` uses real media element via established library, watch interval union correct; save/resume after reload.
- All weighted lesson scoring with configurable defaults; demo fixtures gated from production publishing.
- Review just wrong questions; corrections alter effective score once; no duplicate award, next lesson monotonic unlock.

## S6/S7 acceptance
- Guest storage works within same browser, cannot open paid content through UI state change or forged APIs.
- OTP + password login and password recovery via simulated provider in CI; real OTP requires gateway approved.
- Import new user auto and existing user only after explicit consent; network failure preserves local source.

## S8/S9 acceptance
- App shell includes three-island Header and three-destination Dock (physical order left/my path, center/class, right/profile).
- Carousel LTR physical motion and RTL text separated; locked stage selectable but activity locked; dots count actual stages.
- My Path 60→1, current newest unlocked; scroll restore/dot navigator; mistakes chronological and return context.
- Profile name/avatar edited and persisted; no independent progress calculator.

## S10/S11 acceptance
- External payment sandbox verified server side, idempotent grant and ownership; paid educational lock still active.
- End-to-end happy + failure/restore flows pass (see verification doc).
- Privacy, backups, monitoring, deployment configuration checked by owner before live traffic.
- UI QC items prioritized but visual polish not conflated with domain acceptance.

## Per-PR template
```md
### Goal / Blueprint IDs
### Existing files inspected and baseline results
### Files added/modified/deleted (why)
### Data migrations / API changes / backward compatibility
### Approved decisions obeyed + provisional ADRs applied
### Tests: command, result, artifacts
### Manual QA steps
### Failure/rollback plan
### Remaining unresolved / DEFERRED_QC
```

## Stop conditions
Stop **specific slice**, not the whole project, when: publishing a lesson requires unspecified production thresholds; connecting real SMS/payment without provider config; destructive schema migration without backup; score based on fake AI eval; authentication/security bypass; unresolved data loss risk in guest merge. Request scoped owner/tech decision and continue other independent slices.

## Deployment gates
- Separate dev/test/prod env; no real gateway in CI.
- Verify hosting chosen by owner actually supports Node runtime, PostgreSQL, public callback and background jobs when needed.
- Migrations deployed atomically or with rollback; monitoring before first real purchase.
- Full course content rollout is separately staged; ۶۰ metadata slots alone are not ۶۰ published lessons.

**Related:** `verification-and-recovery.md`, `agent-handoff.md`, `00-foundation/assumptions-and-blockers.md`.
