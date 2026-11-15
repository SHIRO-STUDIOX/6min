# Agent Handoff & Working Agreement

**Audience:** coding agents with access to local repository. **Product priority:** correct flows, storage, security and functional MVP first; detailed visuals after owner QC. **This file is operational instructions for a human-approved agent, not an automatic command.**

## Mandatory preflight
1. Confirm working branch, clean/dirty status and active root; do not overwrite uncommitted owner work.
2. Read `docs/blueprints/README.md`, Foundation files, selected domain contracts and test plan.
3. Read **actual current files** and `AGENTS.md`, `CLAUDE.md`, `Workflow.md`. Report conflicts in `assumptions-and-blockers.md` or PR, rather than silently choosing.
4. Record baseline commands and outputs. `npm run lint` currently reported as `eslint --fix`, so do not execute it for read-only audits.
5. State allowed file paths and tests before altering code. Split changes into small PRs; no broad refactor by default.

## Decision priority
1. Explicit newly approved product owner instruction.
2. Approved `decision-register.md` and MVP scope.
3. Domain contract owning rule, modified only with linked decision.
4. Live repository state for implementation feasibility.
5. `PROVISIONAL` engineering choice via ADR.

**Never:** promote a prototype XP/strict video focus/English mock into business policy; hardcode arbitrary thresholds; bypass payment verification; invent final lesson content; silently rework the base visual design.

## Task input template (copy for every slice)
```md
### Task ID / Slice
S<number> — <specific user-visible behavior>
### Blueprint source
- `docs/blueprints/00-foundation/decision-register.md` DEC-...
- Owner-domain contract: `<path>` sections ...
- Dependencies: `<paths>`
### Allowed modifications
`<explicit files/directories>`
### Protected areas
`/sandbox`, existing FSM behavior, token definitions unless approved
### Deliverable
<runtime behavior + endpoints/schema/tests>
### Test/acceptance
<test IDs from verification-and-recovery.md>
### Unknowns
<UN-xx provisional, required ADR if applicable>
### Exit rule
All acceptance tests pass, feature branch commit prepared; report owner QC items separately
```

## Agent completion response format
```md
## Delivered
- Observable behavior implemented
## Modified files
- path — reason
## Schema / API
- migrations, endpoints, compatibility
## Tests and results
- exact commands, exit status, test IDs
## Decisions respected
- DEC IDs
## Provisional choices and open issues
- ADR/UN IDs, failure or blocker
## QA / Owner review
- reproduction URL/steps, screenshots if available, DEFERRED_QC items
## Rollback
- how to revert safely; migration caveats
```

## Feature boundaries
- **Product owner:** contents, teaching rules, business access, UI/QC approvals.
- **Engineering lead:** ORM, route DTO format, technical session library, adapter implementation, test tooling via ADR.
- **Coding agent:** deliver exactly scoped code/tests, no unapproved product or security shortcut.
- **Content owner:** actual German lesson material, exercises, private answer keys and publishing.

## Agent do's / don'ts
| Do | Do not |
|---|---|
| add schema validation and authz in every handler | trust client-computed correct answers |
| persist unique attempt and merged watch ranges | count replayed watched interval twice |
| pass actual lesson content to existing FSM components | remove FSM hooks without parity testing |
| migrate through versioned SQL/ORM changes | run uncontrolled prod schema sync |
| use current HeroUI v3 and existing tokens | invent independent UI kit |
| preserve `app/sandbox` and register new stories | break QC lab by global dependency change |
| write unit+integration tests for domain change | rely on build success as feature validation |
| put unresolved values in config with `DEMO_ONLY` | silently encode unapproved 20%/70% in product |
| use adapter for payment, OTP, AI | ship dev mock payment/OTP in production |
| report faults and unresolved items | claim a production service works without staging verify |

## Work sequence for first week (order, not time promise)
- S0: baseline, lint fix, testing harness, status report.
- S1: ORM ADR, database schema and migrations, env sample with **variable names only**.
- S2: sample content and content API, ۳ lesson fixtures with deterministic German sample text.
- S3/S4: at least one real end-to-end learning path with real media adapter and exam FSM.
- Then proceed according to `implementation-slices.md`; stop only when necessary input missing.

## Ownership of open decisions
- Missing owner decision: add entry in assumptions file and continue another slice. Do not ask a question previously resolved in `decision-register.md`.
- Change in UX/QC: log request, implement minimal stable variant, avoid freezing dimensions/progress effects.
- New architectural choice: ADR with options/rollback before dependency introduced.
- Conflict between report and actual code: actual code describes current state; product decisions describe target behavior; report reconciliation in PR.

## Release gate
No delivery to real learners until SMS and payment provider verified, default weights/threshold approved, hosting constraints checked, sample grading honest, data backup/retention and major E2E security tests pass. A functioning mocked staging product can be delivered earlier but must be explicitly described as such.
