import { databaseReady, wrangler } from "./cloudflare.mjs";
try {
  if (!databaseReady())
    throw new Error("Configure o banco primeiro: npm run configure.");
  if (process.env.FF_SKIP_BUILD !== "1") await import("./build.mjs");
  // Deploy the internal web service before the gateway references it.
  wrangler(["deploy", "--config", "services/web/wrangler.jsonc"]);
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
