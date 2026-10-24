import type { Metadata } from "next";
import { BookingView } from "../../features/booking/BookingView";
export const metadata: Metadata = { title: "Prepare seu atendimento" };
export default function Page() {
  return <BookingView />;
}
