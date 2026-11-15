# Windows local loading fix — 2026-11-16

Branch: feat/shish-mvp, base ac62b28. Authorization: owner requested investigation first, then explicitly instructed «اصلاح کن», followed by add/commit/push to this same branch on2026-11-16. This is a local-development follow-up, not a new S0–S11 stage or production release.

## Reproduction and cause

- The original local runner started Next16.4.6 with its default Turbopack runtime. A fresh Chrome context on the owner's Windows machine repeatedly received HMR restart / `HMR hash mismatch` messages, with more than30 main-frame navigations in4.5seconds. Both localhost and127.0.0.1 stayed in a loading state because hydration and learner requests were interrupted.
- The runner also printed127.0.0.1 while start.ps1 documented localhost. NextRequest normalizes loopback hostnames to localhost. The exact Origin guard therefore rejected browser writes from127.0.0.1 with403 ORIGIN_REQUIRED, blocking guest bootstrap and dependent classroom/path data.
- Database health,60 catalog entries and the first lesson's3 stages returned200. This was not missing schema or missing first-lesson content. Only3 synthetic lessons are published;57 metadata slots remain intentionally unavailable.

## Changes

- scripts/run-local-next.mjs: explicitly select `dev --webpack --hostname localhost`, preserving the owned process-tree lifecycle and existing SQLite preloader.
- start.ps1: check both supported loopback address families before setup; print the canonical localhost/Webpack launch address.
- playwright.local.config.ts and tests/local-start/loading.spec.ts: invoke actual start.ps1 on3107 and exercise onboarding, guest bootstrap,3 classroom stage shells, watch-session initialization, stable hydration,60 path entries, guest profile and return to class. Foreign and absent write origins must still return403. Windows PowerShell receives its built-in module path instead of inheriting a pwsh7-only module path from the test host.
- package.json and SQLite CI workflow: add `test:local-start` to both OS jobs, replacing the weaker Windows health/catalog-only startup probe. Existing production-preview tests remain unchanged.
- scripts/local-sqlite-setup.mjs and scripts/dev-environment.mjs: remove unused Unix shebangs from helpers invoked explicitly with Node. Under the Windows Vite test runner those lines appeared after generated imports and caused `Invalid or unexpected token`. All15 affected setup tests then ran successfully.
- Local-start guide, ADR-014 and execution status document the workaround, command and test behavior. No dependency, schema, grading, identity or UI/FSM redesign.

## Executed verification

Windows, Node24.15.0, Windows PowerShell5.1, Next16.4.6 and installed system Google Chrome. The browser command set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to the installed Chrome executable; the test also supports Playwright's installed Chromium.

| Check | Result |
|---|---|
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./start.ps1 -SetupOnly` | PASS, exit0; existing SQLite/profile retained |
| `npm test` |54 PASS across16 files, exit0; no skipped tests |
| `npm run test:local-start` |1 PASS,40.9s total, exit0; actual launcher/browser flow and Origin denial assertions |
| `npm run typecheck` |PASS, exit0 |
| `node --import ./scripts/load-local-sqlite.mjs node_modules/next/dist/bin/next build` |PASS, exit0 |
| `npm run lint` |PASS, exit0;0 errors,22142 style warnings in this Windows checkout, predominantly CRLF/formatting; no autofix. Both new test/config files also passed focused lint with0 warnings. |
| Occupied IPv4 and IPv6 loopback ports |PASS; real temporary listeners preserved, launcher exit1 before `[2/5]` and all setup writes |
| Test-server cleanup / `git diff --check` / Node helper syntax |PASS; no listener remained on3000 or3107 after testing |
| `npm run security:check` |FAIL, exit1; existing Telegram placeholder values in local .env also occur in3 unchanged tracked legacy files. The same matches were verified in HEAD. No matching value appeared in the built browser assets or new/changed files; no values were printed. The scanner itself was left unchanged. |

An initial smoke-test attempt exposed inherited PowerShell module-path isolation in the test host. Another waited for a dock button that the roadmap intentionally hides during its automatic downward scroll. The final test returns to the roadmap heading to reveal navigation before continuing; no application scroll behavior was changed. The final completed run is the successful result above, not either failed attempt.

Build/lint logs are retained privately under ignored .local-data/fix-local-start-{build,lint}.log. Temporary browser sessions may add guest/session records to the development database, as a normal app visit does. No database was reset, existing history was deleted, or private configuration printed.

## Limits and recovery

The entire existing42-case production-preview browser suite and38-case integration suite were not rerun for this launcher-only follow-up. Their prior results are historical, not new evidence here. GitHub CI was updated but has not been observed remotely. This change makes no claim about final content, real SMS/payment or deployment readiness.

Run `.\start.ps1`, open the printed localhost URL and stop with Ctrl+C. Do not run another development server from the same checkout during `test:local-start`, because Next's dev lock is shared. Keep the .env.sqlite.local profile and SQLite files. The owner authorized publication to feat/shish-mvp; no cache deletion, reset, main/dev merge or public deployment is part of this fix. Review/revert the introducing feature-branch commit without removing the local database. Webpack is the selected local workaround until a replacement passes the real launcher regression.
