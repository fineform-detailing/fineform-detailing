import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = { title: "Termos de serviço" };
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/" aria-current="page">
          {"Termos de serviço"}
        </a>
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
        <h1>{"Termos de serviço"}</h1>
        <p className="legal-date">
          {"Versão de 22 de outubro de 2026 · revisão 3"}
        </p>
        <p className="legal-lead">
          {
            "O site apresenta os cuidados da Fine Form e permite enviar solicitações de orçamento. O envio registra uma solicitação de orçamento. Serviço, data e horário dependem da aceitação e confirmação de Mateus. Não há reserva ou cobrança automática."
          }
        </p>
        <h2>{"Solicitação, orçamento e confirmação manual"}</h2>
        <p>
          {
            "O formulário registra a solicitação como recebida e pendente de análise. O cliente não aceita o próprio orçamento nem altera o andamento pelo link de acompanhamento. Aceitação, recusa e evolução do serviço são registradas por Mateus no painel. Recusar uma solicitação não significa cancelar um atendimento já confirmado; o contexto de cada etapa fica no histórico."
          }
        </p>
        <p>
          {
            "Você escolhe o veículo, os cuidados e, se quiser, uma preferência de data e horário. Mateus avalia a solicitação e informa escopo, valor completo, forma de pagamento, duração, local de atendimento, identificação do fornecedor e disponibilidade antes da confirmação da contratação. A liberação do endereço no acompanhamento ou por WhatsApp não confirma o agendamento. Não se desloque sem combinar data e horário. Guarde a confirmação e o resumo do que foi combinado. É possível corrigir as escolhas antes de enviar ou conversar depois usando a referência do pedido."
          }
        </p>
        <p>
          {
            "Os valores apresentados correspondem aos cuidados descritos. Sujidade excepcional, estado do material e trabalhos adicionais devem ser avaliados e informados antes, com sua aprovação. Etapas em comum são consideradas no orçamento. O site não processa cartão nem faz débito automático."
          }
        </p>
        <h2>{"Cuidados e resultados"}</h2>
        <p>
          {
            "O resultado depende do estado da pintura, dos materiais e de danos anteriores. Correção de marcas, higienização e proteção são avaliadas conforme a superfície. Não há promessa de remover todo defeito, recuperar material danificado ou tornar o veículo imune a riscos. Cura, secagem, produto aplicado e orientações de manutenção são combinados conforme o cuidado contratado."
          }
        </p>
        <p>
          {
            "Essas informações não afastam a responsabilidade da Fine Form nem as garantias e soluções asseguradas pela legislação em caso de falha no serviço."
          }
        </p>
        <h2>{"Fine Form Care"}</h2>
        <p>
          {
            "Os planos são mensais para um veículo cadastrado, conforme as visitas e os valores apresentados no plano escolhido. A placa é conferida presencialmente antes da ativação e do uso; ela não é solicitada no orçamento público. A ativação do Care exige a confirmação manual do recebimento do pagamento e do veículo cadastrado. A ativação e a renovação dependem da confirmação de Mateus e do pagamento combinado. Uma visita aceita reserva uma lavagem; a visita concluída entra no histórico. O saldo pertence ao ciclo e não acumula para ciclos seguintes. Adicionais são discriminados à parte. Não há renovação ou cobrança automática pelo site."
          }
        </p>
        <p>
          {
            "Para cancelamento, remarcação ou análise de valores pagos, consulte a "
          }
          <a href="/cancelamento-e-reembolso/">
            {"política de cancelamento e reembolso"}
          </a>
          {". Condições do plano não limitam os direitos legais do consumidor."}
        </p>
        <h2>{"Uso responsável e informações"}</h2>
        <p>
          {
            "Informe dados de contato que você possa usar e não envie informações de outras pessoas sem necessidade. Links privados devem ser guardados e compartilhados apenas com quem deve acompanhar o atendimento. Uma alteração de texto no site não modifica retroativamente o que já foi contratado."
          }
        </p>
        <h2>{"Fotos e avaliações"}</h2>
        <p>
          {
            "As fotos editoriais não demonstram resultados nem veículos atendidos pela Fine Form, e não indicam parceria com fabricantes. Veja os "
          }
          <a href="/creditos/">{"créditos e fontes"}</a>
          {
            ". Avaliações são enviadas por links vinculados a pedidos entregues, com autorização específica para publicação. Notas positivas e negativas recebem o mesmo tratamento; não criamos depoimentos ou notas artificiais."
          }
        </p>
        <h2>{"Atendimento e direitos"}</h2>
        <p>
          {"Dúvidas, correções e reclamações: "}
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {
            ". Aplicam-se as normas brasileiras, incluindo o Código de Defesa do Consumidor e a LGPD. Não há renúncia a direitos nem imposição de foro que restrinja sua defesa."
          }
        </p>
      </article>
    </main>
  );
}
