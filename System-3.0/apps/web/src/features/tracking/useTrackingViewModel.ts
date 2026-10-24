"use client";
import { useEffect, useState } from "react";
import { useCapability } from "../../hooks/useCapability";
import { useResource } from "../../hooks/useResource";
import { useLive } from "../../hooks/useLive";
import { quotes } from "../../services/api";
import { readOrders } from "@domain/privacy-storage.mjs";
export function useTrackingViewModel() {
  const capability = useCapability();
  const [orders, setOrders] = useState<
    { id: string; token: string; reference: string }[]
  >([]);
  const resource = useResource(
    (signal) => quotes.get(capability.id, capability.token, signal),
    capability.ready && Boolean(capability.id && capability.token),
    capability.id + capability.token,
  );
  const live = useLive(
    "quote",
    capability.id,
    capability.token,
    resource.reload,
    Boolean(resource.data),
  );
  useEffect(() => {
    const read = () => {
      try {
        setOrders(readOrders(localStorage));
      } catch {}
    };
    read();
    window.addEventListener("ff:saved-data-cleared", read);
    return () => window.removeEventListener("ff:saved-data-cleared", read);
  }, []);
  return {
    ...resource,
    ...capability,
    orders,
    live,
    forget: () => {
      try {
        localStorage.removeItem("ff-orders-v2");
      } catch {}
      setOrders([]);
    },
  };
}
