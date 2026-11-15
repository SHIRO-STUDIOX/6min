# Local MVP development

Requires Node.js 24+, npm, and PostgreSQL 17. Use the existing checkout; preserve local work. No Production database is required or authorized.

1. `npm install --package-lock=false` (no dependency lockfile is committed yet).
2. Start an isolated PostgreSQL instance bound only to loopback, with a durable volume and locally generated password. During cloud development it is named `shish-mvp-postgres`, volume `shish-mvp-pgdata`, port 55432. Resume it with `docker start shish-mvp-postgres`; do not delete its volume. The image digest validated was `sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7`.
3. Set DATABASE_URL securely in ignored `.env.local` and SHISH_DEMO_MODE=1 for development fixtures only. Never commit or print credentials. Node scripts load this file when present; CI injects values through the environment.
4. `npm run db:migrate`; `npm run db:seed`. Both are repeatable. Seed refuses Production or missing demo opt-in. Migration runner locks, checks hashes, and transacts each migration; no schema reset.
5. `npm run sandbox`; request `/api/v1/health` for nonsecret database readiness. Sandbox requires no DB connection.

Checks: `npm test`, `npm run test:integration` (real PostgreSQL required; not skipped when missing), `npm run lint`, `npm run build`, `npm run typecheck`, then `npm run test:e2e`. Local system Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Browser tests use an isolated production process on port 6106. Otherwise install Chromium with Playwright as in CI.

Keep failed, skipped and unrun checks distinct. The remote CI workflow must be run after an authorized push; local results do not establish remote CI success. Public hosting, real SMS/payment and destructive migrations remain gated separately.
