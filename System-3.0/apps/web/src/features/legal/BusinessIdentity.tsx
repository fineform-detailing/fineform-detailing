"use client";
import { business } from "../../services/api";
import { useResource } from "../../hooks/useResource";
export function BusinessIdentity() {
  const { data, error } = useResource((signal) => business.public(signal));
  return (
    <>
      <section data-public-business>
        {data?.supplier && (
          <dl>
            <dt>Nome empresarial</dt>
            <dd>{data.supplier.legalName}</dd>
            <dt>CNPJ</dt>
            <dd>{data.supplier.cnpj}</dd>
          </dl>
        )}
        <p>
          Atendimento somente com horário combinado. O local e as orientações de
          chegada são informados por Mateus antes da confirmação do atendimento.
        </p>
        {error && (
          <p role="status">
            Não foi possível consultar a identificação agora. Fale com Mateus
            pelo contato acima.
          </p>
        )}
      </section>
      <noscript suppressHydrationWarning>
        <section data-business-fallback="">
          <p>
            O local e as orientações de chegada são informados por Mateus antes
            da confirmação do atendimento.
          </p>
        </section>
      </noscript>
    </>
  );
}
