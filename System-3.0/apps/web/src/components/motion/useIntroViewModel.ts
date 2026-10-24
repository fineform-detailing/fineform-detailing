"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createIntroController } from "../../services/motion/controller.mjs";
import { installIntroNavigation } from "../../services/motion/navigation.mjs";
import {
  introMode,
  browserStorage,
  readStorage,
  INTRO,
} from "../../services/motion/config.mjs";
import { useApp } from "../layout/AppProvider";
export function useIntroViewModel() {
  const pathname = usePathname(),
    { paused } = useApp();
  const ref = useRef<ReturnType<typeof createIntroController> | null>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      controller = createIntroController(window);
    ref.current = controller;
    const allowed = () => !paused && !media.matches;
    const nav = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const mode = introMode({
      location,
      reduced: media.matches,
      paused,
      seen: readStorage(
        browserStorage(window, "sessionStorage"),
        INTRO.seenKey,
      ),
      pending: readStorage(
        browserStorage(window, "sessionStorage"),
        INTRO.pendingKey,
      ),
      navigationType: nav?.type || "navigate",
      saveData: false,
    });
    if (mode && allowed() && !document.hidden) void controller.open(mode);
    const cleanupNavigation = installIntroNavigation(
      window,
      controller,
      allowed,
    );
    const stop = () => {
      if (document.hidden) controller.cancel("hidden");
      else if (!allowed()) controller.skip();
    };
    const pagehide = () => controller.cancel("pagehide");
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) controller.cancel("restored");
    };
    const replay = () => {
      if (allowed()) void controller.open("replay");
    };
    media.addEventListener("change", stop);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", restored);
    window.addEventListener("ff:replay-intro", replay);
    return () => {
      cleanupNavigation?.();
      controller.destroy();
      ref.current = null;
      media.removeEventListener("change", stop);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", restored);
      window.removeEventListener("ff:replay-intro", replay);
    };
  }, [pathname, paused]);
  return { skip: () => ref.current?.skip() };
}
