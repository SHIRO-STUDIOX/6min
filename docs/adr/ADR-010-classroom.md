# ADR-010 — Functional classroom, navigation and draft isolation

Context: root previously mounted five hardcoded English prototype cards with fake video and vertical wheel hijacking. Keep them available but do not treat them as live German curriculum.

Decision: preserve the original root verbatim as LegacyClassroom in Sandbox; root becomes short onboarding/return-to-last-activity and /classroom/:id consumes public server DTOs only. Header has three independent islands, exact four More actions, calendar of actual full-attempt dates (no invented XP/streak formula). Dock physical LTR order is My Path/Class/Profile. Initial destination routes expose basic own progress; S9 adds the full list/profile/review functionality.

Stage selection and activity eligibility are separate. Existing StageIndicator accepts locked selection; StageDot uses HeroUI controls with 40px hit targets around unchanged 6px visual dots, selection ring distinct from educational status. All cards have equal fixed outer geometry; Focus changes emphasis only. Physical carousel uses one-stage pointer gestures, excludes player/controls, leaves vertical wheel native, derives dots from actual stages and keeps preview inert. Final blur/radius/motion palette remains DEFERRED_QC.

Vocabulary/grammar FSMs gain opt-in raw deferred assessment, preserving local Sandbox paths. Unordered public token IDs never reveal grammar answer order. Shared QuestionRenderer is reusable for full and quick review. Server grades only submitted complete attempts; stable idempotency key survives failed submissions. Unsupported pronunciation/audio content is unavailable, never mock scored in live learning.

Drafts are scoped by principal+stage+revision. Guest IndexedDB remains authoritative only for raw drafts, account drafts also sync to PostgreSQL with optimistic versions. Different local/server drafts require explicit version choice; no silent account overwrite. Selection context is separate from actual last activity; selecting a locked shell cannot falsify activity. Successful attempt/watch writes persist last activity atomically, independent of best score/current lesson. Bug reports are own-subject records only; no email/chat is sent. More exit changes route, not login state.

Rollback code/routes while retaining drafts/history; no destructive data migration. No visual completion or physical-device certification claimed. Approval: reversible engineering mapping of existing approved contracts, no product decisions changed.
