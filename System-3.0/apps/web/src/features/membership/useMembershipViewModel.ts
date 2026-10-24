"use client";
import { useEffect, useRef, useState } from "react";
import { useCapability } from "../../hooks/useCapability";
import { useResource } from "../../hooks/useResource";
import { useLive } from "../../hooks/useLive";
import { memberships } from "../../services/api";
import {
  submissionToken,
  saveBookmark,
  clearPendingSubmission,
} from "../../services/browser.mjs";
import { chooseCredit, visitAvailability } from "@domain/membership-state.mjs";
import { planVisitQuote, validatePreference } from "@domain/catalog.mjs";
import { PRIVACY_VERSION } from "@domain/privacy-storage.mjs";
import {
  emptySelection,
  normalizeSelection,
  toggleAddon,
} from "../booking/booking.model";
import type { Selection, Quote } from "../../models/entities";
import { messageOf } from "../../models/config";
export function useMembershipViewModel() {
  const capability = useCapability();
  const resource = useResource(
    (signal) => memberships.get(capability.id, capability.token, signal),
    Boolean(capability.ready && capability.id && capability.token),
    capability.id + capability.token,
  );
  const [kind, setKind] = useState(""),
    [draft, setDraft] = useState<Selection>(emptySelection),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<{ quote: Quote; token: string } | null>(
      null,
    );
  const locked = useRef(false);
  const s = resource.data?.subscription;
  const live = useLive(
    "subscription",
    capability.id,
    capability.token,
    resource.reload,
    Boolean(s),
  );
  useEffect(() => {
    if (!s) return;
    const selected = chooseCredit(s, kind);
    if (selected !== kind) setKind(selected);
    setDraft((previous) =>
      normalizeSelection({
        ...previous,
        vehicle: s.vehicle,
        name: s.name,
        phone: s.phone || "",
        model: s.model,
        mode: "single",
        service: selected === "moto" ? "motoPremium" : selected || "premium",
      }),
    );
  }, [s, kind]);
  const update = (patch: Partial<Selection>) =>
    setDraft((d) => normalizeSelection({ ...d, ...patch }));
  const toggle = (id: string, key: "extras" | "treatments") =>
    setDraft((d) => toggleAddon(d, id, key));
  const availability = visitAvailability(s, kind);
  async function submit() {
    if (locked.current || !s) return;
    const invalid = !availability.allowed
      ? availability.reason
      : !draft.ack
        ? "Confirme o envio da solicitação."
        : validatePreference(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (
      draft.date &&
      s.cycle &&
      (draft.date < s.cycle.starts_on || draft.date >= s.cycle.ends_on)
    ) {
      setError("Escolha uma data dentro do período do seu ciclo.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...draft,
        creditKind: kind,
        website: "",
        privacyVersion: PRIVACY_VERSION,
      };
      const key = "ff-care-request-" + s.id;
      const token = submissionToken(payload, key);
      const { quote } = await memberships.request(s.id, capability.token, {
        ...payload,
        submissionToken: token,
      });
      saveBookmark(quote.id, token, quote.reference, {
        remember: draft.rememberLink,
      });
      setReceipt({ quote, token });
      clearPendingSubmission(key);
      await resource.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    ...capability,
    ...resource,
    subscription: s,
    live,
    kind,
    setKind,
    draft,
    update,
    toggle,
    busy,
    error: error || resource.error,
    availability,
    submit,
    receipt,
    another: () => {
      setReceipt(null);
      setDraft((d) => ({
        ...d,
        extras: [],
        treatments: [],
        date: "",
        time: "",
        notes: "",
        ack: false,
      }));
    },
    budget: planVisitQuote(draft),
  };
}
