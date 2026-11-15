# Playback & Exercise Runtime Contract

**Purpose:** replace timer-based video mocks with an off-the-shelf player, connect existing exercise FSMs to persisted domain events, and preserve navigation behavior. **No custom video engine.**

## Existing-code audit pointers (`BASELINE`, verify live)
- `components/organisms/video-card.tsx`: can render `<video>` for `videoSrc` but timer controls don't operate native playback reliably.
- `components/organisms/video-player.tsx`: elaborate UI with `<img>` and artificial interval; `isStrict` + focus penalty are prototype behaviors **not approved**.
- `hooks/use-{vocabulary,grammar,dictation,pronunciation}-fsm.ts`: existing local state & assessment feedback.
- `components/molecules/StageIndicator/`: existing visual indicator not wired to production route.

## Video adapter interface (`PROVISIONAL` contract)
```ts
type PlaybackSnapshot = {
  currentTimeMs: number;
  durationMs: number;
  paused: boolean;
  buffering: boolean;
  muted: boolean;
  playbackRate: number;
};
type VideoEvent =
  | {type:'ready'; durationMs:number}
  | {type:'play'|'pause'|'ended'|'buffering'}
  | {type:'timeupdate'; positionMs:number; mediaClockMs:number}
  | {type:'seek-start'|'seek-end'; fromMs:number; toMs:number}
  | {type:'error'; code:string};
type VideoAdapter = {
  load(assetRef:string, posterRef?:string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(ms:number): void;
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener:(e:VideoEvent)=>void):()=>void;
};
```
Select actual player package after mini-spike/ADR and confirm captions, keyboard, focus, touch and iOS support. The above is interface boundary, **not instruction to implement player controls from scratch**.

## Video states (orthogonal, not one huge enum)
- Load: `unavailable | loading | ready | error`.
- Playback: `idle | playing | paused | buffering | ended`.
- Learning credit: `notCredited | credited`.
- Display: `normal | focus | browserFullscreen` (PiP undecided).
- Persistence: `localPending | syncing | confirmed | retryableFailure`.

Transitions: loading→ready; ready+play→playing; buffering retains last valid progress; ended by itself **does not** credit unless ≥۸۰٪ unique played; fullscreen/Focus must not reset actual playback or card geometry.

## مشاهده منحصربه‌فرد ویدیو
- Client emits **actual media playing** time intervals in milliseconds based on playback element events and elapsed monotonic wall-time, not fake `setInterval` time progression.
- Merge overlapping/adjacent valid intervals as half-open `[start,end)`; clamp to `[0,duration]`; remove gaps induced by seeking; avoid counting paused/buffering time.
- Coverage = `sum(mergedIntervalLengths) / durationMs` for specific **video asset + published revision**.
- Credit once if `coverage >= 0.8`; apply **entire videoWeight once**. Resume position is separate from coverage and may be after a seek.
- Replaying already watched segment never increases unique coverage; watch ranges may persist across sessions for same revision.
- Server validates authenticated/guest subject, active playable lesson, valid session, increasing sequence number, nonnegative ranges, media duration and plausible elapsed play time. **Client reports cannot cryptographically prove watching**; document residual fraud risk and do not claim otherwise.
- Credit persistence idempotent; timeupdate bursts batched/throttled, save on pause/unload when possible; retry missed updates safely.

## Player UI boundaries
- Before Play: attractive poster/thumb and clear start; title and approved card-shell positioning; source and caption controls remain from chosen library.
- During Play: status/progress in card, full controls of ready player, optional Focus ambience. Main controls remain accessible for pause/rewind.
- If lesson stage is future/locked, shell and title can be selected, but video activity protected per policy; lesson access gate protects media URL server-side.
- Never penalize pausing or switching browser tabs automatically; prototype `isStrict`, seek lock and ۳۰ثانیه punishment are `NON_GOAL` unless owner approves.
- Native fullscreen may change only player surface; classroom Focus may change internal layout without changing outer shell dimensions; exact interaction is `DEFERRED_QC`.
- Keyboard/pointer, captions support, reduced motion and screen reader controls are functional requirements, not final aesthetic choices.

## Exercise adapter boundary
```ts
type ExerciseDraft = {
  lessonId: string; lessonRevisionId: string; stageId: string;
  data: Record<string,unknown>; updatedAt: string;
};
type QuestionAnswer = {
  questionId: string; questionRevision:string; response:unknown;
};
type ExerciseCompletion = {
  lessonId:string; lessonRevisionId:string; stageId:string;
  answers:QuestionAnswer[]; finishedAt:string;
};
type ExerciseRuntimeAdapter = {
  createDraft():ExerciseDraft;
  onStateChange(next:unknown):void;
  toCompletedAttempt():ExerciseCompletion | null;
  resetForRetry():void;
};
```
- Hook FSM manages **interaction** (selection/dragging/text/voice), not authoritative correctness. Existing local `accuracyPercentage` and `onComplete` are feedback only until validated by server.
- Server loads question answer definitions from published revision, grades full attempt, writes `QuestionResult` and mistake events.
- Review mode is powered by **same question renderer** with a filtered set of mistaken question IDs; it is a partial `review` submission, not a full attempt.
- Incomplete/unsubmitted drafts are not scored; re-enter same stage restores draft if compatible with contentVersion.

## Handling each current FSM
| FSM | Keep | Bridge requirement | Risk/test |
|---|---|---|---|
| Vocabulary | shuffled matching UI and match transitions | map every pair to assessable question result; do not equate number of clicks with unique answer | shuffle stable IDs and repeated wrong tries |
| Grammar | token building + distractors | send ordered token IDs; normalize server-side | multilingual punctuation, repeated tokens |
| Dictation | Levenshtein typo hints | server grade canonical variants; distinguish `TYPO_WARNING` from accepted | NFC, apostrophe and German umlauts |
| Pronunciation | recording UX, mic analyser | **real AI evaluator/API scoring policy before weighted score**; mock-match is never production pass | denied mic, no Web Speech, unsupported language, network |

For a pronunciation exercise required in a lesson, **do not silently bypass or award points** when no trustworthy evaluator exists. To ship an early vertical slice, use only exercise types with deterministic validated grading; keep pronunciation UI sandboxed until grading integration is approved.

## Learning events & UI callbacks
`onVideoCredit(lessonId)`, `onAttemptSubmitted(result)`, `onMistakeIdentified(questionRef)`, `onLessonUnlocked(nextLessonId)`, `onDraftChanged(stageId)` consume **server responses** or durable local guest result following same pure domain contract. Component props are adapters, not final per-card UI props.

## Focus/Carousel interaction arbitration
1. Pointer inside native player controls → player priority; do not initiate card drag.
2. Pointer in card background → carousel drag with one-card max per gesture.
3. Mobile touch on video → native controls / media interactions first; horizontal swipe on card outer region → carousel.
4. Vertical wheel/trackpad remains native page scroll; only horizontal delta moves track.
5. Dots/arrows can directly jump to locked stages; activity overlay blocks learning interaction only.
6. Preserve selected stage and drafts when navigating to My Path/Profile/Review; resume last actionable stage on ordinary return-to-class policy.

## Failure and retry
- Missing media or unsupported format: status error, retry; no watch credit.
- Buffering/slow internet: keep previously credited intervals; no double counting.
- Attempt submission network failure: keep draft and idempotency key, retry; no fake success state.
- Version conflict: safe explain/reload, preserve old attempt history; do not grade against different answer key.
- Microphone refusal: offer accessible message and retry; prevent fabricated completion.

## Acceptance tests
1. Seek 0→duration with no playback: 0% unique coverage.
2. Watch 0–50%, rewatch same 0–50%: still 50%.
3. Watch 0–40% and 40–80%: credit once; two overlapping devices/sessions still once.
4. Pause, buffer and tab switch: no artificial progress or punishment.
5. Full attempt saves all question results; review saves only targeted mistakes; refresh retains score.
6. Test mobile touch carousel interactions without stealing video controls.
7. Verify `VideoPlayer` mock not mounted on live course route after adapter integrated.

**Related:** `progression-and-mistake-review.md`, `01-architecture/api-and-events.md`, `04-experience/app-shell-and-navigation.md`.
