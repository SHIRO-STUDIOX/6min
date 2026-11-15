import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ContentError } from "./content";
import { demoContentAllowed } from "../contracts/content";

export async function profile(userId: string) {
  const result = await db.execute(
    sql`SELECT id,display_name,avatar_key,auth_mode FROM users WHERE id=${userId}`,
  );
  const user = result.rows[0];
  if (!user) throw new ContentError("AUTHENTICATION_REQUIRED", 401);
  return {
    id: user.id,
    displayName: user.display_name,
    avatarKey: user.avatar_key,
    authMode: user.auth_mode,
  };
}
export async function updateProfile(userId: string, input: unknown) {
  const parsed = z
    .object({
      displayName: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_PROFILE", 422);
  await db.execute(
    sql`UPDATE users SET display_name=${parsed.data.displayName} WHERE id=${userId}`,
  );
  return profile(userId);
}
// Replace this adapter with approved private object storage before deployment.
function storageRoot() {
  if (!demoContentAllowed())
    throw new ContentError("AVATAR_STORAGE_UNAVAILABLE", 503);
  return path.join(
    process.cwd(),
    ".local-data",
    process.env.SHISH_ENV === "test" ? "test-avatars" : "avatars",
  );
}
export async function replaceAvatar(userId: string, bytes: Buffer) {
  const root = storageRoot();
  if (bytes.length > 2097152) throw new ContentError("AVATAR_TOO_LARGE", 413);
  let encoded: Buffer;
  try {
    const image = sharp(bytes, { limitInputPixels: 16000000, animated: false });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("format");
    encoded = await image
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    throw new ContentError("INVALID_AVATAR", 422);
  }
  const id = randomUUID();
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, id + ".png"), encoded, {
    flag: "wx",
    mode: 0o600,
  });
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO avatar_assets(id,user_id,media_type,byte_size) VALUES(${id},${userId},'image/png',${encoded.length})`,
    );
    await tx.execute(sql`UPDATE users SET avatar_key=${id} WHERE id=${userId}`);
  });
  return profile(userId);
}
export async function clearAvatar(userId: string) {
  await db.execute(sql`UPDATE users SET avatar_key=NULL WHERE id=${userId}`);
  return profile(userId); // Retain previous assets; retention/deletion awaits policy.
}
export async function avatar(userId: string, id: string) {
  const root = storageRoot();
  if (!z.string().uuid().safeParse(id).success)
    throw new ContentError("NOT_FOUND", 404);
  const result = await db.execute(
    sql`SELECT id FROM avatar_assets WHERE id=${id} AND user_id=${userId}`,
  );
  if (!result.rows.length) throw new ContentError("NOT_FOUND", 404);
  return readFile(path.join(root, id + ".png"));
}
