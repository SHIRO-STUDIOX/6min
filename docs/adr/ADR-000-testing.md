# ADR-000 — Test tooling

Context: S0 has no automated TypeScript or browser tests. Preserve the existing UI and test real behavior.

Options: Jest or Vitest for pure domain tests; Cypress or Playwright for browser journeys.

Decision: Vitest 3.2.4 (Node runtime, TypeScript support), Playwright 1.56.1 (Chromium journeys). Pins are explicit. Tests use a separate port 6106 and two unit workers. Keep the application's dependencies and UI APIs intact. Read-only ESLint is the default; `lint:fix` is explicit.

Consequences: CI needs Chromium. Locally the installed system Chromium is selected with PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. Warnings in legacy formatting are reported, not silently disabled or mass-fixed.

Rollback: remove the test scripts and tooling dependencies; no learner data or schema affected.

Approval: reversible engineering choice under the owner's S0–S11 authorization; no product decision changed.
