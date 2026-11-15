# App Shell & Navigation — Functional Contract

**Owner:** classroom navigation, Header, Action Center, Bottom Dock, focus and state restoration. **UI values (except approved behavior):** `DEFERRED_QC`.

## ۱. Page anatomy
A sky-like background holds three independent regions:
- **Header:** not one bar. Right brand logotype; three separate left glass islands: `Streak`, `Mistakes`, `More`.
- **Action Center:** unbacked outer centered area, bounded max width; one horizontally arranged card track, one selected card and next preview if space.
- **Bottom Dock:** single floating pill near bottom center, destinations physically left `مسیر من`, middle `کلاس`, right `پروفایل`.
Header visible during classroom Focus Mode; dock remains but visually subdued and active. Modal/sheet disables underlying dock; Header popover need not.

## ۲. Header interactions
| Island | Trigger | Functional outcome |
|---|---|---|
| Brand | header logo | identity/navigation behavior `DEFERRED_QC` (don't invent route) |
| Streak | click/tap | calendar in popover desktop/bottom sheet mobile; streak semantics not part of weighted score |
| Mistakes | click/tap | short summary and route/flow into Mistake Review; restore calling context on exit |
| More | click/tap | exactly `ظاهر و محیط کلاس`، `راهنما`، `گزارش مشکل`، `خروج از کلاس` |

`خروج از کلاس` ≠ logout account. Logout requires separate explicit identity action when provided; do not make More entry revoke login. Existing `FloatingHeader` is mock; reuse shell selectively with three-island spec, not old PRO pricing/login menu blindly.

## ۳. Action Center behavior
- Stages are **physical left→right** independent from RTL text; selected card begins at left of display viewport; next peek at its physical right if room (~۳۰٪ conceptual, not hard constraint for narrow screens).
- Equal outer card dimensions, `gap:6px` approved; no scale-up/down on selection. Desktop roughly square, mobile narrower/taller by responsive rules; exact sizing for QC.
- Progressive blur + fade mask is **fixed to viewport**, not applied as blur on each card; next card first renders full style. Masked/non-visible card portion does not receive pointer interactions.
- Previous card normally concealed but may appear as temporary blurred ghost during dragging; on snap return to selected anchored position.
- Swipe mobile, pointer drag desktop, native horizontal wheel/trackpad; **never intercept vertical scrolling**. Each gesture at most one stage; direct dots/arrows may jump to any index. Snap and edge resistance; no wrap-around.
- Dots above active card, centered relative **selected card width**, exactly one per actual stage. Color reflects pedagogical status while selection ring/indicator reflects current index. Dots for locked stage still clickable.
- Desktop arrows two independent Liquid Glass HeroUI controls about 16px below card area, at physical right; hide invalid direction at ends, hide on mobile, tablet only when space.
- Selection of locked stage allowed; **only activity area** glass blur overlay locks interaction, with contextual notice on attempt. Title and stage identity remain readable. Stage eligibility sourced from server policy.
- Focus Mode reflows inner activity, outer selected card shell dimensions/position unchanged; current video may continue controlled by user; never punish pauses by default.
- Respect reduced motion, keyboard focus, accessible labels and touch hit areas; no magnifying Dock behavior.

## ۴. Bottom Dock
- Active item circle morphs into horizontal capsule, contains filled icon and label when width permits; inactive circles outline icon. Icons remain constant size; compact mode may omit label but hit area remains accessible.
- Dock stays centered and changes total width smoothly; only active navigation changes route. Hover inactive reflection + tooltip, pressed tactile small feedback.
- On vertical scroll down hide, on scroll up show; keyboard open on mobile hide. On modal/sheet dock interaction disabled. In Focus subdued but accessible.
- Safe area at phone bottom respected; route loading/errors keep Dock available when shell intact.
- Each page preserves filter/scroll/view state on navigation; no unintentional reset of learning progress.

## ۵. Navigation context distinction
```ts
type NavigationContext = {
  origin:'class'|'my-path'|'profile'|'mistakes'|'onboarding'|'checkout';
  lessonId?:string;
  stageId?:string;
  returnTo?:string; // whitelist internal route, not open redirect
  myPathScrollAnchor?:{lessonId:string; offsetPx:number};
  sourceLessonRevisionId?:string;
  draftId?:string;
};
```
- **Current lesson:** latest/highest pedagogically unlocked lesson.
- **Last learning activity:** most recent lesson/stage actually worked on; returning authenticated user goes there.
- **Return from secondary page to classroom:** active lesson state/drafts restored; ordinary re-entry selecting last available/actionable stage should follow confirmed classroom policy. A contextual deep link explicitly targeting a mistaken question overrides default stage selection.
- `My Path` first visit scroll near current lesson; later visits restore previous scroll. Click «برو به درس من» scrolls to current lesson, not last activity.

## ۶. Error/edge behavior
- API route pending: keep shell navigable, show skeleton/loader in affected card only where possible.
- Rapid taps on dots vs drag: pending gesture cancel/resolve deterministically; no overlapping animation state corrupt index.
- New stage count from revision: clamp selection to valid index and keep meaningful draft association by stage ID.
- Changing lesson while video playing: pause/teardown old player, save watch state, revoke media listeners/streams; never leak microphones/audio.
- Native screen reader and focus: selected stage's heading announced; locked indicator includes reason and action availability.
- Deep-link to locked lesson/activity: page may show lesson metadata and reason, but must not mount playable protected content.

## ۷. Proposed component contracts (not final design props)
`ClassroomShell({lessonId, selectedStageId, stageSummaries, onNavigateStage, onReturn})`, `HeaderIslands({streakSummary,mistakeSummary,onMoreAction})`, `ActionCenter({stages,activeStageId,onSelectStage})`, `BottomDock({activeDestination,onNavigate})`. Each gets domain DTO, not direct DB adapters; HeroUI control API and accessibility preserved.

## ۸. Acceptance conditions
- User can jump via dots to locked stage; overlay blocks only activity; no API unlock bypass.
- Drag one-card max, dot direct-jump any stage, correct physical left-right in RTL.
- Wheel vertical scroll remains vertical; player controls take precedence.
- Dock order and back/return state verified desktop/mobile.
- Header popovers work without moving outer card; Focus doesn't hide header.
- /sandbox remains accessible with no production auth dependency.

**Related:** `screen-flows.md`, `design-guardrails-and-qc.md`, `02-learning/playback-and-exercise-runtime.md`.
