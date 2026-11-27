import type { Metadata } from "next";
import AccountPage from "@/components/account-page";

export const metadata: Metadata = {
  title: "Your account — KredoWork",
  description: "KredoWork account connected with GitHub.",
};

export default function AccountPageShell() {
  return <AccountPage />;
}
