import { wrangler, config, databaseReady } from "./cloudflare.mjs";
import { readFileSync } from "node:fs";
try {
  const cfg = config(),
    db = cfg.previews?.d1_databases?.find((x) => x.binding === "DB"),
    production = cfg.d1_databases.find((x) => x.binding === "DB");
  const migration = JSON.parse(
    readFileSync(
      new URL("../wrangler.preview-migrations.jsonc", import.meta.url),
      "utf8",
    ),
  ).d1_databases.find((x) => x.binding === "PREVIEW_DB");
  if (
    !databaseReady({ d1_databases: cfg.previews?.d1_databases || [] }) ||
    db.database_id === production.database_id ||
    migration.database_id !== db.database_id
  )
    throw Error("Confira o D1 separado de preview: npm run preview:configure.");
  wrangler([
    "d1",
    "migrations",
    "apply",
    "PREVIEW_DB",
    "--remote",
    "--config",
    "wrangler.preview-migrations.jsonc",
  ]);
  wrangler(["preview", "--ignore-base-config", ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
