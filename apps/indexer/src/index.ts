import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Rpc,
  type SolanaRpcApi,
} from "@solana/kit";
import { config } from "./config.js";
import { processTransaction } from "./sync.js";

async function backfillRecentTransactions(
  rpc: Rpc<SolanaRpcApi>,
  limit = config.backfillLimit,
) {
  const signatures = await rpc
    .getSignaturesForAddress(config.programId, {
      commitment: "confirmed",
      limit,
    })
    .send();

  for (const sigInfo of [...signatures].reverse()) {
    if (sigInfo.err) continue;
    try {
      await processTransaction(rpc, sigInfo.signature);
    } catch (err) {
      console.error(`[indexer] Error backfilling ${sigInfo.signature}:`, err);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const rpc = createSolanaRpc(config.solanaRpcUrl);
  const abortController = new AbortController();

  process.on("SIGINT", () => abortController.abort());
  process.on("SIGTERM", () => abortController.abort());

  console.log(
    `[indexer] Running initial backfill (${config.backfillLimit} txs) for ${config.programId}...`,
  );
  await backfillRecentTransactions(rpc);
  console.log("[indexer] Initial backfill complete.");

  // Periodic safety polling every 20s, in case the WebSocket misses events on Devnet
  const pollTimer = setInterval(() => {
    void backfillRecentTransactions(rpc, 15).catch((err) => {
      console.error("[indexer] Poll backfill error:", err);
    });
  }, 20_000);

  while (!abortController.signal.aborted) {
    try {
      const rpcSubscriptions = createSolanaRpcSubscriptions(config.solanaWsUrl);
      console.log(
        `[indexer] Subscribing to Devnet logs for ${config.programId}...`,
      );

      const logsNotifications = await rpcSubscriptions
        .logsNotifications(
          { mentions: [config.programId] },
          { commitment: "confirmed" },
        )
        .subscribe({ abortSignal: abortController.signal });

      for await (const notification of logsNotifications) {
        if (notification.value.err) continue;
        const sig = notification.value.signature;
        console.log(`[indexer] New tx detected: ${sig}`);
        await processTransaction(rpc, sig);
      }
    } catch (err) {
      if (abortController.signal.aborted) break;
      console.error(
        "[indexer] WebSocket disconnected, reconnecting in 3s...",
        err,
      );
      await sleep(3_000);
    }
  }

  clearInterval(pollTimer);
}

main().catch((err) => {
  console.error("[indexer] Fatal error:", err);
  process.exit(1);
});
