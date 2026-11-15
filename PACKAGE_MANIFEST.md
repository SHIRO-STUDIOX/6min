# SHISH — Complete MVP Blueprint ZIP

**Version:** v1.0.0 (2026-11-15)  
**Purpose:** One self-contained documentation handoff package for an existing Next.js 16 / HeroUI v3 SHISH repository; not a code patch, not a production deployment.  
**Provenance:** Confirmed product-owner conversation decisions and two reference files delivered with the package. Live source code was *not* independently cloned or executed during creation.

## What is inside
- `docs/blueprints/README.md`: entry point and source-of-truth map.
- `docs/blueprints/00-foundation/`: scope, explicit decision register, temporary assumptions & blockers.
- `docs/blueprints/01-architecture/`: modular Next.js/Node layout, PostgreSQL model, API/events.
- `docs/blueprints/02-learning/`: German content contract, off-the-shelf player/FSM integration, progress and mistake scoring.
- `docs/blueprints/03-identity-commerce/`: OTP/password, guest-to-account transfer, one-time checkout and entitlement.
- `docs/blueprints/04-experience/`: shell/dock/action center, screen flows, design guardrails and QC.
- `docs/blueprints/05-delivery/`: development slices, verification and handoff workflow.
- `references/CURRENT_PROJECT_STATE.md`: original repository audit supplied by user.
- `references/SHISH_MVP_BLUEPRINT_MASTER_PLAN.md`: original master plan supplied by user.
- `AGENT_START_PROMPT.md`: first task prompt for a connected coding agent.
- `FILE_HASHES.sha256`: hashes for package files (excluding itself).

**18 Markdown blueprints in `docs/blueprints` = 1 README + 17 domain/implementation documents.** References and agent prompt are extra and do not replace these blueprints.

## Install into your actual repository
1. Extract ZIP in a temporary directory. Review `PACKAGE_MANIFEST.md` and `docs/blueprints/README.md`.
2. Copy the *directory* `docs/blueprints/` into repository root while keeping existing `app/`, `components/`, `hooks/`, `types/`, `styles/` untouched.
3. Do **not** blindly overwrite `AGENTS.md`, `CLAUDE.md`, `Workflow.md`, or `CURRENT_PROJECT_STATE.md` in the existing repository; they are not modified in this package.
4. Give a coding agent `AGENT_START_PROMPT.md` and ask to audit live file paths first, then create feature branch and execute only first approved slice.

## Approved vs provisional
- **Approved:** user flows, 60 lessons, 3 free, weighted progress rules, 80% unique video watch, best complete attempt + review amendments, SMS/password choices, guest import/merge consent, one-time external purchase, navigation structure.
- **Provisional:** exact ORM, auth library/session strategy, payment/SMS/media vendors, storage and file paths, example question contents and numeric test thresholds.
- **Deferred:** per-card polished visual layout, sticker/glow/chapter progress styling, motion, final responsive proportions.
- **Unknown:** selected hosting specifics; authoritative default video weight and passing threshold; payment amount/currency, providers and real German lesson content.

## Validation
Check ZIP integrity and `FILE_HASHES.sha256` after extract. A ZIP with full Markdown files does **not** itself prove code correctness, production readiness or live hosting compatibility. Execution requires connecting the agent to the actual repository and implementing/testing the contracts slice by slice.
