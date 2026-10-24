"use client";
import { useRef, useState, type FormEvent } from "react";
import { messageOf } from "../../models/config";
export function values(form: HTMLFormElement) {
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [
      key,
      String(value),
    ]),
  );
}
export function checked(form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement && input.checked;
}
export function FormArea({
  name,
  label,
  value = "",
  maxLength = 600,
}: {
  name: string;
  label: string;
  value?: string;
  maxLength?: number;
}) {
  return (
    <label className="system-field">
      <span>{label}</span>
      <textarea name={name} defaultValue={value} maxLength={maxLength} />
    </label>
  );
}
export function FormSelect({
  name,
  label,
  value = "",
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
}) {
  return (
    <label className="system-field">
      <span>{label}</span>
      <select name={name} defaultValue={value}>
        {options.map(([id, label]) => (
          <option value={id} key={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function FormCheck({
  name,
  label,
  required = false,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <label className="system-check">
      <input
        type="checkbox"
        name={name}
        required={required}
        defaultChecked={defaultChecked}
      />
      <span>{label}</span>
    </label>
  );
}
export function PaidCheck() {
  return (
    <FormCheck
      name="paidConfirmed"
      label="Recebi o pagamento deste ciclo e conferi o valor."
      required
    />
  );
}
export function useAdminAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function run<T>(
    fn: () => Promise<T>,
    success?: (result: T) => Promise<unknown> | unknown,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      await success?.(result);
      return result;
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    setError,
    run,
    form: (
      event: FormEvent<HTMLFormElement>,
      fn: (form: HTMLFormElement) => Promise<unknown>,
    ) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      void run(() => fn(form));
    },
  };
}
