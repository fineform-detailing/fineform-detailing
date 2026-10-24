import { api } from "./http.mjs";
export function watchUpdates({
  scope,
  id,
  token,
  onChange,
  onState = (_state) => {},
}) {
  let stopped = false,
    socket = null,
    reconnect = null,
    poll = null,
    ping = null,
    delay = 1000,
    refreshTimer = null,
    connecting = false,
    handshake = null;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      () => Promise.resolve(onChange()).catch(() => {}),
      150,
    );
  };
  const close = () => {
    clearTimeout(reconnect);
    clearTimeout(handshake);
    handshake = null;
    clearInterval(poll);
    clearInterval(ping);
    poll = null;
    ping = null;
    const old = socket;
    socket = null;
    old?.close();
  };
  const fallback = () => {
    if (!poll)
      poll = setInterval(() => {
        if (!document.hidden) refresh();
      }, 30000);
  };
  const retry = (ws) => {
    if (ws !== socket) return;
    socket = null;
    clearTimeout(handshake);
    handshake = null;
    clearInterval(ping);
    ping = null;
    if (stopped || document.hidden) return;
    onState("fallback");
    fallback();
    reconnect = setTimeout(connect, delay);
    delay = Math.min(30000, delay * 2);
  };
  async function connect() {
    if (stopped || document.hidden || connecting) return;
    connecting = true;
    onState("connecting");
    fallback();
    try {
      const data = await api("/api/realtime-ticket", {
        method: "POST",
        body: { scope, id },
        token,
      });
      if (stopped || document.hidden) return;
      const url = new URL("/api/realtime", location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("ticket", data.ticket);
      const ws = new WebSocket(url);
      socket = ws;
      handshake = setTimeout(() => {
        retry(ws);
        ws.close();
      }, 8000);
      ws.onopen = () => {
        if (ws !== socket || stopped) {
          ws.close();
          return;
        }
        clearTimeout(handshake);
        handshake = null;
        delay = 1000;
        clearInterval(poll);
        poll = null;
        onState("live");
        refresh();
        ping = setInterval(() => {
          if (socket?.readyState === 1) socket.send("ping");
        }, 25000);
      };
      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        try {
          if (JSON.parse(e.data).type === "changed") refresh();
        } catch {}
      };
      ws.onclose = () => retry(ws);
      ws.onerror = () => ws.close();
    } catch {
      onState("fallback");
      if (!stopped && !document.hidden) {
        reconnect = setTimeout(connect, delay);
        delay = Math.min(30000, delay * 2);
      }
    } finally {
      connecting = false;
    }
  }
  const visibility = () => {
    if (document.hidden) close();
    else {
      refresh();
      connect();
    }
  };
  const restored = (event) => {
    if (event.persisted) {
      refresh();
      connect();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pageshow", restored);
  connect();
  return () => {
    stopped = true;
    close();
    clearTimeout(refreshTimer);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pageshow", restored);
  };
}
