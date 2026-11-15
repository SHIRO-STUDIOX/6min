# Local SQLite and ordered Windows launcher

Status: COMPLETE for local development, introducing commit on feat/shish-mvp. Owner explicitly selected SQLite locally and PostgreSQL in Production. ADR-014 details compatibility/transaction choices. PostgreSQL migrations0001–0013 and existing data are unchanged; no conversion, data deletion or main/dev merge.

## Delivered

- Root start.ps1 checks Node24+, environment and port; lock-hash-gated npm ci; separate SQLite schema/seed; Next on3000 (or -Port). SetupOnly/RefreshDependencies supported. No Docker/psql/PostgreSQL installation or database service needed in this path.
- Dedicated ignored .env.sqlite.local and .local-data development/test files. Existing .env/.env.local/PostgreSQL configuration retained. Unknown profile lines preserved without exporting arbitrary environment keys. Separate file identity checks include Windows case, hard links and rejected symlinks/junctions.
- Built-in node:sqlite adapter with bound query parameters, typed result normalization, structural JSON, exact rational TEXT, timezone projection and explicit supported SQL subset. WAL/full sync/busy timeout, real BEGIN IMMEDIATE, shared queue and rollback/aborted-transaction behavior. Immutable history/published-content/FK/uniqueness constraints preserved in a separate checksum-locked SQLite schema. Production rejects SQLite and keeps native pg/Drizzle.
- Node profile preloader avoids Next worker NODE_OPTIONS rejecting --env-file; owned Next process-tree runner plus PowerShell finally cleanup prevents orphaned dev servers. Only child processes started by this invocation are stopped. Occupied ports fail before install/schema writes; other servers are not killed.
- Same integration/browser suites run on both drivers; additional Ubuntu/Windows SQLite CI workflow and updated local documentation. Original PostgreSQL/Docker helper remains optional and backward compatible.

## Executed evidence

Local Node24.22.1, PostgreSQL17, bundled Node SQLite, system Chromium, Microsoft PowerShell7.6.10 on Linux (download SHA256 verified against official Microsoft HTTPS package metadata). Base HEAD53f2963 plus this feature's working tree; introducing commit includes the implementation and evidence.

| Check | Result |
|---|---|
| npm test |54 PASS, including transaction abort/serialization, exact180-digit fractions, types, timezones, path isolation, profile preservation and ordered failure/retry|
| test:integration:sqlite |38 PASS, real SQLite file|
| test:integration |38 PASS, real PostgreSQL|
| full test:e2e:sqlite |42 PASS,2.1min, real browser/HTTP learning/auth/import/review/profile/payment flows|
| full test:e2e |42 PASS,2.2min, PostgreSQL regression|
| build with local profile preloader |PASS, Next16.4.6 production build|
| TypeScript |PASS|
| read-only ESLint |0 errors; existing/style warnings remain visible in local artifact|
| configured-secret source/browser scan |PASS, both PG and SQLite profiles checked; no values printed|
| PowerShell parser / SetupOnly / repeat |PASS; cold dependency installation and reused installation both exercised|
| actual PowerShell start/readiness/interrupt/stop |PASS, health ready,60 catalog items, app port closed after SIGINT|
| occupied-port guard |PASS, fails before dependencies/schema changes and leaves existing listener alive|
| test/development file alias guard |PASS, rejects before migration/test mutation|
| git diff --check |PASS|

Artifacts: /workspace/.setup/6min/mvp-baseline/{dual-db-*,sqlite-*,dual-postgres-*,start-powershell-*,start-port-guard.log}. No cases skipped/disabled. Initial SQLite parity checks found count/Boolean projection type differences, which were normalized without weakening assertions. Actual launcher checks caught Next's --env-file worker restriction and an orphaned child on stop; preloader/owned process-tree handling fixed both and lifecycle/port checks passed. No local user database reset was used to make tests pass.

## Limits / review

Actual execution on the user's Windows machine and remote GitHub CI are not certified by Linux PowerShell results; Windows CI is provided, not reported green without evidence. PowerShell uses5.1-compatible syntax, actual local parser/runtime was7.6.10. SQLite is single-writer local development; Production remains PostgreSQL. No automatic cross-database history migration or Production deployment. Existing real SMS/payment/content/scoring/QC/privacy/hosting release gates remain open. Mock providers and synthetic lessons remain explicitly labeled.

Use docs/LOCAL_START.md: git pull --ff-only, then .\start.ps1. Node24+ is the only database/runtime prerequisite beyond npm dependencies. For release, keep SHISH_DB_DRIVER=postgres / SHISH_ENV=production and never use the local SQLite launcher/profile. Historical S11 results remain in FINAL.md; this report records the subsequent feature.
