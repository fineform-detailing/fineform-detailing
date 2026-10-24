import type { Metadata } from "next";
import { MembershipView } from "../../features/membership/MembershipView";
export const metadata: Metadata = {
  title: "Seu Fine Form Care",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <MembershipView />;
}
