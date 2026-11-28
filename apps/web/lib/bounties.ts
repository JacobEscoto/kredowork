import "server-only";
import { getMarketplaceBounties, type MarketplaceStatus } from "@/lib/marketplace";

export type BountyStatus = MarketplaceStatus | "REJECTED";

export type Bounty = {
  id: string;
  title: string;
  description: string;
  amount: string;
  status: BountyStatus;
  deadline: string;
  approval: string;
  hash: string;
  category: string;
  posted: string;
};

export async function getBountyById(id: string): Promise<Bounty | undefined> {
  const bounty = (await getMarketplaceBounties()).find((item) => item.id === id);
  if (!bounty) return undefined;
  return {
    id: bounty.id,
    title: bounty.title,
    description: bounty.summary,
    amount: bounty.amount.toLocaleString("en-US", { maximumFractionDigits: 4 }),
    status: bounty.status,
    deadline: bounty.days === 0 ? "0h" : `${bounty.days}d`,
    approval: bounty.approval,
    hash: bounty.hash,
    category: bounty.space,
    posted: bounty.deadline,
  };
}
