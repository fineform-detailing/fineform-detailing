import type { Metadata } from "next";
import { LinksView } from "../../features/home/LinksView";
export const metadata: Metadata = { title: "Todos os links" };
export default function Page() {
  return <LinksView />;
}
