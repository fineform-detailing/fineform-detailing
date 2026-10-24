"use client";
import type { Selection } from "../../models/entities";
import {
  compatibleExtras,
  includedFor,
  extraPriceFor,
  availableTreatments,
  treatmentPrice,
  hasCoating,
} from "@domain/catalog.mjs";
import { money } from "@domain/catalog.mjs";
export function Addons({
  selection: s,
  onToggle,
}: {
  selection: Selection;
  onToggle: (id: string, kind: "extras" | "treatments") => void;
}) {
  const included = includedFor(s);
  return (
    <>
      <div>
        {compatibleExtras(s.vehicle).map((e) => {
          const replaced =
            e.id === "exteriorPlastic" && s.extras.includes("plasticCoating");
          const covered = included.includes(e.id);
          return (
            <label
              className={"extra-choice " + (covered ? "included" : "")}
              key={e.id}
            >
              <input
                type="checkbox"
                name="extra"
                value={e.id}
                checked={!replaced && (covered || s.extras.includes(e.id))}
                disabled={covered || replaced}
                onChange={() => onToggle(e.id, "extras")}
              />
              <span>
                <b>{e.label}</b>
                <small>{e.description}</small>
                <span className="option-price">
                  {replaced
                    ? "SUBSTITUÍDO PELA VITRIFICAÇÃO"
                    : covered
                      ? "JÁ INCLUÍDO · QUANDO COMPATÍVEL"
                      : money(extraPriceFor(e, s))}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {s.vehicle === "car" && (
        <fieldset className="fieldset-clean">
          <legend>Tratamentos para combinar (opcional)</legend>
          {availableTreatments(s).map((t) => (
            <label className="extra-choice" key={t.id}>
              <input
                type="checkbox"
                name="treatment"
                checked={s.treatments.includes(t.id)}
                onChange={() => onToggle(t.id, "treatments")}
              />
              <span>
                <b>{t.label}</b>
                <small>{t.description}</small>
                <span className="option-price">
                  {money(treatmentPrice(t.id, s))}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {hasCoating(s) && (
        <p className="note-box">
          Revestimento cerâmico em substituição à cera. Produto, cura e entrega
          combinados com Mateus.
        </p>
      )}
    </>
  );
}
