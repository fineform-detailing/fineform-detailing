"use client";
import { useState } from "react";
import { useApp, PrivacyDialog } from "../../components/layout/AppProvider";
import {
  ServiceMenu,
  CarePlans,
  GallerySection,
  VelocityBand,
  CareFolder,
  ClosingCTA,
} from "./HomeSections";
import { CarStory } from "../experience/CarStory";
import { PublicReviews } from "../reviews/PublicReviews";
export function HomeView() {
  const { contact } = useApp();
  const [privacy, setPrivacy] = useState(false);
  return (
    <>
      <main id="conteudo" className="home-composition" tabIndex={-1}>
        <CarStory />
        <section
          className="ff-section manifesto"
          aria-labelledby="manifesto-title"
        >
          <div className="section-index">{"A FORMA FINE FORM"}</div>
          <div className="manifesto-copy">
            <h2 id="manifesto-title">
              {"Cada detalhe merece"}
              <br />
              {"um cuidado próprio."}
            </h2>
            <p>
              {
                "Pintura, vidros, rodas, bancos e acabamentos. Cada material pede um cuidado próprio. Na Fine Form, a gente começa entendendo o veículo e o que você quer melhorar."
              }
            </p>
            <a className="underlined-link" href="#experiencia">
              {"Encontre seu ponto de partida "}
              <span>{"↗"}</span>
            </a>
          </div>
          <div className="manifesto-mark" aria-hidden="true"><img src="/assets/tentacle.svg" alt="" /></div>
        </section>
        <GallerySection />
        <ServiceMenu />
        <section
          className="ff-section process-section"
          id="como-funciona"
          aria-labelledby="process-title"
        >
          <div className="section-index">{"DO PEDIDO AO CUIDADO"}</div>
          <div className="process-layout">
            <div className="process-intro">
              <h2 id="process-title">
                {"Você escolhe."}
                <br />
                {"Eu "}
                <span>{"cuido."}</span>
              </h2>

            </div>
            <div className="process-steps">
              <article>
                <span>{"01"}</span>
                <div>
                  <h3>{"Conte sobre o veículo."}</h3>
                  <p>
                    {
                      "Carro ou moto, marca, modelo e o que gostaria de melhorar."
                    }
                  </p>
                </div>
              </article>
              <article>
                <span>{"02"}</span>
                <div>
                  <h3>{"Indique seu momento."}</h3>
                  <p>
                    {"Escolha os cuidados e uma preferência de data e horário."}
                  </p>
                </div>
              </article>
              <article>
                <span>{"03"}</span>
                <div>
                  <h3>{"Acompanhe seu cuidado."}</h3>
                  <p>
                    {
                      "O pedido chega ao meu painel. Você acompanha a resposta e o andamento pelo seu link privado, e a gente combina os detalhes."
                    }
                  </p>
                </div>
              </article>
            </div>
          </div>
          <div className="process-next">
            <a className="button orange" href="atendimento/">
              {"Preparar meu orçamento "}
              <span>{"↗"}</span>
            </a>
            <p>
              {
                "O orçamento enviado fica sujeito à análise de Mateus. A preferência de horário não confirma uma reserva."
              }
            </p>
          </div>
        </section>
        <CarePlans />
        <PublicReviews />
        <section
          className="ff-section personal-section"
          id="sobre"
          aria-labelledby="human-title"
        >
          <div className="section-index">{"PRAZER, MATEUS."}</div>
          <div className="personal-layout">
            <div>
              <h2 id="human-title">
                {"É comigo"}
                <br />
                {"que você "}
                <span>{"fala."}</span>
              </h2>
              <p>
                {
                  "Eu avalio o veículo, explico os cuidados possíveis e combino o que será feito antes de começar. Um veículo por vez, com atenção aos materiais e ao que você espera do atendimento."
                }
              </p>
              <div className="personal-actions">
                <button
                  className="button orange"
                  data-contact=""
                  onClick={() => contact()}
                >
                  {"Conversar no WhatsApp "}
                  <span>{"↗"}</span>
                </button>
                <a
                  className="underlined-link"
                  href="mailto:fineformcare@gmail.com"
                >
                  {"Prefiro e-mail ↗"}
                </a>
              </div>
            </div>
            <aside className="hours-panel">
              <p className="kicker">{"HORÁRIOS DE REFERÊNCIA"}</p>
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
                {"Atendimento somente com horário combinado."}
                <br />
                {
                  "Confirme data, duração e local com Mateus antes de se deslocar."
                }
              </p>
              <img
                src="/assets/logo-original.png"
                alt="Símbolo Fine Form"
                width="80"
                height="80"
              />
            </aside>
          </div>
        </section>
        <section
          className="ff-section faq-section"
          id="duvidas"
          aria-labelledby="faq-title"
        >
          <div>
            <p className="section-index">{"BOM SABER"}</p>
            <h2 id="faq-title">
              {"Antes de"}
              <br />
              <span>{"começar."}</span>
            </h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>
                {"Escolher um horário confirma minha reserva?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "Você indica sua preferência. Eu recebo seu pedido no painel, converso com você e confirmo o atendimento conforme a agenda. O site não bloqueia vagas."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Quanto tempo leva o serviço?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "Depende do veículo, dos materiais e do cuidado escolhido. O prazo é combinado na avaliação. Higienizações precisam de secagem; vitrificação também exige cura conforme o produto."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Qual a diferença entre Essencial e Premium?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "A Essencial custa R$ 100: lavagem externa e secagem, rodas e pneus nas partes acessíveis, aspiração, tapetes, painel, console e vidros. A Premium custa R$ 180 e inclui tudo isso, mais limpeza de emblemas, frestas e vãos de portas, proteção dos plásticos internos e cera na pintura. As duas recebem o mesmo capricho; a Premium acrescenta etapas de detalhamento e proteção."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Qual a diferença entre Premium e Extra?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "A Premium custa R$ 180 e inclui manutenção, detalhamento de frestas e emblemas, proteção dos plásticos internos e cera. O Extra custa R$ 1.590 e reúne também higienização profunda do interior, incluindo teto e cintos, plásticos externos, rodas e caixas de roda, tratamento dos vidros com repelência e polimento Premium quando necessário. Os bancos precisam de tempo para secar após a higienização."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Como funciona a vitrificação dos plásticos?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "Os plásticos externos sem pintura e compatíveis recebem limpeza, preparação e revestimento cerâmico próprio: R$ 220 para carros e R$ 150 para motos. No Extra, o acréscimo é de R$ 150, pois substitui o acabamento de manutenção já incluído. É um cuidado separado da vitrificação da pintura, com cura e entrega combinadas antes."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Vitrificação é a mesma coisa que cera?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "São finalizações diferentes. A vitrificação recebe preparação, remoção de resíduos e aplicação manual de revestimento cerâmico. Custa R$ 1.390 com preparação e realce, ou R$ 970 como complemento de um polimento ou do Extra. O prazo de cura e a manutenção dependem do produto e são combinados antes."
                }
              </p>
            </details>
            <details>
              <summary>
                {"O que está incluído no cuidado de motos?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "A Moto Premium cuida das superfícies estéticas acessíveis e inclui cera na pintura compatível. Não inclui motor, inferior/chassi, corrente/transmissão, desmontagem ou manutenção mecânica. Não aplicamos pretinho nos pneus nem acabamento escorregadio nas áreas de contato ou nos freios."
                }
              </p>
            </details>
            <details>
              <summary>
                {"Como funciona o Care mensal?"}
                <span>{"+"}</span>
              </summary>
              <p>
                {
                  "Cada plano vale para um veículo cadastrado e inclui uma quantidade de visitas no mês. Você escolhe o interesse pelo site e conversa comigo antes de contratar. Polimentos e higienizações profundas têm orçamento próprio."
                }
              </p>
            </details>
          </div>
        </section>
        <ClosingCTA />
      </main>
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
    </>
  );
}
