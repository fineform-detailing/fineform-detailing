"use client";
import { useEffect, useRef } from "react";
import { useBookingViewModel } from "./useBookingViewModel";
import { goals } from "./booking.model";
import {
  services,
  plans,
  money,
  findPlan,
  findService,
  todaySP,
  timesFor,
  createSummary,
} from "@domain/catalog.mjs";
import { REQUEST_NOTICE } from "@domain/business-stage.mjs";
import { emailMessage } from "@domain/contacts.mjs";
import {
  Budget,
  Check,
  ErrorMessage,
  Field,
  Select,
  TextArea,
} from "../../components/ui/primitives";
import { VehicleIcon } from "../../components/catalog/VehicleIcon";
import { Addons } from "../../components/catalog/Addons";
import { useApp } from "../../components/layout/AppProvider";
import { trackingUrl, copyText } from "../../services/browser.mjs";
import { config, dateLabel } from "../../models/config";
import { CustomerNotice } from "../reviews/CustomerNotice";
import type { Quote } from "../../models/entities";
const stepNames = [
  "Seu veículo",
  "O cuidado",
  "Os detalhes",
  "Sua preferência",
  "Vamos conversar",
];
export function BookingView() {
  const vm = useBookingViewModel();
  const s = vm.selection;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (vm.step) heading.current?.focus({ preventScroll: true });
  }, [vm.step]);
  return (
    <main className="booking-layout" id="conteudo">
      <aside className="booking-aside">
        <a className="back-link" href="/">
          ← Voltar ao estúdio
        </a>
        <p className="eyebrow">FINE FORM / SEU PRÓXIMO CUIDADO</p>
        <h1>
          Seu veículo.
          <br />
          Seu jeito.
          <br />
          <em>Nosso cuidado.</em>
        </h1>
        <p>
          Você conta o que deseja.
          <br />
          Mateus combina os detalhes com você.
        </p>
        <ol className="step-nav">
          {stepNames.map((name, i) => (
            <li
              key={name}
              className={vm.step === i ? "active" : vm.step > i ? "done" : ""}
              aria-current={vm.step === i ? "step" : undefined}
            >
              0{i + 1} <span>{name}</span>
            </li>
          ))}
        </ol>
        <div className="aside-note">
          <i className="status-dot" />
          <p>Você envia; Mateus analisa e confirma.</p>
        </div>
      </aside>
      <section className="booking-panel" aria-label="Preparar atendimento">
        {vm.result ? (
          <BookingReceipt
            quote={vm.result.quote}
            token={vm.result.token}
            onReset={vm.reset}
          />
        ) : (
          <>
            <div className="wizard-top">
              <span>ETAPA 0{vm.step + 1} / 05</span>
              <button
                type="button"
                className="quiet-button"
                disabled={vm.busy}
                onClick={() => {
                  if (confirm("Recomeçar e apagar o rascunho deste aparelho?"))
                    vm.reset();
                }}
              >
                Recomeçar
              </button>
            </div>
            <progress
              className="wizard-progress"
              value={vm.step + 1}
              max={5}
              aria-label="Progresso do orçamento"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void vm.advance();
              }}
              noValidate
              aria-busy={vm.busy}
            >
              <fieldset
                disabled={vm.busy || !vm.ready}
                className="fieldset-clean"
              >
                <h2 className="wizard-title" tabIndex={-1} ref={heading}>
                  {
                    [
                      "Vamos começar pelo seu veículo.",
                      "Qual cuidado você procura?",
                      "Vamos aos detalhes.",
                      "Quando seria bom para você?",
                      "Agora, vamos conversar.",
                    ][vm.step]
                  }
                </h2>
                {vm.step === 0 && (
                  <>
                    <p className="wizard-lead">
                      Carro ou moto: o cuidado começa conhecendo quem acompanha
                      você.
                    </p>
                    <div
                      className="vehicle-options"
                      role="group"
                      aria-label="Tipo de veículo"
                    >
                      {(["car", "moto"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={
                            "choice-card " + (s.vehicle === v ? "selected" : "")
                          }
                          aria-pressed={s.vehicle === v}
                          onClick={() => vm.chooseVehicle(v)}
                        >
                          <span className="choice-icon" aria-hidden="true">
                            <VehicleIcon vehicle={v} />
                          </span>
                          <h3>{v === "car" ? "Meu carro" : "Minha moto"}</h3>
                        </button>
                      ))}
                    </div>
                    <Field
                      label="Qual é a marca e o modelo? *"
                      name="model"
                      value={s.model}
                      onChange={(e) => vm.update({ model: e.target.value })}
                      placeholder={
                        s.vehicle === "car"
                          ? "Ex.: Honda Civic 2020"
                          : "Ex.: Honda CB 500 2022"
                      }
                      maxLength={80}
                      required
                    />
                    <p className="privacy-note">
                      A placa será conferida e cadastrada por Mateus quando o
                      veículo chegar.
                    </p>
                  </>
                )}
                {vm.step === 1 && (
                  <>
                    <div
                      className="mode-tabs"
                      role="group"
                      aria-label="Modalidade de atendimento"
                    >
                      {(
                        [
                          ["single", "Um atendimento"],
                          ["plan", "Care mensal"],
                          ["guidance", "Quero orientação"],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          type="button"
                          key={mode}
                          aria-pressed={s.mode === mode}
                          className={s.mode === mode ? "active" : ""}
                          onClick={() => vm.update({ mode })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {s.mode === "single" && (
                      <div className="choice-stack">
                        {services
                          .filter((v) => v.vehicle === s.vehicle)
                          .map((service) => (
                            <button
                              key={service.id}
                              type="button"
                              className={
                                "choice-card " +
                                (s.service === service.id ? "selected" : "")
                              }
                              onClick={() => vm.update({ service: service.id })}
                              aria-pressed={s.service === service.id}
                            >
                              <h3>{service.label}</h3>
                              <p>{service.description}</p>
                              <small>{money(service.price)}</small>
                            </button>
                          ))}
                      </div>
                    )}
                    {s.mode === "plan" && (
                      <div className="choice-stack">
                        {plans
                          .filter((p) => p.vehicle === s.vehicle)
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className={
                                "choice-card " +
                                (s.plan === p.id ? "selected" : "")
                              }
                              aria-pressed={s.plan === p.id}
                              onClick={() => vm.update({ plan: p.id })}
                            >
                              <h3>{p.name}</h3>
                              <p>{p.description}</p>
                              <small>{money(p.price)}/mês</small>
                            </button>
                          ))}
                        <p className="note-box">
                          Assinatura exclusiva de um veículo. A placa e o
                          pagamento serão conferidos antes da ativação.
                        </p>
                      </div>
                    )}
                    {s.mode === "guidance" && (
                      <p className="note-box">
                        Tudo bem não conhecer o nome do serviço. Mateus ajuda
                        você a escolher na conversa.
                      </p>
                    )}
                    <fieldset className="fieldset-clean">
                      <legend>O que é importante para você? (opcional)</legend>
                      <div className="goals">
                        {goals
                          .filter(
                            (g) => s.vehicle === "car" || g !== "Interior",
                          )
                          .map((g) => (
                            <button
                              key={g}
                              className={
                                "goal-button " +
                                (s.goals.includes(g) ? "selected" : "")
                              }
                              type="button"
                              aria-pressed={s.goals.includes(g)}
                              onClick={() =>
                                vm.update({
                                  goals: s.goals.includes(g)
                                    ? s.goals.filter((x) => x !== g)
                                    : [...s.goals, g],
                                })
                              }
                            >
                              {g}
                            </button>
                          ))}
                      </div>
                    </fieldset>
                  </>
                )}
                {vm.step === 2 && (
                  <>
                    <p className="wizard-lead">
                      A avaliação orienta o que é adequado para o seu veículo.
                    </p>
                    <Addons selection={s} onToggle={vm.toggle} />
                  </>
                )}
                {vm.step === 3 && (
                  <>
                    <p className="note-box">
                      Sua preferência não bloqueia uma vaga. O atendimento
                      depende da confirmação de Mateus.
                    </p>
                    <Field
                      label="Data de preferência"
                      type="date"
                      min={todaySP()}
                      value={s.date}
                      onChange={(e) =>
                        vm.update({ date: e.target.value, time: "" })
                      }
                    />
                    <Select
                      label="Horário de preferência"
                      value={s.time}
                      disabled={!s.date}
                      onChange={(time) => vm.update({ time })}
                      options={
                        [
                          ["", "Prefiro combinar o horário"],
                          ...timesFor(s.date).map((t) => [t, t]),
                        ] as [string, string][]
                      }
                    />
                    <Check
                      label="Tenho flexibilidade ou prefiro combinar a data pela conversa."
                      checked={s.flexibleDate}
                      onChange={(flexibleDate) => vm.update({ flexibleDate })}
                    />
                    <p className="hours-note">
                      Segunda a sábado · 9h às 17h30. Domingo · 9h às 12h.
                    </p>
                  </>
                )}
                {vm.step === 4 && (
                  <>
                    <dl className="review-list">
                      <div>
                        <dt>VEÍCULO</dt>
                        <dd>{s.model}</dd>
                      </div>
                      <div>
                        <dt>INTERESSE</dt>
                        <dd>
                          {s.mode === "plan"
                            ? findPlan(s.plan)?.name
                            : s.mode === "guidance"
                              ? "Orientação com Mateus"
                              : findService(s.service)?.label}
                        </dd>
                      </div>
                      <div>
                        <dt>PREFERÊNCIA</dt>
                        <dd>
                          {dateLabel(s.date)} · {s.time || "Horário a combinar"}
                        </dd>
                      </div>
                    </dl>
                    <Field
                      label="Como podemos chamar você? *"
                      name="name"
                      value={s.name}
                      onChange={(e) => vm.update({ name: e.target.value })}
                      autoComplete="given-name"
                      maxLength={80}
                      required
                    />
                    <Field
                      label="Seu WhatsApp com DDD *"
                      name="phone"
                      type="tel"
                      value={s.phone}
                      onChange={(e) => vm.update({ phone: e.target.value })}
                      maxLength={20}
                      autoComplete="tel"
                      required
                    />
                    <TextArea
                      label="Quer contar mais alguma coisa?"
                      value={s.notes}
                      onChange={(notes) => vm.update({ notes })}
                    />
                    <p className="privacy-note">
                      Não envie documentos, dados sensíveis ou dados de
                      terceiros.
                    </p>
                    <Check
                      label="Entendo que envio uma solicitação de orçamento, sujeita à aceitação de Mateus, sem reserva ou cobrança automática. Li as informações de privacidade e atendimento."
                      checked={s.ack}
                      onChange={(ack) => vm.update({ ack })}
                      required
                    />
                    <p className="privacy-inline">
                      <a href="/privacidade/">Privacidade</a> ·{" "}
                      <a href="/termos/">Termos</a> ·{" "}
                      <a href="/cancelamento-e-reembolso/">
                        Cancelamento e reembolso
                      </a>
                    </p>
                    <Check
                      label="Guardar o link privado deste pedido neste aparelho por até 90 dias (opcional)."
                      checked={Boolean(s.rememberLink)}
                      onChange={(rememberLink) => vm.update({ rememberLink })}
                    />
                    <p className="request-disclosure">{REQUEST_NOTICE}</p>
                    <label className="sr-honeypot" aria-hidden="true">
                      Website
                      <input
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        onChange={(e) => {
                          vm.website.current = e.target.value;
                        }}
                      />
                    </label>
                  </>
                )}
                {vm.step > 0 && <Budget budget={vm.budget} />}
                <ErrorMessage message={vm.error} />
                <div className="wizard-actions">
                  {vm.step > 0 && (
                    <button
                      className="button outline"
                      type="button"
                      onClick={() => vm.setStep(vm.step - 1)}
                    >
                      ← Voltar
                    </button>
                  )}
                  <button className="button orange" type="submit">
                    {vm.busy
                      ? "Enviando…"
                      : vm.step === 4
                        ? "Enviar solicitação de orçamento ↗"
                        : "Continuar →"}
                  </button>
                </div>
              </fieldset>
            </form>
            <Check
              label="Guardar meu rascunho neste aparelho por até 30 dias"
              checked={vm.remember}
              onChange={vm.setRemember}
              disabled={vm.busy}
            />
            <p className="privacy-note">
              O rascunho é opcional e pode ser apagado a qualquer momento.{" "}
              <a href="/privacidade/">Privacidade</a>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
export function BookingReceipt({
  quote,
  token,
  onReset,
}: {
  quote: Quote;
  token: string;
  onReset: () => void;
}) {
  const { toast, contact } = useApp();
  const link = trackingUrl(quote.id, token),
    summary =
      createSummary(quote.selection) +
      "\n\nPedido " +
      quote.reference +
      "\nAcompanhar: " +
      link;
  const copy = (text: string) =>
    copyText(text)
      .then(() => toast("Copiado."))
      .catch((e: Error) => toast(e.message));
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([summary], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fine-form-meu-cuidado.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="result-mark" aria-hidden="true">
        ↗
      </div>
      <h2 className="wizard-title">Sua solicitação foi recebida.</h2>
      <p>
        Seu pedido chegou ao painel de Mateus e aguarda análise e aceitação
        manual.
      </p>
      <section className="system-card receipt">
        <strong>{quote.reference}</strong>
        <a className="tracking-link" href={link}>
          {link}
        </a>
        <div className="system-actions">
          <a className="button orange" href={link}>
            Acompanhar pedido ↗
          </a>
          <button className="button outline" onClick={() => copy(link)}>
            Copiar link
          </button>
        </div>
        <p className="system-muted">
          Este link é privado. Guarde-o para acompanhar a resposta.
        </p>
      </section>
      <CustomerNotice quote={quote} token={token} />
      <Budget budget={quote.budget} />
      <pre className="summary-pre">{summary}</pre>
      <div className="result-actions">
        <button className="button orange" onClick={() => contact(summary)}>
          Enviar pelo WhatsApp ↗
        </button>
        <a className="button outline" href={emailMessage(config, summary)}>
          Enviar por e-mail
        </a>
        <button className="button outline" onClick={() => copy(summary)}>
          Copiar resumo
        </button>
        <button className="button outline" onClick={download}>
          Baixar .md ↓
        </button>
        <button
          className="button outline"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: "Meu cuidado — Fine Form",
                  text: summary,
                });
              else download();
            } catch (e) {
              if (e instanceof Error && e.name !== "AbortError")
                toast(e.message);
            }
          }}
        >
          Compartilhar ↗
        </button>
        <button className="text-link" onClick={onReset}>
          Preparar outro pedido
        </button>
      </div>
    </>
  );
}
