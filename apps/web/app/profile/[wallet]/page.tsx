import { ReputationProfile } from '@/components/reputation-profile'

export default async function ProfilePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params
  return <ReputationProfile wallet={decodeURIComponent(wallet)} />
}
