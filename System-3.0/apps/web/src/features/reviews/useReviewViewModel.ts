"use client";
import { useRef, useState } from "react";
import { useCapability } from "../../hooks/useCapability";
import { useResource } from "../../hooks/useResource";
import { reviews } from "../../services/api";
import { messageOf } from "../../models/config";
export function useReviewViewModel() {
  const capability = useCapability();
  const resource = useResource(
    (signal) => reviews.state(capability.id, capability.token, signal),
    Boolean(capability.ready && capability.id && capability.token),
    capability.id + capability.token,
  );
  const [rating, setRating] = useState(0),
    [comment, setComment] = useState(""),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const data = resource.data;
  async function operation(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (!rating || !consent) {
      setError("Escolha sua nota e autorize a publicação.");
      return;
    }
    await operation(async () => {
      const result = await reviews.save(capability.id, capability.token, {
        rating,
        comment,
        consent,
      });
      resource.setData({
        eligible: true,
        firstName: data?.firstName || "",
        review: result.review,
      });
    });
  }
  async function withdraw() {
    await operation(async () => {
      await reviews.withdraw(capability.id, capability.token);
      resource.setData(await reviews.state(capability.id, capability.token));
    });
  }
  return {
    capability,
    resource,
    data,
    rating,
    setRating,
    comment,
    setComment,
    consent,
    setConsent,
    error,
    busy,
    submit,
    withdraw,
  };
}
