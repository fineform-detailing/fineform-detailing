import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = {
  title: "Informações da Fine Form",
};
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
        <a href="/cookies/">{"Cookies e dados"}</a>
        <a href="/acessibilidade/">{"Acessibilidade"}</a>
        <a href="/informacoes/" aria-current="page">
          {"Sobre a Fine Form"}
        </a>
        <a href="/creditos/">{"Créditos e imagens"}</a>
      </nav>
      <article className="legal-content">
        <a className="back-link" href="/">
          {"← Voltar à Fine Form"}
        </a>
        <p className="kicker">{"INFORMAÇÕES / FINE FORM"}</p>
        <h1>{"Informações da Fine Form"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "Atendimento por solicitação e confirmação de Mateus. O formulário não reserva horário e não gera cobrança automática."
          }
        </p>
        <dl>
          <dt>{"MARCA"}</dt>
          <dd>{"Fine Form"}</dd>
          <dt>{"CONTATO RESPONSÁVEL PELO ATENDIMENTO"}</dt>
          <dd>{"Mateus"}</dd>
          <dt>{"E-MAIL DE ATENDIMENTO E PRIVACIDADE"}</dt>
          <dd>
            <a href="mailto:fineformcare@gmail.com">
              {"fineformcare@gmail.com"}
            </a>
          </dd>
          <dt>{"WHATSAPP"}</dt>
          <dd>
            <a href="https://wa.me/5511959473298" rel="noreferrer">
              {"+55 (11) 95947-3298"}
            </a>
          </dd>
          <dt>{"HORÁRIOS DE REFERÊNCIA"}</dt>
          <dd>
            {
              "Segunda a sábado, 9h às 17h30. Domingo, 9h às 12h. Datas, horários e atendimento em feriados dependem de combinação."
            }
          </dd>
        </dl>
        <BusinessIdentity />
        <h2>{"Antes de confirmar"}</h2>
        <p>
          {
            "Confira com Mateus a identificação do fornecedor, o endereço, o escopo, o valor total, a forma de pagamento e o horário. O local pode ser informado no acompanhamento privado do seu pedido ou pelo WhatsApp. Compartilhar o endereço não confirma serviço nem agenda."
          }
        </p>
        <p>
          <a href="/termos/">{"Termos de serviço"}</a>
          {" · "}
          <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
          {" · "}
          <a href="/privacidade/">{"Privacidade"}</a>
        </p>
      </article>
    </main>
  );
}
