import { siteUrl } from "@/lib/site-url";

export function GET() {
  const origin = siteUrl.origin;
  const content = [
    "# KredoWork",
    "",
    "> Plataforma para coordinar tareas de infraestructura de Solana con alcance definido, revisión y recompensas verificables.",
    "",
    "## Páginas principales",
    `- [Inicio](${origin}/): propuesta y flujo de trabajo de KredoWork.`,
    `- [Explorar tareas](${origin}/bounties): listado y estados de las tareas.`,
    `- [Cómo funciona](${origin}/about): pasos, revisión y garantías del producto.`,
    "",
    "## Alcance actual",
    "- El producto se presenta en Solana Devnet; los SOL de prueba no tienen valor monetario real.",
    "- El listado actual contiene datos de demostración.",
    "- Las acciones de las fichas de tarea son de vista previa y no envían transacciones on-chain.",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
