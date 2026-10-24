import type { Metadata } from "next";
import { AdminView } from "../../features/admin/AdminView";
export const metadata: Metadata = {
  title: "Painel da Fine Form",
  robots: { index: false, follow: false },
  manifest: "/painel/manifest.webmanifest",
};
export default function Page() {
  return <AdminView />;
}
