export class LiveUpdates {
  constructor(ctx) {
    this.ctx = ctx;
    if (typeof WebSocketRequestResponsePair !== "undefined")
      ctx.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair("ping", "pong"),
      );
  }
  async schedule() {
    const times = this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === 1)
      .map((ws) => ws.deserializeAttachment()?.expiresAt)
      .filter((t) => Number.isFinite(t) && t > Date.now());
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }
  async fetch(req) {
    if (new URL(req.url).pathname === "/notify") {
      const { topics, revoke = [] } = await req.json();
      for (const ws of this.ctx.getWebSockets("admin"))
        if (revoke.includes(ws.deserializeAttachment()?.sessionId)) {
          try {
            ws.close(1008, "Session ended");
          } catch {}
        }
      for (const topic of [...new Set(topics)].slice(0, 5))
        for (const ws of this.ctx.getWebSockets(topic)) {
          try {
            ws.send(JSON.stringify({ type: "changed" }));
          } catch {}
        }
      return new Response("ok");
    }
    const topic = req.headers.get("X-FF-Topic"),
      expiresAt = Number(req.headers.get("X-FF-Expires"));
    if (
      !topic ||
      !/^admin$|^(quote|subscription):[0-9a-f-]{36}$/.test(topic) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + 301000
    )
      return new Response("Forbidden", { status: 403 });
    if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [topic]);
    server.serializeAttachment({
      topic,
      expiresAt,
      sessionId: req.headers.get("X-FF-Session") || null,
    });
    await this.schedule();
    return new Response(null, { status: 101, webSocket: client });
  }
  async alarm() {
    for (const ws of this.ctx.getWebSockets()) {
      const expiry = ws.deserializeAttachment()?.expiresAt;
      if (!expiry || expiry <= Date.now()) {
        try {
          ws.close(1008, "Reconnect");
        } catch {}
      }
    }
    await this.schedule();
  }
  webSocketMessage(ws, message) {
    if (ws.deserializeAttachment()?.expiresAt <= Date.now()) {
      ws.close(1008, "Reconnect");
      return;
    }
    if (message === "ping") ws.send("pong");
  }
  webSocketClose(ws, code) {
    try {
      ws.close(code, "");
    } catch {}
  }
  webSocketError(ws) {
    try {
      ws.close(1011, "Reconnect");
    } catch {}
  }
}
export async function notify(env, topics, revoke = []) {
  if (!env.LIVE) return;
  const stub = env.LIVE.get(env.LIVE.idFromName("fine-form-live"));
  await stub.fetch("https://live/notify", {
    method: "POST",
    body: JSON.stringify({ topics: ["admin", ...topics], revoke }),
  });
}
