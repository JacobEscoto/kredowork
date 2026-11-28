import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { siteUrl } from "@/lib/site-url";

const siteTitle = "KredoWork — Trabajo abierto, recompensas verificables";
const siteDescription =
  "KredoWork conecta equipos de infraestructura de Solana con contribuidores mediante tareas con alcance claro, revisión comunitaria y recompensas verificables.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: siteTitle, template: "%s | KredoWork" },
  description: siteDescription,
  applicationName: "KredoWork",
  keywords: [
    "Solana",
    "infraestructura",
    "trabajo abierto",
    "recompensas",
    "Devnet",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "KredoWork",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
