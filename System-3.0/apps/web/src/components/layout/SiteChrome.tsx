"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { socialContacts } from "@domain/contacts.mjs";
import { config } from "../../models/config";
import { useApp, PrivacyDialog } from "./AppProvider";
import { SocialIcon } from "../ui/SocialIcon";
import { Intro } from "../motion/Intro";
export function SiteChrome({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false),
    [privacy, setPrivacy] = useState(false);
  const path = usePathname();
  const admin = path.startsWith("/painel");
  const { paused, toggleMotion } = useApp();
  useEffect(() => {
    const name = path.startsWith("/atendimento")
      ? "booking"
      : path.startsWith("/acompanhar")
        ? "tracking"
        : path.startsWith("/assinatura")
          ? "membership"
          : path.startsWith("/avaliar")
            ? "review"
            : path.startsWith("/painel")
              ? "admin"
              : path === "/links/"
                ? "links"
                : path === "/"
                  ? "home"
                  : "legal";
    document.body.dataset.page = name;
    document.body.classList.toggle("legal-page", name === "legal");
    setOpen(false);
  }, [path]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      {!admin && (
        <header className="site-header">
          <a className="brand" href="/" aria-label="Fine Form, página inicial">
            <img className="brand-symbol" src="/assets/logo-original.png" alt="" width={32} height={32} /><span className="brand-title">FINE FORM</span>
          </a>
          <nav
            id="main-nav"
            className={"nav-links " + (open ? "open" : "")}
            aria-label="Navegação principal"
          >
            {[
              ["/#cuidados", "Cuidados"],
              ["/#care", "Planos"],
              ["/#sobre", "Sobre"],
              ["/#avaliacoes", "Avaliações"],
              ["/acompanhar/", "Meus pedidos"],
            ].map(([href, label]) => (
              <a href={href} key={label} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <a className="header-cta" href="/atendimento/">
              <span className="cta-prefix">Vamos </span>conversar ↗
            </a>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={open}
              aria-controls="main-nav"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen(!open)}
            >
              ☰
            </button>
          </div>
        </header>
      )}
      {children}
      {!admin && (
        <footer className="site-footer">
          <div className="footer-strip">
            <span className="footer-copyright">
              © {new Date().getFullYear()} FINE FORM
            </span>
            <a className="footer-symbol" href="/" aria-label="Página inicial">
              <img
                src="/assets/logo-original.png"
                alt=""
                width="44"
                height="44"
              />
            </a>
            <nav
              className="footer-socials"
              aria-label="Redes sociais e contatos"
            >
              {socialContacts(config).map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target={s.key === "email" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                >
                  <SocialIcon kind={s.key} />
                  <span className="sr-only">{s.label}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="footer-bottom">
            <a href="/links/">Todos os links ↗</a>
            <div className="footer-utilities">
              <a href="/privacidade/">Privacidade</a>
              <details className="footer-information">
                <summary>Informações +</summary>
                <nav className="footer-information-panel">
                  {[
                    ["termos", "Termos"],
                    ["cancelamento-e-reembolso", "Cancelamento e reembolso"],
                    ["cookies", "Cookies e dados"],
                    ["acessibilidade", "Acessibilidade"],
                    ["informacoes", "Sobre a Fine Form"],
                    ["creditos", "Créditos"],
                  ].map(([slug, label]) => (
                    <a key={slug} href={"/" + slug + "/"}>
                      {label}
                    </a>
                  ))}
                </nav>
              </details>
              <button
                type="button"
                className="footer-data-settings"
                onClick={() => setPrivacy(true)}
              >
                Gerenciar dados neste aparelho
              </button>
              <button
                type="button"
                className="motion-toggle"
                aria-pressed={paused}
                onClick={toggleMotion}
              >
                {paused ? "▶ Retomar animações" : "Ⅱ Pausar animações"}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  window.dispatchEvent(new Event("ff:replay-intro"))
                }
              >
                Rever abertura
              </button>
            </div>
          </div>
        </footer>
      )}
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
      <Intro />
    </>
  );
}
