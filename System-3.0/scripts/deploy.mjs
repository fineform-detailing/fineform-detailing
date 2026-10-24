import { readFileSync } from "node:fs";
import { config, databaseReady, wrangler } from "./cloudflare.mjs";
try {
  if (!databaseReady())
    throw new Error("Configure o banco primeiro: npm run configure.");
  if (process.env.FF_SKIP_BUILD !== "1") await import("./build.mjs");
  const main = config();
  const web = JSON.parse(
    readFileSync(
      new URL("../services/web/wrangler.jsonc", import.meta.url),
      "utf8",
    ),
  );
  if (
    web.name === main.name ||
    web.account_id !== main.account_id ||
    web.workers_dev !== false ||
    web.preview_urls !== false
  )
    throw Error("Confira o destino privado do serviço web antes de publicar.");
  // Deploy the internal web service before the gateway references it.
  wrangler(["deploy", "--config", "services/web/wrangler.jsonc"], {
    auxiliary: true,
  });
  // Only versioned, additive migrations are applied to the existing database.
  wrangler(["d1", "migrations", "apply", "DB", "--remote"]);
  wrangler(["deploy", "--keep-vars"]);
  console.log(
    "Fine Form 4.0 publicada: React/Next.js + API. Confira /api/health.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
