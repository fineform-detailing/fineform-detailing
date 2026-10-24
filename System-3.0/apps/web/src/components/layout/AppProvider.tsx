"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearSavedData } from "@domain/privacy-storage.mjs";
import { Modal } from "../ui/primitives";
import { config } from "../../models/config";
import { emailMessage, whatsappMessage } from "@domain/contacts.mjs";
const Context = createContext({
  toast: (_message: string) => {},
  contact: (_message?: string) => {},
  paused: false,
  toggleMotion: () => {},
});
export const useApp = () => useContext(Context);
export function AppProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState(""),
    [privacy, setPrivacy] = useState(false),
    [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      setPaused(localStorage.getItem("ff-motion-paused") === "1");
    } catch {}
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "enabled";
    window.dispatchEvent(
      new CustomEvent("ff:motion", { detail: { enabled: !paused } }),
    );
  }, [paused]);
  const toast = useCallback((value: string) => {
    setMessage(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 5500);
  }, []);
  const contact = useCallback(
    (
      text = "Olá, Mateus! Gostaria de cuidar do meu veículo na Fine Form. Pode me ajudar a escolher e combinar um horário?",
    ) => {
      const url = whatsappMessage(config, text) || emailMessage(config, text);
      window.open(
        url,
        url.startsWith("mailto:") ? "_self" : "_blank",
        "noopener,noreferrer",
      );
    },
    [],
  );
  const toggleMotion = () =>
    setPaused((v) => {
      try {
        localStorage.setItem("ff-motion-paused", v ? "0" : "1");
      } catch {}
      return !v;
    });
  return (
    <Context.Provider value={{ toast, contact, paused, toggleMotion }}>
      {children}
      <div className={"toast " + (message ? "visible" : "")} role="status">
        {message}
      </div>
      <button
        className="sr-only"
        onClick={() => setPrivacy(true)}
        id="privacy-settings-shortcut"
      >
        Gerenciar dados
      </button>
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
    </Context.Provider>
  );
}
export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useApp();
  return (
    <Modal title="Dados neste aparelho." onClose={onClose}>
      <p>
        Você pode apagar seus rascunhos e links privados guardados neste
        navegador. Os pedidos registrados na Fine Form continuam no sistema.
      </p>
      <button
        className="button orange"
        onClick={() => {
          const ok = clearSavedData(localStorage);
          try {
            sessionStorage.removeItem("ff-pending-submission");
            sessionStorage.removeItem("ff-pending-visit");
          } catch {}
          window.dispatchEvent(new Event("ff:saved-data-cleared"));
          toast(
            ok
              ? "Dados deste aparelho apagados."
              : "Não foi possível apagar. Confira as permissões do navegador.",
          );
          onClose();
        }}
      >
        Apagar rascunhos e links deste aparelho
      </button>
      <p>
        <a href="/privacidade/">Privacidade e seus direitos</a>
      </p>
    </Modal>
  );
}
