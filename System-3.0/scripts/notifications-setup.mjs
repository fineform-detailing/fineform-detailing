import { webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { config, databaseReady, wrangler } from "./cloudflare.mjs";

export function notificationOrigin(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw Error("Informe a URL HTTPS do site publicado.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw Error(
      "Use somente a origem HTTPS do site, por exemplo https://seu-site.workers.dev.",
    );
  return url.origin;
}
export async function generateVapid(origin) {
  origin = notificationOrigin(origin);
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const key = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
  const publicKey = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(key.x, "base64url"),
    Buffer.from(key.y, "base64url"),
  ]).toString("base64url");
  return { origin, subject: origin + "/", publicKey, privateKey: key.d };
}
export function notificationCron(cfg) {
  const list = cfg.triggers?.crons ?? [];
  if (!Array.isArray(list) || list.some((value) => typeof value !== "string"))
    throw Error("Confira triggers.crons no wrangler.jsonc.");
  if (!list.includes("* * * * *") && list.length >= 3)
    throw Error(
      "Já há três horários agendados. Ajuste a configuração de Cron antes de habilitar as notificações.",
    );
  return {
    ...cfg,
    triggers: { ...cfg.triggers, crons: [...new Set([...list, "* * * * *"])] },
  };
}
function putSecret(value) {
  const cli = fileURLToPath(
    new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [cli, "secret", "put", "PUSH_VAPID"],
    {
      input: JSON.stringify(value) + "\n",
      stdio: ["pipe", "inherit", "inherit"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      "A chave de notificações não foi gravada. Confira a mensagem do Cloudflare.",
    );
}
export async function setupNotifications() {
  const args = process.argv.slice(2);
  let origin = null,
    rotate = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1])
      origin = notificationOrigin(args[++i]);
    else if (args[i] === "--rotate") rotate = true;
    else
      throw Error(
        "Use npm.cmd run notifications:setup ou acrescente -- --url URL_HTTPS.",
      );
  }
  const cfg = config();
  if (!databaseReady(cfg))
    throw Error(
      "Abra o projeto que já está conectado ao seu D1 em wrangler.jsonc.",
    );
  const updated = notificationCron(cfg),
    secrets = JSON.parse(wrangler(["secret", "list"], { capture: true })),
    existing = secrets.some((item) => item.name === "PUSH_VAPID");
  if (!existing || rotate) {
    if (!origin) {
      const terminal = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        origin = notificationOrigin(
          await terminal.question(
            "URL HTTPS que você usa para abrir o site (sem /painel): ",
          ),
        );
      } finally {
        terminal.close();
      }
    }
    putSecret(await generateVapid(origin));
    console.log(
      rotate
        ? "Chave de notificações renovada. Reative os avisos em cada aparelho."
        : "Chave de notificações configurada no Worker.",
    );
  } else console.log("A chave de notificações existente foi preservada.");
  writeFileSync(
    new URL("../wrangler.jsonc", import.meta.url),
    JSON.stringify(updated, null, 2) + "\n",
  );
  console.log(
    "Recuperação automática da fila configurada. Publique com npm.cmd run deploy e ative os avisos no painel do celular.",
  );
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  setupNotifications().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
