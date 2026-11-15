# Learning Progression & Mistake Review — Source of Truth

**This file owns all scoring, review, and unlock semantics.** Approved by owner: weighted video+exercises; defaults overrideable; 80% video; relative score; best full attempt baseline; review amends baseline wrong questions; once unlocked never relock from weaker attempts; mistakes immutable history.

## ۱. Config and invariants
```ts
type LessonScoringPolicy = {
  lessonRevisionId:string;
  videoWeight:number;            // 0..100; numeric default currently UNRESOLVED
  unlockThreshold:number;       // 0..100; numeric default currently UNRESOLVED
  exerciseIds:string[];
};
const exerciseWeight = (p:LessonScoringPolicy) =>
  (100 - p.videoWeight) / p.exerciseIds.length; // guard n=0 before publish
```
**Important:** example values, if any, are `DEMO_ONLY`; DO NOT silently ship 20% and 70% as confirmed. Use decimal/rational math internally; round only displayed values. Each lesson can override defaults. `threshold` comparison must use unrounded score.

For each exercise, normalize `fullAttemptScore = validCorrectQuestions / assessableQuestions` in `[0,1]` (or item weight normalized if content contract later approves nonuniform items; currently equal question credit simplest `PROVISIONAL`). `lastFullAttempt` and `bestFullAttempt` are independently preserved; ties use deterministic stable rule (`PROVISIONAL`: earliest completed at equal score).

## ۲. Effective score with review corrections
The owner selected **amending the best completed attempt**, **not** mixing best answers across all attempts. Define:
- `B`: one chosen **best valid full attempt** for exercise revision; contains a set of correctly answered question IDs.
- `Q_B`: set of assessable question IDs for that exercise revision.
- `C_B`: subset of `Q_B` already correct in `B`.
- `R_B`: subset of `Q_B \ C_B` for which a **valid later quick-review correct answer** exists for the **same exact question revision**. Review is not itself a full attempt.
- `effectiveExerciseFraction = |C_B ∪ R_B| / |Q_B|`, bounded `[0,1]`.

If questions have different configured item weights in future, replace counts with sum of `questionCreditWeight`, but this is **not approved for current MVP**. A question corrected twice counts once; correcting a question already correct in baseline adds zero. Later incorrect attempts can re-open `needsReview` but **never subtract previously earned progress**.

If a new complete attempt becomes the best full attempt, re-select `B` and **recompute `R_B` for its wrong questions**, retaining only corrections that are valid for the same question version and issued after the baseline attempt as required by the approved word “اصلاح ... همان تلاش”. Prior correction events remain in immutable history; no silent historical rewrite. If the change would reduce a previously attained **effective score**, persist `max(previousEarnedEffectiveScore, recomputedScore)` for progression and keep the current displayed calculation separately (`PROVISIONAL` compatibility rule; requires test/ADR). Previously granted unlocks must remain granted regardless. Avoid claiming best full and review state are identical.

## ۳. Lesson total
Let `V = 1` if server-confirmed watch coverage ≥0.8 of unique real playback ranges, else `0`.

`lessonScore = videoWeight*V + Σ_{exercise e}(exerciseWeight(e) * effectiveExerciseFraction(e))`

The result is always in `[0,100]`; without any full attempt for an exercise its effective fraction is `0` and quick review **cannot** inflate score from nothing (review needs existing wrong questions). No points on partially completed full attempt.

At threshold crossing: `lesson.progressStatus = readyToContinue` and `next lesson pedagogicallyUnlockedAt` becomes **persistently** set. Do not label unresolved errors as magically mastered. If user revisits lesson and scores less, do **not** relock successor or erase their best result.

## ۴. Mistake lifecycle
- On wrong answer in full attempt, append `incorrect` event with `{questionId,revision,attemptId,at}`; expose one current active mistake entry per question revision (proposed projection).
- On correct answer in quick review or full attempt, append `corrected` event if transition applicable; set `reviewStatus='corrected'` after **one valid correct**.
- If wrong again later, append `incorrect`/`reopened` and set `needsReview` again; preserve prior correction and any earned points.
- Mistake list sorted by **most recent wrong event descending**; chronological list confirmed. Full audit log remains even when item no longer active. Whether corrected items remain visible in main view is not separately approved; `PROVISIONAL`: active list defaults to needsReview, corrected available under history without default clutter.
- Avoid duplicate list entries from repeated wrong attempts: project by `(subject, questionId, questionRevision)` with recent wrong date; this grouping is a **technical provisional** not separate user-approved UI behavior.

## ۵. Review flows
### Quick Review
1. From Header mistakes popover/entry open mistake list ordered newest first.
2. Select one or more **currently wrong** question refs; review loads only those questions, using same exercise renderer with `reviewMode=true`.
3. Submit question answer; server grades against stored question revision, appends attempt `kind=review`, updates `MistakeEvent`, and recomputes effective score against current best full attempt.
4. If threshold crossed, unlock next lesson; return `unlockEvent` for subtle nonblocking notification.
5. Finish → brief summary → user chooses **continue reviewing** or **return to previous location**.

### Return to original exercise
- Open same lesson, correct stage and exercise; restore class navigation context when user exits.
- Re-running whole exercise creates `kind=full` attempt and may change `bestFullAttempt`; quick-review answers do not count as full.
- If original content revision is retired or missing, present history and safe unavailable path; do not pretend to rerun a different question.

## ۶. Concrete scoring examples (`DEMO_ONLY`)
Example with `videoWeight=20`, two equally weighted exercises (40 each), `threshold=70` *for tests only*. One exercise best full attempt 3 correct / 5 = 24 points; correcting one of its two wrong questions yields 4/5 = 32 points, not 24+8+8 for repeated correction. If other exercise earns 20 points and video credited 20, total 72 and unlocks; remaining wrong question remains pending review.

Case: baseline question 2 wrong, corrected on quick review, then user answers question 2 wrong in another complete attempt with worse overall result. `reviewStatus` may reopen and history records new error; effective earned score remains at least the previous best and successor stays unlocked.

## ۷. Source snapshots & timestamps
- Original `LearningAttempt` and `QuestionResult` immutable. Distinguish `attempt.completedAt` from `reviewStatus.updatedAt` and `unlockTimestamp`.
- Stale item revision: reject with 409, do not silently map to new question.
- Client-computed hint/animation never determines accepted score; server regrades.
- Distinguish lesson unlock (`pedagogical`) from purchase entitlement (`commercial`) and publication (`contentAvailable`); actual `canStart` requires all three.

## ۸. Events/persistence ordering
Within one server transaction: grade attempt → append question results/mistake events → recompute exercise and lesson score → upsert progress → persist unlock → commit. On duplicate `Idempotency-Key`, return original outcome without crediting twice. Video threshold uses separate idempotent transaction. UI notification after successful commit only.

## ۹. Open boundaries
- Exact videoWeight and threshold per course default: `UNRESOLVED`.
- Grading of pronunciation failures/forgiven and typo warning: require quality rule; no free points for dev mock.
- How to combine corrections when baseline changes must be tested against immutable historic correction event times and content revision; `maxEarned` behavior is `PROVISIONAL` domain engineering decision, not owner-approved formula revision.
- How corrected historical mistakes are shown in UI: `DEFERRED_QC` beyond basic history access.

## ۱۰. Unit test matrix (must cover)
| Case | Expected |
|---|---|
| Video coverage 79.99% | no credit |
| Video coverage ≥80% distinct | full videoWeight exactly once |
| Seek and replay duplicates | no extra credit |
| 2 exercises with changing counts | remaining weight divides equally |
| Full attempt 3/5, 2 incorrect | best=0.6; review subset 2 eligible |
| Correct one wrong in review | effective=0.8; status corrected |
| Re-correct same wrong | no second point award |
| Correct baseline-already-correct item | no effective increment |
| Review without full attempt | rejected, no credit |
| New full attempt worse | best unchanged; unlock unchanged |
| New full attempt better | baseline selection updated deterministically; corrections intersect |
| Wrong later after corrected | status reopens; history persists; earned unlock monotonic |
| Duplicate attempt request | one attempt and one award |
| Score arithmetic precision | never >100; threshold compare unrounded |
| Undo/retry network conflict | idempotent response |
| Paid vs educational lock | treated separately |

**Dependencies:** `content-contract.md`, `domain-model-and-storage.md`, `entitlement-and-payment.md`.
