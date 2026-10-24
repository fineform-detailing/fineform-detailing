import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = {
  title: "Cancelamento e reembolso",
};
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/" aria-current="page">
          {"Cancelamento e reembolso"}
        </a>
        <a href="/cookies/">{"Cookies e dados"}</a>
        <a href="/acessibilidade/">{"Acessibilidade"}</a>
        <a href="/informacoes/">{"Sobre a Fine Form"}</a>
        <a href="/creditos/">{"Créditos e imagens"}</a>
      </nav>
      <article className="legal-content">
        <a className="back-link" href="/">
          {"← Voltar à Fine Form"}
        </a>
        <p className="kicker">{"INFORMAÇÕES / FINE FORM"}</p>
        <h1>{"Cancelamento e reembolso"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "Você pode pedir a correção ou retirada de uma solicitação de orçamento e tratar de remarcação, cancelamento ou reembolso pelo contato com Mateus. As condições aplicáveis consideram o que foi confirmado, contratado e pago, preservados os direitos legais."
          }
        </p>
        <a
          className="button orange"
          href="https://wa.me/5511959473298?text=Olá%2C%20Mateus!%20Quero%20tratar%20de%20um%20cancelamento%20ou%20reembolso."
        >
          {"Solicitar atendimento pelo WhatsApp ↗"}
        </a>
        <h2>{"Como pedir"}</h2>
        <p>
          {"Use "}
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {
            ". Informe a referência do pedido ou plano, o que deseja e a data combinada, se houver. Você não precisa enviar dados de cartão, senha ou código bancário. Guarde a mensagem e o protocolo ou confirmação recebida. O site abre seu aplicativo; confira e envie a mensagem para que a Fine Form a receba."
          }
        </p>
        <h2>{"Pedido ainda não confirmado"}</h2>
        <p>
          {
            "Uma preferência enviada pelo formulário não reserva horário e não gera cobrança no site. Avise se quiser desistir ou alterar o pedido. Se já houver confirmação ou pagamento por outro canal, informe isso para que o cancelamento e eventual devolução sejam tratados conforme a contratação e a lei."
          }
        </p>
        <h2>{"Contratação à distância e arrependimento"}</h2>
        <p>
          {
            "Nas contratações feitas fora do estabelecimento, inclusive pela internet ou telefone, aplica-se o direito de arrependimento de 7 dias nas hipóteses do art. 49 do Código de Defesa do Consumidor, contado da assinatura ou do recebimento do produto ou serviço conforme a situação. A solicitação pode ser feita pelo mesmo canal da contratação. Quando esse direito se aplica, a devolução segue a lei, sem multa de arrependimento."
          }
        </p>
        <p>
          {
            "Se houver pedido de execução do serviço dentro desse período, as condições precisam ser esclarecidas previamente. Não exigimos renúncia genérica ao direito de arrependimento."
          }
        </p>
        <h2>{"Serviço e valores pagos"}</h2>
        <p>
          {
            "Fora da hipótese de arrependimento, a análise considera o que foi contratado, se o serviço começou ou foi realizado, o motivo do pedido e os direitos do consumidor. Esta página não estabelece multa automática, perda integral de sinal ou exclusão geral de reembolso."
          }
        </p>
        <p>
          {
            "Se houver falha na prestação, permanecem as soluções legais, incluindo reexecução, restituição ou abatimento nas hipóteses aplicáveis. Envie a referência e descreva o problema para avaliação. O prazo operacional de um estorno depende do meio de pagamento e deve ser informado no atendimento; isso não altera o dever legal de restituição."
          }
        </p>
        <h2>{"Planos Care"}</h2>
        <p>
          {
            "O site não faz cobrança recorrente automática. Solicite a interrupção de próximas renovações e a análise de valores do ciclo pago, indicando as visitas utilizadas. As regras de ciclo e saldo não afastam o direito de arrependimento nem outros direitos legais. Não é necessário aceitar um novo plano para solicitar cancelamento."
          }
        </p>
        <p>
          {"Referências: "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
            rel="noreferrer"
          >
            {"Código de Defesa do Consumidor, especialmente arts. 20 e 49"}
          </a>
          {" e "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm"
            rel="noreferrer"
          >
            {"Decreto nº 7.962/2013"}
          </a>
          {"."}
        </p>
      </article>
    </main>
  );
}
