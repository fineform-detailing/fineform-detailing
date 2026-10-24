"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  readDraft,
  DRAFT_TTL,
  PRIVACY_VERSION,
} from "@domain/privacy-storage.mjs";
import { quoteFor } from "@domain/catalog.mjs";
import { quotes } from "../../services/api";
import {
  submissionToken,
  saveBookmark,
  clearPendingSubmission,
} from "../../services/browser.mjs";
import type { Quote, Selection } from "../../models/entities";
import { messageOf } from "../../models/config";
import {
  emptySelection,
  normalizeSelection,
  sanitizeSelection,
  selectionFromQuery,
  validateStep,
  toggleAddon,
} from "./booking.model";
export function useBookingViewModel() {
  const [selection, setSelection] = useState(emptySelection),
    [step, setStep] = useState(0),
    [remember, setRemember] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{ quote: Quote; token: string } | null>(
      null,
    );
  const locked = useRef(false);
  const website = useRef("");
  useEffect(() => {
    let saved = null;
    try {
      saved = readDraft(localStorage);
    } catch {}
    setSelection(
      selectionFromQuery(
        sanitizeSelection(saved),
        new URLSearchParams(location.search),
      ),
    );
    setRemember(Boolean(saved));
    setReady(true);
    const clear = () => setRemember(false);
    window.addEventListener("ff:saved-data-cleared", clear);
    return () => window.removeEventListener("ff:saved-data-cleared", clear);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      if (remember)
        localStorage.setItem(
          "ff-care-draft-v1",
          JSON.stringify({
            ...selection,
            ack: false,
            rememberLink: false,
            expiresAt: Date.now() + DRAFT_TTL,
          }),
        );
      else localStorage.removeItem("ff-care-draft-v1");
    } catch {
      setRemember(false);
    }
  }, [selection, remember, ready]);
  const update = useCallback((patch: Partial<Selection>) => {
    setSelection((s) => normalizeSelection({ ...s, ...patch }));
    setError("");
  }, []);
  const chooseVehicle = (vehicle: Selection["vehicle"]) =>
    setSelection((s) =>
      vehicle === s.vehicle
        ? s
        : {
            ...s,
            vehicle,
            service: vehicle === "car" ? "essential" : "motoPremium",
            plan: vehicle === "car" ? "careEssential" : "careMoto",
            extras: [],
            treatments: [],
            goals: s.goals.filter((g) => vehicle === "car" || g !== "Interior"),
          },
    );
  const toggle = (id: string, kind: "extras" | "treatments") =>
    setSelection((s) => toggleAddon(s, id, kind));
  const advance = async () => {
    if (locked.current) return;
    const invalid = validateStep(selection, step);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (step < 4) {
      setStep(step + 1);
      setError("");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...selection,
        privacyVersion: PRIVACY_VERSION,
        website: website.current,
      };
      const token = submissionToken(payload);
      const { quote } = await quotes.create(
        selection,
        token,
        PRIVACY_VERSION,
        website.current,
      );
      saveBookmark(quote.id, token, quote.reference, {
        remember: selection.rememberLink,
      });
      setResult({ quote, token });
      clearPendingSubmission();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const reset = () => {
    if (busy) return;
    setSelection(emptySelection());
    setStep(0);
    setResult(null);
    setRemember(false);
    setError("");
    clearPendingSubmission();
  };
  return {
    selection,
    step,
    setStep,
    remember,
    setRemember,
    ready,
    busy,
    error,
    result,
    update,
    chooseVehicle,
    toggle,
    advance,
    reset,
    website,
    budget: useMemo(() => quoteFor(selection), [selection]),
  };
}
