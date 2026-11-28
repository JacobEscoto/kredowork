import { ReputationProfile } from "@/components/reputation-profile";
import { getReputationMetrics } from "@/lib/marketplace";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet: encodedWallet } = await params;
  const wallet = decodeURIComponent(encodedWallet);
  const profile = await getReputationMetrics(wallet);
  return <ReputationProfile wallet={wallet} profile={profile} />;
}
