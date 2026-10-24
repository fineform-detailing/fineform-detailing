import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import {
  readOrders,
  rememberOrder,
  readDraft,
  clearSavedData,
  DRAFT_TTL,
  LINK_TTL,
} from "../packages/domain/privacy-storage.mjs";
const storage = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
};
const id = "7baf190e-60d5-43a1-b456-3705af141bb4",
  token = "A".repeat(43);

test("links privados exigem escolha explícita, expiram e não renovam silenciosamente", () => {
  const s = storage(),
    timestamp = 1700000000000;
  assert.equal(rememberOrder(s, id, token, "FF-EXEMPLO", { timestamp }), false);
  assert.equal(s.getItem("ff-orders-v2"), null);
  assert.equal(
    rememberOrder(s, id, token, "FF-EXEMPLO", { remember: true, timestamp }),
    true,
  );
  assert.equal(readOrders(s, timestamp)[0].expiresAt, timestamp + LINK_TTL);
  assert.equal(
    rememberOrder(s, id, token, "FF-EXEMPLO", { timestamp: timestamp + 1000 }),
    true,
  );
  assert.equal(
    readOrders(s, timestamp + 1000)[0].expiresAt,
    timestamp + LINK_TTL,
  );
  assert.deepEqual(readOrders(s, timestamp + LINK_TTL), []);
  assert.equal(s.getItem("ff-orders-v2"), null);
});
test("dados locais antigos ganham prazo e rascunhos expirados são removidos", () => {
  const s = storage(),
    timestamp = 1700000000000;
  s.setItem(
    "ff-orders-v2",
    JSON.stringify([
      { id, token, reference: "FF-ANTIGO", phone: "não deve permanecer" },
    ]),
  );
  assert.equal(readOrders(s, timestamp)[0].expiresAt, timestamp + LINK_TTL);
  assert.ok(!s.getItem("ff-orders-v2").includes("phone"));
  s.setItem("ff-care-draft-v1", JSON.stringify({ model: "Civic" }));
  assert.equal(readDraft(s, timestamp).model, "Civic");
  assert.equal(
    JSON.parse(s.getItem("ff-care-draft-v1")).expiresAt,
    timestamp + DRAFT_TTL,
  );
  assert.equal(readDraft(s, timestamp + DRAFT_TTL), null);
  assert.equal(clearSavedData(s), true);
  assert.equal(s.getItem("ff-orders-v2"), null);
});
test("texto e foco da camada de privacidade têm contraste AA nas superfícies utilizadas", () => {
  const lum = (hex) => {
    const rgb = hex
      .match(/[0-9a-f]{2}/gi)
      .map((n) => parseInt(n, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const ratio = (a, b) =>
    (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const [foreground, background] of [
    ["0b0d0c", "53c3b1"],
    ["37483f", "e9f6f2"],
    ["4e5848", "ffffff"],
    ["17594f", "ffffff"],
  ])
    assert.ok(
      ratio(foreground, background) >= 4.5,
      foreground + " / " + background,
    );
  assert.ok(ratio("176359", "ffffff") >= 3);
});

test("foco e bordas de contraste prevalecem sobre os estilos anteriores do formulário", async () => {
  const dom = new JSDOM(
      '<!doctype html><html lang="pt-BR"><head></head><body data-design="kinetic" data-page="booking"><section class="booking-panel"><label class="field"><span>Modelo</span><input id="model"></label></section></body></html>',
      { pretendToBeVisual: true },
    ),
    w = dom.window;
  for (const name of [
    "style",
    "editorial",
    "clean",
    "studio",
    "system",
    "compliance",
  ]) {
    const style = w.document.createElement("style");
    style.textContent = await readFile(
      "apps/web/src/styles/" + name + ".css",
      "utf8",
    );
    w.document.head.append(style);
  }
  const input = w.document.getElementById("model");
  input.focus();
  const style = w.getComputedStyle(input);
  assert.equal(style.borderTopColor, "rgb(116, 125, 114)");
  assert.match(style.outline, /#176359/);
  assert.match(style.outline, /3px/);
  w.close();
});

test("o cabeçalho da página inicial preserva contraste após carregar os estilos do assistente", async () => {
  const dom = new JSDOM(
      '<!doctype html><html><head></head><body data-design="kinetic" data-page="home"><header class="site-header"><nav class="nav-links"><a href="#cuidados">Cuidados</a></nav></header></body></html>',
      { pretendToBeVisual: true },
    ),
    w = dom.window;
  for (const name of [
    "style",
    "editorial",
    "clean",
    "studio",
    "system",
    "compliance",
  ]) {
    const style = w.document.createElement("style");
    style.textContent = await readFile(
      "apps/web/src/styles/" + name + ".css",
      "utf8",
    );
    w.document.head.append(style);
  }
  assert.equal(
    w.getComputedStyle(w.document.querySelector(".nav-links a")).color,
    "rgb(78, 88, 72)",
  );
  w.close();
});
