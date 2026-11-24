import { notFound } from 'next/navigation'
import { BountyDetail } from '@/components/bounty-detail'
import { bounties } from '@/lib/bounties'

export default async function BountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bounty = bounties.find((item) => item.id === id)
  if (!bounty) notFound()
  return <BountyDetail bounty={bounty} />
}
