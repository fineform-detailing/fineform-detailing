import { spawn } from "node:child_process";
const cli = (file, args) =>
  spawn(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
const children = [
  cli("node_modules/wrangler/bin/wrangler.js", [
    "dev",
    "-c",
    "wrangler.jsonc",
    "-c",
    "services/web/wrangler.jsonc",
    "--port",
    "8787",
  ]),
  cli("node_modules/next/dist/bin/next", ["dev", "apps/web", "--port", "3000"]),
];
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children)
  child.on("exit", (code) => {
    stop();
    process.exitCode = code || 0;
  });
