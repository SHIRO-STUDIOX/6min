# Entitlements & External Payment

**Approved commercial model:** first ۳ lessons free; one-time purchase grants **commercial access** to full ۶۰-lesson course; payment on external gateway and browser returns to SHISH. **Not approved:** price/currency/provider, subscription, bundles.

## ۱. Two independent locks + publication
Actual learning activity access requires:
```ts
const canStartLesson =
  contentPublished && pedagogicallyUnlocked &&
  (lessonSequence <= 3 || hasCourseEntitlement);
```
`pedagogicallyUnlocked` initially true only for lesson ۱; after reaching threshold in lesson `n`, persist unlock of lesson `n+1` (through 60). Buying the course never unlocks education stages out of order. Later worse score never revokes educational unlock; paid entitlement revocation is a different exceptional business process.

| Scenario | Content ready | Pedagogical gate | Commercial gate | Result |
|---|---|---|---|---|
| Guest lesson ۱ | yes | yes | free | allow |
| Guest lesson ۳ before lesson ۲ threshold | yes | no | free | educational lock |
| Guest lesson ۴ after lesson ۳ threshold | yes | yes | purchase required | commercial lock / signup |
| Paid user lesson ۲۰ while lesson ۱۹ incomplete | yes | no | entitlement yes | educational lock |
| Paid user lesson ۴ after meeting prerequisites | yes | yes | entitlement yes | allow |
| Any unpublished lesson | no | any | any | unavailable (separate from lock) |

## ۲. Checkout flow
1. User attempts paid lesson or chooses purchase; if guest, authenticate first, keeping `returnContext` and guest import/consent sequence.
2. `POST /api/v1/checkout` with trusted `productId`; server loads **price and currency from server configuration/product record**, never client price.
3. Create Purchase `pending`, unique request id, invoke gateway adapter to obtain redirect URL.
4. Redirect browser to **whitelisted payment URL**; preserve session and intended lesson/stage in server purchase metadata or signed return token (no secrets in query string).
5. Gateway processes payment; **independent server callback or server-to-server verification** validates reference/status/signature/amount/currency/order owner.
6. In atomic transaction set `Purchase=successful`, record verified transaction, grant unique entitlement; duplicate callbacks safe.
7. Browser return page reads **server purchase status**, polling temporarily if callback delayed; show success/pending/failed/cancelled and offer retry. A return URL parameter `success=true` never grants anything.
8. If entitlement and lesson pedagogy both permit, return to previously intended activity. Otherwise explain which gate still blocks it.

## ۳. State model
`created → pending → verifiedSuccess | verifiedFailure | cancelled | expired`. Some gateways notify asynchronously; pending may survive browser close. Retry should create new payment attempt under same purchase or new purchase per ADR and **never duplicate successful entitlement**.

- Purchase record owned by one user + product; guest purchase not allowed.
- Entitlement for product `SHISH_FULL_60` is an account-level durable grant, not a lesson-by-lesson copy.
- Unexpected conflicting gateway status after success is a reconciliation/admin case; do not revoke learning access automatically without audited business rule.
- One-time access assumed without subscription expiry; refund/revoke policy `UNRESOLVED`.

## ۴. Provider adapter (`PROVISIONAL`)
```ts
type PaymentInit = {
  purchaseId:string; amountMinor:number; currency:string;
  callbackUrl:string; payerReference:string;
};
type VerifiedPayment = {
  provider:string; externalPaymentId:string; purchaseId:string;
  confirmedAmountMinor:number; currency:string; success:boolean;
  verifiedAt:string;
};
interface PaymentGateway {
  createRedirect(input:PaymentInit):Promise<{redirectUrl:string; providerRef:string}>;
  verifyExternalResult(providerPayload:unknown):Promise<VerifiedPayment>;
}
```
Only server can invoke `verifyExternalResult`; use timeout/retries with backoff and webhook signature/verified API, and reconcile eventual success independent of browser return. Dev mock gateway must be marked `TEST_ONLY` and blocked in production.

## ۵. Integrity and security
- Verify amount, currency, purchase ID, user and provider transaction reference; replay protection via unique DB constraints.
- No payment card details, OTP, secret keys in app logs or client bundle.
- No redirect to untrusted external URL (allowlist/check gateway adapter result).
- CSRF protection on authenticated checkout; webhook verification and event source validation on callback.
- `GET /purchases/:id` requires current owner, not just knowledge of UUID.
- Cache refresh/policy invalidation after entitlement grant; client local flag not authority.

## ۶. Guest paywall interaction
- The free course ends after lesson ۳ progression; show nonblocking invitation **after free section** and at attempted commercial access.
- Guests may revisit free lessons and review mistakes; no forced sign-up mid-exercise.
- If account creation fails or payment is canceled, preserve local guest drafts and prior account progress; return to safe previously accessible view.
- Existing account merge consent occurs before importing guest data; **purchasing does not imply consent to merge**.

## ۷. Deployment dependencies
- Owner says hosting chosen but details unknown: callback publicly reachable via TLS, outbound gateway API access, server clock, secret vault, DB reachable and transaction capable, logs/monitoring, proper domain redirects.
- Provider, price, currency and callback contract have to be approved before real checkout; development can use sandbox provider and fake success verification under test flags.

## ۸. Acceptance tests
1. Guest can exercise lessons 1..3 where pedagogically unlocked; lesson 4 blocked even after local state manipulation.
2. Buying successful allows commercial gate of all 60 but does not bypass pedagogical lock.
3. `return?success=true` without verification grants nothing.
4. Duplicate callback/success polling grant one entitlement; concurrent requests deduplicate.
5. Callback before return, return before callback, browser close and delayed gateway verified success all converge.
6. Wrong amount, wrong signature, wrong user and reused payment transaction rejected.
7. Payment failed/cancelled leaves prior progress and guest data intact; user may retry.
8. Unpublished lesson remains unavailable even for payer.

**Related:** `authentication-and-guest.md`, `01-architecture/api-and-events.md`, `02-learning/progression-and-mistake-review.md`.
