import { rememberOrder } from "../../../../packages/domain/privacy-storage.mjs";
export function randomToken() {
  if (!crypto.getRandomValues)
    throw Error("Abra o site por uma conexão segura.");
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function submissionToken(payload, key = "ff-pending-submission") {
  const fingerprint = JSON.stringify(payload);
  try {
    const old = JSON.parse(sessionStorage.getItem(key) || "null");
    if (old?.fingerprint === fingerprint) return old.token;
  } catch {}
  const token = randomToken();
  try {
    sessionStorage.setItem(key, JSON.stringify({ fingerprint, token }));
  } catch {}
  return token;
}
export function clearPendingSubmission(key = "ff-pending-submission") {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
export function trackingUrl(id, token, path = "acompanhar") {
  return new URL(
    "/" +
      path +
      "/?id=" +
      encodeURIComponent(id) +
      "#t=" +
      encodeURIComponent(token),
    location.origin,
  ).href;
}
export function saveBookmark(id, token, reference, options = {}) {
  try {
    return rememberOrder(localStorage, id, token, reference, options);
  } catch {
    return false;
  }
}
export async function copyText(value) {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  document.body.append(input);
  input.select();
  const ok = document.execCommand("copy");
  input.remove();
  if (!ok) throw Error("Copie o link exibido na tela.");
}
