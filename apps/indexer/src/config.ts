import { address, type Address } from "@solana/kit";

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  solanaWsUrl: process.env.SOLANA_WS_URL ?? "wss://api.devnet.solana.com",
  programId: address(
    process.env.PROGRAM_ID ?? "2xudVYfkKXUSF5vdbhgXpV3bG8m479iE2xG2EyLi8o3j",
  ) as Address,
  backfillLimit: Number(process.env.BACKFILL_LIMIT ?? 50),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
};
