# Release gates and deferred QC

Functional development MVP and Production launch are separate decisions. No deployment, merge, real SMS, real payment or final visual approval has been performed. S0–S11 functional scope uses explicit development/test adapters as authorized.

| Item | Current evidence | Before real traffic |
|---|---|---|
| Curriculum | 60 stable slots,3 synthetic published revisions; silent10s locally licensed media | Supply/approve real German content, media, captions, provenance, publish staged revisions |
| Scoring | Exact rational engine, deterministic grading, monotonic earned/unlock; test20/70 fixtures | Approve final weights/thresholds and per-content configuration |
| SMS / identity | Mock OTP/password/reset/limits/opaque sessions/import tested; mock realm rejected Production | Approved SMS vendor, destination region, trusted proxy/IP/cost caps, real sandbox/delivery tests, credential vault |
| Payments | Signed local TEST_ONLY simulator, owner/idempotency/amount/ref checks, unique grant | Approved provider/price/currency, vendor sandbox proof, TLS callback, outage/retry/reconciliation and refund policy |
| Assets | Private local dev avatar raster storage, own-only reads, safe failure | Approved private durable object storage, retention/backup, malware/native decoding patch process |
| Database | 13 additive checked migrations; isolated test restore digest comparison | Least privilege app/migration roles, encrypted scheduled backups/PITR, RPO/RTO, actual restore drill |
| Hosting | Node24 with local SQLite and PostgreSQL17 parity; Production PostgreSQL required; reproducible npm lock; no public deployment | Owner hosting/domain/network/TLS/CSP/HSTS/secrets configuration; callback accessibility; separate test/prod data |
| Privacy | Bounded inputs, opaque cookies, no raw mic audio stored, error logs exclude bodies/PII | Privacy/consent/retention/deletion policies, avatar/guest archive expiry, region and operator access |
| Monitoring | Nonsecret health readiness and requestId/code/status API failure logs | Production log/metric sink, actionable alerts, incident/oncall ownership and budget/reconciliation alerts |
| Security | Local ownership/CSRF/strict bodies/replay/rate limits/provider failclosed tested; dependency audit | Actual hosting security verification, secret rotation process, independent review; no penetration-test claim |
| CI / delivery | Commands run locally; workflow present | Authorized feature-branch push and remote CI; owner review before merge/release |
| Cloud snapshot | Current workspace services/setup tested; scripts saved for review | Local-only commits must be preserved; fresh-task restoration not certified/reliable without supported snapshot/authorized remote persistence. No reset/push workaround performed |

## Visual and device QC backlog

- P1 physical iOS Safari/Android Chrome playback controls, touch-vs-scroll arbitration, virtual keyboard, safe areas, RTL and screenreader VoiceOver/TalkBack. Chromium emulation is evidence only, not physical certification.
- P1 full accessibility audit including contrast, zoom200%, screenreader announcements and visible focus across themes; keyboard/modal/reduced-motion smoke tested locally, no WCAG certification claimed.
- P2 owner review of card blur/peek, exact geometry/radii/colors/motion, current-path emphasis,60-dot compression, error/result copy and mobile spacing. Existing design tokens preserved; details not finalized autonomously.
- P2 long real content/audio, slow networks, large histories, production performance and concurrency/load budgets. Local synthetic fixtures cannot establish these limits.
- Pronunciation remains original Sandbox prototype; a real evaluator, actual audio contract/content and privacy decision are required before any valid pronunciation credit. Deterministic dictation grader exists but supplied audio/content is required for live dictation lessons.

## Operational recovery

Never reset source data to make a test pass. Migration runner refuses changed applied checksums and rolls back failed file transactions. Application rollback retains durable history/import/purchases/assets. Restore archive only into a new isolated database and verify digests before any approved cutover. Local artifacts may contain credential digests/synthetic identities; keep private and out of Git. Mock payment success is not a real financial transaction and cannot establish vendor readiness.
