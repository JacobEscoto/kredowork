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

  return (
    <div
      className={`relative flex items-center${isMethodVariant ? " w-full flex-col items-stretch" : " flex-wrap gap-2"}`}
    >
      <button
        className={
          isMethodVariant
            ? "flex items-center gap-3 w-full min-h-[62px] py-2.5 px-3 rounded-md border border-[#e5e8e2] bg-white text-foreground text-left cursor-pointer mb-2.5 transition-colors duration-180 hover:border-[#c5d0be] hover:bg-[#fbfcfa] disabled:cursor-wait disabled:opacity-72 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-3 max-[460px]:gap-2 max-[460px]:p-2"
            : "flex items-center gap-[9px] py-2.5 px-3.5 rounded-md border border-[#191b16] bg-[#171a15] text-white text-xs cursor-pointer transition-colors duration-200 hover:bg-[#353a30] disabled:cursor-wait disabled:opacity-72 max-[760px]:py-[9px] max-[760px]:px-2.5 max-[760px]:text-[11px] max-[460px]:gap-1.5 max-[460px]:p-2"
        }
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
              className="grid place-items-center flex-none w-9 h-9 text-[#171a15] max-[460px]:w-[30px] max-[460px]:h-[30px]"
              aria-hidden="true"
            >
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : connected ? (
                <Check size={17} />
              ) : (
                <WalletIcon size={17} strokeWidth={1.8} />
              )}
            </span>
            <span className="flex flex-1 flex-col gap-1 min-w-0 [&_strong]:text-[11px] [&_strong]:font-semibold [&_strong]:truncate [&>span]:text-[#82877d] [&>span]:text-[9px] [&>span]:truncate">
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
                className="grid place-items-center ml-auto text-muted"
                aria-hidden="true"
              >
                <ChevronDown size={15} />
              </span>
            )}
          </>
        ) : (
          <>
            {busy ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : connected ? (
              <Check size={15} strokeWidth={2} />
            ) : (
              <WalletIcon size={15} strokeWidth={1.8} />
            )}
            {connected
              ? shortAddress
              : busy
                ? t("wallet.connecting")
                : t("wallet.connectWallet")}
            {connected && (
              <span className="text-[9px] text-[#b2e995] border-l border-white/21 pl-2">
                {t("common.solanaDevnet")}
              </span>
            )}
            {!connected && wallets.length > 1 && <ChevronDown size={13} />}
          </>
        )}
      </button>

      {connected && (
        <div
          className={
            isMethodVariant
              ? "w-full flex items-center justify-between gap-2 mb-2"
              : "flex items-center gap-2"
          }
        >
          <span
            className={`text-[10px] ${walletVerified ? "text-[#568a3f] font-medium" : "text-[#8a6d3b]"}`}
            role="status"
          >
            {walletVerified
              ? t("wallet.walletVerified")
              : t("wallet.walletNotVerified")}
          </span>
          {!walletVerified && (
            <button
              type="button"
              className="px-2.5 py-1.5 rounded border border-line bg-white text-foreground text-[10px] font-medium cursor-pointer hover:bg-soft disabled:opacity-60"
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
          className="absolute z-10 right-0 top-[calc(100%+8px)] min-w-[180px] p-[5px] bg-white border border-line shadow-[0_10px_30px_#11130f18] [&_button]:block [&_button]:w-full [&_button]:py-2.5 [&_button]:px-3 [&_button]:border-0 [&_button]:bg-white [&_button]:text-left [&_button]:text-xs [&_button]:cursor-pointer [&_button:hover]:bg-soft"
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
          className={
            isMethodVariant
              ? "static w-full mt-1 mb-2 py-[11px] px-[13px] border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-[11px] leading-[1.5]"
              : "w-full py-[9px] px-[12px] border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-[11px] leading-[1.5]"
          }
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
