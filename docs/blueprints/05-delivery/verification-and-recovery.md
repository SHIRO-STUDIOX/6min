# Verification, Recovery & MVP Acceptance

**Purpose:** executable proof of behavior and data integrity. **Tests are mandatory for security/business logic; visual QC is separate.**

## Test levels
- **Unit:** pure domain functions (interval union, weighted scoring, choosing best full attempt, mistake lifecycle, unlock monotonicity, access policy).
- **Integration:** real test DB with migrations, API validation, ownership, duplicate messages, rollback, guest import, payment mocked verifier.
- **E2E:** web journeys across refresh, route navigation, auth recovery, quick review, checkout redirect/callback and accessibility.
- **Manual/device:** microphone/browser media, mobile gesture arbitration, PWA readiness if later, RTL/keyboard/reduced motion.

## Scoring and playback cases
| ID | Setup / Action | Expected |
|---|---|---|
| LE-01 | Watch unique 79.9% | no full video credit |
| LE-02 | Watch 80% unique across multiple sessions | exactly one full video credit |
| LE-03 | Seek end at start | no credit |
| LE-04 | Replay same interval 3× | unique coverage counted once |
| LE-05 | Watch while paused/buffering | no time credit during silence |
| LE-06 | 1 video + 2 exercises | remaining weight split equal; total <=100 |
| LE-07 | Complete attempt scores 3/5 | best full =60%; last=60% |
| LE-08 | Review correct 1 of 2 wrong | effective 4/5, no full attempt created |
| LE-09 | Review same corrected item again | no extra earned points |
| LE-10 | Later weaker full attempt | best unchanged, successor stays unlocked |
| LE-11 | Later wrong on corrected question | current mistake reopens, history kept, earned unlock persists |
| LE-12 | Stale question revision | explicit conflict; no hidden cross-version merge |
| LE-13 | Retry duplicate idempotency key | one attempt/credit/unlock event |
| LE-14 | Server rejects fabricated client score | score computed from server answer key |
| LE-15 | Configured threshold boundary 69.99/70.00 *test example* | below/at threshold respectively; true default remains TBD |

## Auth / guest / commerce cases
| ID | Scenario | Expected |
|---|---|---|
| AU-01 | Guest starts lesson ۱ and submits exercise | works without account |
| AU-02 | Guest after lesson ۲ unlocks lesson ۳ | can progress free sequence |
| AU-03 | Guest tampers client paid flag, requests lesson ۴ | denied on server |
| AU-04 | New account OTP signup imports guest batch twice | one import; no history duplicate |
| AU-05 | Existing account logs in with guest data, declines merge | original account unchanged |
| AU-06 | Existing account accepts merge | union valid history, preserves unlocks/entitlements |
| AU-07 | Invalid/expired/reused OTP | denied; rate limits/resend safe |
| AU-08 | Password login then password recovery | verified reset works; old credential invalid |
| AU-09 | Session expires mid-class | after auth original intent and drafts restored |
| CO-01 | Payment external return `success` without provider verify | entitlement NOT granted |
| CO-02 | Valid provider verification callback twice | exactly one entitlement |
| CO-03 | Return arrives before webhook | pending then eventually verified |
| CO-04 | Payment cancelled/failed | safe return; guest and account progress preserved |
| CO-05 | Paid lesson ۱۰ but lesson ۹ prerequisite not met | pedagogical lock still holds |
| CO-06 | Wrong provider amount/signature/purchase owner | rejection and audit |

## Navigation / UI functional cases
| ID | Scenario | Expected |
|---|---|---|
| UX-01 | RTL class user swipes forward | stage sequence physical left→right, track moves left |
| UX-02 | drag forward strongly | advances at most one card; dot can jump arbitrarily |
| UX-03 | select locked stage dot | shell accessible, exercise disabled, notice shown |
| UX-04 | vertical wheel in Action Center | normal vertical page scroll, no wheel hijack |
| UX-05 | video controls touched on mobile | playback controls work, card doesn't steal gesture |
| UX-06 | navigate My Path then back | previous scroll and class state restored |
| UX-07 | ۶۰ درس listed top=60 bottom=1 | newest unlocked highlighted; dot navigator scrolls only |
| UX-08 | click locked My Path lesson | expands same item with prereq/reason; no route to activity |
| UX-09 | click unlocked lesson | direct class open, preserves other lesson drafts |
| UX-10 | Mistake quick review ends | short result, continue review or back to previous context |
| UX-11 | navigate dock | physical left My Path, center Class, right Profile |
| UX-12 | switch Focus vs normal | outer card geometry constant, header visible, pause user-controlled |
| UX-13 | update displayName/avatar | persists, no loss of lesson progress |
| UX-14 | screenreader/keyboard/reduced motion | no inaccessible stage or invisible focus |

## Failure & recovery matrix
| Failure | Server/domain policy | UI behavior |
|---|---|---|
| Network drops during answer | committed only if server accepted; idempotent key reused | keep draft, show retry; don't fake completion |
| Browser closes mid-video | save validated intervals and lastPosition | restore known position, no duplicate credit |
| Browser closes mid-review | graded questions durable, unsubmitted remain draft | resume or return to list with saved results |
| Unpublished content or missing media | access denied/unavailable, historical attempts preserved | show graceful unavailable/retry without marking complete |
| Client contentVersion stale | reject stale submit, migration path explicit | prompt refresh, protect old draft where safe |
| Payment callback timeout | purchase stays pending and reconcilable | pending view, retry status polling, no grant |
| SMS gateway unavailable | don't bypass challenge | retry later; guest free class remains accessible |
| Upload avatar fails | rollback UI to last persisted avatar | error + retry |
| DB temporarily unavailable | no local false authoritative score | safe read-only/loading state + retry; alert ops |
| Migration fails | rollback/recovery runbook; don't continue deploy | no user data manipulation |
| Guest import fails halfway | atomic rollback / batch idempotency | keep local guest data; retry with same batch |

## Operational checks before launch
- `npm run build` and `npx tsc --noEmit` success; `npx eslint ...` after config fix success; chosen tests green.
- Database backup schedule and restore drill, key rotation and secret storage, TLS, logging/tracing without PII/OTP, realistic gateway callback URL.
- SMS send cost limit and rate limits; payment reconciliation ability; monitoring for webhook failures and repeated attempts.
- Authorization tests against **real server** (not mocks), content publication flag, and test/provider flags disabled in production.
- Accessible touch/keyboard and basic mobile browser support; playback path verified on target devices.
- Privacy policy and retention/deletion review prior to production data collection.
- Explicit sign-off for real threshold/videoWeight, course price/currency, provider integrations, hosting configuration, and initial published lesson content.

## Evidence format for completed tests
Record `testId, environment, buildSHA, executedAt, command or manual steps, observed, expected, PASS/FAIL, linked issue, screenshots/log reference without secrets`. Do not write “tested” without evidence.

## Release decision
- `Functional MVP ready for staging` may be declared with mock SMS/payments and sample content if clearly labeled; **not production launch**.
- `Production ready` requires live services/real thresholds/approved publishing, monitoring and security gates.
- `Visual QC complete` is a separate owner approval; most aesthetic backlog does not block functional staging.

**Related:** `implementation-slices.md`, `agent-handoff.md`, `00-foundation/assumptions-and-blockers.md`.
