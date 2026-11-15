# API, Events & Authorization Contract

**Scope:** versioned JSON HTTP API callable by current Next.js UI and possible installed client. **Method/path names below:** `PROVISIONAL API DESIGN`; domain semantics approved. No implementation exists in audited repository.

## قواعد عمومی HTTP
- Prefix `/api/v1`; JSON UTF-8, ISO-8601 UTC timestamps, stable opaque IDs, explicit API schema version.
- Success: `{data, meta?:{requestId,version}}`. Error: `{error:{code,message,details?,requestId,retryable?}}` without secrets.
- Input validation on all mutations; use stable idempotency key (`Idempotency-Key` header) on submit, import, checkout and payment verification.
- Cookie browser sessions `HttpOnly`, `Secure`, `SameSite` and CSRF strategy; mobile future bearer strategy must be covered by ADR, not blindly expose cookie token.
- Client supplies attempt answers, **not score**, `isCorrect`, `isPaid`, `unlocked`, or pricing.
- Return accurate `401` unauthenticated, `403` entitlement/authorization, `409` version/idempotency conflict, `422` invalid payload, `429` rate limit, `503` provider outage.
- Strong request schemas are shared where safe; never share answer keys, password hashes, signing secrets with client.

## Endpoint matrix (`PROVISIONAL` paths)
| Method / Path | Auth | Request / response (summary) | Effect and checks |
|---|---|---|---|
| `GET /api/v1/catalog` | Guest/User | `{lessons:[{id,number,title,published,access:{pedagogical,commercial,reason},reviewFlag}]}` | ۶۰ metadata slots; no answers |
| `GET /api/v1/lessons/:id` | Guest/User | `{lesson,revision,stages,publicQuestions,progress}` | check published, access before serving protected payload/media |
| `GET /api/v1/me/progress` | User, guest local alternative | `{lessons,currentLesson,lastActivity}` | no independent client score |
| `POST /api/v1/attempts` | Guest/User | `{attemptId?,lessonId,revisionId,stageId,kind:'full'|'review',answers:[{questionId,revision,response}],completed:true}` → `{attemptId,gradedResults,exerciseScore,lessonScore,unlockEvent?}` | authz + server grade + atomic update; partial submissions not completed |
| `POST /api/v1/drafts` | User/Guest (strategy TBD) | `{lessonId,stageId,localDraftVersion,input}` | draft only, never grade |
| `POST /api/v1/video/watch-sessions` | Guest/User | `{lessonId,revisionId,videoAssetId}` → `{watchSessionId,position,watchedRanges}` | returns scoped watch session |
| `PATCH /api/v1/video/watch-sessions/:id` | Session owner | `{sequence,playedIntervals:[{fromMs,toMs}],lastPositionMs,telemetry?}` → `{coverage,credited,lessonScore,unlockEvent?}` | plausibility + de-dup + unique interval union |
| `GET /api/v1/mistakes?cursor=&status=` | User (guest local or guest scoped policy) | `{items,nextCursor}` | recent incorrect activities first; safe public prompt |
| `POST /api/v1/mistakes/review-sessions` | Guest/User | `{questionIds}` → review session with only current wrong question revisions | filter active errors |
| `GET /api/v1/me` | User | `{id,displayName,avatarUrl,learningSummary}` | no PII beyond own account |
| `PATCH /api/v1/me` | User | `{displayName}` → updated profile | validated name length/content |
| `POST /api/v1/me/avatar` | User | signed upload flow or direct multipart (ADR) → `{avatarUrl}` | type/size/ownership; no public bucket writes |
| `DELETE /api/v1/me/avatar` | User | no body | reset to placeholder |
| `POST /api/v1/auth/otp/request` | Anonymous | `{phone,purpose}` → `{challengeId,expiresIn,resendAfter}` | rate limit + generic response |
| `POST /api/v1/auth/otp/verify` | Anonymous | `{challengeId,code}` → session or short-lived verified flow grant | one-time code; TTL |
| `POST /api/v1/auth/password/login` | Anonymous | `{phone,password}` → session | constant-time failure paths; rate limit |
| `POST /api/v1/auth/password/set` | Verified user | `{password}` | hash server side |
| `POST /api/v1/auth/password/recover` | Verified recovery flow | `{recoveryGrant,newPassword}` | rotates credentials/sessions per policy |
| `POST /api/v1/auth/logout` | User | `{}` | invalidate session; no client-only fake logout |
| `POST /api/v1/guest/import` | User | `{guestBatchId,guestPayload,mergeConsent}` → `{importId,summary}` | newly created auto; existing account explicit confirm |
| `POST /api/v1/checkout` | User | `{productId}` → `{purchaseId,redirectUrl}` | price from trusted DB/config |
| `GET /api/v1/purchases/:id` | Purchase owner | `{status,entitlementActive}` | safe polling after redirect |
| `POST /api/v1/payment/callback/:provider` | Trusted gateway | provider-specific payload | signature + verify server-side, idempotent |

`GET /api/v1/mistakes` and guest-specific route specifics may vary per guest-storage ADR; do **not** expose cross-account data.

## Sample contracts (illustrative only; no real content)
```ts
type AccessReason = 'OK' | 'PEDAGOGICAL_LOCK' | 'PURCHASE_REQUIRED' | 'UNPUBLISHED';
type LessonAccessDto = {
  lessonId: string;
  sequenceNumber: number;
  pedagogicallyUnlocked: boolean;
  commerciallyEntitled: boolean;
  contentPublished: boolean;
  canStart: boolean; // computed by server from all three
  reason: AccessReason;
};
type AttemptSubmitDto = {
  lessonId: string;
  lessonRevisionId: string;
  stageId: string;
  kind: 'full' | 'review';
  answers: Array<{questionId:string; questionRevision:string; response:unknown}>;
  completed: true;
};
```
A **full** attempt must contain all required question results of that stage. A **review** attempt can contain a subset but only current mistake IDs. If client stage revision stale, return `409 CONTENT_VERSION_CHANGED` with safe refresh path, not silent regrade.

## Event catalog
| Event | Producer | Consumers | Sensitive data? |
|---|---|---|---|
| `video.coverage_updated` | watch service | progress recompute | session/range only |
| `video.credited` | watch service | progress/unlock | stable event ID |
| `attempt.completed` | grading service | mistake/progress | result IDs; avoid raw answers in analytics |
| `mistake.recorded` | review service | mistake list | question ref, no private payload |
| `mistake.corrected` | review service | effective score/progress | question ref |
| `lesson.threshold_reached` | progress service | unlock + UX event | course/lesson ID |
| `lesson.next_unlocked` | progress service | path + toast | next lesson ID |
| `guest.imported` | identity service | progress snapshot | import summary |
| `payment.verified` | commerce service | entitlement | purchase/provider refs |
| `entitlement.granted` | commerce service | access policy cache | product ID |

Events can be in-transaction outbox or returned as domain notifications (`PROVISIONAL`); **don't** require Kafka/queue for MVP. Side effects must be idempotent. UX-only events may be emitted after successful mutation response.

## Authz matrix
| Action | Guest | Authenticated no purchase | Paid user |
|---|---|---|---|
| View free lessons 1..3 | yes if pedagogically open/published | yes | yes |
| View paid lesson 4..60 | no | no | yes **only if** pedagogically open/published |
| Submit full/review attempt | allowed only free lesson and own subject | own unlocked free lessons | own unlocked entitled lessons |
| Import guest data | no until verified session | yes with merge policy | yes with merge policy |
| Checkout | login required | yes | idempotent no-op / already owned state |
| Edit profile | no account (guest temporary display not persisted) | yes | yes |
| Read another user's progress | never | never | never |

## Session, retry and offline
- GET may be safely retried; POST/PATCH mutate with an idempotency key and bounded retry; never retry OTP blindly.
- Double-click submit or network timeout → lookup same idempotency result; no duplicate attempt.
- Payment callback may arrive before browser return, after, or multiple times: verification handles all orders.
- Offline draft may queue in guest/client storage; server decides final acceptance after reconnect and validates content version.

## API definition gate
Generate OpenAPI once DTO/route handlers chosen. Contract tests ensure response conforms and forbidden fields never appear. All routes should have tests for successful, forbidden, stale version, idempotent replay and provider failure paths.
