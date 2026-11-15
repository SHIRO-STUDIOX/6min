import { randomInt, randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, expect, it, vi } from "vitest";
import { pool } from "../../lib/server/db";
import {
  profile,
  updateProfile,
  replaceAvatar,
  clearAvatar,
  avatar,
} from "../../lib/server/profile";
async function user() {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'user')", [id]);
  await pool.query(
    "INSERT INTO users(id,phone,auth_mode,phone_verified_at) VALUES($1,$2,'mock',now())",
    [id, "+999" + randomInt(100000000, 999999999)],
  );
  return id;
}
afterAll(() => pool.end());
it("validates profile changes and persists only permitted fields", async () => {
  const id = await user();
  await updateProfile(id, { displayName: "  نام تست  " });
  expect((await profile(id)).displayName).toBe("نام تست");
  for (const input of [
    { displayName: "" },
    { displayName: "x", phone: "forged" },
    { displayName: "x\nY" },
  ])
    await expect(updateProfile(id, input)).rejects.toMatchObject({
      status: 422,
    });
  expect((await profile(id)).displayName).toBe("نام تست");
});
it("re-encodes private raster uploads, isolates owners and retains old reference on failure", async () => {
  const id = await user();
  const other = await user();
  const image = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
  const result = await replaceAvatar(id, image);
  const bytes = await avatar(id, String(result.avatarKey));
  const meta = await sharp(bytes).metadata();
  expect(meta.format).toBe("png");
  expect(meta.width).toBe(512);
  expect(meta.exif).toBeUndefined();
  await expect(avatar(other, String(result.avatarKey))).rejects.toMatchObject({
    status: 404,
  });
  for (const bad of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    Buffer.from("bad"),
  ])
    await expect(replaceAvatar(id, bad)).rejects.toMatchObject({ status: 422 });
  await expect(replaceAvatar(id, Buffer.alloc(2097153))).rejects.toMatchObject({
    status: 413,
  });
  expect((await profile(id)).avatarKey).toBe(result.avatarKey);
  expect((await clearAvatar(id)).avatarKey).toBeNull();
  expect((await avatar(id, String(result.avatarKey))).length).toBeGreaterThan(
    0,
  );
  vi.stubEnv("SHISH_ENV", "production");
  try {
    await expect(replaceAvatar(id, image)).rejects.toMatchObject({
      status: 503,
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
