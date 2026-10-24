"use client";
import { useEffect, useRef, useState } from "react";
import { admin } from "../../services/api";
import {
  clearAdminSession,
  setReauthenticationHandler,
  setSessionExpiryHandler,
  trackActivity,
} from "../../services/http.mjs";
import type { Session } from "../../models/entities";
import { messageOf } from "../../models/config";
export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [reauth, setReauth] = useState(false);
  const pending = useRef<{
    resolve: () => void;
    reject: (reason: Error) => void;
    promise: Promise<void>;
  } | null>(null);
  const authenticated = Boolean(session?.authenticated);
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    admin
      .session(controller.signal)
      .then((s) => {
        if (mounted) setSession(s);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    setReauthenticationHandler(() => {
      if (pending.current) return pending.current.promise;
      let resolve!: () => void, reject!: (reason: Error) => void;
      const promise = new Promise<void>((yes, no) => {
        resolve = yes;
        reject = no;
      });
      pending.current = { resolve, reject, promise };
      setReauth(true);
      return promise;
    });
    setSessionExpiryHandler(() => {
      setSession(null);
      setError("Sua sessão terminou. Entre novamente.");
    });
    const stop = trackActivity();
    return () => {
      stop();
      setReauthenticationHandler(null);
      setSessionExpiryHandler(null);
      pending.current?.reject(Error("A página foi encerrada."));
      pending.current = null;
      clearAdminSession();
    };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    const check = () => {
      if (!document.hidden)
        void admin.session().catch(() => {
          setSession(null);
          clearAdminSession();
        });
    };
    const timer = setInterval(check, 60000);
    const hidden = () => {
      if (document.hidden) return;
      check();
    };
    const pagehide = () => clearAdminSession();
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", restored);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", restored);
    };
  }, [authenticated]);
  const login = async (key: string, code: string) => {
    setError("");
    try {
      const result = await admin.login({ key, code }, reauth);
      setSession(result);
      if (reauth) {
        setReauth(false);
        pending.current?.resolve();
        pending.current = null;
      }
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    }
  };
  return {
    authenticated,
    ready,
    error,
    reauth,
    session,
    login,
    cancelReauth: () => {
      setReauth(false);
      pending.current?.reject(Error("Confirmação de acesso cancelada."));
      pending.current = null;
    },
    logout: async () => {
      try {
        await admin.logout();
      } finally {
        clearAdminSession();
        setSession(null);
      }
    },
  };
}
