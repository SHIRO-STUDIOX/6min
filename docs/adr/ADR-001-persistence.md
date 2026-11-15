# ADR-001 — PostgreSQL with SQL-first Drizzle

Context: DEC-038 requires PostgreSQL; transaction and ownership invariants must be testable against a real database. Production hosting is unresolved.

Options: Prisma generated schema/client or Drizzle over node-postgres with explicit SQL migrations.

Decision: Drizzle 0.44.7 over pg 8.16.3. Versioned, reviewed SQL is authoritative for PostgreSQL constraints, partial indexes, append-only triggers and transactions. Drizzle SQL expressions parameterize values; no string concatenation of learner input. A unified subject table owns user/guest-scoped data. Anonymous guest proof and sessions are deferred to S6/S7; merely knowing a subject ID will never authorize an API.

Consequences: a small migration runner uses an advisory lock, checksums and one transaction per migration. No destructive synchronization or auto-reset. Drizzle executes SQL rather than maintaining a second, potentially divergent generated schema. A local Docker PostgreSQL 17 instance binds to loopback only, with a durable named volume and generated local credentials. No Production connection is used. Database imports are confined to server modules/scripts/tests.

Rollback: additive schema retained; revert application commit without dropping learner data. Any destructive rollback needs separate owner permission and backup. Local volume is never automatically deleted.

Approval: reversible engineering choice authorized by the continuous execution policy. Weights, price, providers and Production infrastructure remain unresolved.
