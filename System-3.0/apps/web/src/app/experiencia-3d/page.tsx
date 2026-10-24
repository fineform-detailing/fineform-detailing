import type { Metadata } from "next";
import { CarStory } from "../../features/experience/CarStory";
import "../../styles/fluid.css";

export const metadata: Metadata = {
  title: "Experiência interativa Fine Form",
  description: "Conheça as etapas do cuidado automotivo em uma experiência visual interativa.",
};

export default function Page() {
  return (
    <main id="conteudo" className="home-composition" tabIndex={-1}>
      <CarStory />
      <section className="ff-section" id="cuidados" aria-label="Continuar para serviços Fine Form">
        <h2>Gostou do passeio?</h2>
        <p>Conheça os cuidados disponíveis para seu carro ou moto e prepare seu orçamento.</p>
        <a className="button orange" href="/#cuidados">Conhecer os serviços ↗</a>
        <a className="underlined-link" href="/atendimento/">Preparar atendimento ↗</a>
      </section>
    </main>
  );
}
