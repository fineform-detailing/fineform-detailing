"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="system-shell">
      <section className="system-card">
        <h1>Não foi possível abrir esta tela.</h1>
        <p>Seus pedidos continuam guardados. Tente novamente.</p>
        <button className="button orange" onClick={reset}>
          Tentar novamente
        </button>
        <a href="/">Voltar à Fine Form</a>
      </section>
    </main>
  );
}
