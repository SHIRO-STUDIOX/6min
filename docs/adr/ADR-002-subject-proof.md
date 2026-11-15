# ADR-002 — Opaque subject proof and full attempt boundary

Context: S3 persistent attempts must have ownership before S6 guest drafts/S7 account UX. A client-provided subject ID must not establish identity.

Options: stateless signed guest claims or opaque database-backed proof. Decision: cryptographically random 256-bit opaque guest cookie, SHA-256 digest stored server-side, HttpOnly/SameSite=Lax, Secure on HTTPS, expiring after 30 days. Same-origin check on mutations. No raw token/phone/answer logging. Account sessions will use the same opaque proof strategy in S7. Cookie guest proof is prerequisite security scaffolding, not a claim that S6 import/storage UX is finished.

Attempt schemas use Zod strict shapes, bounded input, exact complete question set, exact content revisions and server-only grading. Subject-scoped advisory transaction lock plus unique idempotency key ensures concurrent retries produce one attempt; replay with a changed payload returns 409. Canonical parsed payload hash prevents a key silently accepting another request. One transaction writes attempt plus all results; no partial score.

The existing vocabulary FSM gains opt-in deferred assessment, collecting initial raw public-option choices without local correctness, accuracy callbacks or revealing answer associations. Default Sandbox local behavior is preserved. Grammar/text adapters submit raw input, never client accuracy. Pronunciation fails unavailable until a trustworthy evaluator; mock voice scoring remains Sandbox-only. React Testing Library + jsdom added for this actual FSM interaction test, not substituted for server integration.

Tests now use a separate TEST_DATABASE_URL with committed generated test identities/attempts; no cleanup/reset of development or Production data. CI's database is explicitly disposable. Production provider/retention/cookie deployment review remains a release gate. Rollback: revert routes/adapters, retain persisted history; no data deletion. Approval: reversible engineering choice under current owner authorization.
