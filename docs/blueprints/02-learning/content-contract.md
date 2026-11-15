# Curriculum & Content Contract

**Approved content model:** ۶۰ قسمت ~۶ دقیقه‌ای آموزش آلمانی، هر قسمت یک موضوع و تمرین‌های مرتبط؛ فعلاً محتوای واقعی آماده نیست. **All illustrative topic titles and exercise data below:** `DEMO_ONLY`, not approved curriculum.

## خط تفکیک محتوا و تجربه
- `Course`: مجموعه ۶۰ درس.
- `Lesson`: شماره آموزشی ثابت ۱ تا ۶۰، عنوان کوتاه، revision و publication status.
- `LessonRevision`: snapshot قفل‌شده برای video asset، stages، grading policy، weights، threshold.
- `Stage`: یک ویدیو یا یک تمرین؛ ترتیب stage برای Action Center است، **نه** شماره درس در My Path.
- `Exercise`: نوع پردازش (matching, grammar ordering, dictation, pronunciation و later)، questions، answer schema.
- `Question`: شناسه پایدار + revision؛ متن عمومی و answer key محرمانه در سرور.

## نسخه‌بندی و انتشار
1. نویسنده محتوای draft ایجاد می‌کند؛ `contentVersion` می‌افزاید.
2. Validator اطمینان می‌دهد stage ویدیویی، حداقل تمرین موردنیاز، سؤال‌های معتبر، media references و weights وجود دارند.
3. Published revision immutable می‌شود؛ ویدیو/سؤال آن در طول تلاش کاربر silent تغییر نمی‌کند.
4. هر تغییر محتوایی غیرسازگار یک revision جدید می‌سازد؛ سیاست انتقال progress به version جدید در migration ثبت می‌شود.
5. lesson slot ۱..۶۰ می‌تواند metadata داشته باشد ولی `published=false` و `canStart=false` باشد؛ **60 slots ≠ 60 ready lessons**.

## TypeScript logical DTOs (`PROVISIONAL` shapes)
```ts
type StageKind = 'video' | 'exercise';
type ExerciseKind = 'vocabulary-match' | 'grammar-order' | 'dictation' | 'pronunciation';
type LessonPublic = {
  id: string;
  sequenceNumber: number; // 1..60
  title: string;
  currentRevisionId: string;
  stages: Array<{
    id: string;
    order: number;
    kind: StageKind;
    exerciseKind?: ExerciseKind;
    publicPayload: unknown;
    activityLocked: boolean;
  }>;
};
type LessonPrivateRevision = {
  id: string;
  lessonId: string;
  version: string;
  videoAssetId: string;
  durationMs?: number;
  videoWeight: number; // APPROVED configurable; numeric DEMO_ONLY till owner confirms
  unlockThreshold: number;
  stages: Array<{id:string; order:number; kind:StageKind; exerciseKind?:ExerciseKind}>;
};
```

## Exercise schema adapter examples
| Existing source | Adapter input | Grading output | Must preserve |
|---|---|---|---|
| Vocabulary FSM | `VocabularyPair[]` stable pair IDs and source/target | correctness per pair ID; attempt percentage | shuffle, matching affordances |
| Grammar FSM | `GrammarSentence[]`, token IDs & distractors | correctness per sentence/question ID | normalization, distractor logic |
| Dictation FSM | `DictationPrompt[]`, accepted variants | correctness per prompt ID, typo hint vs final answer | typo warning / Levenshtein |
| Pronunciation FSM | `PronunciationItem[]`, reference audio/phonetic | validated result from trustworthy evaluator | microphone controls; **mock score not accepted as real** |

Existing hardcoded English demo content **must be replaced by German-specific fixtures**, not treated as course truth. The audio URLs from unofficial Youdao are not reliable production hosting.

## Minimal fixture set — solely for tests
Three separate published lessons `demo-de-001`, `demo-de-002`, `demo-de-003` with two simple exercises each; `demo-de-004` can exist as unpublished/locked metadata for transition tests. Example topics (not approved):
- Lesson 1: `Begrüßung` (hello/greetings), one matching + one text entry/dictation.
- Lesson 2: `Sich vorstellen` (introductions), grammar order + vocabulary.
- Lesson 3: `Zahlen 1–10` (numbers), matching + dictation.
Each uses self-owned synthetic test poster/video media with permission, **not** fabricated streaming links. No real audio/video asset can be assumed to exist. Seed deterministic IDs/revisions and correct answers server side. Add StageIndex per actual stages, no forced number ۵ for all lessons.

## Weight handling
- Require `videoWeight` and `unlockThreshold` on publication, resolved from defaults or per-lesson overrides.
- Equal exercise weight across `n > 0` stages: `(100 - videoWeight)/n`; compute in precise decimal arithmetic; round display only.
- Unknown real defaults → `DEMO_ONLY` seeded numeric values explicitly flagged, not promoted to production.
- Grading is normalized by actual **number of assessable questions**; typo warning and forgiven pronunciation must follow an approved grading adapter, not silently count as correct.

## Validation before publish
- Lesson `sequenceNumber` unique 1..60; stage order unique and contiguous for smooth carousel.
- One valid published video and at least one assessable exercise for the default loop (unless product approves a special lesson).
- Every assessable item has unique ID + revision + server answer key + supported exercise adapter.
- `durationMs > 0` when known; watch events computed on verified media duration, not an arbitrary six-minute timer.
- All required media URLs and subtitles pass availability/authorization checks; no secret asset URL exposed permanently.
- `videoWeight` and `unlockThreshold` in [0,100] and suitable for configured exercise count; no division by zero.
- No content edit to published revision in place; create new revision.

## Relationship with front-end
- UI consumes `publicPayload` only; no answer key in browser bundles for secure grading (some local demo comparisons may remain solely in Sandbox).
- Content service is source of lesson/stage list; Action Center dots derive from actual stages.
- My Path always maps 60 lesson metadata slots, but entry into unpublished lessons returns a clear unavailable state, not a broken view.
- Asset hosting/provider remains external selection; lesson DTO contains abstract media references or short-lived authorized URLs.

## Acceptance checks
- Fixture loads into DB and `GET /api/v1/lessons/demo-de-001` returns stable ordered stages.
- Next fixtures reuse existing FSM adapters without hardcoded component data.
- Private answer keys never appear in GET public lesson response.
- Attempt against outdated question revision returns conflict; history remains queryable.
- Changing fixture stage count updates dots and default equal weights automatically.

**Owners:** Content creator + learning engineer. **Related:** `domain-model-and-storage.md`, `playback-and-exercise-runtime.md`, `progression-and-mistake-review.md`.
