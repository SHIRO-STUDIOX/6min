# First Agent Instruction — SHISH Blueprint Pack

You have access to an existing Next.js project containing SHISH prototypes. A full specification pack has been provided at `docs/blueprints/`.

## Your immediate goal
**Perform repository verification and prepare an implementation-ready plan for slice S0, without implementing all 17 specs at once.** This is a controlled coding handoff.

## Before touching files
1. Read `docs/blueprints/README.md`, all of `00-foundation`, `01-architecture/architecture-and-repository-map.md`, `05-delivery/implementation-slices.md`, `05-delivery/agent-handoff.md`.
2. Read actual `AGENTS.md`, `CLAUDE.md`, `Workflow.md`, and current `app`, `components`, `hooks`, `types`, `styles` paths. Reconcile any discrepancy with the attached audit (`references/CURRENT_PROJECT_STATE.md` in package only).
3. State which decisions are `APPROVED` and which are `PROVISIONAL` or `UNRESOLVED`. Do not hardcode placeholder weights, thresholds, OTP or payment providers as production choices.
4. Run **safe** baseline validation commands. `npm run lint` may include `--fix`; don't run it for a read-only baseline without checking `package.json`.
5. Produce a per-slice file plan and test criteria with special care to preserve `/sandbox`, existing FSMs, HeroUI v3 API and central tokens.

## Next step after review
Implement only slice S0 (lint/test scaffold) on an isolated feature branch after receiving authorization to change code. Follow `05-delivery/agent-handoff.md` for reporting. Do not refactor the entire project, install unrelated tools or modify product policy.

## Completion report
Return audit mismatches, proposed changed files for S0, test outputs, unresolved ADRs/owner decisions, and a risk list. Never claim production ready based on mocks or a successful build alone.
