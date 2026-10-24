import "./setup";
import React from "react";
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  render,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel } from "miniflare";
import { applyMigrations } from "../helpers/database.mjs";
import { AppProvider } from "../../apps/web/src/components/layout/AppProvider";
import { BookingView } from "../../apps/web/src/features/booking/BookingView";
import { AdminView } from "../../apps/web/src/features/admin/AdminView";
import { MembershipView } from "../../apps/web/src/features/membership/MembershipView";
import { TrackingView } from "../../apps/web/src/features/tracking/TrackingView";
import { ReviewView } from "../../apps/web/src/features/reviews/ReviewView";
import {
  GallerySection,
  CareFolder,
} from "../../apps/web/src/features/home/HomeSections";
import { PrivacySettingsButton } from "../../apps/web/src/components/layout/PrivacySettingsButton";
import { CustomerEditor } from "../../apps/web/src/features/admin/AdminEditors";
import { Notifications } from "../../apps/web/src/features/admin/AdminLists";
import {
  sanitizeSelection,
  emptySelection,
  toggleAddon,
} from "../../apps/web/src/features/booking/booking.model";
import { quoteFor, todaySP } from "../../packages/domain/catalog.mjs";
import { admin as adminApi } from "../../apps/web/src/services/api";
import { pushId, keyBytes } from "../../apps/web/src/services/notifications";
import {
  digest,
  REAUTH_SECONDS,
} from "../../services/api/src/infrastructure/security.mjs";
import { clearAdminSession } from "../../apps/web/src/services/http.mjs";
let mf: Miniflare,
  db: Awaited<ReturnType<Miniflare["getD1Database"]>>,
  cookie = "",
  csrf = "",
  ip = 1,
  loseNextResponse = false;
let override:
  ((path: string, options: RequestInit) => Promise<Response> | null) | null =
  null;
const key = "react-integration-key-at-least-32-characters";
let quoteId = "",
  quoteToken = "",
  subscriptionId = "",
  portalToken = "";
before(async () => {
  const source = await build({
    entryPoints: ["services/api/src/http/worker.mjs"],
    bundle: true,
    format: "esm",
    write: false,
  });
  mf = new Miniflare({
    modules: true,
    script: source.outputFiles[0].text,
    compatibilityDate: "2026-07-30",
    cf: false,
    bindings: { ADMIN_KEY: key },
    d1Databases: { DB: "react-end-to-end" },
    durableObjects: { LIVE: { className: "LiveUpdates", useSQLite: true } },
    log: new Log(LogLevel.ERROR),
  });
  db = await mf.getD1Database("DB");
  await applyMigrations(db);
  globalThis.fetch = async (
    path: RequestInfo | URL,
    options: RequestInit = {},
  ) => {
    const route = String(path);
    const custom = override?.(route, options);
    if (custom) return custom;
    const headers = new Headers(options.headers);
    headers.set("Origin", location.origin);
    headers.set("CF-Connecting-IP", "192.0.2." + ip++);
    if (cookie) headers.set("Cookie", cookie);
    const response = await mf.dispatchFetch(
      new URL(route, location.href).href,
      { ...options, headers },
    );
    const set = response.headers.get("Set-Cookie");
    if (set) {
      cookie = set.split(";")[0];
      const data = (await response.clone().json()) as { csrfToken?: string };
      if (data.csrfToken) csrf = data.csrfToken;
    }
    if (
      loseNextResponse &&
      route === "/api/quotes" &&
      options.method === "POST"
    ) {
      loseNextResponse = false;
      throw Error("A resposta se perdeu. Tente novamente.");
    }
    return response;
  };
});
afterEach(() => {
  cleanup();
  override = null;
  Object.defineProperty(window, "isSecureContext", {
    value: false,
    configurable: true,
  });
  history.replaceState(null, "", "/");
  clearAdminSession();
});
after(async () => {
  await mf.dispose();
});
function page(node: React.ReactNode) {
  return render(<AppProvider>{node}</AppProvider>);
}
async function backend(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  token = "",
) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-FF-CSRF": csrf } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.ok, true, JSON.stringify(data));
  return data;
}
function fill(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

test("React booking recovers a lost response without duplicates and preserves the original Care budget", async () => {
  history.replaceState(null, "", "/atendimento/");
  loseNextResponse = true;
  const p = page(<BookingView />);
  await waitFor(() =>
    assert.equal(
      (p.getByRole("button", { name: "Continuar →" }) as HTMLButtonElement)
        .disabled,
      false,
    ),
  );
  fill(p.getByLabelText("Qual é a marca e o modelo? *"), "Honda Civic React");
  fireEvent.click(p.getByRole("button", { name: "Continuar →" }));
  fireEvent.click(p.getByRole("button", { name: "Care mensal" }));
  fireEvent.click(p.getByRole("button", { name: "Continuar →" }));
  fireEvent.click(p.getByRole("button", { name: "Continuar →" }));
  fireEvent.click(p.getByRole("button", { name: "Continuar →" }));
  fill(p.getByLabelText("Como podemos chamar você? *"), "Cliente React");
  fill(p.getByLabelText("Seu WhatsApp com DDD *"), "11900000123");
  fireEvent.click(p.getByLabelText(/Entendo que envio uma solicitação/));
  fireEvent.click(
    p.getByRole("button", { name: "Enviar solicitação de orçamento ↗" }),
  );
  await p.findByText("A resposta se perdeu. Tente novamente.");
  assert.equal(
    (p.getByLabelText("Como podemos chamar você? *") as HTMLInputElement).value,
    "Cliente React",
  );
  const pending = JSON.parse(sessionStorage.getItem("ff-pending-submission")!);
  assert.equal(pending.token.length, 43);
  fireEvent.click(
    p.getByRole("button", { name: "Enviar solicitação de orçamento ↗" }),
  );
  await p.findByText("Sua solicitação foi recebida.");
  const link = new URL(
    (p.getByRole("link", { name: "Acompanhar pedido ↗" }) as HTMLAnchorElement)
      .href,
  );
  quoteId = link.searchParams.get("id")!;
  quoteToken = new URLSearchParams(link.hash.slice(1)).get("t")!;
  assert.equal(quoteToken, pending.token);
  assert.equal(sessionStorage.getItem("ff-pending-submission"), null);
  assert.equal(localStorage.getItem("ff-orders-v2"), null);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) n FROM quotes").first<{ n: number }>())!
      .n,
    1,
  );
  const q = await backend(
    "/api/quotes/" + quoteId,
    undefined,
    "GET",
    quoteToken,
  );
  assert.equal(q.quote.budget.total, 260);
  assert.equal(q.quote.status, "pending");
  assert.equal(q.quote.plate, null);
});

test("React admin logs in, registers the physical vehicle, accepts a quote and activates paid Care", async () => {
  history.replaceState(null, "", "/painel/");
  const p = page(<AdminView />);
  fill(await p.findByLabelText("Chave do painel"), key);
  fireEvent.click(p.getByRole("button", { name: "Abrir painel ↗" }));
  fireEvent.click(await p.findByRole("button", { name: "Pedidos" }));
  await p.findByText("Cliente React");
  fireEvent.click(p.getByRole("button", { name: "Gerenciar ↗" }));
  const d = await p.findByRole("dialog");
  const modal = within(d);
  fill(await modal.findByLabelText("Placa que conferi no veículo"), "ABC1D23");
  fill(
    modal.getByLabelText("Motivo do cadastro ou da correção"),
    "Conferência presencial de teste",
  );
  fireEvent.click(
    modal.getByLabelText("Conferi esta placa pessoalmente no veículo."),
  );
  fireEvent.click(modal.getByRole("button", { name: "Salvar placa" }));
  await waitFor(() => assert.ok(modal.getAllByText("ABC1D23").length));
  fill(modal.getByLabelText("Status"), "accepted");
  fireEvent.click(modal.getByRole("button", { name: "Salvar atualização ↗" }));
  await modal.findByText("Ativar este Care.");
  fireEvent.click(
    modal.getByLabelText("Recebi o pagamento deste ciclo e conferi o valor."),
  );
  fireEvent.click(modal.getByRole("button", { name: "Ativar após pagamento" }));
  const link = await modal.findByRole("link", {
    name: /http:\/\/localhost:3000\/assinatura/,
  });
  const url = new URL((link as HTMLAnchorElement).href);
  subscriptionId = url.searchParams.get("id")!;
  portalToken = new URLSearchParams(url.hash.slice(1)).get("t")!;
  assert.equal(
    (await db
      .prepare("SELECT COUNT(*) n FROM subscriptions")
      .first<{ n: number }>())!.n,
    1,
  );
  const s = await backend(
    "/api/subscriptions/" + subscriptionId,
    undefined,
    "GET",
    portalToken,
  );
  assert.equal(s.subscription.plate, "ABC1D23");
  assert.equal(s.subscription.cycle.credits.premium.available, 1);
});

test("React customer tracking keeps the original private link and opens the Care created by that quote", async () => {
  history.replaceState(
    null,
    "",
    "/acompanhar/?id=" + quoteId + "#t=" + quoteToken,
  );
  const p = page(<TrackingView />);
  await p.findByText("Olá, Cliente React.");
  assert.ok(p.getAllByText(/ABC1D23/).length);
  const link = p.getByRole("link", {
    name: "Ver meu Fine Form Care ↗",
  }) as HTMLAnchorElement;
  assert.match(link.href, new RegExp(subscriptionId));
  assert.ok(link.href.endsWith("#t=" + quoteToken));
});

test("React Care requests an included wash at zero cost and keeps observations during live refresh", async () => {
  history.replaceState(
    null,
    "",
    "/assinatura/?id=" + subscriptionId + "#t=" + portalToken,
  );
  const p = page(<MembershipView />);
  await p.findByText("Seu próximo cuidado.");
  await waitFor(() =>
    assert.equal(
      (
        p.getByRole("button", {
          name: "Solicitar esta visita ↗",
        }) as HTMLButtonElement
      ).disabled,
      false,
    ),
  );
  fill(p.getByLabelText("Observações (opcional)"), "Manter esta observação.");
  fireEvent.click(p.getByRole("button", { name: "Atualizar saldo" }));
  await waitFor(() =>
    assert.equal(
      (p.getByLabelText("Observações (opcional)") as HTMLTextAreaElement).value,
      "Manter esta observação.",
    ),
  );
  fireEvent.click(
    p.getByLabelText(
      "Solicito esta visita e entendo que o saldo será reservado quando Mateus aceitar.",
    ),
  );
  fireEvent.click(p.getByRole("button", { name: "Solicitar esta visita ↗" }));
  const link = await p.findByRole("link", { name: "Acompanhar visita ↗" });
  const url = new URL((link as HTMLAnchorElement).href),
    id = url.searchParams.get("id")!,
    token = new URLSearchParams(url.hash.slice(1)).get("t")!;
  const data = await backend("/api/quotes/" + id, undefined, "GET", token);
  assert.equal(data.quote.budget.total, 0);
  assert.equal(data.quote.notes, "Manter esta observação.");
  assert.equal(data.quote.plate, "ABC1D23");
});

test("paused Care explains why requests are blocked and does not present a stuck submit button", async () => {
  const detail = await backend("/api/admin/subscriptions/" + subscriptionId);
  await backend(
    "/api/admin/subscriptions/" + subscriptionId,
    { version: detail.subscription.version, status: "paused" },
    "PATCH",
  );
  history.replaceState(
    null,
    "",
    "/assinatura/?id=" + subscriptionId + "#t=" + portalToken,
  );
  const p = page(<MembershipView />);
  await p.findByText(/Seu Care está pausado/);
  assert.equal(
    (
      p.getByRole("button", {
        name: "Solicitar esta visita ↗",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  const updated = await backend("/api/admin/subscriptions/" + subscriptionId);
  await backend(
    "/api/admin/subscriptions/" + subscriptionId,
    { version: updated.subscription.version, status: "active" },
    "PATCH",
  );
});

test("React review accepts a low rating, preserves comment after failure and escapes submitted markup", async () => {
  const detail = await backend("/api/admin/quotes/" + quoteId);
  await backend(
    "/api/admin/quotes/" + quoteId,
    { version: detail.quote.version, status: "completed" },
    "PATCH",
  );
  history.replaceState(
    null,
    "",
    "/avaliar/?id=" + quoteId + "#t=" + quoteToken,
  );
  let fail = true;
  override = (path, options) =>
    path.endsWith("/review") && options.method === "POST" && fail
      ? ((fail = false),
        Promise.resolve(
          Response.json(
            { error: "Falha temporária de teste" },
            { status: 503 },
          ),
        ))
      : null;
  const p = page(<ReviewView />);
  await p.findByText("Como foi seu cuidado, Cliente?");
  fireEvent.click(
    p.getByRole("radio", { name: "1 de 5 estrelas · Deixou a desejar" }),
  );
  fill(
    p.getByLabelText("Quer contar mais? (opcional)"),
    "<img src=x onerror=alert(1)>",
  );
  fireEvent.click(
    p.getByLabelText(
      "Autorizo a publicação da minha nota, comentário e primeiro nome no site da Fine Form.",
    ),
  );
  fireEvent.click(
    p.getByRole("button", { name: "Publicar minha avaliação ↗" }),
  );
  await p.findByText("Falha temporária de teste");
  assert.equal(
    (p.getByLabelText("Quer contar mais? (opcional)") as HTMLTextAreaElement)
      .value,
    "<img src=x onerror=alert(1)>",
  );
  fireEvent.click(
    p.getByRole("button", { name: "Publicar minha avaliação ↗" }),
  );
  await p.findByText("Obrigado pelo seu olhar, Cliente.");
  assert.equal(p.container.querySelector("img"), null);
  assert.ok(p.getByText("<img src=x onerror=alert(1)>"));
  fireEvent.click(
    p.getByRole("button", { name: "Retirar autorização de publicação" }),
  );
  await p.findByText("Autorização retirada.");
});

test("React gallery handles keyboard and horizontal swipe; folder opens by touch and Escape closes it", () => {
  const p = page(
    <>
      <GallerySection />
      <CareFolder />
    </>,
  );
  const photo = p.getByRole("button", { name: "Próxima foto de cuidado" });
  fireEvent.keyDown(photo, { key: "ArrowRight" });
  assert.ok(p.getByText("De dentro para fora."));
  fireEvent.touchStart(photo, { touches: [{ clientX: 180, clientY: 50 }] });
  fireEvent.touchEnd(photo, { changedTouches: [{ clientX: 20, clientY: 55 }] });
  assert.ok(p.getByText("Também em duas rodas."));
  fireEvent.touchStart(photo, { touches: [{ clientX: 80, clientY: 30 }] });
  fireEvent.touchEnd(photo, {
    changedTouches: [{ clientX: 90, clientY: 170 }],
  });
  assert.ok(p.getByText("Também em duas rodas."));
  const folder = p.getByRole("button", {
    name: "Ver os itens do resumo: veículo, cuidado e data e horário",
  });
  fireEvent.click(folder);
  assert.equal(folder.getAttribute("aria-expanded"), "true");
  fireEvent.keyDown(folder, { key: "Escape" });
  assert.equal(folder.getAttribute("aria-expanded"), "false");
});

test("React privacy settings clear only optional device data and never invent marketing consent", () => {
  localStorage.setItem("ff-care-draft-v1", "{}");
  localStorage.setItem("ff-orders-v2", "[]");
  const p = page(
    <PrivacySettingsButton>Preferências de privacidade</PrivacySettingsButton>,
  );
  fireEvent.click(
    p.getByRole("button", { name: "Preferências de privacidade" }),
  );
  const d = p.getByRole("dialog");
  assert.equal(d.querySelectorAll("input").length, 0);
  fireEvent.click(
    p.getByRole("button", { name: "Apagar rascunhos e links deste aparelho" }),
  );
  assert.equal(localStorage.getItem("ff-care-draft-v1"), null);
  assert.equal(localStorage.getItem("ff-orders-v2"), null);
});

test("domain model discards legacy plate drafts and keeps ceramic plastic complement pricing", () => {
  const s = sanitizeSelection({
    ...emptySelection(),
    plate: "ABC1D23",
    plateVerified: true,
  });
  assert.equal(s.plate, undefined);
  assert.equal(s.plateVerified, undefined);
  const extra = toggleAddon(
    { ...s, service: "extra" },
    "plasticCoating",
    "extras",
  );
  const b = quoteFor(extra);
  assert.equal(b.total, 1740);
  assert.ok(!extra.extras.includes("exteriorPlastic"));
});

test("React admin requests recent confirmation and resumes the same activation once", async () => {
  history.replaceState(null, "", "/painel/");
  const p = page(<AdminView />);
  fireEvent.click(await p.findByRole("button", { name: "Assinaturas" }));
  fireEvent.click(await p.findByRole("button", { name: "Cadastrar Care ↗" }));
  const d = within(p.getByRole("dialog"));
  fill(d.getByLabelText("Cliente"), "Confirmação React");
  fill(d.getByLabelText("WhatsApp com DDD"), "11900000456");
  fill(d.getByLabelText("Marca e modelo do veículo"), "Toyota React");
  fill(d.getByLabelText("Placa que conferi no veículo"), "DEF2G34");
  fireEvent.click(
    d.getByLabelText("Conferi esta placa pessoalmente no veículo."),
  );
  fireEvent.click(
    d.getByLabelText("Recebi o pagamento deste ciclo e conferi o valor."),
  );
  const oldCookie = cookie;
  await db
    .prepare("UPDATE admin_sessions SET authenticated_at=? WHERE id=?")
    .bind(
      Math.floor(Date.now() / 1000) - REAUTH_SECONDS - 1,
      await digest(cookie.split("=")[1]),
    )
    .run();
  fireEvent.click(d.getByRole("button", { name: "Ativar assinatura ↗" }));
  await p.findByText("Confirme seu acesso.");
  const dialogs = p.getAllByRole("dialog");
  const auth = within(dialogs[dialogs.length - 1]);
  fill(auth.getByLabelText("Chave do painel"), key);
  fireEvent.click(auth.getByRole("button", { name: "Abrir painel ↗" }));
  await p.findByText("Link privado do cliente");
  assert.notEqual(cookie, oldCookie);
  assert.equal(
    (await db
      .prepare(
        "SELECT COUNT(*) n FROM subscriptions s JOIN customers c ON c.id=s.customer_id WHERE c.phone='5511900000456'",
      )
      .first<{ n: number }>())!.n,
    1,
  );
});

test("React session expiry removes private records and requires login again", async () => {
  history.replaceState(null, "", "/painel/?pedido=" + quoteId);
  const p = page(<AdminView />);
  await p.findByRole("dialog");
  await p.findByText("Pedido de cuidado.");
  await db.prepare("DELETE FROM admin_sessions").run();
  await act(async () => {
    await adminApi.dashboard().catch(() => {});
  });
  await p.findByLabelText("Chave do painel");
  assert.equal(p.queryByRole("dialog"), null);
  assert.equal(p.queryByText("Cliente React"), null);
});

function mockPush({
  deny = false,
  fail = false,
}: { deny?: boolean; fail?: boolean } = {}) {
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  let permissionCalls = 0,
    subscriptions = 0,
    unsubscribes = 0,
    posts = 0,
    tests = 0;
  let current: Record<string, unknown> | null = null;
  let devices: { id: string; label: string }[] = [];
  const publicKey = btoa(String.fromCharCode(4, ...new Array(64).fill(1)));
  const endpoint = "https://fcm.googleapis.com/fcm/send/react-test-device";
  const permission = async () => {
    permissionCalls++;
    return deny ? "denied" : "granted";
  };
  const NotificationMock = {
    permission: "default",
    requestPermission: permission,
  };
  Object.defineProperty(window, "Notification", {
    value: NotificationMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, "Notification", {
    value: NotificationMock,
    configurable: true,
  });
  Object.defineProperty(window, "PushManager", {
    value: class {},
    configurable: true,
  });
  const registration = {
    active: {},
    pushManager: {
      getSubscription: async () => current,
      subscribe: async () => {
        subscriptions++;
        current = {
          endpoint,
          options: { applicationServerKey: keyBytes(publicKey).buffer },
          toJSON: () => ({ endpoint, keys: { auth: "test", p256dh: "test" } }),
          unsubscribe: async () => {
            unsubscribes++;
            current = null;
            return true;
          },
        };
        return current;
      },
    },
  };
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      getRegistration: async () => registration,
      register: async () => registration,
      addEventListener() {},
      removeEventListener() {},
    },
    configurable: true,
  });
  override = (path, options) => {
    if (!path.startsWith("/api/admin/notifications")) return null;
    return (async () => {
      if (options.method === "POST" && path.endsWith("/subscription")) {
        posts++;
        if (fail) {
          fail = false;
          return Response.json(
            { error: "Cadastro de teste indisponível" },
            { status: 503 },
          );
        }
        devices = [
          { id: await pushId(endpoint), label: "<img src=x onerror=alert(1)>" },
        ];
        return Response.json({ ok: true });
      }
      if (options.method === "DELETE") {
        devices = [];
        return Response.json({ ok: true });
      }
      if (path.endsWith("/test")) {
        tests++;
        return Response.json({ ok: true });
      }
      return Response.json({
        configured: true,
        publicKey,
        maximum: 3,
        devices,
      });
    })();
  };
  return {
    stats: () => ({
      permissionCalls,
      subscriptions,
      unsubscribes,
      posts,
      tests,
    }),
  };
}

test("React notifications request permission only on tap, escape labels, and support test/revoke", async () => {
  const mock = mockPush();
  const p = page(<Notifications />);
  const enable = await p.findByRole("button", {
    name: "Ativar notificações neste aparelho",
  });
  await waitFor(() =>
    assert.equal((enable as HTMLButtonElement).disabled, false),
  );
  assert.equal(mock.stats().permissionCalls, 0);
  fireEvent.click(enable);
  const test = await p.findByRole("button", {
    name: "Enviar notificação de teste",
  });
  assert.equal(mock.stats().permissionCalls, 1);
  assert.equal(p.container.querySelector("img"), null);
  assert.ok(p.getByText(/<img src=x onerror=alert/));
  fireEvent.click(test);
  await waitFor(() => assert.equal(mock.stats().tests, 1));
  await waitFor(() =>
    assert.equal(
      (
        p.getByRole("button", {
          name: "Desativar neste aparelho",
        }) as HTMLButtonElement
      ).disabled,
      false,
    ),
  );
  fireEvent.click(p.getByRole("button", { name: "Desativar neste aparelho" }));
  await p.findByRole("button", { name: "Ativar notificações neste aparelho" });
  assert.equal(mock.stats().unsubscribes, 1);
});

test("React notification registration rolls back a newly created subscription and permits retry", async () => {
  const mock = mockPush({ fail: true });
  const p = page(<Notifications />);
  const button = await p.findByRole("button", {
    name: "Ativar notificações neste aparelho",
  });
  await waitFor(() =>
    assert.equal((button as HTMLButtonElement).disabled, false),
  );
  fireEvent.click(button);
  await p.findByText("Cadastro de teste indisponível");
  assert.equal(mock.stats().unsubscribes, 1);
  fireEvent.click(
    p.getByRole("button", { name: "Ativar notificações neste aparelho" }),
  );
  await p.findByRole("button", { name: "Enviar notificação de teste" });
  assert.equal(mock.stats().posts, 2);
  assert.equal(mock.stats().subscriptions, 2);
});

test("denied notification permission never subscribes a device or posts consent to the API", async () => {
  const mock = mockPush({ deny: true });
  const p = page(<Notifications />);
  const button = await p.findByRole("button", {
    name: "Ativar notificações neste aparelho",
  });
  await waitFor(() =>
    assert.equal((button as HTMLButtonElement).disabled, false),
  );
  fireEvent.click(button);
  await p.findByText(
    "A permissão não foi concedida. Confira os ajustes do navegador.",
  );
  assert.equal(mock.stats().subscriptions, 0);
  assert.equal(mock.stats().posts, 0);
});

test("customer deletion refreshes stale counts and requires a second decision after a concurrent visit", async () => {
  await adminApi.login({ key });
  const row = await db
    .prepare(
      "SELECT id,customer_id FROM subscriptions WHERE model='Toyota React'",
    )
    .first<{ id: string; customer_id: string }>();
  assert.ok(row);
  let closed = false;
  const p = page(
    <CustomerEditor
      id={row.customer_id}
      changed={() => {}}
      close={() => {
        closed = true;
      }}
    />,
  );
  await p.findByText("Confirmação React");
  assert.ok(p.getByText("0 lavagem(ns)"));
  const detail = await backend("/api/admin/subscriptions/" + row.id);
  await backend("/api/admin/subscriptions/" + row.id + "/visits", {
    cycleId: detail.subscription.cycle.id,
    kind: "premium",
    date: todaySP(),
    status: "completed",
    checkedPlate: "DEF2G34",
    operationId: crypto.randomUUID(),
  });
  fireEvent.click(
    p.getByRole("button", { name: "Excluir cliente e registros" }),
  );
  await p.findByText("1 lavagem(ns)");
  assert.equal(closed, false);
  assert.ok(
    await db
      .prepare("SELECT id FROM customers WHERE id=?")
      .bind(row.customer_id)
      .first(),
  );
  fireEvent.click(
    p.getByRole("button", { name: "Excluir cliente e registros" }),
  );
  await waitFor(() => assert.equal(closed, true));
  assert.equal(
    await db
      .prepare("SELECT id FROM customers WHERE id=?")
      .bind(row.customer_id)
      .first(),
    null,
  );
  assert.ok(
    await db
      .prepare("SELECT id FROM customers WHERE phone='5511900000123'")
      .first(),
  );
});
