import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = { title: "Acessibilidade" };
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
        <a href="/cookies/">{"Cookies e dados"}</a>
        <a href="/acessibilidade/" aria-current="page">
          {"Acessibilidade"}
        </a>
        <a href="/informacoes/">{"Sobre a Fine Form"}</a>
        <a href="/creditos/">{"Créditos e imagens"}</a>
      </nav>
      <article className="legal-content">
        <a className="back-link" href="/">
          {"← Voltar à Fine Form"}
        </a>
        <p className="kicker">{"INFORMAÇÕES / FINE FORM"}</p>
        <h1>{"Acessibilidade"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "Queremos que você consiga conhecer os cuidados e falar com Mateus com autonomia. Se encontrar uma barreira, descreva o que aconteceu por "
          }
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {"."}
        </p>
        <h2>{"Teclado e leitura"}</h2>
        <ul>
          <li>
            {
              "Use Tab e Shift+Tab para percorrer links, botões e campos. Enter ou Espaço ativam os controles conforme o tipo."
            }
          </li>
          <li>
            {
              "O link “Ir para o conteúdo”, no início da página, permite pular a navegação."
            }
          </li>
          <li>
            {
              "O menu móvel possui botão de abrir e fechar. Escape fecha o menu e os diálogos."
            }
          </li>
          <li>
            {
              "Nos planos Care, há botões de anterior e próximo e opções de plano; as setas do teclado também navegam pelo carrossel."
            }
          </li>
          <li>
            {
              "Na galeria, o botão “Próximo” permite trocar a foto sem arrastar. Nas avaliações, as notas usam controles de opção do teclado."
            }
          </li>
          <li>
            {
              "Os campos têm rótulos; mensagens de erro e atualizações são identificadas para leitores de tela. Imagens de conteúdo têm texto alternativo e desenhos decorativos são ignorados na leitura."
            }
          </li>
        </ul>
        <h2>{"Movimento e contraste"}</h2>
        <p>
          {
            "Você pode pausar animações pelo botão “Animações” no rodapé. O site considera a preferência de movimento reduzido do aparelho. A abertura pode ser pulada e as páginas legais abrem diretamente. O ciano da marca é acompanhado de texto escuro; controles têm indicação de foco visível."
          }
        </p>
        <p>
          {
            "É possível ampliar o conteúdo pelo navegador. Em telas pequenas, textos e controles se reorganizam; tabelas de referência podem ser percorridas horizontalmente."
          }
        </p>
        <h2>{"Relatar uma dificuldade"}</h2>
        <p>
          {
            "Informe a página, a ação que tentou e, se possível, o navegador e a tecnologia assistiva usada. Não é necessário enviar diagnóstico ou dado de saúde. Também podemos orientar o atendimento por e-mail ou WhatsApp."
          }
        </p>
        <p>
          {
            "Estas são medidas de melhoria contínua. Esta declaração não é um certificado de conformidade integral. Referência técnica: "
          }
          <a href="https://www.w3.org/TR/WCAG22/" rel="noreferrer">
            {"WCAG 2.2"}
          </a>
          {"."}
        </p>
      </article>
    </main>
  );
}
