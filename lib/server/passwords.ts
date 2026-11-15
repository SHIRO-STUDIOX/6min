import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function passwordHash(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new Error("INVALID_PASSWORD");
  const salt = randomBytes(16);
  return `scrypt$32768$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string | null) {
  const parts = stored?.split("$") ?? [];
  const valid =
    parts.length === 6 &&
    parts.slice(0, 4).join("$") === "scrypt$32768$8$1" &&
    /^[a-f0-9]{32}$/.test(parts[4]) &&
    /^[a-f0-9]{64}$/.test(parts[5]);
  const actual = await derive(
    password.slice(0, 128),
    valid ? Buffer.from(parts[4], "hex") : Buffer.alloc(16),
  );
  const expected = valid ? Buffer.from(parts[5], "hex") : Buffer.alloc(32);
  return timingSafeEqual(actual, expected) && valid;
}
