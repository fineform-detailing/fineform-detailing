import { scriptPolicies } from "../../generated/csp.mjs";
import { fail } from "../domain/model.mjs";
const enc = new TextEncoder();
export const SESSION_SECONDS = 7200,
  IDLE_SECONDS = 1200,
  REAUTH_SECONDS = 600;
export const b64 = (v) =>
  btoa(String.fromCharCode(...new Uint8Array(v)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const unb64 = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
export const randomToken = () =>
  b64(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}
export function keyReady(env) {
  return (
    typeof env.ADMIN_KEY === "string" &&
    env.ADMIN_KEY.length >= 32 &&
    env.ADMIN_KEY.length <= 4096
  );
}
export function isLocal(req) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(req.url).hostname,
  );
}
export const mfaReady = (env) =>
  typeof env.ADMIN_TOTP_SECRET === "string" &&
  /^[A-Z2-7]{32}$/.test(env.ADMIN_TOTP_SECRET);
export function adminReady(req, env) {
  return keyReady(env) && (isLocal(req) || mfaReady(env));
}
async function key(env) {
  if (!keyReady(env))
    fail(503, "A configuração do painel ainda não foi concluída.");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(env.ADMIN_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function sign(data, env) {
  const payload = b64(enc.encode(JSON.stringify(data)));
  return (
    payload +
    "." +
    b64(await crypto.subtle.sign("HMAC", await key(env), enc.encode(payload)))
  );
}
export async function verify(value, env, type) {
  try {
    if (typeof value !== "string" || value.length > 2048) return null;
    const [payload, sig, extra] = value.split(".");
    if (!payload || !sig || extra) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(env),
      unb64(sig),
      enc.encode(payload),
    );
    if (!valid) return null;
    const data = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(unb64(payload)),
    );
    return data.type === type &&
      Number.isFinite(data.exp) &&
      data.exp > Date.now()
      ? data
      : null;
  } catch {
    return null;
  }
}
export function constantEqual(a, b) {
  const x = enc.encode(String(a)),
    y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
export const bearer = (req) => {
  const m = (req.headers.get("Authorization") || "").match(
    /^Bearer ([A-Za-z0-9_-]{43})$/,
  );
  return m?.[1] || "";
};
export function checkOrigin(
  req,
  { required = req.method !== "GET" && req.method !== "HEAD" } = {},
) {
  const origin = req.headers.get("Origin"),
    site = req.headers.get("Sec-Fetch-Site");
  if (
    site === "cross-site" ||
    site === "same-site" ||
    (origin && origin !== new URL(req.url).origin) ||
    (required && !origin)
  )
    fail(403, "Origem não autorizada. Abra o site diretamente.");
}
function cookieName(req) {
  return new URL(req.url).protocol === "https:"
    ? "__Host-ff_admin"
    : "ff_admin_dev";
}
export function sessionCookie(req, token, seconds = SESSION_SECONDS) {
  return (
    cookieName(req) +
    "=" +
    token +
    "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" +
    seconds +
    (new URL(req.url).protocol === "https:" ? "; Secure" : "")
  );
}
function cookieToken(req) {
  const name = cookieName(req),
    cookies = (req.headers.get("Cookie") || "")
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x.startsWith(name + "="));
  if (cookies.length !== 1) return "";
  const v = cookies[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(v) ? v : "";
}
async function fingerprint(env) {
  return digest(env.ADMIN_KEY + "\u0000" + (env.ADMIN_TOTP_SECRET || ""));
}
async function agent(req) {
  return digest((req.headers.get("User-Agent") || "").slice(0, 1024));
}
export async function csrfToken(session, env) {
  return b64(
    await crypto.subtle.sign(
      "HMAC",
      await key(env),
      enc.encode("csrf|" + session.id),
    ),
  );
}
export async function adminSession(req, env) {
  if (!adminReady(req, env)) return null;
  const token = cookieToken(req);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000),
    id = await digest(token);
  const session = await env.DB.prepare(
    "SELECT * FROM admin_sessions WHERE id=? AND expires_at>? AND last_seen>?",
  )
    .bind(id, now, now - IDLE_SECONDS)
    .first();
  if (
    !session ||
    !constantEqual(session.key_hash, await fingerprint(env)) ||
    !constantEqual(session.agent_hash, await agent(req)) ||
    session.audience !== new URL(req.url).host
  )
    return null;
  return session;
}
export async function isAdmin(req, env) {
  return Boolean(await adminSession(req, env));
}
export async function requireAdmin(
  req,
  env,
  { csrf = req.method !== "GET" && req.method !== "HEAD", recent = false } = {},
) {
  checkOrigin(req);
  const session = await adminSession(req, env);
  if (!session) fail(401, "Sua sessão terminou. Entre novamente no painel.");
  if (
    csrf &&
    !constantEqual(
      req.headers.get("X-FF-CSRF") || "",
      await csrfToken(session, env),
    )
  )
    fail(403, "Confirmação de segurança inválida. Reabra o painel.");
  if (
    recent &&
    Math.floor(Date.now() / 1000) - session.authenticated_at > REAUTH_SECONDS
  )
    fail(428, "Confirme seu acesso novamente antes desta operação.");
  // Polling must not keep an unattended panel alive.
  if (csrf || req.headers.get("X-FF-Activity") === "1")
    await env.DB.prepare("UPDATE admin_sessions SET last_seen=? WHERE id=?")
      .bind(Math.floor(Date.now() / 1000), session.id)
      .run();
  return session;
}
export async function createSession(req, env) {
  const token = randomToken(),
    id = await digest(token),
    now = Math.floor(Date.now() / 1000);
  const session = {
    id,
    key_hash: await fingerprint(env),
    agent_hash: await agent(req),
    audience: new URL(req.url).host,
    created_at: now,
    authenticated_at: now,
    last_seen: now,
    expires_at: now + SESSION_SECONDS,
  };
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM admin_sessions WHERE id IN (SELECT id FROM admin_sessions WHERE expires_at<=? OR last_seen<=? LIMIT 100)",
    ).bind(now, now - IDLE_SECONDS),
    env.DB.prepare(
      "INSERT INTO admin_sessions(id,key_hash,agent_hash,audience,created_at,authenticated_at,last_seen,expires_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(...Object.values(session)),
  ]);
  return { token, session, csrfToken: await csrfToken(session, env) };
}
export function base32Decode(value) {
  let bits = 0,
    buffer = 0,
    result = [];
  for (const c of value) {
    const v = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    if (v < 0) throw Error("Segredo do autenticador inválido.");
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >> bits) & 255);
    }
  }
  return new Uint8Array(result);
}
export async function totpCode(secret, step = Math.floor(Date.now() / 30000)) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(step));
  const k = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, bytes)),
    offset = mac[mac.length - 1] & 15;
  const n = new DataView(mac.buffer).getUint32(offset) & 0x7fffffff;
  return String(n % 1000000).padStart(6, "0");
}
export async function totpStep(secret, code, time = Date.now()) {
  if (!/^[0-9]{6}$/.test(code || "")) return null;
  const current = Math.floor(time / 30000);
  let found = null;
  for (const step of [current - 1, current, current + 1])
    if (constantEqual(await totpCode(secret, step), code)) found = step;
  return found;
}
export async function verifyCredentials(req, env, body) {
  if (!adminReady(req, env))
    fail(
      503,
      "Ative o autenticador do painel: execute npm run security:setup no projeto e publique novamente.",
    );
  const correct =
    typeof body.key === "string" &&
    body.key.length <= 4096 &&
    constantEqual(await digest(body.key), await digest(env.ADMIN_KEY));
  if (correct && mfaReady(env))
    await limit(req, env, "admin-second-factor", 12, 900, "all-operators");
  let step = null;
  if (mfaReady(env))
    step = await totpStep(
      env.ADMIN_TOTP_SECRET,
      typeof body.code === "string" ? body.code : "",
    );
  if (!correct || (mfaReady(env) && step === null))
    fail(401, "Chave ou código do autenticador inválido.");
  if (mfaReady(env)) {
    const result = await env.DB.prepare(
      "INSERT INTO mfa_counters(id,last_step) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET last_step=excluded.last_step WHERE mfa_counters.last_step<excluded.last_step RETURNING last_step",
    )
      .bind(await fingerprint(env), step)
      .all();
    if (!result.results.length)
      fail(401, "Aguarde um novo código do autenticador e tente novamente.");
  }
}
export async function jsonBody(req) {
  if (
    (req.headers.get("Content-Type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    fail(415, "Envie os dados em JSON.");
  if (
    req.headers.has("Content-Encoding") &&
    req.headers.get("Content-Encoding") !== "identity"
  )
    fail(415, "Formato de envio não autorizado.");
  if (Number(req.headers.get("Content-Length")) > 16384)
    fail(413, "Pedido muito grande.");
  const reader = req.body?.getReader();
  if (!reader) fail(400, "Pedido sem dados.");
  let size = 0,
    chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      fail(413, "Pedido muito grande.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    const v = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail(400, "Dados inválidos.");
    const stack = [[v, 0]];
    let count = 0;
    while (stack.length) {
      const [node, depth] = stack.pop();
      if (depth > 16 || ++count > 1000) fail(400, "Dados inválidos.");
      for (const [k, value] of Object.entries(node)) {
        if (["__proto__", "constructor", "prototype"].includes(k))
          fail(400, "Dados inválidos.");
        if (value && typeof value === "object") stack.push([value, depth + 1]);
      }
    }
    return v;
  } catch {
    fail(400, "Dados inválidos.");
  }
}
export async function limit(
  req,
  env,
  scope,
  maximum,
  period = 600,
  identity = null,
) {
  const now = Math.floor(Date.now() / 1000),
    slot = Math.floor(now / period),
    ip = identity ?? (req.headers.get("CF-Connecting-IP") || "local");
  const id = await digest(scope + "|" + ip + "|" + slot + "|" + env.ADMIN_KEY);
  const r = await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM rate_buckets WHERE id IN (SELECT id FROM rate_buckets WHERE expires_at < ? LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "INSERT INTO rate_buckets(id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    ).bind(id, (slot + 1) * period),
  ]);
  if (r[1].results[0].count > maximum)
    fail(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
}
export function securityHeaders(
  req,
  response,
  { privatePage = false, api = false } = {},
) {
  if (response.status === 101) return response;
  const url = new URL(req.url),
    headers = new Headers(response.headers),
    ws = (url.protocol === "https:" ? "wss://" : "ws://") + url.host;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "0");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  const pagePath = url.pathname
    .replace(/\/index\.html$/, "/")
    .replace(/\/?$/, "/");
  const hashes = scriptPolicies[pagePath] || [];
  headers.set(
    "Content-Security-Policy",
    api
      ? "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
      : `default-src 'self'; script-src 'self' ${hashes.join(" ")}; style-src 'self'${url.pathname.startsWith("/painel") ? "" : " 'unsafe-inline'"}; img-src 'self' data:; font-src 'self'; connect-src 'self' ${ws}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  );
  if (url.protocol === "https:")
    headers.set("Strict-Transport-Security", "max-age=31536000");
  if (api || privatePage) {
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Pragma", "no-cache");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Vary", "Cookie, Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
