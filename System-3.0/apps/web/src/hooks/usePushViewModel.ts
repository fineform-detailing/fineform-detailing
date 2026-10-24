"use client";
import { useEffect, useRef, useState } from "react";
import { request } from "../services/api";
import {
  supportsPush,
  encode,
  keyBytes,
  pushId,
  activated,
} from "../services/notifications";
import { useResource } from "./useResource";
import { messageOf } from "../models/config";
import type { PushSettings } from "../models/entities";
export function usePushViewModel(
  scope: "admin" | "customer",
  quoteId = "",
  token = "",
  enabled = true,
) {
  const [supported, setSupported] = useState(false),
    [device, setDevice] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const prefix =
    scope === "admin"
      ? "/api/admin/notifications"
      : "/api/quotes/" + quoteId + "/notifications";
  const swScope = scope === "admin" ? "/painel/" : "/acompanhar/";
  useEffect(() => {
    setSupported(supportsPush());
  }, []);
  const resource = useResource(
    (signal) => request<PushSettings>(prefix, { token, signal }),
    enabled && Boolean(scope === "admin" || quoteId),
    prefix + token,
  );
  useEffect(() => {
    let valid = true;
    if (!supported || !resource.data) return;
    void navigator.serviceWorker
      .getRegistration(swScope)
      .then((r) => r?.pushManager.getSubscription())
      .then(async (s) => {
        const id = s
          ? await pushId(s.endpoint, scope === "customer" ? quoteId : undefined)
          : "";
        if (valid) setDevice(id);
      })
      .catch(() => {});
    return () => {
      valid = false;
    };
  }, [supported, resource.data, swScope, scope, quoteId]);
  const active = Boolean(
    device &&
    (scope === "admin"
      ? resource.data?.devices?.some((d) => d.id === device)
      : resource.data?.deviceIds?.includes(device)),
  );
  async function execute(operation: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      await resource.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function enable() {
    if (!supported || !resource.data?.publicKey || lock.current) return;
    const permission = Notification.requestPermission();
    void execute(async () => {
      if ((await permission) !== "granted")
        throw Error(
          "A permissão não foi concedida. Confira os ajustes do navegador.",
        );
      const r = await activated(
        await navigator.serviceWorker.register(swScope + "sw.js", {
          scope: swScope,
          updateViaCache: "none",
        }),
      );
      let sub = await r.pushManager.getSubscription();
      if (
        sub &&
        (!sub.options.applicationServerKey ||
          encode(sub.options.applicationServerKey) !== resource.data!.publicKey)
      ) {
        await sub.unsubscribe();
        sub = null;
      }
      let created = false;
      if (!sub) {
        sub = await r.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(resource.data!.publicKey!),
        });
        created = true;
      }
      try {
        await request(prefix + (scope === "admin" ? "/subscription" : ""), {
          method: "POST",
          token,
          body:
            scope === "admin"
              ? {
                  subscription: sub.toJSON(),
                  label: /Android/.test(navigator.userAgent)
                    ? "Meu Android"
                    : "Meu aparelho",
                }
              : { consent: true, subscription: sub.toJSON() },
        });
        setDevice(
          await pushId(
            sub.endpoint,
            scope === "customer" ? quoteId : undefined,
          ),
        );
      } catch (e) {
        if (created) await sub.unsubscribe().catch(() => {});
        throw e;
      }
    });
  }
  function revoke(id = device) {
    void execute(async () => {
      const r = await navigator.serviceWorker?.getRegistration(swScope);
      const sub = await r?.pushManager.getSubscription();
      await request(prefix + (scope === "admin" ? "/subscription" : ""), {
        method: "DELETE",
        token,
        body: scope === "admin" ? { id } : { endpoint: sub?.endpoint },
      });
      if (scope === "admin" && id === device) {
        await sub?.unsubscribe();
        setDevice("");
      }
    });
  }
  return {
    supported,
    active,
    busy,
    error: error || resource.error,
    data: resource.data,
    device,
    enable,
    revoke,
    test: () =>
      execute(() =>
        request(prefix + "/test", { method: "POST", body: { id: device } }),
      ),
  };
}
