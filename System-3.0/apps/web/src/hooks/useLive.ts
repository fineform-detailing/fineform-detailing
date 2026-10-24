"use client";
import { useEffect, useRef, useState } from "react";
import { watchUpdates } from "../services/realtime.mjs";
export function useLive(
  scope: "quote" | "subscription" | "admin",
  id: string,
  token: string,
  onChange: () => unknown,
  enabled = true,
) {
  const [state, setState] = useState("connecting");
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!enabled) return;
    return watchUpdates({
      scope,
      id,
      token,
      onChange: () => callback.current(),
      onState: (value: string) => setState(value),
    });
  }, [scope, id, token, enabled]);
  return state === "live"
    ? "Atualizações ativas"
    : state === "connecting"
      ? "Conectando atualizações…"
      : "Atualização automática · reconectando";
}
