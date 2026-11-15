# Authentication, Sessions, Guest & Merge

**Approved:** phone + password OR phone + SMS OTP, password recovery by phone OTP; guest free lessons; new account auto-import; existing account explicit consent; return to last class activity. **Provider and country support:** `UNRESOLVED`.

## ۱. Identity cases
- `GUEST`: anonymous device-scoped learning of lessons ۱–۳; optional entry without registering.
- `NEW_USER`: a verified phone becomes durable account; brief intro + explicit «شروع درس اول» unless guest progress already provides active context (`PROVISIONAL` collision behavior).
- `RETURNING_USER`: session valid → last learning activity; session expired → authenticate, then restore captured deep link/context.
- `EXISTING_ACCOUNT_WITH_GUEST`: before altering account history, show non-destructive import summary and obtain affirmative consent.

## ۲. Auth flows
### Login with OTP
`enter phone → normalize & validate → request purpose:login/signup → server issues challenge/TTL → SMS adapter sends code → verify server-side → session created/rotated → resume`.

### Login with password
`enter phone + password → verify stored passwordHash server side → rate limit → rotate/create session → resume`.
If account was created OTP-only and no password exists, user can continue with OTP and optionally **set password after verified login**. Do not store a plaintext password or create a guessed password for OTP-only accounts.

### Forgot password
`enter phone → request recover challenge → verify OTP → short-lived single-use recovery grant → set new passwordHash → invalidate/rotate old sessions according to ADR → login`.
Failure cases avoid revealing whether a particular phone is registered. Never log OTP or password. Show resend after cooldown, code expiry and safe retries.

## ۳. Phone and OTP constraints
- Existing prototype `phone-login.tsx` validates Iranian `09xxxxxxxxx`; actual supported countries/format unspecified. `PROVISIONAL`: canonical server phone in E.164 and client-specific normalization; country coverage decision before real SMS.
- Challenge is bound to phone, purpose, expiry, attempt budget and resend cooldown. Store only hashed code/challenge proof; single successful use.
- Rate limit by phone, device, IP and challenge; prevent OTP enumeration and SMS abuse; no exposure of true user existence in generic responses.
- Session on web: HttpOnly/Secure cookie, CSRF protection where required; future installed app may use a distinct token flow, but same domain API.
- Ensure time sync, HTTPS, session revocation on logout and password reset.

## ۴. Guest persistence and scope
- `APPROVED`: guest can experience **real** video and exercises in three free lessons; no cross-device recovery guarantee.
- `PROVISIONAL`: store guestId, lesson progress, drafts, watch range snapshots and attempt event journal in IndexedDB; localStorage may hold only small references. Do not store auth secrets or raw microphone recording in guest data.
- Guest access rules use `lesson.sequenceNumber <= 3` **and** pedagogical unlock **and** content publication; even client tampering must not grant access to paid content.
- Guest actions should use same pure scoring functions as logged-in server to minimize divergence, but authoritative account import must revalidate and recompute results server-side.
- If browser storage disabled/private mode: allow ephemeral experience with clear limitations; do not claim it will persist.

## ۵. Import to new account (auto)
1. User verifies phone, server recognizes newly created account.
2. Browser sends guest batch with stable event IDs + hash/checksum under a unique import ID.
3. Server validates guest events, referenced published revisions, lesson order and free-access scope; replay against deterministic grading logic instead of trusting client-supplied scores.
4. Transaction imports attempts, video watch evidence with trust policy, mistake events and last activity; **does not grant paid entitlement**.
5. On successful response and resolved consistency, client clears/marks imported guest batch safely. Failed request must retain local data for retry.

## ۶. Import to existing account (requires consent)
1. User authenticates existing account with saved progress.
2. Before any mutation, return preview: lessons affected, attempt counts, potential new mistakes, current progress protection; **no silent overwrite**.
3. Ask explicit «ادغام پیشرفت مهمان با حساب» consent with option decline.
4. If yes, use atomic import with `guestBatchId,targetUserId` uniqueness; append non-duplicate events; recompute derived score and mistake current states; preserve previously granted unlocks and entitlements.
5. If declined, don't import anything or delete device guest data automatically; user can continue account context.

### Adversarial cases
- Browser user logs into different person's account: never merge without fresh consent.
- Same guest batch submitted twice: second attempt is idempotent no-op.
- User switches devices: no assumption of guest progress transfer.
- Guest corrects paid lesson by editing browser object: server rejects based on lesson 1..3 rule.
- Two concurrent import sessions: DB uniqueness and transaction lock prevent double records.

## ۷. Last activity vs current lesson
`lastActivity` describes the last learning activity (may be lesson ۵ review); `currentLesson` is newest **pedagogically unlocked** (perhaps ۱۲). Returning user lands in last activity, My Path highlights currentLesson. A stage initially selected in class may be preserved for explicit restore, but ordinary return to class from navigation chooses last actionable stage as approved policy; use route state and provenance to distinguish.

## ۸. Auth state machine (logical)
```text
anonymousGuest ── login request ──> verifyingOtp / verifyingPassword
verifyingOtp ── valid code ──> authenticated
verifyingPassword ── valid password ──> authenticated
authenticated ── logout/session expiry ──> anonymousGuest or signedOut
recoveringPassword ── OTP verified ──> passwordResetGrant ── set password ──> authenticated (policy-dependent)
authenticated + pendingGuestBatch ── new account ──> importAuto
authenticated + pendingGuestBatch ── existing account ──> waitingForConsent ── accept ──> importing
```
Transition failure should be retryable without discarding guest progress. Never store password in persistent UI state.

## ۹. Ownership and permissions
- `UserProfile` is editable only by subject account; displayName and avatar can change with validated schema/file type, size and ownership.
- No account is required to **start** first three lessons; account required for payment and cross-device durable progress.
- On logout, terminate session but do not automatically delete server data. Whether local guest cache should remain after logout is a privacy policy to confirm (`UNRESOLVED`); avoid impersonation on shared device.

## ۱۰. Definition of Done
- OTP login/new signup, password login, password recovery and session refresh work against fake provider in local integration tests and real provider in staging before go-live.
- User cannot use expired/replayed code; response doesn't leak account existence; rate limiting tested.
- Guest can progress free content; cannot access lesson ۴ without entitlement.
- New account imports once automatically; existing requires consent, decline leaves account untouched.
- Duplicate import, interrupted import, repeated refresh, multiple devices don't corrupt progress.

**Related:** `entitlement-and-payment.md`, `01-architecture/domain-model-and-storage.md`, `04-experience/screen-flows.md`.
