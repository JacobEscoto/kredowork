"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import SignOutButton from "@/components/sign-out-button";
import Brand from "@/components/brand";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";
import WalletConnect from "@/components/wallet-connect";
import GitHubSignInButton from "@/components/github-sign-in-button";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default function AccountPage() {
  const { translate: t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<{
    id: string;
    email?: string | null;
    githubUsername?: string | null;
    linkedWallet?: string | null;
  } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadAccount = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const u = data.session?.user ?? null;
    if (!u) {
      setUser(null);
      setLoading(false);
      return;
    }

    const meta = u.user_metadata ?? {};
    const { data: dbProfile } = await supabaseBrowser
      .from("users")
      .select(
        "display_name, avatar_url, github_username, primary_wallet_pubkey",
      )
      .eq("id", u.id)
      .maybeSingle();

    const isSyntheticWalletEmail = u.email?.endsWith("@wallet.kredowork.local");
    const resolvedName =
      dbProfile?.display_name ??
      (meta.full_name as string | undefined) ??
      (meta.user_name as string | undefined) ??
      "";
    const resolvedAvatar =
      dbProfile?.avatar_url ?? (meta.avatar_url as string | undefined) ?? null;

    setUser({
      id: u.id,
      email: isSyntheticWalletEmail ? null : (u.email ?? null),
      githubUsername:
        dbProfile?.github_username ??
        (meta.user_name as string | undefined) ??
        null,
      linkedWallet:
        dbProfile?.primary_wallet_pubkey ??
        (meta.wallet_address as string | undefined) ??
        null,
    });
    setDisplayName(resolvedName);
    setAvatarUrl(resolvedAvatar);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.has(file.type) || file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: "error", text: t("account.invalidImage") });
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFeedback(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSaveProfile(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setFeedback(null);

    try {
      let nextAvatarUrl = avatarUrl;

      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabaseBrowser.storage
          .from("avatars")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: selectedFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseBrowser.storage
          .from("avatars")
          .getPublicUrl(filePath);

        nextAvatarUrl = publicUrlData.publicUrl;
      }

      const trimmedName = displayName.trim() || null;

      const { error: updateTableError } = await supabaseBrowser
        .from("users")
        .update({
          display_name: trimmedName,
          avatar_url: nextAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateTableError) throw updateTableError;

      await supabaseBrowser.auth.updateUser({
        data: {
          full_name: trimmedName,
          avatar_url: nextAvatarUrl,
        },
      });

      setAvatarUrl(nextAvatarUrl);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setFeedback({ type: "success", text: t("account.savedSuccess") });
    } catch (err) {
      console.error("Failed to update profile:", err);
      setFeedback({ type: "error", text: t("account.saveError") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const hasGitHub = Boolean(user?.githubUsername || user?.email);
  const shownAvatar = previewUrl ?? avatarUrl;
  const initials = (displayName || user?.githubUsername || "KW")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen max-w-360 mx-auto px-[6.25%] flex flex-col max-[1050px]:px-[4%] max-[760px]:px-5.5 max-[460px]:px-4.25">
      <header className="h-19.5 flex items-center justify-between border-b border-line max-[760px]:h-16.5">
        <Brand />
        <div className="ml-auto flex items-center gap-5.5 max-[760px]:gap-3 max-[460px]:gap-0">
          <Link
            className="inline-flex items-center gap-2 text-[#71766e] no-underline text-[11px] hover:text-[#171a15]"
            href="/"
          >
            <ArrowLeft size={14} /> {t("common.backHome")}
          </Link>
          <LanguageDropdown />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-start justify-center w-full max-w-160 mx-auto py-16 max-[760px]:py-11">
        <h1 className="m-0 text-[#171a15] text-[clamp(44px,5.5vw,64px)] leading-none tracking-[-3.5px] font-semibold max-[460px]:text-[42px] max-[460px]:tracking-[-2.5px]">
          {t("account.profile")} {t("account.toKredoWork")}
        </h1>
        <p className="mt-4 mb-7 text-[#676c63] text-[13px] leading-[1.7]">
          {t("account.lede")}
        </p>

        {/* Formulario editable de Avatar + Nombre visible */}
        {user && (
          <form
            onSubmit={(e) => void handleSaveProfile(e)}
            className="w-full p-5 border border-[#e6e9e3] bg-white flex flex-col gap-5"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group w-18 h-18 rounded-full overflow-hidden border border-[#dce1d7] bg-[#f4f6f2] text-[#2c3327] font-semibold text-base grid place-items-center cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-lime"
                aria-label={t("account.changePhoto")}
              >
                {shownAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shownAvatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="absolute inset-0 bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                  <Camera size={18} />
                </span>
              </button>

              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line bg-[#f8f9f7] text-[#171a15] text-[11px] font-medium cursor-pointer hover:bg-[#eef1eb]"
                >
                  <Camera size={13} /> {t("account.changePhoto")}
                </button>
                <span className="text-[10px] text-[#7b8176]">
                  {t("account.photoHint")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="display-name-input"
                className="text-[11px] font-medium text-[#242820]"
              >
                {t("account.displayNameLabel")}
              </label>
              <input
                id="display-name-input"
                type="text"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("account.displayNamePlaceholder")}
                className="w-full h-10 px-3 rounded border border-[#dce1d7] bg-white text-xs text-[#171a15] focus:outline-none focus:border-[#171a15]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 min-h-9.5 px-4 rounded-md bg-[#171a15] text-white text-xs font-medium cursor-pointer transition-colors hover:bg-[#30372c] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    {t("account.saving")}
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    {t("account.saveChanges")}
                  </>
                )}
              </button>

              {feedback && (
                <p
                  role="status"
                  className={`m-0 text-[11px] ${
                    feedback.type === "success"
                      ? "text-[#4b7d35] font-medium"
                      : "text-[#a24132]"
                  }`}
                >
                  {feedback.text}
                </p>
              )}
            </div>
          </form>
        )}

        {/* Tarjeta GitHub */}
        <div className="mt-4 flex items-center gap-3.25 w-full p-4 border border-[#e6e9e3] bg-white">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <strong className="truncate text-[#242820] text-xs">
              {t("account.githubAccount")}
            </strong>
            <span className="truncate text-[#7b8176] text-[10px]">
              {hasGitHub
                ? `${user?.githubUsername ? `@${user.githubUsername}` : ""}${user?.email ? ` · ${user.email}` : ""}`
                : t("wallet.githubNotConnected")}
            </span>
          </span>
          <span className="flex items-center gap-1.75 text-[#568a3f] text-[9px] whitespace-nowrap">
            <span
              className={`w-1.75 h-1.75 rounded-full ${hasGitHub ? "bg-lime" : "bg-[#c7ccc3]"}`}
            />
            {hasGitHub
              ? t("wallet.githubConnected")
              : t("wallet.githubNotConnected")}
          </span>
        </div>

        {!hasGitHub && (
          <div className="mt-3 w-full">
            <GitHubSignInButton />
          </div>
        )}

        {/* Solana Wallet Card */}
        <div className="mt-4 flex w-full flex-col gap-3 border border-[#e6e9e3] bg-white p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
              <Wallet size={14} /> {t("register.solanaDevnet")}
            </span>
            {user?.linkedWallet && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#568a3f]">
                  {user.linkedWallet.slice(0, 4)}…{user.linkedWallet.slice(-4)}{" "}
                  · {t("wallet.walletVerified")}
                </span>
                <Link
                  href={`/profile/${user.linkedWallet}`}
                  className="inline-flex items-center gap-1 text-[10px] text-[#171a15] underline hover:opacity-75"
                >
                  {t("account.viewPublicProfile")} <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </div>
          <WalletConnect
            variant="compact"
            onVerified={() => {
              void loadAccount();
            }}
          />
        </div>

        <div className="flex items-start gap-3 mt-6 flex-wrap">
          {user && <SignOutButton />}
          <Link
            className="inline-flex items-center justify-center gap-3 no-underline min-h-11 px-4.5 rounded-md bg-[#171a15] text-white text-xs transition-colors duration-180 hover:bg-[#30372c]"
            href="/bounties"
          >
            {t("account.goToKredoWork")}
          </Link>
        </div>
      </section>

      <footer className="flex items-center justify-between gap-5 py-4.25 border-t border-line text-[#858a80] text-[9px] max-[760px]:flex-wrap max-[760px]:[&>span]:w-full">
        <Brand compact variant="footer" />
        <span>{t("common.builtForMaintainers")}</span>
      </footer>
    </main>
  );
}
