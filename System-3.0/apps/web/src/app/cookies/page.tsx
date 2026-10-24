import { PrivacySettingsButton } from "../../components/layout/PrivacySettingsButton";
import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = {
  title: "Cookies e dados no aparelho",
};
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
        <a href="/cookies/" aria-current="page">
          {"Cookies e dados"}
        </a>
        <a href="/acessibilidade/">{"Acessibilidade"}</a>
        <a href="/informacoes/">{"Sobre a Fine Form"}</a>
        <a href="/creditos/">{"Créditos e imagens"}</a>
      </nav>
      <article className="legal-content">
        <a className="back-link" href="/">
          {"← Voltar à Fine Form"}
        </a>
        <p className="kicker">{"INFORMAÇÕES / FINE FORM"}</p>
        <h1>{"Cookies e dados no aparelho"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "Esta versão não carrega Google Analytics, Meta Pixel, publicidade, mapas incorporados ou widgets de redes sociais. Não há cookies opcionais de rastreamento para aceitar ou rejeitar."
          }
        </p>
        <p>
          {
            "Cookies são pequenos registros usados pelo navegador. O site também usa armazenamento local e de sessão, com finalidades diferentes. Recursos necessários de segurança não são uma autorização para publicidade."
          }
        </p>
        <div className="legal-table-wrap">
          <table>
            <caption>{"Armazenamento usado por esta versão"}</caption>
            <thead>
              <tr>
                <th scope="col">{"Recurso"}</th>
                <th scope="col">{"Finalidade e escolha"}</th>
                <th scope="col">{"Duração"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{"Sessão do painel"}</th>
                <td>
                  {
                    "Cookie de autenticação restrito ao administrador, protegido por HttpOnly, Secure em produção e SameSite. Não é criado pelo formulário público."
                  }
                </td>
                <td>
                  {
                    "Conforme a sessão, até sair ou expirar; sujeita a limite de inatividade."
                  }
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>{"ff-care-draft-v1"}</code>
                </th>
                <td>
                  {
                    "Rascunho com dados preenchidos. Opcional, habilitado por “Guardar meu rascunho”."
                  }
                </td>
                <td>
                  {
                    "30 dias sem atualização; limpo na próxima visita ou ao apagar."
                  }
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>{"ff-orders-v2"}</code>
                </th>
                <td>
                  {
                    "Links privados de pedidos. Novos links só são guardados se você escolher. Evite em aparelhos compartilhados."
                  }
                </td>
                <td>
                  {
                    "Até 90 dias; limpeza na próxima consulta ou ao apagar. Links antigos recebem esse prazo na primeira visita à versão atual."
                  }
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>{"ff-pending-submission"}</code>
                  {", "}
                  <code>{"ff-care-request-*"}</code>
                </th>
                <td>
                  {
                    "Armazenamento de sessão para evitar repetição de um mesmo envio. Pode conter os dados desse pedido."
                  }
                </td>
                <td>
                  {
                    "Até o envio ser confirmado, até recomeçar ou até encerrar a sessão da aba, conforme o navegador. Se a conexão falhar, o registro é mantido para permitir nova tentativa sem duplicação."
                  }
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>{"ff-intro-seen-v1"}</code>
                  {", "}
                  <code>{"ff-intro-navigation-v1"}</code>
                </th>
                <td>
                  {
                    "Controle da abertura e transições, sem identificação de visitante."
                  }
                </td>
                <td>
                  {
                    "Sessão da aba; a indicação de navegação é válida por 15 segundos."
                  }
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>{"ff-motion-paused"}</code>
                </th>
                <td>{"Preferência escolhida para pausar animações."}</td>
                <td>
                  {"Até alterar a preferência ou limpar os dados do site."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h2>{"Gerenciar e apagar"}</h2>
        <p>
          {"Use "}
          <PrivacySettingsButton>
            {"Preferências de privacidade"}
          </PrivacySettingsButton>
          {
            " para remover rascunhos e links locais. Você também pode desmarcar “Guardar meu rascunho” no formulário e usar “Apagar links deste aparelho” em Meus pedidos. O navegador permite apagar todos os dados do site e revogar notificações. Apagar dados do aparelho não cancela o atendimento nem elimina o que está no sistema da Fine Form."
          }
        </p>
        <h2>{"Notificações e serviços externos"}</h2>
        <p>
          {
            "O convite de avaliação por notificação é opcional. A permissão e a inscrição do aparelho só são solicitadas quando você escolhe ativar esse recurso; não são cookies de publicidade. A hospedagem pode aplicar recursos técnicos de segurança e registrar acessos. WhatsApp e outros serviços externos seguem suas próprias regras depois que você abre seus links."
          }
        </p>
        <h2>{"Se isso mudar"}</h2>
        <p>
          {
            "Qualquer futura ferramenta opcional de análise ou publicidade deverá ter sua finalidade informada e permanecer desativada até uma escolha válida, quando o consentimento for a base aplicável. Fechar o aviso, enviar um pedido ou continuar navegando não constitui essa escolha."
          }
        </p>
        <p>
          {"Mais informações na "}
          <a href="/privacidade/">{"Política de Privacidade"}</a>
          {" e no "}
          <a
            href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais"
            rel="noreferrer"
          >
            {"guia de cookies da ANPD"}
          </a>
          {"."}
        </p>
      </article>
    </main>
  );
}
