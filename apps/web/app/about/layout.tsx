import type { Metadata } from "next";

const title = "Cómo funciona KredoWork";
const description =
  "Conoce cómo KredoWork conecta equipos y contribuidores de Solana mediante tareas con alcance claro, revisión comunitaria y recompensas verificables.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about", type: "article" },
  twitter: { card: "summary", title, description },
};

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
