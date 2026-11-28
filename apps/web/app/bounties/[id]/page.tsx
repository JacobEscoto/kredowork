import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BountyDetail } from "@/components/bounty-detail";
import { getBountyById } from "@/lib/bounties";

type BountyPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: BountyPageProps): Promise<Metadata> {
  const { id } = await params;
  const bounty = await getBountyById(id);

  if (!bounty) {
    return {
      title: "Tarea no encontrada",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/bounties/${encodeURIComponent(bounty.id)}`;
  const description = bounty.description.slice(0, 160);

  return {
    title: bounty.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: bounty.title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: { card: "summary", title: bounty.title, description },
  };
}

export default async function BountyDetailPage({ params }: BountyPageProps) {
  const { id } = await params;
  const bounty = await getBountyById(id);
  if (!bounty) notFound();
  return <BountyDetail bounty={bounty} />;
}
