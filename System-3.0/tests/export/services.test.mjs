import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel } from "miniflare";
let mf;
before(async () => {
  const api = await build({
    entryPoints: ["services/api/src/http/worker.mjs"],
    bundle: true,
    format: "esm",
    write: false,
  });
  mf = new Miniflare({
    workers: [
      {
        name: "gateway",
        modules: true,
        script: api.outputFiles[0].text,
        compatibilityDate: "2026-07-30",
        cf: { country: "BR" },
        serviceBindings: { WEB: "web" },
      },
      {
        name: "web",
        modules: true,
        script: await readFile("services/web/worker.mjs", "utf8"),
        compatibilityDate: "2026-07-30",
        assets: {
          directory: "dist",
          binding: "ASSETS",
          routerConfig: {
            has_user_worker: true,
            invoke_user_worker_ahead_of_assets: true,
          },
        },
      },
    ],
    log: new Log(LogLevel.ERROR),
  });
});
after(async () => {
  await mf?.dispose();
});
test("gateway serves React through the private web service binding and preserves its security headers", async () => {
  const r = await mf.dispatchFetch("https://fine-form.test/atendimento/", {
    cf: { country: "BR" },
  });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /\/_next\/static\//);
  assert.equal(r.headers.get("X-Frame-Options"), "DENY");
  assert.match(r.headers.get("Content-Security-Policy"), /sha256-/);
});
test("API routes remain in the gateway and country enforcement runs before the web service", async () => {
  const health = await mf.dispatchFetch("https://fine-form.test/api/health", {
    cf: { country: "BR" },
  });
  assert.equal(health.status, 200);
  const data = await health.json();
  assert.equal(data.version, "4.0.0");
  assert.equal(data.webService, true);
  const blocked = await mf.dispatchFetch(
    "https://fine-form.test/atendimento/",
    { cf: { country: "US" } },
  );
  assert.equal(blocked.status, 403);
});
