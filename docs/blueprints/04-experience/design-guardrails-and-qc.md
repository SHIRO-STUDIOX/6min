# Design Guardrails, Reuse & UI QC

**Goal:** preserve SHISH visual identity and accessibility while intentionally avoiding premature lock-in of per-card details.

## Already-approved design principles
- Sky/cloud classroom atmosphere, bright restrained soft digital-paper card surface; sky seen mainly **around** card, not through its main opaque body.
- Card shell: soft rounded edges, gentle shadow, no ornamental grain; generous large top-right title; locked activity-only overlay; do not visually change selected card shell size.
- HeroUI v3 ready-made controls should keep original public props, keyboard behavior, focus ring, accessibility, and touch semantics. Provide centrally defined Liquid Glass variant where appropriate, **not a parallel button library**.
- Use **existing project tokens**. Any missing token must be proposed centrally and reviewed; don't scatter hardcoded hex/rgba or improvised tailwind colors in production components.
- Bottom Dock is glass, card body generally paper-like; interactive controls may be glass. Status accents faint and pedagogically meaningful, not garish.
- Some video content gets expressive thumbnail; video region upper ~4px inset as approved direction; progress treatment and sticker are potential ideas but final artwork/behavior remain QC.
- Both RTL Persian text and deliberately LTR **physical carousel progression** must work.

## Existing design infrastructure (`BASELINE` audit observations)
- `styles/globals.css`: Tailwind CSS v4, `@heroui/styles`, CSS variables and seven `data-brand` palettes, glass rim helper, squircle utility.
- `app/providers.tsx`: `next-themes` plus locale provider; current default dark report, whereas brand vision emphasizes light airy class; reconcile through prototype, **do not flip all defaults automatically**.
- `public/fonts/IRANYekanXVF.woff2`: local Persian variable font; keep numeral features and `[dir=ltr]` behavior.
- Solar + Lucide currently mixed; unification is QC/design consistency issue, not reason to block functional MVP.
- `/sandbox` has viewport tools and inspection; preserve component registry and register new reusable components.

## Minimal implementation guardrails
- Build functional shell first: semantic landmarks, real interaction targets, correct data/state; use skeleton/error variants for every network-bound screen.
- Apply `focus-visible` and keyboard navigation; accessible button text/labels (play, close, jump lesson, start exercise, retry); avoid inaccessible icon-only controls.
- Reduced-motion: disable nonessential scaling/morph and minimize carousel animation; keep state communicated by text/shape, not color alone.
- Touch target sizes remain usable even if circles appear smaller; safe-area on mobile Dock.
- Treat focus state and success/warning as separate data facets; UI must not confuse “current stage” with “stage status.”
- Live progress strip in video is informative and distinct from weighted lesson score; do not label playback percent as learning mastery.
- Avoid blocking stage navigation during exercise locks; only interaction area blocked.
- Demo animation on old `CompletionCard` is not source of business rules; exclude mandatory reward economy.

## Nonbinding design backlog (`DEFERRED_QC`)
| Area | Open for owner QC | Must not be silently fixed by agent |
|---|---|---|
| Video Card | thumbnail composition, poster, progress glow/chapter segmentation, badge/sticker, Focus controls | custom player engine/strict penalties |
| Exercise Cards | individual layouts, micro-interactions, content-specific visuals | invented grading policy |
| Header | calendar presentation, mascot peek, popover dimensions/animation | extra More actions |
| Action Center | responsive sizes, mask strength, blur response, arrow timing | changing LTR physical progression |
| Dock | morph, glass reflection, capsule sizing, tooltips | swapping three physical positions |
| My Path | prominence of current item, vertical dots density/mobile behavior | changing ۶۰→۱ order |
| Mistakes | active vs history presentation, summary layout | removing immutable mistakes |
| Profile/Onboarding | editorial graphics, empty states | adding compulsory steps/signup |
| Global | font sizes, surface tones, icon stroke style, motion timing | breaking design tokens/accessibility |

## Sandbox QC loop
1. Each vertical slice must build and expose component/story with realistic fixture props in `/sandbox` when appropriate.
2. Product owner reviews screen at desktop/tablet/mobile; logs issue as `QC-###` with route, device, screenshot, expected/actual, priority.
3. Developer fixes QC issue without modifying domain contract unless explicitly approved.
4. Regression check focus, RTL/LTR, reduced motion, keyboard and form behavior.
5. Close QC ticket only after re-review; do not declare “pixel-perfect” absent actual approval.

## Reuse vs rewrite decision test
- Existing FSM: retain state transitions and helpers wherever possible; extract server grading separately.
- Existing video mock: replace fake playback/time source; may reuse poster/button layout, not fake timer.
- Existing Header mock: reuse visual atoms but implement new ۳-island structure and exact More actions.
- Existing StageIndicator: refactor click policy to allow locked selection; maintain status semantics.
- Existing `BaseCard`: preserve family silhouette, adapt responsive sizes only through approved design-system boundary.

## Definition of Done (visual baseline)
Functional actions usable; no arbitrary tokens; keyboard accessible; screen reader labels; stable layout; no hidden access bypass; /sandbox unaffected. Final shades/spacing/animations do **not** block functional MVP unless they break usability.

**Related:** `04-experience/app-shell-and-navigation.md`, `05-delivery/verification-and-recovery.md`.
