import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "../components/layout/AppProvider";
import { SiteChrome } from "../components/layout/SiteChrome";
import "../styles/globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://fine-form-3-0.fineformcare.workers.dev"),
  title: {
    default: "Fine Form — Seu veículo, em boa forma.",
    template: "%s | Fine Form",
  },
  description:
    "Cuidado automotivo com atenção em cada etapa. Prepare seu orçamento, acompanhe seu pedido e consulte seu Fine Form Care.",
  icons: {
    icon: "/assets/logo-original.png",
    apple: "/assets/app-icon-192.png",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#53c3b1",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body data-design="kinetic">
        <AppProvider>
          <SiteChrome>{children}</SiteChrome>
        </AppProvider>
      </body>
    </html>
  );
}
