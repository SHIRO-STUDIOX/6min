# Local MVP development

Use the existing checkout, Node24+ and npm. Windows start.ps1 defaults to embedded SQLite; PostgreSQL remains the Production backend. Docker/PostgreSQL installation is optional for the existing PostgreSQL development workflow. Preserve local files. Do not create worktrees, reset data, merge, deploy, or contact live providers during setup. See docs/MVP_EXECUTION_POLICY.md and stage evidence docs/reports/mvp/.

## Default Windows start (SQLite, no external services)

Run `./start.ps1` from the checkout. It checks Node24+, installs dependencies only when the lockfile changed or modules are missing, applies SQLite migrations, loads demo lessons and starts Next on3000. Use `-Port 3001`, `-SetupOnly`, or `-RefreshDependencies` when needed. See [LOCAL_START.md](LOCAL_START.md) for PowerShell policy and first-run details.

SQLite data stays in ignored .local-data/shish-dev.sqlite with a separate shish-test.sqlite and .env.sqlite.local. Existing .env/.env.local and PostgreSQL data are retained. There is no automatic cross-database progress transfer. Test a new mode in a private browser window or sign in again when changing database backends.

Cross-platform equivalent: `npm ci`, `npm run dev:sqlite`, then `node --import ./scripts/load-local-sqlite.mjs node_modules/next/dist/bin/next dev -p 3000`. Use the preloader; passing --env-file directly to next dev fails when Next forwards that option into worker NODE_OPTIONS. The preloader only exports validated local setup keys and refuses SHISH_ENV=production. Local Next build/preview NODE_ENV=production is separate from a Production deployment.

SQLite checks: `npm test`, `npm run test:integration:sqlite`, `node --import ./scripts/load-local-sqlite.mjs node_modules/next/dist/bin/next build`, `npm run typecheck`, `npm run test:e2e:sqlite`. CI includes Ubuntu/Windows SQLite jobs plus the existing PostgreSQL job. Local evidence is not remote CI success.

## Optional PostgreSQL install and initialization

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

## Windows / Docker startup troubleshooting

In PowerShell, start Docker Desktop and wait for its Engine to be running. Select **Linux containers**. Verify the daemon before setup:

```powershell
docker info
npm run dev:setup
npx next dev -p 3000
```

Port3000 avoids browsers that reject the original6006 port. If Next is already running, stop it with Ctrl+C before setup and restart afterward so it loads newly generated .env.local. The helper checks the Docker daemon first and reports CLI/Engine/platform/image-download/port errors without printing credentials. An image download failure may require fixing Docker Desktop network/proxy/registry access; the helper prints a pinned docker pull command for a direct diagnostic. Do not disable TLS verification.

The helper now runs migration/seed through the current Node executable, avoiding Windows npm.cmd shell execution. Existing .env settings are checked before service mutation; local setup keys are saved to .env.local without overwriting unrelated settings. Interrupted first setup may recover only when the retained private credentials match the exact helper container/image/volume. Unknown credentials or missing configured services require inspection; never delete project volumes or reset data as a workaround.

A 401 on /api/v1/me is expected for a guest. A 503 on /api/v1/guest/bootstrap means the database/service is unavailable; starting Next alone does not initialize the database. After successful setup and restart, check http://localhost:3000/api/v1/health for data.ready=true. Never paste .env files or password values into support messages.
