"use client";
import { useState } from "react";
import { useApp, PrivacyDialog } from "../../components/layout/AppProvider";
import { SocialLinks } from "./HomeSections";
export function LinksView() {
  const { contact } = useApp();
  const [privacy, setPrivacy] = useState(false);
  return (
    <>
      <main className="links-page" id="conteudo" tabIndex={-1}>
        <header className="links-top">
          <a className="brand" href="/" aria-label="Fine Form, página inicial">
            <span className="brand-title">{"FINE FORM"}</span>
          </a>
          <a className="back-link" href="/">
            {"Conheça o site "}
            <span aria-hidden="true">{"↗"}</span>
          </a>
        </header>
        <div className="links-layout">
          <section
            className="links-intro links-enter"
            aria-labelledby="links-title"
          >
            <h1 id="links-title">
              {"Seu próximo cuidado,"}
              <br />
              <span>{"em um só lugar."}</span>
            </h1>
            <p>
              {"Carros e motos. Atenção aos detalhes."}
              <br />
              {"Conversa direta com Mateus."}
            </p>
            <figure className="links-photo">
              <img
                src="/assets/modern-gt3.webp"
                alt="Frente de um Porsche 911 GT3 moderno, fotografia editorial de Erik Fabian"
                width="933"
                height="1400"
                fetchPriority="high"
              />
              <figcaption>
                <span>
                  {"FINE FORM "}
                  <b>{"CAR CARE"}</b>
                </span>
                <span>{"FOTOGRAFIA EDITORIAL"}</span>
              </figcaption>
            </figure>
          </section>
          <section
            className="links-destinations"
            aria-label="Cuidados, planos e contatos"
          >
            <a className="links-request links-enter" href="/atendimento/">
              <span>
                {"Escolher meu cuidado"}
                <small>
                  {"Prepare seu orçamento e acompanhe a análise de Mateus."}
                </small>
              </span>
              <b aria-hidden="true">{"↗"}</b>
            </a>
            <nav className="bio-nav" aria-label="Links Fine Form">
              <a className="links-enter" href="/acompanhar/">
                <span>
                  {"Meus pedidos"}
                  <small>{"Abra seu acompanhamento privado."}</small>
                </span>
                <b aria-hidden="true">{"↗"}</b>
              </a>
              <a className="links-enter" href="/#cuidados">
                <span>
                  {"Cuidados e preços"}
                  <small>
                    {"Lavagens, polimentos, higienização e proteção."}
                  </small>
                </span>
                <b aria-hidden="true">{"↗"}</b>
              </a>
              <a className="links-enter" href="/#care">
                <span>
                  {"Planos Fine Form Care"}
                  <small>{"Uma rotina de cuidado para carro ou moto."}</small>
                </span>
                <b aria-hidden="true">{"↗"}</b>
              </a>
              <a className="links-enter" href="/#experiencia">
                <span>
                  {"Ajuda para escolher"}
                  <small>{"Encontre o foco: pintura, interior ou moto."}</small>
                </span>
                <b aria-hidden="true">{"↗"}</b>
              </a>
              <button
                className="links-enter"
                type="button"
                data-contact=""
                onClick={() => contact()}
              >
                <span>
                  {"Conversar com Mateus"}
                  <small>{"Atendimento pessoal pelo WhatsApp."}</small>
                </span>
                <b aria-hidden="true">{"↗"}</b>
              </button>
            </nav>
            <div className="links-contact-block links-enter">
              <h2>{"Encontre a Fine Form"}</h2>
              <SocialLinks />
            </div>
            <aside
              className="bio-hours links-enter"
              aria-labelledby="links-hours-title"
            >
              <h2 id="links-hours-title">{"Horários de referência"}</h2>
              <dl>
                <div>
                  <dt>{"Segunda a sábado"}</dt>
                  <dd>{"9h — 17h30"}</dd>
                </div>
                <div>
                  <dt>{"Domingo"}</dt>
                  <dd>{"9h — 12h"}</dd>
                </div>
              </dl>
              <p>
                {
                  "Atendimento somente com horário combinado. Confirme data e local com Mateus antes de se deslocar."
                }
              </p>
            </aside>
          </section>
        </div>
        <footer className="links-end">
          <a
            className="links-footmark"
            href="/"
            aria-label="Fine Form, página inicial"
          >
            <img
              src="/assets/logo-original.png"
              alt=""
              width="30"
              height="30"
            />
            <span>{"FINE FORM / CAR CARE"}</span>
          </a>
          <div className="links-utilities">
            <button
              className="motion-toggle"
              id="motion-toggle"
              type="button"
              aria-pressed="false"
              aria-label="Pausar animações decorativas"
            >
              <span aria-hidden="true">{"Ⅱ"}</span>
              <span className="motion-label">{"Animações"}</span>
            </button>
          </div>
          <div className="footer-resources">
            <a href="/privacidade/">{"Privacidade"}</a>
            <details className="footer-information">
              <summary>
                {"Informações "}
                <span aria-hidden="true">{"+"}</span>
              </summary>
              <div className="footer-information-panel">
                <nav className="footer-legal" aria-label="Informações legais">
                  <a href="/termos/">{"Termos de serviço"}</a>
                  <a href="/cancelamento-e-reembolso/">
                    {"Cancelamento e reembolso"}
                  </a>
                  <a href="/cookies/">{"Cookies e dados"}</a>
                  <a href="/acessibilidade/">{"Acessibilidade"}</a>
                  <a href="/informacoes/">{"Sobre a Fine Form"}</a>
                  <a href="/creditos/">{"Créditos e imagens"}</a>
                </nav>
                <button
                  type="button"
                  className="footer-data-settings"
                  data-cookie-settings=""
                  onClick={() => setPrivacy(true)}
                >
                  {"Gerenciar dados neste aparelho"}
                </button>
              </div>
            </details>
          </div>
        </footer>
      </main>
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
    </>
  );
}
