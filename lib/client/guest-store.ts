import { openDB, type DBSchema } from "idb";

export type GuestDraft = {
  scope: string;
  lessonId: string;
  revisionId: string;
  stageId: string;
  input: unknown;
  version: number;
  updatedAt: string;
};
interface GuestDatabase extends DBSchema {
  drafts: { key: string; value: GuestDraft };
  meta: { key: string; value: { batchId: string; imported: boolean } };
}
const key = (scope: string, stageId: string, revisionId: string) =>
  JSON.stringify([scope, stageId, revisionId]);
function database() {
  return openDB<GuestDatabase>("shish-guest-v1", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("drafts"))
        db.createObjectStore("drafts");
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    },
  });
}
export async function saveGuestDraft(draft: Omit<GuestDraft, "updatedAt">) {
  const serialized = JSON.stringify(draft.input, (_key, value) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error("INVALID_DRAFT");
    return value;
  });
  if (serialized === undefined) throw new Error("INVALID_DRAFT");
  if (
    !draft.scope ||
    !draft.stageId ||
    !draft.revisionId ||
    !Number.isInteger(draft.version) ||
    draft.version < 0 ||
    new TextEncoder().encode(serialized).byteLength > 32768
  )
    throw new Error("INVALID_DRAFT");
  const db = await database();
  try {
    const tx = db.transaction(["drafts", "meta"], "readwrite");
    const store = tx.objectStore("drafts");
    const id = key(draft.scope, draft.stageId, draft.revisionId);
    const existing = await store.get(id);
    if (
      existing &&
      (existing.version > draft.version ||
        (existing.version === draft.version &&
          JSON.stringify(existing.input) !== serialized))
    )
      throw new Error("DRAFT_VERSION_CONFLICT");
    await store.put(
      {
        ...draft,
        input: JSON.parse(serialized),
        updatedAt: new Date().toISOString(),
      },
      id,
    );
    const meta = await tx.objectStore("meta").get(draft.scope);
    if (meta?.imported)
      await tx
        .objectStore("meta")
        .put({ batchId: crypto.randomUUID(), imported: false }, draft.scope);
    await tx.done;
  } finally {
    db.close();
  }
}
export async function loadGuestDraft(
  scope: string,
  stageId: string,
  revisionId: string,
) {
  const db = await database();
  try {
    return (await db.get("drafts", key(scope, stageId, revisionId))) ?? null;
  } finally {
    db.close();
  }
}
export async function guestBatch(scope: string) {
  const db = await database();
  try {
    const tx = db.transaction(["drafts", "meta"], "readwrite");
    let meta = await tx.objectStore("meta").get(scope);
    if (!meta) {
      meta = { batchId: crypto.randomUUID(), imported: false };
      await tx.objectStore("meta").put(meta, scope);
    }
    const drafts = (await tx.objectStore("drafts").getAll()).filter(
      (draft) => draft.scope === scope,
    );
    await tx.done;
    return { ...meta, drafts };
  } finally {
    db.close();
  }
}
export async function acknowledgeGuestImport(
  scope: string,
  batchId: string,
  serverAcknowledged: boolean,
) {
  if (!serverAcknowledged) throw new Error("IMPORT_NOT_ACKNOWLEDGED");
  const db = await database();
  try {
    const tx = db.transaction("meta", "readwrite");
    const meta = await tx.store.get(scope);
    if (!meta || meta.batchId !== batchId)
      throw new Error("IMPORT_BATCH_CONFLICT");
    await tx.store.put({ ...meta, imported: true }, scope);
    await tx.done;
  } finally {
    db.close();
  }
}
