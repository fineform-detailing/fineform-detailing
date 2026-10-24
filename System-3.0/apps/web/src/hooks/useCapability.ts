"use client";
import { useEffect, useState } from "react";
import { readOrders } from "@domain/privacy-storage.mjs";
export function useCapability() {
  const [value, setValue] = useState({ id: "", token: "", ready: false });
  useEffect(() => {
    const read = () => {
      const id = new URLSearchParams(location.search).get("id") || "";
      let token = new URLSearchParams(location.hash.slice(1)).get("t") || "";
      try {
        if (!token && id)
          token =
            readOrders(localStorage).find((q: { id: string }) => q.id === id)
              ?.token || "";
      } catch {}
      setValue({ id, token, ready: true });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return value;
}
