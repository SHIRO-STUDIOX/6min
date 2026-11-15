# Screen Flows — MVP (UI-independent)

**Approved user journeys and actions**, not fixed pixel layouts. Source-of-truth of scoring and entitlement is in learning/commerce Blueprint, not here.

## ۱. First Entry / guest → first lesson
**Entry:** new visitor arrives unauthenticated. **Flow:** optional guest → short intro → «شروع درس اول» → lesson ۱ video stage → exercise stages. Signup is not mandatory to try free content.
- At end of the three-lesson free segment: suggest account creation and one-time purchase, non-blocking for revisiting free lessons.
- Attempting lesson ۴ triggers auth/signup if guest and commercial gate; purchase requires verified account.
- If guest later registers a **new account**, auto-import existing guest progress; existing account requires explicit merge consent.
- Failures preserve guest data and current context.

## ۲. Returning user → last activity
- Valid session: directly resume last learning activity class (lesson, stage/appropriate restore policy and draft).
- Expired session: login via OTP or password then resume same intended context.
- Current lesson shown in My Path remains **newest unlocked**, not last visited; differences intentional.
- On direct navigation to class via Dock, restore class context and last available/actionable stage, unless a purposeful deep link points to exact exercise.

## ۳. Classroom cycle
1. Load lesson public stages + access + persisted progress.
2. Video Card preview and real player; credit video after ۸۰٪ unique real played ranges.
3. Exercises selected via Action Center (including locked previews); on completed attempt server grades and updates score/mistakes.
4. Retry exercise to improve best valid full result; quick review may correct wrong questions.
5. At threshold, persist `readyToContinue` and next lesson pedagogical unlock. Notify briefly «درس بعدی باز شد» plus optional button **without automatic navigation**.
6. User chooses lesson next or keeps practicing; note commercial gate may still block next.

## ۴. My Path
**Structure:** one compact centered vertical list of ۶۰ slots, physical top lesson ۶۰ → bottom lesson ۱, dotted/segmented connector. Normal items relatively narrow, current lesson more prominent. Minimal per item number + title + status; small review-needed marker.

**First visit:** scroll near newest pedagogically unlocked lesson. **Subsequent visit:** restore previous scroll anchor, unless deliberate «برو به درس من» action.

**On select available lesson:** navigate directly into class selected lesson (no preview gate). **On select locked:** expand **same item** with prerequisite lesson and concise condition; maintain scroll. **Vertical navigator dots:** jump scroll to corresponding item/region; one dot does NOT start lesson. How to compress ۶۰ dots on small viewport is `DEFERRED_QC` but jump behavior must remain accessible.

**Header:** show compact summary e.g. «درس ۱۲ از ۶۰», no requirement to expose scoring formula.

## ۵. Mistakes
- Header Mistakes island → contextual summary/list.
- List ordered by latest wrong timestamp descending; include active wrong items and optional corrected history access.
- Quick review: **only wrong question IDs**, same question renderer, evaluate correctness server-side; corrected after one valid correct response.
- Alternative: tap «رفتن به تمرین اصلی», navigate to exact original lesson and stage with return context.
- End quick review: short result summary and **two explicit choices**: continue review or return to previous location; if no prior location, fallback to mistake list (`PROVISIONAL`).
- May unlock lesson next through effective scoring; feedback remains brief; preserve old current stage on return.

## ۶. Profile
- User displayName/avatar and basic lesson progress summary; edit displayName and replace/remove avatar.
- Actions: continue learning, My Path, mistakes. Reuse shared progress data; don't create competing progress engine.
- Guest mode: profile may show invitation to create account, but account edit actions require authentication (`PROVISIONAL` minimal gating).
- Saving profile: explicit result, failure keeps old server data and retry possible; no impact on progress or purchases.

## ۷. Authentication
- Main auth options: mobile+password OR mobile+OTP.
- OTP invalid/expired → error, re-request after cooldown; no account enumeration.
- Password forgotten → SMS verify → reset password → authenticated return.
- Signup after guest: auto import on new account; consent dialog for merge on existing account; decline cannot overwrite account.
- Logout from account (if exposed) terminates session; More «خروج از کلاس» is not equivalent to account logout.

## ۸. Checkout/paywall
- Lesson ۱–۳ free within pedagogy; paid lesson attempt triggers purchase explanation.
- If account needed, authenticate first while preserving requested destination.
- Checkout → external payment → server verification → return to original destination if both gates pass.
- Pending/failed/cancelled states show appropriately without granting content; allow retry and preserve learning data.

## ۹. Screen states matrix
| Screen | Loading | Empty / First-time | Failure | Restoration |
|---|---|---|---|---|
| Class | stage/content skeleton within card | intro/first video | content/player/attempt retry | lesson/stage/watch/draft |
| My Path | list skeleton | ۶۰ metadata, lesson ۱ current | localized error + reload | scroll anchor |
| Mistakes | list skeleton | no active mistakes — optional history | fetch/review retry | list position + return origin |
| Profile | profile shell | guest account CTA | save failure rollback | displayName/avatar |
| Auth | challenge pending | phone field | expired OTP/rate-limited | redirect intent/guest state |
| Checkout return | pending verification | no purchase created | failed/cancelled/retry | route return intent |

## ۱۰. Routing examples (`PROVISIONAL`)
`/` or `/class/:lessonId`; `/path`; `/profile`; `/mistakes`; `/auth`; `/checkout/return`. Exact route mapping must respect existing `/` class page and `app/sandbox`; no destructive route rename required. Routes can use server-friendly paths while preserving navigation intent/query through validated IDs. All deep links re-check server access.

## ۱۱. Tests of experience
- Login redirect resumes correct last activity, including expired session recovery.
- My Path visual order reversed but progression from ۱ to ۶۰, and dotted jump does not start lesson.
- Selecting locked lesson expands item instead of routing; entering unlocked lesson goes directly to classroom.
- Quick review corrections alter effective lesson score and may unlock next without auto jump.
- Payment canceled doesn't delete guest progress; verified purchase restores intended lesson when pedagogically allowed.
- Profile edits survive reload; mock data not used on actual route.

**Related:** `app-shell-and-navigation.md`, `02-learning/progression-and-mistake-review.md`, `03-identity-commerce/*`.
