# ADR-008 — Versioned synthetic content and DTOs

Context: S2 needs 60 metadata slots, 3 synthetic German lessons, no fabricated external media or public answer keys. No final course content/default weights approved.

Options: external sample links or self-generated test asset. Decision: original silent 10-second FFmpeg color pattern under CC0, with descriptive VTT. This is playback test media, never represented as a six-minute lesson. Three self-authored German exercise fixtures, each matching plus grammar order, with private keys in PostgreSQL. Pronunciation remains sandbox-only until real grading is approved. Retain the existing S1 `de-01` identifier; use `de-01` through `de-60` rather than renaming an existing stable slot to blueprint example IDs.

DTOs: Zod 3.25.76 strict public question schema rejects accidental private fields; server projection selects named public columns. Display options may include correct answers as distractor choices, but associations/answer keys are not serialized. Demo access requires both SHISH_DEMO_MODE=1 and SHISH_ENV=development/test; Production fails closed. Seed refuses NODE_ENV=production. Fixture weights 20/70 are explicitly DEMO_ONLY, not approved defaults.

Consequences: until S5/S6 establish subject-aware progress, successor lesson APIs fail closed. Generated player fixture has no speech; dictation is not faked. Node typings aligned with Node 24 for the test-tool peer requirements.

Rollback: revert application code, retain published immutable fixture revisions/history. No automatic deletion/reset. Approval: reversible engineering choice only, product decisions unchanged.
