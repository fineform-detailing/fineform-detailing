"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { messageOf } from "../models/config";
export function useResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  enabled = true,
  key: string | number = "",
) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(enabled);
  const ref = useRef(loader);
  ref.current = loader;
  const controller = useRef<AbortController | null>(null),
    mounted = useRef(false);
  const reload = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    try {
      const value = await ref.current(current.signal);
      if (mounted.current && !current.signal.aborted) setData(value);
      return value;
    } catch (failure) {
      if (mounted.current && !current.signal.aborted)
        setError(messageOf(failure));
      return null;
    } finally {
      if (mounted.current && !current.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (enabled) void reload();
    else setLoading(false);
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [enabled, reload, key]);
  return { data, error, loading, reload, setData, setError };
}
