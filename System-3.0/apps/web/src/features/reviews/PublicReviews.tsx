"use client";
import { useState } from "react";
import { reviews } from "../../services/api";
import { useResource } from "../../hooks/useResource";
import { useApp } from "../../components/layout/AppProvider";
import type { Review } from "../../models/entities";
export function PublicReviews() {
  const [page, setPage] = useState(0),
    [items, setItems] = useState<Review[]>([]);
  const { toast } = useApp();
  const { data, error, setData } = useResource((signal) =>
    reviews.list(0, signal),
  );
  const [busy, setBusy] = useState(false);
  const list = [...(data?.items || []), ...items];
  async function more() {
    setBusy(true);
    try {
      const d = await reviews.list(page + 1);
      setPage(page + 1);
      setItems((v) => [
        ...v,
        ...d.items.filter(
          (i) =>
            !v.some((x) => x.id === i.id) &&
            !data?.items.some((x) => x.id === i.id),
        ),
      ]);
      setData((previous) =>
        previous
          ? {
              ...previous,
              hasMore: d.hasMore,
              count: d.count,
              average: d.average,
            }
          : d,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ff-section reviews-section" id="avaliacoes">
      <p className="section-index">QUEM CONFIA / QUEM CONTA</p>
      <div className="reviews-heading">
        <h2>
          O cuidado, pelo olhar
          <br />
          de quem recebeu.
        </h2>
        <p aria-live="polite">
          {data?.count
            ? `${data.average} de 5 · ${data.count} avaliações de atendimentos entregues.`
            : "Avaliações de atendimentos entregues. Experiências reais, na voz dos nossos clientes."}
        </p>
      </div>
      <div className="reviews-list">
        {list.length ? (
          list.map((r) => (
            <article className="review-card" key={r.id}>
              <p
                className="review-stars"
                aria-label={r.rating + " de 5 estrelas"}
              >
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.comment && <blockquote>{r.comment}</blockquote>}
              <strong>{r.firstName}</strong>
              <small> · {r.vehicle === "car" ? "Carro" : "Moto"}</small>
            </article>
          ))
        ) : (
          <div className="reviews-empty">
            <span aria-hidden="true">✳</span>
            <h3>Cada experiência tem seu lugar.</h3>
            <p>
              {error
                ? "Não foi possível consultar as avaliações agora."
                : "Quem já recebeu o veículo pode avaliar pelo link do pedido."}
            </p>
          </div>
        )}
      </div>
      {data?.hasMore && (
        <button className="button outline" disabled={busy} onClick={more}>
          Ver mais avaliações
        </button>
      )}
    </section>
  );
}
