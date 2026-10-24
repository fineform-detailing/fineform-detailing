let adminCsrf = "",
  lastActivity = Date.now(),
  reauthenticate = null,
  sessionExpired = null,
  authGeneration = 0;
export const setReauthenticationHandler = (handler) =>
  (reauthenticate = handler);
export const setSessionExpiryHandler = (handler) => (sessionExpired = handler);
export const clearAdminSession = () => {
  adminCsrf = "";
  authGeneration++;
};
export function trackActivity() {
  const update = () => {
    lastActivity = Date.now();
  };
  const events = ["pointerdown", "keydown", "touchstart"];
  events.forEach((e) =>
    document.addEventListener(e, update, { passive: true }),
  );
  return () => events.forEach((e) => document.removeEventListener(e, update));
}
export async function api(
  path,
  { method = "GET", body, token, signal, _retried = false } = {},
) {
  const target = new URL(path, location.origin);
  if (target.origin !== location.origin || !target.pathname.startsWith("/api/"))
    throw new Error("Destino de envio inválido.");
  const generation = authGeneration,
    adminRequest =
      target.pathname.startsWith("/api/admin/") &&
      !["/api/admin/session", "/api/admin/reauth"].includes(target.pathname);
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  const stop = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(adminCsrf &&
        (target.pathname.startsWith("/api/admin/") || body?.scope === "admin")
          ? {
              "X-FF-CSRF": adminCsrf,
              "X-FF-Activity": Date.now() - lastActivity < 60000 ? "1" : "0",
            }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res
      .json()
      .catch(() => ({ error: "Resposta indisponível. Tente novamente." }));
    if (adminRequest && generation !== authGeneration) {
      const error = new Error("A sessão foi encerrada. Entre novamente.");
      error.status = 401;
      throw error;
    }
    if (!res.ok) {
      if (
        res.status === 428 &&
        data.code === "reauth_required" &&
        reauthenticate &&
        !_retried
      ) {
        clearTimeout(timeout);
        await reauthenticate();
        return api(path, { method, body, token, signal, _retried: true });
      }
      if (
        res.status === 401 &&
        !["/api/admin/session", "/api/admin/reauth"].includes(
          target.pathname,
        ) &&
        (target.pathname.startsWith("/api/admin/") || body?.scope === "admin")
      ) {
        clearAdminSession();
        sessionExpired?.();
      }
      const error = new Error(
        data.error || "Não foi possível concluir a operação.",
      );
      error.status = res.status;
      error.mfaRequired = data.mfaRequired;
      throw error;
    }
    if (data.authenticated && data.csrfToken) adminCsrf = data.csrfToken;
    if (target.pathname === "/api/admin/session" && method === "DELETE")
      clearAdminSession();
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "A conexão demorou. Tente novamente; seu pedido não será duplicado.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", stop);
  }
}
