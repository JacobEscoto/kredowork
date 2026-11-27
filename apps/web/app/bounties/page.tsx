import type { Metadata } from "next";
import BountyExplorer from "@/components/bounty-explorer";

const title = "Explorar tareas de infraestructura de Solana";
const description =
  "Busca tareas abiertas de infraestructura de Solana, revisa sus criterios y descubre cómo se organizan las recompensas en KredoWork.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/bounties" },
  openGraph: { title, description, url: "/bounties", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function BountiesPage() {
  return <BountyExplorer />;
}
