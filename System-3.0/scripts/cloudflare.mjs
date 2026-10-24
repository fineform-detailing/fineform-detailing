import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const cli = new URL(
  "../node_modules/wrangler/bin/wrangler.js",
  import.meta.url,
);
export function wrangler(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [fileURLToPath(cli), ...args], {
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "O comando Cloudflare não concluiu. Confira a mensagem acima.",
    );
  return result.stdout || "";
}
export function config() {
  return JSON.parse(
    readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  );
}
export function databaseReady(c = config()) {
  const id = c.d1_databases.find((v) => v.binding === "DB")?.database_id;
  return (
    /^[0-9a-f-]{36}$/i.test(id || "") &&
    id !== "00000000-0000-0000-0000-000000000000"
  );
}
