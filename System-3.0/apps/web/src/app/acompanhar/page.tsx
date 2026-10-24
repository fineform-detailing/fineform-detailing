import type { Metadata } from "next";
import { TrackingView } from "../../features/tracking/TrackingView";
export const metadata: Metadata = {
  title: "Acompanhe seu cuidado",
  robots: { index: false, follow: false },
  manifest: "/acompanhar/manifest.webmanifest",
};
export default function Page() {
  return <TrackingView />;
}
