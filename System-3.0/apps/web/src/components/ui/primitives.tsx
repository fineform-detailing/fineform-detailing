"use client";
import {
  useEffect,
  useRef,
  useId,
  type ReactNode,
  type InputHTMLAttributes,
} from "react";
import type {
  Budget as BudgetModel,
  LocationDetails,
} from "../../models/entities";
import { dateLabel, statusLabels } from "../../models/config";
import { money } from "@domain/catalog.mjs";
import { safeMapUrl } from "@domain/business-profile.mjs";
export function Status({ value }: { value: string }) {
  return (
    <span className={"status-badge status-" + value}>
      {statusLabels[value] || value}
    </span>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="system-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <p className="system-note" role="status">
      Carregando…
    </p>
  );
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <label className="system-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}
export function TextArea({
  label,
  name,
  value,
  onChange,
  maxLength = 600,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <label className="system-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
  required = false,
  disabled = false,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="system-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="system-field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      className="dialog admin-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <button
        type="button"
        className="dialog-close"
        onClick={onClose}
        aria-label="Fechar"
      >
        ×
      </button>
      <h2 id={label}>{title}</h2>
      {children}
    </dialog>
  );
}
export function Budget({
  budget,
  confirmedTotal,
}: {
  budget: BudgetModel;
  confirmedTotal?: number | null;
}) {
  return (
    <aside className="quote-box" aria-label="Seu orçamento">
      <h3>Seu orçamento</h3>
      <dl>
        {budget.items.map((item, i) => (
          <div key={item.id + "-" + i}>
            <dt>
              {item.label}
              {item.kind === "monthly"
                ? " · mensalidade"
                : item.kind === "credit"
                  ? " · incluída no Care"
                  : ""}
            </dt>
            <dd>{money(item.price)}</dd>
          </div>
        ))}
        {budget.discount > 0 && (
          <div className="quote-credit">
            <dt>Etapas em comum</dt>
            <dd>−{money(budget.discount)}</dd>
          </div>
        )}
      </dl>
      <div className="quote-total">
        <span>
          {confirmedTotal != null
            ? "Valor confirmado"
            : budget.hasBase
              ? "Total do pedido"
              : "Subtotal dos cuidados escolhidos"}
        </span>
        <strong>{money(confirmedTotal ?? budget.total)}</strong>
      </div>
      {budget.recurring > 0 && (
        <p>
          Mensalidade: {money(budget.recurring)}/mês.
          {budget.additional > 0 && (
            <> Adicionais desta visita: {money(budget.additional)}.</>
          )}
        </p>
      )}
      {!budget.hasBase && confirmedTotal == null && (
        <p>O orçamento completo será definido com Mateus.</p>
      )}
      <p className="quote-note">
        Atendimento confirmado na conversa. Sem cobrança automática pelo site.
      </p>
    </aside>
  );
}
export function Location({ value }: { value: LocationDetails | null }) {
  const map = safeMapUrl(value?.mapsUrl || "");
  return (
    <section className="system-card">
      <h3>Local de atendimento.</h3>
      {value ? (
        <>
          <p className="whitespace-pre-line">{value.address}</p>
          {value.arrivalNote && <p>{value.arrivalNote}</p>}
          {map && (
            <a
              className="button outline"
              href={map}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir mapa ↗
            </a>
          )}
          <p className="system-muted">
            Confirme data e horário com Mateus antes de se deslocar.
          </p>
        </>
      ) : (
        <p>
          O local de atendimento será combinado com Mateus e liberado neste
          acompanhamento.
        </p>
      )}
    </section>
  );
}
export function PrivateFrame({
  title,
  eyebrow,
  live,
  children,
}: {
  title: string;
  eyebrow: string;
  live?: string;
  children: ReactNode;
}) {
  return (
    <main id="conteudo" className="system-shell">
      <header className="system-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {live && (
          <p className="system-muted" role="status">
            {live}
          </p>
        )}
      </header>
      {children}
    </main>
  );
}
export { dateLabel };
