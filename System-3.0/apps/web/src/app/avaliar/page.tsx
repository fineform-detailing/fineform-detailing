import type { Metadata } from "next";
import { ReviewView } from "../../features/reviews/ReviewView";
export const metadata: Metadata = {
  title: "Sua avaliação",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ReviewView />;
}
