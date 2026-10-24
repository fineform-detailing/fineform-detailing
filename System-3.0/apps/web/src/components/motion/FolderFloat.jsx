"use client";
import React, { useState } from "react";

// Fine Form adaptation of the opening-folder interaction shown by React Bits.
// Independently implemented: no registry source is bundled for this effect.
export default function FolderFloat({ motionEnabled = true }) {
  const [open, setOpen] = useState(false),
    [pinned, setPinned] = useState(false);
  const close = () => {
    setOpen(false);
    setPinned(false);
  };
  return (
    <div className={"summary-folder" + (!motionEnabled ? " folder-still" : "")}>
      <button
        type="button"
        className={"folder-float" + (open ? " is-open" : "")}
        aria-expanded={open}
        aria-controls="folder-notes"
        aria-label="Ver os itens do resumo: veículo, cuidado e data e horário"
        onPointerEnter={(event) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover)").matches
          )
            setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !pinned) setOpen(false);
        }}
        onClick={() => {
          setOpen(!open);
          setPinned(!open);
        }}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <span className="folder-back" aria-hidden="true" />
        <span className="folder-notes" id="folder-notes" aria-hidden="true">
          {["Seu veículo", "O cuidado", "Data e horário"].map(
            (label, index) => (
              <span className={"folder-sheet sheet-" + index} key={label}>
                <span className="sheet-number">0{index + 1}</span>
                <b>{label}</b>
                <span className="sheet-line" />
                <span className="sheet-line short" />
              </span>
            ),
          )}
        </span>
        <span className="folder-front" aria-hidden="true">
          <span>FINE FORM / SEU RESUMO</span>
          <b>
            Pronto para
            <br />a nossa conversa.
          </b>
          <span className="folder-plus">{open ? "−" : "+"}</span>
        </span>
      </button>
      <p className="folder-hint">Passe o mouse ou toque na pasta.</p>
    </div>
  );
}
