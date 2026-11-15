import { existsSync, lstatSync, statSync } from "node:fs";
import path from "node:path";
export function localSqlitePath(value, cwd = process.cwd()) {
  if (typeof value !== "string" || !value.startsWith("sqlite:"))
    throw new Error("SQLite requires a local sqlite: DATABASE_URL");
  const relative = value.slice(7);
  if (
    !relative ||
    /[\u0000\r\n?#]/.test(relative) ||
    relative.startsWith("//") ||
    relative.startsWith("\\\\")
  )
    throw new Error("Invalid local SQLite path");
  const root = path.resolve(cwd, ".local-data"),
    filename = path.resolve(cwd, relative);
  if (!filename.startsWith(root + path.sep))
    throw new Error(
      "SQLite files must remain inside this checkout's ignored .local-data folder",
    );
  let current = root;
  for (const part of ["", ...path.relative(root, filename).split(path.sep)]) {
    if (part) current = path.join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error(
        "SQLite local paths cannot use symbolic links or junctions",
      );
  }
  return filename;
}
export function sameSqliteFile(
  left,
  right,
  windows = process.platform === "win32",
) {
  if (
    (windows ? left.toLowerCase() : left) ===
    (windows ? right.toLowerCase() : right)
  )
    return true;
  if (existsSync(left) && existsSync(right)) {
    const a = statSync(left, { bigint: true }),
      b = statSync(right, { bigint: true });
    return (
      a.ino !== BigInt(0) &&
      b.ino !== BigInt(0) &&
      a.dev === b.dev &&
      a.ino === b.ino
    );
  }
  return false;
}
