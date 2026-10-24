import { PrivacySettingsButton } from "../../components/layout/PrivacySettingsButton";
import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = {
  title: "Política de Privacidade",
};
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/" aria-current="page">
          {"Privacidade"}
        </a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
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
        <h1>{"Política de Privacidade"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "Ao enviar uma solicitação de orçamento, seus dados são usados para responder ao contato e organizar as etapas que você combinar com Mateus. O envio não confirma atendimento nem autoriza publicidade."
          }
        </p>
        <h2>{"Responsável e contato"}</h2>
        <p>
          {
            "Este é o site da Fine Form. Mateus administra o site e o contato sobre as solicitações recebidas. Os canais de contato e a identificação do fornecedor, quando cadastrada, estão na página de informações da Fine Form. Para assuntos de privacidade e direitos sobre dados pessoais, fale por "
          }
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {". Consulte também as "}
          <a href="/informacoes/">{"informações da Fine Form"}</a>
          {"."}
        </p>
        <h2>{"O que é solicitado"}</h2>
        <ul>
          <li>
            {
              "Pedido: nome de contato, telefone, marca e modelo do veículo, cuidados escolhidos e, se desejar, preferências de agenda e observações."
            }
          </li>
          <li>
            {
              "Atendimento e Care, quando houver: histórico do pedido, orçamento, mensagens, visitas, ciclos e registros de pagamento confirmados por Mateus. A placa é conferida presencialmente; não é pedida no orçamento inicial."
            }
          </li>
          <li>
            {
              "Avaliação: nota, comentário opcional, primeiro nome e registro da autorização de publicação, vinculados ao atendimento entregue."
            }
          </li>
          <li>
            {
              "Segurança: informações técnicas de conexão, controles de acesso e registros de operações do painel. O provedor de hospedagem processa dados técnicos necessários ao serviço."
            }
          </li>
        </ul>
        <p>
          {
            "Não há campo de documento pessoal, cartão, senha bancária ou localização precisa no pedido. Não envie dados sensíveis nem dados de outras pessoas nas observações."
          }
        </p>
        <h2>{"Finalidades e fundamentos"}</h2>
        <p>
          {
            "Dados necessários a orçamento, agenda, atendimento e Care são tratados para procedimentos preliminares solicitados por você e execução do contrato. Registros que a lei exigir e os necessários ao exercício de direitos têm essas finalidades específicas. A autorização separada de avaliação serve somente à publicação; notificações do navegador dependem de sua escolha. O pedido não inscreve você em publicidade."
          }
        </p>
        <h2>{"Onde ficam e com quem são compartilhados"}</h2>
        <p>
          {
            "O sistema é hospedado na Cloudflare e usa seu banco D1. O painel possui autenticação e controle de acesso; o acompanhamento usa um link privado. A infraestrutura de prestadores pode envolver processamento fora do Brasil, sujeito aos requisitos aplicáveis de proteção e transferência de dados. Não vendemos dados pessoais."
          }
        </p>
        <p>
          {
            "WhatsApp, Instagram, TikTok e e-mail são links externos. Abrir um deles envolve as regras do serviço escolhido. O site só prepara mensagens; o envio depende de sua ação. Se você ativar um convite de avaliação pelo navegador, o provedor de notificações do aparelho processará a entrega. Não carregamos widgets de redes sociais nem pixels de anúncios."
          }
        </p>
        <h2>{"Tempo de conservação"}</h2>
        <p>
          {
            "Pedidos, cadastro e histórico são conservados enquanto necessários ao atendimento, ao vínculo Care e às obrigações legais ou ao exercício de direitos. A necessidade de cada registro deve ser avaliada ao encerrar a relação ou receber uma solicitação; não há exclusão automática de registros financeiros pelo site. A resposta a um pedido de eliminação informa o que pode ser apagado e o fundamento de eventual conservação."
          }
        </p>
        <p>
          {
            "O rascunho opcional expira após 30 dias sem atualização; links salvos no aparelho expiram em até 90 dias. A limpeza acontece quando você volta a usar o site ou solicita a remoção. Fechar uma aba encerra o armazenamento de sessão conforme o navegador. Consulte o "
          }
          <a href="/cookies/">{"inventário de armazenamento"}</a>
          {"."}
        </p>
        <h2>{"Seus direitos e como solicitar"}</h2>
        <p>
          {
            "Você pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamentos, portabilidade quando aplicável, e análise de bloqueio, anonimização ou eliminação. Também pode retirar consentimentos. Fale por "
          }
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {
            ", diga qual direito quer exercer e indique a referência do atendimento, se tiver. Não envie o link privado inteiro nem documentos na primeira mensagem. A confirmação de identidade será limitada ao necessário."
          }
        </p>
        <p>
          {
            "Pedidos de confirmação ou acesso seguem as formas e prazos do art. 19 da LGPD, inclusive declaração completa em até 15 dias. Outros direitos seguem os prazos legais aplicáveis. Se necessário, você pode recorrer à ANPD e aos órgãos de defesa do consumidor."
          }
        </p>
        <h2>{"Avaliações, notificações e dados no aparelho"}</h2>
        <p>
          {
            "Para retirar uma avaliação do site, abra o mesmo link de avaliação e use “Retirar autorização de publicação”. Isso despublica a avaliação e remove nome e comentário; o registro restrito da nota e da revogação fica vinculado ao pedido para comprovação da operação. Para solicitar eliminação adicional, use o contato de privacidade. Retirar a autorização não prejudica o atendimento."
          }
        </p>
        <p>
          {
            "Notificações são opcionais e podem ser desligadas no acompanhamento ou nas permissões do navegador. Para apagar os rascunhos e links deste aparelho, use "
          }
          <PrivacySettingsButton>
            {"Preferências de privacidade"}
          </PrivacySettingsButton>
          {". Essa ação local não apaga os registros no sistema."}
        </p>
        <h2>{"Cuide do seu link"}</h2>
        <p>
          {
            "Quem tiver o link privado completo poderá abrir aquele acompanhamento e o local de atendimento, se Mateus o tiver liberado naquele pedido. O endereço é informado antes da confirmação do atendimento. Guarde o link com cuidado, evite aparelhos compartilhados e peça a Mateus a troca do link se ele for exposto. Retirar o local do acompanhamento impede novas consultas nessa página, mas não apaga mensagens, cópias ou capturas já recebidas."
          }
        </p>
        <p>
          {"Referência: "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm"
            rel="noreferrer"
          >
            {"Lei Geral de Proteção de Dados"}
          </a>
          {"."}
        </p>
      </article>
    </main>
  );
}
