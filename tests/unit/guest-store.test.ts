import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  acknowledgeGuestImport,
  guestBatch,
  loadGuestDraft,
  saveGuestDraft,
} from "../../lib/client/guest-store";

it("retains drafts across connections, isolates scopes/revisions and rejects stale concurrent versions", async () => {
  const scope = crypto.randomUUID();
  const draft = {
    scope,
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    input: "Hallo",
    version: 1,
  };
  await saveGuestDraft(draft);
  expect(
    (await loadGuestDraft(scope, draft.stageId, draft.revisionId))?.input,
  ).toBe("Hallo");
  expect(
    await loadGuestDraft("other", draft.stageId, draft.revisionId),
  ).toBeNull();
  expect(await loadGuestDraft(scope, draft.stageId, "new-revision")).toBeNull();
  await expect(
    saveGuestDraft({ ...draft, input: "lost edit", version: 0 }),
  ).rejects.toThrow("DRAFT_VERSION_CONFLICT");
  await expect(
    saveGuestDraft({ ...draft, input: "other tab", version: 1 }),
  ).rejects.toThrow("DRAFT_VERSION_CONFLICT");
  expect(
    (await loadGuestDraft(scope, draft.stageId, draft.revisionId))?.input,
  ).toBe("Hallo");
});
it("preserves source on failed/unacknowledged import and rolls batch only after later edits", async () => {
  const scope = crypto.randomUUID();
  const draft = {
    scope,
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    input: "Guten Tag",
    version: 1,
  };
  await saveGuestDraft(draft);
  const batch = await guestBatch(scope);
  expect((await guestBatch(scope)).batchId).toBe(batch.batchId);
  await expect(
    acknowledgeGuestImport(scope, batch.batchId, false),
  ).rejects.toThrow();
  expect((await guestBatch(scope)).drafts).toHaveLength(1);
  await acknowledgeGuestImport(scope, batch.batchId, true);
  expect((await guestBatch(scope)).imported).toBe(true);
  expect((await guestBatch(scope)).drafts).toHaveLength(1);
  await saveGuestDraft({ ...draft, input: "Guten Abend", version: 2 });
  expect((await guestBatch(scope)).imported).toBe(false);
  expect((await guestBatch(scope)).batchId).not.toBe(batch.batchId);
  await expect(
    saveGuestDraft({
      ...draft,
      input: new Blob(["raw recording"]),
      version: 3,
    }),
  ).rejects.toThrow("INVALID_DRAFT");
});
