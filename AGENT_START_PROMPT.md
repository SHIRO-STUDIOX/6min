# First Agent Instruction — SHISH Blueprint Pack

You have access to an existing Next.js project containing SHISH prototypes. A full specification pack has been provided at `docs/blueprints/`.

## Your immediate goal
First read [MVP_EXECUTION_POLICY.md](docs/MVP_EXECUTION_POLICY.md), which records the owner's latest execution policy. **Initial S0 authorization was granted on 2026-11-15: «تائیده شروع کن». Continue according to the recorded stage status without asking again.** Registering this policy does not authorize baseline/scaffold work or start any implementation slice.

After explicit initial S0 authorization, execute S0 through S11 continuously in order, with separate acceptance checks, reports, and commits. Successful stage reports do not require another approval before continuing. Preserve all product, safety, and release gates in the policy and blueprints; do not implement all specs as one undifferentiated change.

## Before touching implementation files (after initial authorization)
1. Read `docs/blueprints/README.md`, all of `00-foundation`, `01-architecture/architecture-and-repository-map.md`, `05-delivery/implementation-slices.md`, `05-delivery/agent-handoff.md`.
2. Read actual `AGENTS.md`, `CLAUDE.md`, `Workflow.md`, and current `app`, `components`, `hooks`, `types`, `styles` paths. Reconcile any discrepancy with the attached audit (`references/CURRENT_PROJECT_STATE.md` in package only).
3. State which decisions are `APPROVED` and which are `PROVISIONAL` or `UNRESOLVED`. Do not hardcode placeholder weights, thresholds, OTP or payment providers as production choices.
4. Run **safe** baseline validation commands. `npm run lint` may include `--fix`; don't run it for a read-only baseline without checking `package.json`.
5. Produce a per-slice file plan and test criteria with special care to preserve `/sandbox`, existing FSMs, HeroUI v3 API and central tokens.

## Next step after review
Initial S0 authorization is recorded in docs/MVP_EXECUTION_POLICY.md. Implement S0 (lint/test scaffold) on an independent branch, validate it, record its report and commit, then immediately continue to S1 and onward through S11 without requesting per-stage approval. Follow `docs/MVP_EXECUTION_POLICY.md` and `docs/blueprints/05-delivery/agent-handoff.md` for reporting and blockers. Do not merge into `dev` or `main`, refactor the entire project, install unrelated tools or change approved product policy without the applicable authorization.

## Completion report
Return audit mismatches, proposed changed files for S0, test outputs, unresolved ADRs/owner decisions, and a risk list. Never claim production ready based on mocks or a successful build alone.
