import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { wrangler, config, databaseReady } from "./cloudflare.mjs";
try {
  const path = process.argv[2];
  if (!path)
    throw Error(
      'Informe a pasta antiga: npm run reuse -- "C:\\caminho\\System-2.0"',
    );
  const previousPath = resolve(path, "wrangler.jsonc"),
    previous = JSON.parse(readFileSync(previousPath, "utf8")),
    next = config();
  if (
    !databaseReady(previous) ||
    !previous.name ||
    !previous.durable_objects?.bindings?.some(
      (x) => x.name === "LIVE" && x.class_name === "LiveUpdates",
    )
  )
    throw Error(
      "A configuração antiga precisa ter D1 válido e o binding LIVE.",
    );
  if (
    !["worker/index.mjs", "services/api/src/http/worker.mjs"].includes(
      previous.main,
    )
  )
    throw Error(
      "A estrutura antiga é diferente. Confira o projeto antes de atualizar.",
    );
  mkdirSync("backups", { recursive: true });
  const filename = resolve(
    "backups",
    "fine-form-before-4-0-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      ".sql",
  );
  wrangler([
    "d1",
    "export",
    "DB",
    "--remote",
    "--config",
    previousPath,
    "--output",
    filename,
  ]);
  const database = previous.d1_databases.find((x) => x.binding === "DB");
  const cfg = {
    ...previous,
    main: next.main,
    assets: next.assets,
    services: next.services,
    d1_databases: previous.d1_databases.map((x) =>
      x.binding === "DB" ? { ...x, migrations_dir: "migrations" } : x,
    ),
    durable_objects: previous.durable_objects,
    migrations: previous.migrations,
  };
  if (cfg.vars) {
    delete cfg.vars.ADMIN_KEY;
    delete cfg.vars.ADMIN_TOTP_SECRET;
  }
  delete cfg.previews;
  writeFileSync(
    new URL("../wrangler.jsonc", import.meta.url),
    JSON.stringify(cfg, null, 2) + "\n",
  );
  console.log(
    "\nBackup criado: " +
      filename +
      "\nWorker preservado: " +
      cfg.name +
      "\nD1 preservado: " +
      database.database_name,
  );
  console.log(
    "A versão do sistema será 4.0; o nome do Worker permanece para manter a URL.",
  );
  console.log(
    "Desconecte o build automático do código antigo no painel Cloudflare. Execute npm run db:remote, npm run security:setup e npm run deploy.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
