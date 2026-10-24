import { spawnSync } from "node:child_process";
import { readFile, writeFile, readdir, rm, cp, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/next/dist/bin/next"),
    "build",
    join(root, "apps/web"),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
if (result.status !== 0)
  throw Error("A aplicação React não concluiu a compilação.");
const out = join(root, "apps/web/out");
await rm(join(root, "dist"), { recursive: true, force: true });
await cp(out, join(root, "dist"), { recursive: true });
const policies = {};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      const key =
        "/" +
        path
          .slice(join(root, "dist").length + 1)
          .replace(/index\.html$/, "")
          .replace(/\/\/+/g, "/");
      policies[key] = [
        ...new Set(
          [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
            .filter((m) => m[1].trim())
            .map(
              (m) =>
                "'sha256-" +
                createHash("sha256").update(m[1]).digest("base64") +
                "'",
            ),
        ),
      ];
    }
  }
}
await collect(join(root, "dist"));
await mkdir(join(root, "services/api/generated"), { recursive: true });
await writeFile(
  join(root, "services/api/generated/csp.mjs"),
  "// Generated from the exact Next.js output. Never allow unsafe-inline scripts.\nexport const scriptPolicies = " +
    JSON.stringify(policies, null, 2) +
    ";\n",
);
console.log(
  "Next.js export e políticas CSP prontos para " +
    Object.keys(policies).length +
    " páginas.",
);
