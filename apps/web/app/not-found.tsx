import type { Metadata } from "next";
import NotFoundView from "@/components/not-found-view";

export const metadata: Metadata = {
  title: "404 — KredoWork",
  description: "The requested page or task could not be found on KredoWork.",
};

export default function NotFoundPage() {
  return <NotFoundView />;
}
