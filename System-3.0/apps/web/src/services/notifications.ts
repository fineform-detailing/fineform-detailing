export const supportsPush = () =>
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
export const encode = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export function keyBytes(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
export const pushId = async (endpoint: string, quoteId?: string) =>
  encode(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode((quoteId ? quoteId + "|" : "") + endpoint),
    ),
  );
export async function activated(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration;
  await new Promise<void>((resolve, reject) => {
    const worker = registration.installing || registration.waiting;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker?.removeEventListener("statechange", check);
      error ? reject(error) : resolve();
    };
    const check = () => {
      if (worker?.state === "activated") finish();
      else if (worker?.state === "redundant")
        finish(Error("Recarregue a página para ativar os avisos."));
    };
    const timer = setTimeout(
      () => finish(Error("A ativação demorou. Tente novamente.")),
      12000,
    );
    if (!worker) {
      finish(Error("Não foi possível ativar os avisos."));
      return;
    }
    worker.addEventListener("statechange", check);
    check();
  });
  return registration;
}
