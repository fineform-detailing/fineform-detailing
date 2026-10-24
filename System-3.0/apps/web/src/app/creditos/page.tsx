import type { Metadata } from "next";
import { BusinessIdentity } from "../../features/legal/BusinessIdentity";
export const metadata: Metadata = { title: "Créditos e imagens" };
export default function Page() {
  return (
    <main className="legal-layout" id="conteudo" tabIndex={-1}>
      <nav className="legal-nav" aria-label="Páginas legais">
        <a href="/privacidade/">{"Privacidade"}</a>
        <a href="/termos/">{"Termos de serviço"}</a>
        <a href="/cancelamento-e-reembolso/">{"Cancelamento e reembolso"}</a>
        <a href="/cookies/">{"Cookies e dados"}</a>
        <a href="/acessibilidade/">{"Acessibilidade"}</a>
        <a href="/informacoes/">{"Sobre a Fine Form"}</a>
        <a href="/creditos/" aria-current="page">
          {"Créditos e imagens"}
        </a>
      </nav>
      <article className="legal-content">
        <a className="back-link" href="/">
          {"← Voltar à Fine Form"}
        </a>
        <p className="kicker">{"INFORMAÇÕES / FINE FORM"}</p>
        <h1>{"Créditos e imagens"}</h1>
        <p className="legal-date">
          {"Versão de 24 de outubro de 2026 · revisão 4"}
        </p>
        <p className="legal-lead">
          {
            "As fotos são editoriais. Não representam veículos atendidos, resultados de serviços da Fine Form nem parceria ou autorização de fabricantes."
          }
        </p>
        <section id="modelo"><h2>Demonstração do cuidado</h2><p>Sequência conceitual do mesmo Porsche 911 (930) Turbo de 1975. Não representa atendimento de cliente ou parceria com o fabricante.</p><p>Modelo de <a href="https://sketchfab.com/3d-models/free-1975-porsche-911-930-turbo-8568d9d14a994b9cae59499f0dbed21e" rel="noreferrer">Lionsharp Studios (Karol Miklas)</a>, sob <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a>. Adaptado com pintura, espuma procedural, iluminação, câmera e compressão. Renderizado em Blender / Cycles. O mesmo modelo é usado no passeio 3D opcional, com malha quantizada, texturas reduzidas, rodas separadas para animação, nova iluminação e ambiente. A cabine exibida na narrativa é uma reconstrução ilustrativa gerada com IA a partir da referência visual do Porsche; não é uma fotografia nem geometria recuperada desse modelo.</p></section><h2>{"Fotografias"}</h2>
        <ul>
          <li>
            {"McLaren: "}
            <a href="https://unsplash.com/photos/IL_guQy_deI" rel="noreferrer">
              {"Kristóf Bogár, no Unsplash"}
            </a>
            {"."}
          </li>
          <li>
            {"Porsche GT3: "}
            <a href="https://unsplash.com/photos/fetaeac5EJA" rel="noreferrer">
              {"Erik Fabian, no Unsplash"}
            </a>
            {"."}
          </li>
          <li>
            {"Interior BMW 2022: "}
            <a href="https://unsplash.com/photos/Siu4aqCJK04" rel="noreferrer">
              {"Divaris Shirichena, no Unsplash"}
            </a>
            {"."}
          </li>
          <li>
            {"Ducati Panigale: "}
            <a href="https://unsplash.com/photos/N-z_T1pbpeQ" rel="noreferrer">
              {"Jan Kopřiva, no Unsplash"}
            </a>
            {"."}
          </li>
        </ul>
        <p>
          {"O projeto registra essas fotos sob a "}
          <a href="https://unsplash.com/license" rel="noreferrer">
            {"licença Unsplash"}
          </a>
          {
            ". Essa licença não transfere a autoria das fotografias à Fine Form nem implica endosso de pessoas ou marcas retratadas."
          }
        </p>
        <h2>{"Identidade, fontes e componentes"}</h2>
        <p>
          {
            "O símbolo e o mascote preservam a identidade original fornecida para a Fine Form. Three.js é distribuído sob licença MIT. As fontes Syne, DM Sans, Instrument Serif, Manrope e Barlow têm licença SIL Open Font License. Componentes Stack, ScrollVelocity e Border Glow foram adaptados de React Bits / David Haz, com MIT + Commons Clause; a interação de pasta foi adaptada para a Fine Form. Avisos de licença acompanham os arquivos do projeto."
          }
        </p>
        <p>
          {
            "Conteúdos de clientes, fotos de veículos identificáveis, placas e depoimentos exigem avaliação de autorização e finalidade antes de divulgação. Se você identificar um problema de autoria ou uso de imagem, entre em contato por "
          }
          <a href="mailto:fineformcare@gmail.com">{"fineformcare@gmail.com"}</a>
          {" ou "}
          <a href="https://wa.me/5511959473298" rel="noreferrer">
            {"WhatsApp (11) 95947-3298"}
          </a>
          {" indicando a página e o conteúdo."}
        </p>
      </article>
    </main>
  );
}
