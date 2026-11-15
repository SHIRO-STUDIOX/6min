import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
const configs = [
  ...[".env", ".env.local", ".env.sqlite.local"]
    .filter(existsSync)
    .map((file) => parseEnv(readFileSync(file, "utf8"))),
  process.env,
];
const secrets = [];
for (const config of configs)
  for (const [name, value] of Object.entries(config)) {
    if (!value) continue;
    if (/DATABASE_URL$/.test(name)) {
      try {
        const parsed = new URL(value);
        if (parsed.password)
          secrets.push(value, decodeURIComponent(parsed.password));
      } catch {}
    } else if (
      /^(SHISH_MOCK_PAYMENT_SECRET|TELEGRAM_BOT_TOKEN|TELEGRAM_SERVICE_API_KEY)$/.test(
        name,
      )
    )
      secrets.push(value);
  }
const protectedValues = [
  ...new Set(secrets.filter((value) => value.length >= 12)),
];
let scanned = 0;
function inspect(file) {
  const size = statSync(file).size;
  if (size > 8000000) return;
  const bytes = readFileSync(file);
  if (bytes.includes(0)) return;
  const source = bytes.toString("utf8");
  if (protectedValues.some((secret) => source.includes(secret)))
    throw new Error(
      "Private configured value detected in reviewable/client artifact; inspect securely",
    );
  scanned++;
}
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
for (const file of files)
  if (existsSync(file) && statSync(file).isFile()) inspect(file);
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = folder + "/" + entry.name;
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) inspect(file);
  }
}
if (!existsSync(".next/static"))
  throw new Error("Build before scanning client artifacts");
walk(".next/static");
console.log(
  JSON.stringify({
    status: "PASS",
    scannedFiles: scanned,
    configuredSecretValuesChecked: protectedValues.length,
    secretValuesPrinted: false,
  }),
);
