"use client";
import { useRef, useState } from "react";
import FolderFloat from "../../components/motion/FolderFloat.jsx";
import {
  services,
  extras,
  plans,
  findService,
  money,
  extraPrice,
  polishIds,
} from "@domain/catalog.mjs";
import { socialContacts } from "@domain/contacts.mjs";
import { SocialIcon } from "../../components/ui/SocialIcon";
import { Modal } from "../../components/ui/primitives";
import { config } from "../../models/config";
import { useApp } from "../../components/layout/AppProvider";
export function ServiceMenu() {
  const [vehicle, setVehicle] = useState("car"),
    [selected, setSelected] = useState("");
  const service = findService(selected);
  const base = services.filter(
    (s) => s.vehicle === vehicle && s.class !== "Classe C",
  );
  return (
    <section className="ff-section menu-section" id="cuidados">
      <div className="section-index">O MENU / CUIDADO AUTOMOTIVO</div>
      <div className="menu-heading">
        <h2>
          O cuidado certo.
          <br />
          <span>Para o seu momento.</span>
        </h2>
        <p>
          Conheça o que faz parte de cada cuidado. Mateus ajuda você a escolher.
        </p>
      </div>
      <div className="menu-tabs">
        <div
          className="segmented"
          data-vehicle={vehicle}
          role="group"
          aria-label="Tipo de veículo"
        >
          {[
            ["car", "Carros"],
            ["moto", "Motos"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={vehicle === id ? "active" : ""}
              aria-pressed={vehicle === id}
              onClick={() => setVehicle(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="service-grid">
        {base.map((s, i) => (
          <article
            className={
              "service-row " + (s.id === "extra" ? "service-complete" : "")
            }
            key={s.id}
          >
            <span className="menu-number">0{i + 1}</span>
            <div className="menu-row-copy">
              <h3>{s.label}</h3>
              <p className="service-positioning">{s.tag}</p>
              <p>{s.description}</p>
            </div>
            <div className="menu-row-price">
              <small>ATENDIMENTO AVULSO</small>
              <strong>{money(s.price)}</strong>
            </div>
            <button
              type="button"
              className="service-open"
              onClick={() => setSelected(s.id)}
              aria-label={"Ver o que está incluído no " + s.label}
            >
              <span>Ver cuidado</span>
              <b>↗</b>
            </button>
          </article>
        ))}
      </div>
      {vehicle === "car" && (
        <section id="paint-treatments">
          <h3>Higienização, polimento e proteção.</h3>
          <div id="treatment-grid" className="treatment-grid">
            {[...polishIds, "coating", "fullClean"].map((id, i) => {
              const s = findService(id)!;
              return (
                <article className="treatment-item" key={id}>
                  <span className="treatment-number">0{i + 1}</span>
                  <div>
                    <h4>{s.label}</h4>
                    <p>{s.description}</p>
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => setSelected(id)}
                    >
                      Ver cuidado ↗
                    </button>
                  </div>
                  <span className="treatment-price">{money(s.price)}</span>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <details className="area-menu">
        <summary>Cuidados por área +</summary>
        <div id="extra-menu" className="extra-menu">
          {extras
            .filter((e) => e.vehicle === "both" || e.vehicle === vehicle)
            .map((e) => (
              <article className="extra-item" key={e.id}>
                <div className="extra-title">
                  <h4>{e.label}</h4>
                  <span>{money(extraPrice(e, vehicle))}</span>
                </div>
                <p>{e.description}</p>
              </article>
            ))}
        </div>
      </details>
      {service && (
        <Modal title={service.label} onClose={() => setSelected("")}>
          <p>{service.description}</p>
          {service.sections ? (
            service.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <ul>
              {service.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {service.notice && <p className="notice-box">{service.notice}</p>}
          <p>Valor do serviço: {money(service.price)}.</p>
          <a
            className="button dark-button"
            href={
              "/atendimento/?vehicle=" +
              service.vehicle +
              "&service=" +
              service.id
            }
          >
            Tenho interesse ↗
          </a>
        </Modal>
      )}
    </section>
  );
}
export function CarePlans() {
  const [active, setActive] = useState(0);
  const p = plans[active];
  return (
    <section className="ff-section care-section" id="care">
      <div className="section-index">FINE FORM CARE / TODO MÊS</div>
      <div className="care-heading">
        <h2>
          O cuidado
          <br />
          <span>vira rotina.</span>
        </h2>
        <p>
          Escolha um Care para um único veículo. Pagamento e renovação
          combinados com Mateus.
        </p>
      </div>
      <div
        className="care-tabs flex flex-wrap gap-2"
        role="group"
        aria-label="Planos Care"
      >
        {plans.map((plan, i) => (
          <button
            type="button"
            className={"button " + (i === active ? "orange" : "outline")}
            aria-pressed={i === active}
            key={plan.id}
            onClick={() => setActive(i)}
          >
            {plan.name}
          </button>
        ))}
      </div>
      <article className="plan-card system-card" id="plan-grid">
        <p className="kicker">{p.visits} VISITAS POR CICLO MENSAL</p>
        <h3>{p.name}</h3>
        <p>{p.description}</p>
        <strong className="text-4xl">
          {money(p.price)}
          <small className="text-base">/mês</small>
        </strong>
        <p>
          Economia de {money(p.saving)} em relação aos atendimentos avulsos do
          plano.
        </p>
        <p className="system-muted">
          Um veículo cadastrado pessoalmente. Saldo não acumula. Sem cobrança
          automática.
        </p>
        <a className="button orange" href={"/atendimento/?plan=" + p.id}>
          Quero este Care ↗
        </a>
      </article>
    </section>
  );
}
const images = [
  {
    src: "modern-gt3",
    alt: "Porsche 911 GT3, fotografia editorial de Erik Fabian",
    title: "Pintura e brilho.",
    description:
      "Realce, correção por polimento e proteção cerâmica. O teste da pintura define o caminho.",
    area: "pintura",
  },
  {
    src: "modern-interior",
    alt: "Interior BMW, fotografia editorial de Divaris Shirichena",
    title: "De dentro para fora.",
    description:
      "Bancos, plásticos, painel e carpete. Cada material pede um cuidado.",
    area: "interior",
  },
  {
    src: "modern-ducati",
    alt: "Ducati Panigale, fotografia editorial de Jan Kopřiva",
    title: "Também em duas rodas.",
    description:
      "Moto Premium, com respeito aos materiais e às áreas de contato.",
    area: "moto",
  },
];
export function GallerySection() {
  const [active, setActive] = useState(0);
  const swiped = useRef(false);
  const current = images[active];
  const next = () => setActive((v) => (v + 1) % images.length);
  return (
    <section className="explorer-section" id="experiencia">
      <div className="explorer-heading">
        <p className="section-index">ENCONTRE SEU FOCO</p>
        <h2>
          Um bom cuidado
          <br />
          começa <span>aqui.</span>
        </h2>
        <p>Explore as fotos. Escolha a parte que merece atenção.</p>
      </div>
      <div className="explorer-inner">
        <div className="explorer-media">
          <button
            className="native-stack gallery-react"
            type="button"
            onClick={() => {
              if (swiped.current) {
                swiped.current = false;
                return;
              }
              next();
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setActive((v) => (v + 2) % 3);
              }
            }}
            aria-label="Próxima foto de cuidado"
            onTouchStart={(e) => {
              swiped.current = false;
              e.currentTarget.dataset.start = String(e.touches[0].clientX);
              e.currentTarget.dataset.startY = String(e.touches[0].clientY);
            }}
            onTouchEnd={(e) => {
              const dx =
                  e.changedTouches[0].clientX -
                  Number(e.currentTarget.dataset.start),
                dy =
                  e.changedTouches[0].clientY -
                  Number(e.currentTarget.dataset.startY);
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                swiped.current = true;
                if (dx < 0) next();
                else setActive((v) => (v + 2) % 3);
              }
            }}
          >
            <img
              src={"/assets/" + current.src + ".webp"}
              alt={current.alt}
              loading="lazy"
              width={933}
              height={1100}
            />
          </button>
          <span className="photo-tag">FINE FORM / OLHAR EDITORIAL</span>
        </div>
        <div className="explorer-detail">
          <div className="explorer-navigation">
            <span className="explorer-counter" aria-live="polite">
              0{active + 1} / 03
            </span>
            <div className="gallery-controls">
              <button
                className="next-photo"
                onClick={() => setActive((v) => (v + 2) % 3)}
                aria-label="Cuidado anterior"
              >
                ←
              </button>
              <button className="next-photo" onClick={next}>
                Próximo ↗
              </button>
            </div>
          </div>
          <div className="explorer-caption">
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <a
              className="button dark-button"
              href={
                current.area === "moto"
                  ? "/atendimento/?vehicle=moto&service=motoPremium"
                  : "/atendimento/?mode=guidance&area=" + current.area
              }
            >
              Quero cuidar desta parte ↗
            </a>
          </div>
          <p className="drag-help">Toque na foto ou use as setas.</p>
        </div>
      </div>
    </section>
  );
}
export function VelocityBand() {
  const { paused } = useApp();
  return (
    <div className="velocity-band" aria-hidden="true">
      <div
        className={"native-marquee-track " + (paused ? "motion-paused" : "")}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i}>LIMPAR. CORRIGIR. PROTEGER. ✳ </span>
        ))}
      </div>
    </div>
  );
}
export function CareFolder() {
  const { paused } = useApp();
  return <FolderFloat motionEnabled={!paused} />;
}
export function ClosingCTA() {
  return (
    <section className="closing-section">
      <div className="closing-panel">
        <p className="kicker">SEU PRÓXIMO CUIDADO</p>
        <h2>
          Tudo começa
          <br />
          com uma boa conversa.
        </h2>
        <p>Conte o que seu veículo precisa. Eu ajudo você a escolher.</p>
        <a className="button orange" href="/atendimento/">
          Preparar meu atendimento ↗
        </a>
      </div>
    </section>
  );
}
export function SocialLinks() {
  return (
    <>
      {socialContacts(config).map((s) => (
        <a
          className="social-link"
          key={s.key}
          href={s.url}
          target={s.key === "email" ? undefined : "_blank"}
          rel="noopener noreferrer"
        >
          <SocialIcon kind={s.key} />
          <span>{s.label}</span>
        </a>
      ))}
    </>
  );
}
