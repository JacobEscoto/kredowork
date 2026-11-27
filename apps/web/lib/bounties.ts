export type BountyStatus =
  | "OPEN"
  | "CLAIMED"
  | "SUBMITTED"
  | "PRE_APPROVED"
  | "COMPLETED"
  | "EXPIRED"
  | "DISPUTED"
  | "REJECTED";

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

export const bounties: Bounty[] = [
  {
    id: "KW-0248",
    title: "Index validator health metrics",
    description:
      "Build a lightweight monitoring service that tracks validator uptime, vote credits, and delinquency across the network.",
    amount: "240",
    status: "OPEN",
    deadline: "2d 14h",
    approval: "Reviewer approval",
    hash: "7xKp…mR4q",
    category: "Monitoring",
    posted: "12 min ago",
  },
  {
    id: "KW-0247",
    title: "Improve RPC failover logic",
    description:
      "Add graceful failover between RPC endpoints with configurable retry and backoff policies.",
    amount: "180",
    status: "CLAIMED",
    deadline: "4d 08h",
    approval: "Multi-sig review",
    hash: "3hNp…aQ8v",
    category: "Client tooling",
    posted: "1 hour ago",
  },
  {
    id: "KW-0246",
    title: "Document Anchor account constraints",
    description:
      "Write a practical guide to account validation patterns and common security pitfalls in Anchor programs.",
    amount: "95",
    status: "SUBMITTED",
    deadline: "1d 06h",
    approval: "Reviewer approval",
    hash: "9aFw…K2pL",
    category: "Documentation",
    posted: "3 hours ago",
  },
  {
    id: "KW-0245",
    title: "Add priority fee estimation",
    description:
      "Implement a robust priority fee estimator using recent on-chain prioritization data.",
    amount: "320",
    status: "PRE_APPROVED",
    deadline: "6d 12h",
    approval: "Automatic verification",
    hash: "5mXe…nT7b",
    category: "Infrastructure",
    posted: "Yesterday",
  },
  {
    id: "KW-0244",
    title: "Rust client retry examples",
    description:
      "Create tested examples for resilient transaction submission in Rust clients.",
    amount: "70",
    status: "COMPLETED",
    deadline: "Completed",
    approval: "Reviewer approval",
    hash: "2vRc…pH6m",
    category: "Developer experience",
    posted: "2 days ago",
  },
  {
    id: "KW-0243",
    title: "Audit log retention policy",
    description:
      "Define and implement a configurable retention policy for infrastructure event logs.",
    amount: "150",
    status: "OPEN",
    deadline: "8d 02h",
    approval: "Multi-sig review",
    hash: "4cWd…zB9n",
    category: "Security",
    posted: "2 days ago",
  },
  {
    id: "KW-0242",
    title: "Refresh validator onboarding guide",
    description:
      "Update the onboarding guide with current network requirements and practical setup checks.",
    amount: "110",
    status: "EXPIRED",
    deadline: "Expired",
    approval: "Sponsor refund",
    hash: "8dPq…sK3m",
    category: "Documentation",
    posted: "3 days ago",
  },
  {
    id: "KW-0241",
    title: "Add transaction simulation tests",
    description:
      "Expand the client test suite with transaction simulation coverage for common failure cases.",
    amount: "205",
    status: "REJECTED",
    deadline: "Rejected",
    approval: "Reviewer approval",
    hash: "6fLm…qR2x",
    category: "Client tooling",
    posted: "4 days ago",
  },
];
