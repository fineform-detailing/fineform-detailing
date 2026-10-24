import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import { scriptPolicies } from "../../services/api/generated/csp.mjs";
import { securityHeaders } from "../../services/api/src/infrastructure/security.mjs";
const routes = [
  "",
  "atendimento",
  "acompanhar",
  "assinatura",
  "avaliar",
  "painel",
  "links",
  "privacidade",
  "termos",
  "cancelamento-e-reembolso",
  "cookies",
  "acessibilidade",
  "informacoes",
  "creditos",
];
for (const route of routes)
  test(
    "Next.js exports React route /" +
      route +
      " with local assets and a strict hydration CSP",
    async () => {
      const html = await readFile(
        "dist/" + (route ? route + "/" : "") + "index.html",
        "utf8",
      );
      const d = new JSDOM(html, {
        url: "https://fine-form.test/" + route + "/",
      }).window.document;
      assert.equal(d.documentElement.lang, "pt-BR");
      assert.equal(d.querySelectorAll("main").length, 1);
      assert.ok(d.querySelector("main[id=conteudo]"));
      assert.equal(d.querySelectorAll("img:not([alt])").length, 0);
      assert.ok(
        d.querySelector('script[src^="/_next/"]'),
        "framework runtime is loaded",
      );
      assert.equal(d.querySelector('script[src*="assets/app.mjs"]'), null);
      assert.equal(d.querySelector("iframe"), null);
      for (const node of d.querySelectorAll(
        "script[src],link[rel=stylesheet],img[src]",
      )) {
        const path = node.getAttribute("src") || node.getAttribute("href");
        if (path.startsWith("/")) await access("dist" + path);
      }
      const key = "/" + (route ? route + "/" : "");
      const response = securityHeaders(
        new Request("https://fine-form.test" + key),
        new Response(html),
        {
          privatePage: [
            "acompanhar",
            "assinatura",
            "avaliar",
            "painel",
          ].includes(route),
        },
      );
      const csp = response.headers.get("Content-Security-Policy");
      assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));
      for (const script of d.querySelectorAll("script:not([src])")) {
        if (!script.textContent.trim()) continue;
        const hash =
          "'sha256-" +
          createHash("sha256").update(script.textContent).digest("base64") +
          "'";
        assert.ok(scriptPolicies[key].includes(hash));
        assert.ok(csp.includes(hash));
      }
      if (["acompanhar", "assinatura", "avaliar", "painel"].includes(route)) {
        assert.match(response.headers.get("Cache-Control"), /no-store/);
        assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
      }
      if (
        [
          "privacidade",
          "termos",
          "cookies",
          "cancelamento-e-reembolso",
          "acessibilidade",
          "informacoes",
          "creditos",
        ].includes(route)
      ) {
        assert.equal(d.querySelectorAll("h1").length, 1);
        assert.ok(d.querySelector("nav a[aria-current=page]"));
        assert.ok(d.querySelector('footer a[href="/privacidade/"]'));
      }
      assert.doesNotMatch(
        d.querySelector("main").textContent,
        /preparação para inauguração|atendimento ainda não começou/i,
      );
    },
  );
test("the production export contains no legacy browser controllers, secrets or editable source templates", async () => {
  const names = await readdir("dist/assets");
  for (const name of names) assert.ok(!name.endsWith(".mjs"), name);
  assert.ok(!names.some((n) => n.endsWith(".ttf")));
  await assert.rejects(access("dist/.dev.vars"));
  await assert.rejects(access("dist/assets/admin.mjs"));
});
test("independent web service stays internal and the existing gateway preserves DB/realtime identity", async () => {
  const api = JSON.parse(await readFile("wrangler.jsonc", "utf8")),
    web = JSON.parse(await readFile("services/web/wrangler.jsonc", "utf8"));
  assert.equal(api.name, "fine-form-3-0");
  assert.equal(
    api.d1_databases[0].database_id,
    "e4a5ca12-b6f6-416f-b57e-f0c389161c23",
  );
  assert.equal(api.durable_objects.bindings[0].class_name, "LiveUpdates");
  assert.equal(api.services[0].service, web.name);
  assert.equal(web.workers_dev, false);
  assert.equal(web.preview_urls, false);
  assert.equal(api.assets.run_worker_first, true);
});
