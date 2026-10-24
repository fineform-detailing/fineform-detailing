"use client";
import { useState, type ReactNode } from "react";
import { PrivacyDialog } from "./AppProvider";
export function PrivacySettingsButton({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="text-link" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <PrivacyDialog onClose={() => setOpen(false)} />}
    </>
  );
}
