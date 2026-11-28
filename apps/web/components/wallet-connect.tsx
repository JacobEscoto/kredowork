"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWallets } from "@wallet-standard/app";
import { address, createSolanaRpc } from "@solana/kit";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Wallet as WalletIcon,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

type StandardWallet = ReturnType<ReturnType<typeof getWallets>["get"]>[number];
type ConnectedAccount = { address: string };
type WalletConnectProps = {
  variant?: "compact" | "method";
  onVerified?: (walletAddress: string) => void;
};

const devnetRpc = createSolanaRpc(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

export default function WalletConnect({
  variant = "compact",
  onVerified,
}: WalletConnectProps) {
  const router = useRouter();
  const { translate: t } = useTranslation();
  const [wallets, setWallets] = useState<readonly StandardWallet[]>([]);
  const [connected, setConnected] = useState<{
    wallet: StandardWallet;
    account: ConnectedAccount;
  } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [walletVerified, setWalletVerified] = useState(false);

  useEffect(() => {
    const registry = getWallets();
    const refresh = () => setWallets(registry.get());
    refresh();
    const stopRegister = registry.on("register", refresh);
    const stopUnregister = registry.on("unregister", refresh);
    return () => {
      stopRegister();
      stopUnregister();
    };
  }, []);

  const checkExistingVerification = useCallback(
    async (walletAddress: string) => {
      try {
        const res = await fetch(
          `/api/auth/wallet?address=${encodeURIComponent(walletAddress)}`,
        );
        if (!res.ok) return false;
        const data = (await res.json()) as { verified?: boolean };
        const isVerified = Boolean(data.verified);
        setWalletVerified(isVerified);
        return isVerified;
      } catch {
        return false;
      }
    },
    [],
  );

  const verifyAndLinkWallet = useCallback(
    async (
      target: { wallet: StandardWallet; account: ConnectedAccount },
      redirectOnSuccess = false,
    ) => {
      setBusy(true);
      setMessage("");
      try {
        const signMessage = target.wallet.features[
          "solana:signMessage"
        ] as unknown as
          | {
              signMessage: (input: {
                account: ConnectedAccount;
                message: Uint8Array;
              }) => Promise<{ signature: Uint8Array }[]>;
            }
          | undefined;

        if (!signMessage) {
          throw new Error("This wallet does not support message signing.");
        }

        const timestamp = new Date().toISOString();
        const challenge = `KredoWork wallet verification\nWallet: ${target.account.address}\nTimestamp: ${timestamp}`;
        const signed = await signMessage.signMessage({
          account: target.account,
          message: new TextEncoder().encode(challenge),
        });
        const signature = signed[0]?.signature;
        if (!signature) throw new Error("Wallet did not return a signature.");

        let binary = "";
        for (const byte of signature) binary += String.fromCharCode(byte);

        const response = await fetch("/api/auth/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: target.account.address,
            signature: btoa(binary),
            message: challenge,
            timestamp,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Wallet verification failed.");
        }

        setWalletVerified(true);
        setMessage(t("wallet.walletLinkSuccess"));
        onVerified?.(target.account.address);
        router.refresh();

        if (redirectOnSuccess) {
          router.push("/bounties");
        }
      } catch (err) {
        setWalletVerified(false);
        setMessage(
          err instanceof Error && err.message
            ? err.message
            : t("wallet.walletLinkFailed"),
        );
      } finally {
        setBusy(false);
      }
    },
    [onVerified, router, t],
  );

  async function connect(wallet: StandardWallet) {
    setBusy(true);
    setMessage("");
    setPickerOpen(false);
    try {
      const connectFeature = wallet.features["standard:connect"] as unknown as {
        connect: () => Promise<{ accounts: ConnectedAccount[] }>;
      };
      const result = await connectFeature.connect();
      const account = result.accounts[0];
      if (!account) throw new Error(t("wallet.noAccount"));

      const pair = { wallet, account };
      setConnected(pair);

      try {
        const response = await devnetRpc
          .getBalance(address(account.address))
          .send();
        setBalance(Number(response.value) / 1_000_000_000);
      } catch {
        setBalance(null);
      }

      const alreadyVerified = await checkExistingVerification(account.address);
      if (!alreadyVerified && variant === "method") {
        await verifyAndLinkWallet(pair, true);
        return;
      }
      if (alreadyVerified && variant === "method") {
        router.push("/bounties");
      }
    } catch {
      setMessage(t("wallet.connectFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (connected) {
      const feature = connected.wallet.features[
        "standard:disconnect"
      ] as unknown as { disconnect?: () => Promise<void> } | undefined;
      await feature?.disconnect?.().catch(() => undefined);
    }
    setConnected(null);
    setBalance(null);
    setWalletVerified(false);
    setMessage("");
  }

  const shortAddress = connected
    ? `${connected.account.address.slice(0, 4)}…${connected.account.address.slice(-4)}`
    : null;

  function handleButtonClick() {
    if (connected) {
      void disconnect();
      return;
    }
    if (wallets.length > 1) {
      setPickerOpen((open) => !open);
      return;
    }
    if (wallets[0]) {
      void connect(wallets[0]);
      return;
    }
    setMessage(t("wallet.noCompatible"));
  }

  const isMethodVariant = variant === "method";

  const methodButton =
    "flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-md border border-[#d5dacf] bg-white px-3 py-2.5 text-left text-foreground transition-colors duration-180 hover:border-[#171a15] hover:bg-[#f7f8f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-70";

  const compactButtonBase =
    "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-70 sm:w-auto";

  const compactButton = connected
    ? `${compactButtonBase} border-[#9ccf84] bg-[#eef8e9] text-[#2f5d1c] hover:bg-[#e3f3da]`
    : `${compactButtonBase} border-[#171a15] bg-white text-[#171a15] hover:bg-[#f1f3ee]`;

  const pickerClass = isMethodVariant
    ? "absolute left-0 right-0 top-[calc(100%+8px)] z-10"
    : "absolute left-0 top-[calc(100%+8px)] z-10 min-w-48";

  return (
    <div
      className={`relative flex ${
        isMethodVariant
          ? "w-full flex-col items-stretch gap-2"
          : "flex-wrap items-center gap-2"
      }`}
    >
      <button
        className={isMethodVariant ? methodButton : compactButton}
        type="button"
        onClick={handleButtonClick}
        disabled={busy}
        aria-expanded={
          wallets.length > 1 && !connected ? pickerOpen : undefined
        }
        aria-haspopup={wallets.length > 1 && !connected ? "menu" : undefined}
      >
        {isMethodVariant ? (
          <>
            <span
              className="grid size-8 flex-none place-items-center text-[#171a15] sm:size-9"
              aria-hidden="true"
            >
              {busy ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : connected ? (
                <Check size={18} />
              ) : (
                <WalletIcon size={18} strokeWidth={1.8} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 [&>span]:truncate [&>span]:text-xs [&>span]:text-[#6b7066] [&_strong]:truncate [&_strong]:text-[13px] [&_strong]:font-semibold">
              <strong>
                {busy
                  ? t("wallet.connecting")
                  : connected
                    ? connected.wallet.name
                    : t("register.connectWallet")}
              </strong>
              <span>
                {connected
                  ? `${shortAddress} · ${t("common.solanaDevnet")}${balance === null ? "" : ` · ${balance.toFixed(3)} SOL`}`
                  : t("register.solanaDevnet")}
              </span>
            </span>
            {wallets.length > 1 && !connected && (
              <span
                className="ml-auto grid place-items-center text-muted"
                aria-hidden="true"
              >
                <ChevronDown size={16} />
              </span>
            )}
          </>
        ) : (
          <>
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : connected ? (
              <Check size={16} strokeWidth={2} />
            ) : (
              <WalletIcon size={16} strokeWidth={1.8} />
            )}
            {connected
              ? shortAddress
              : busy
                ? t("wallet.connecting")
                : t("wallet.connectWallet")}
            {connected && (
              <span className="border-l border-[#2f5d1c]/25 pl-2 text-[11px] text-[#3f6f2a]">
                {t("common.solanaDevnet")}
              </span>
            )}
            {!connected && wallets.length > 1 && <ChevronDown size={14} />}
          </>
        )}
      </button>

      {connected && (
        <div
          className={
            isMethodVariant
              ? "flex w-full flex-wrap items-center justify-between gap-2"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <span
            className={`text-xs ${walletVerified ? "font-medium text-[#3f6f2a]" : "text-[#8a6d3b]"}`}
            role="status"
          >
            {walletVerified
              ? t("wallet.walletVerified")
              : t("wallet.walletNotVerified")}
          </span>
          {!walletVerified && (
            <button
              type="button"
              className="min-h-9 cursor-pointer rounded-md border border-[#171a15] bg-[#171a15] px-3 text-xs font-medium text-white transition-colors hover:bg-[#30372c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-60"
              onClick={() => void verifyAndLinkWallet(connected, false)}
              disabled={busy}
            >
              {busy ? t("wallet.connecting") : t("wallet.verifyAndLink")}
            </button>
          )}
        </div>
      )}

      {pickerOpen && !connected && (
        <div
          className={`${pickerClass} border border-line bg-white p-1.25 shadow-[0_10px_30px_#11130f18] [&_button:hover]:bg-soft [&_button]:block [&_button]:min-h-11 [&_button]:w-full [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2.5 [&_button]:text-left [&_button]:text-sm`}
          role="menu"
          aria-label={t("wallet.pickerAria")}
        >
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              type="button"
              role="menuitem"
              onClick={() => void connect(wallet)}
            >
              {wallet.name}
            </button>
          ))}
        </div>
      )}

      {message && (
        <p
          className="w-full border border-[#e4c5a3] bg-[#fffaf4] px-3 py-2.5 text-xs leading-normal text-[#59442f]"
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
