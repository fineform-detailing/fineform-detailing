"use client";
import { useReviewViewModel } from "./useReviewViewModel";
import {
  PrivateFrame,
  Loading,
  ErrorMessage,
  Check,
  TextArea,
} from "../../components/ui/primitives";
const ratings = [
  "Deixou a desejar",
  "Poderia melhorar",
  "Foi bom",
  "Foi muito bom",
  "Foi excelente",
];
export function ReviewView() {
  const {
    capability: c,
    resource,
    data,
    rating,
    setRating,
    comment,
    setComment,
    consent,
    setConsent,
    error,
    busy,
    submit,
    withdraw,
  } = useReviewViewModel();
  return (
    <PrivateFrame title="Seu olhar faz parte." eyebrow="AVALIAÇÃO / FINE FORM">
      {!c.ready || resource.loading ? (
        <Loading />
      ) : !data ? (
        <section className="system-card">
          <ErrorMessage
            message={resource.error || "Abra seu link privado para avaliar."}
          />
          <a href="/acompanhar/">Meus pedidos ↗</a>
        </section>
      ) : data.review ? (
        <section className="system-card review-thanks">
          <h2>
            {data.review.published
              ? "Obrigado pelo seu olhar, " + data.review.firstName + "."
              : "Autorização retirada."}
          </h2>
          {data.review.published ? (
            <>
              <p
                className="review-stars"
                aria-label={data.review.rating + " de 5 estrelas"}
              >
                {"★".repeat(data.review.rating)}
              </p>
              <blockquote>{data.review.comment}</blockquote>
              <button
                className="button outline"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      "Retirar a autorização de publicação desta avaliação?",
                    )
                  )
                    return;
                  await withdraw();
                }}
              >
                Retirar autorização de publicação
              </button>
            </>
          ) : (
            <p>
              Sua avaliação deixou de aparecer no site. Nome e comentário foram
              removidos do registro.
            </p>
          )}
          <p>
            <a href="/#avaliacoes">Voltar à Fine Form ↗</a>
          </p>
          <ErrorMessage message={error} />
        </section>
      ) : !data.eligible ? (
        <section className="system-card">
          <h2>Seu cuidado ainda está acontecendo.</h2>
          <p>A avaliação fica disponível depois que o veículo for entregue.</p>
        </section>
      ) : (
        <section className="system-card review-compose">
          <h2>Como foi seu cuidado, {data.firstName}?</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset className="rating-field" disabled={busy}>
              <legend>Sua nota *</legend>
              <div className="rating-options">
                {ratings.map((label, i) => (
                  <label
                    key={label}
                    className={rating > i ? "is-selected" : ""}
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={i + 1}
                      checked={rating === i + 1}
                      onChange={() => setRating(i + 1)}
                      required
                    />
                    <span aria-hidden="true">★</span>
                    <span className="sr-only">
                      {i + 1} de 5 estrelas · {label}
                    </span>
                  </label>
                ))}
              </div>
              <p>
                {rating ? ratings[rating - 1] : "Escolha de 1 a 5 estrelas."}
              </p>
            </fieldset>
            <TextArea
              label="Quer contar mais? (opcional)"
              value={comment}
              onChange={setComment}
            />
            <p className="system-muted">
              {comment.length}/600 · Evite telefone, placa ou outros dados
              pessoais.
            </p>
            <Check
              label="Autorizo a publicação da minha nota, comentário e primeiro nome no site da Fine Form."
              checked={consent}
              onChange={setConsent}
              required
              disabled={busy}
            />
            <ErrorMessage message={error} />
            <button className="button orange" type="submit" disabled={busy}>
              {busy ? "Enviando…" : "Publicar minha avaliação ↗"}
            </button>
            <p className="system-muted">
              Uma avaliação por atendimento entregue. Todas as notas são
              bem-vindas. <a href="/privacidade/">Privacidade</a>.
            </p>
          </form>
        </section>
      )}
    </PrivateFrame>
  );
}
