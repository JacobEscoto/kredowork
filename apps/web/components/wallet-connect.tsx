"use client";

import { useEffect, useState } from "react";
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
type WalletConnectProps = { variant?: "compact" | "method" };

const devnetRpc = createSolanaRpc("https://api.devnet.solana.com");

export default function WalletConnect({
  variant = "compact",
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
      setConnected({ wallet, account });
      if (variant === "method") router.replace("/bounties");
      try {
        const response = await devnetRpc
          .getBalance(address(account.address))
          .send();
        setBalance(Number(response.value) / 1_000_000_000);
      } catch {
        setBalance(null);
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
      className={`wallet-connect-wrap${isMethodVariant ? " wallet-method-wrap" : ""}`}
    >
      <button
        className={
          isMethodVariant
            ? "register-method wallet-method wallet-method-button"
            : "wallet-button"
        }
        type="button"
        onClick={handleButtonClick}
        disabled={busy}
        aria-expanded={
          wallets.length > 1 && !connected ? pickerOpen : undefined
        }
        aria-haspopup={wallets.length > 1 && !connected ? "menu" : undefined}
        aria-label={
          isMethodVariant && connected
            ? `${t("wallet.disconnectWallet")} ${shortAddress}`
            : undefined
        }
        title={
          !isMethodVariant && connected
            ? `${connected.wallet.name} · ${t("common.solanaDevnet")}${balance === null ? "" : ` · ${balance.toFixed(3)} SOL`}`
            : undefined
        }
      >
        {isMethodVariant ? (
          <>
            <span className="method-icon" aria-hidden="true">
              {busy ? (
                <LoaderCircle size={17} className="wallet-spinner" />
              ) : connected ? (
                <Check size={17} />
              ) : (
                <WalletIcon size={17} strokeWidth={1.8} />
              )}
            </span>
            <span className="method-copy wallet-method-copy">
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
              <span className="wallet-method-trailing" aria-hidden="true">
                <ChevronDown size={15} />
              </span>
            )}
          </>
        ) : (
          <>
            {busy ? (
              <LoaderCircle size={15} className="wallet-spinner" />
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
              <span className="wallet-network-label">
                {t("common.solanaDevnet")}
              </span>
            )}
            {!connected && wallets.length > 1 && <ChevronDown size={13} />}
          </>
        )}
      </button>
      {pickerOpen && !connected && (
        <div
          className="wallet-picker"
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
          className={`wallet-feedback${isMethodVariant ? " wallet-method-feedback" : ""}`}
          role="status"
        >
          {message}
        </p>
      )}
      {connected && balance !== null && (
        <span className="sr-only">
          {t("wallet.devnetBalance", { balance: balance.toFixed(4) })}
        </span>
      )}
    </div>
  );
}
