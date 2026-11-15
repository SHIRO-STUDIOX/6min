# Local MVP development

Use the existing checkout, Node24+, npm and local Docker/PostgreSQL17. Preserve local files. Do not create worktrees, reset data, merge, deploy, or contact live providers during setup. See docs/MVP_EXECUTION_POLICY.md and stage evidence docs/reports/mvp/.

## Install and initialize

From repository root:

```sh
npm ci
npm run dev:setup
```

The setup helper creates only isolated loopback services (port55432, named container shish-mvp-postgres and durable volume shish-mvp-pgdata), generates local-only credentials without printing them, and stores ignored .env.local with0600 permissions. Existing configuration and data are preserved. It starts an existing matching container, creates separate shish_test if absent, runs additive checksum-locked migrations and immutable demo seeding. Repeated setup was exercised. Unknown/Production/remote configuration or missing existing service is a stop for inspection, never a reason to reinitialize user data. Docker daemon and persistent volume must be available after cloud restoration; fresh-task restoration is not certified. Pinned image digest is in scripts/dev-environment.mjs.

For an existing external development database, configure .env.local securely and run db:migrate/db:seed deliberately; the local Docker helper will refuse that target. Demo seed requires SHISH_ENV development/test and SHISH_DEMO_MODE1. SMS/payment providers mock only. Mock payment key locally generated >=32 characters, never NEXT_PUBLIC. There is no working real provider adapter or deployment target. Keep test and development DB URLs distinct; never point tests at Production.

HeroUI cache is ignored. If missing, use the pinned onboarding generation command:

```sh
npm exec --yes --package=heroui-cli@3.2.0 -- heroui agents-md --react --output .heroui-docs/AGENTS.md --json
```

This writes the generated index inside the cache and preserves tracked AGENTS.md. Existing .heroui-docs/react is retained in the current cloud workspace.

## Run and verify

```sh
NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1
```

Development port6006; internal requests must use localhost for Next resources. Require /api/v1/health ready=true, /api/v1/catalog60 items and3 published samples, /sandbox containing HeroUI Sandbox, root/classroom pages rendering. Sandbox baseline can render without DB; connected template stories need local services. Browser6006 may require explicitly-allowed-ports; committed browser tests use production6106 instead. No loopback preview link is supported by cloud onboarding UI.

```sh
npm test
npm run test:integration
npm run lint
npm run build
npm run typecheck
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
node scripts/security-check.mjs
npm audit --omit=dev
```

If system Chromium absent, npx playwright install --with-deps chromium as CI. Playwright starts its own production6106 with isolated test DB, explicit test realm and mock providers; rebuild after source edits. Integration tests append random synthetic data and never reset databases. Lint is read-only; warnings remain visible. Keep failed/unrun checks distinct; remote CI requires an authorized push and was not run here. Test logs are local .setup/6min/mvp-baseline outside checkout; browser traces/results ignored. CI mock signing key is intentionally public fixture data, unusable outside test realm.

## Backup and recovery

Run with services quiet:

```sh
npm run backup:drill
```

This restricted helper only reads isolated shish_test on55432, creates a fresh uniquely named restoration DB, retains a custom archive/checksum under ignored .local-data/backup-drills and compares counts/digests for every public table. It never drops/resets/deletes a database. Production backups must use approved encrypted storage, access controls, schedule, retention, PITR and measured RPO/RTO. A local test drill is not a Production backup service. Local avatar files require separate backup; PostgreSQL references alone are insufficient. Removed/replaced avatars and guest source history are retained pending privacy policy.

## Scope and release limits

Only3 published synthetic lessons,57 unpublished slots, silent10s CC0 test video. Test weight20/threshold70 are fixtures, not approved final scoring. Pronunciation/dictation prototypes remain in Sandbox; live pronunciation grading requires a real approved evaluator and supplied content. SMS uses public demo000000 only guarded development/test. Checkout uses fictional TEST units and a local signed simulator; real gateway sandbox proof unrun. Avatar storage private local dev only. No push/merge/public deploy/real SMS/payment occurred. See FINAL.md and RELEASE_GATES.md for owner decisions and visual/device QC.
