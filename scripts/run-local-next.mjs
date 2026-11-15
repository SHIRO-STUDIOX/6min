// Keep the Next process tree owned until shutdown. No shell or foreign PIDs.
import "./load-local-sqlite.mjs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
const port = Number(process.argv[2] ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid local app port");
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { stdio: "inherit", detached: true, windowsHide: true, env: process.env },
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (!child.pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 10000,
    });
  else
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
if (process.platform === "win32") process.on("SIGBREAK", stop);
process.on("exit", stop);
child.on("error", () => {
  console.error(
    "Could not start the local Next process; check the dependency installation.",
  );
  process.exitCode = 1;
  stop();
});
child.on("exit", (code) => {
  const interrupted = stopping;
  stop();
  process.exitCode = interrupted ? 0 : (code ?? 1);
});
