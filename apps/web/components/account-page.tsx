"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ExternalLink,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
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

const CARD = "w-full border border-[#e6e9e3] bg-white p-4 sm:p-5";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-360 flex-col px-4 sm:px-6 md:px-8 lg:px-[6.25%]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-line lg:h-19.5">
        <Brand />
        <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-5.5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-xs text-[#5f645b] no-underline transition-colors hover:text-[#171a15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171a15]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">
              {t("common.backHome")}
            </span>
          </Link>
          <LanguageDropdown />
        </div>
      </header>

      {/* Contenido */}
      <section className="mx-auto flex w-full max-w-160 flex-1 flex-col py-10 sm:py-14 lg:py-16">
        <h1 className="m-0 text-[clamp(2.5rem,8vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[#171a15]">
          {t("account.profile")} {t("account.toKredoWork")}
        </h1>
        <p className="mb-7 mt-4 text-sm leading-7 text-[#676c63]">
          {t("account.lede")}
        </p>

        <div className="flex flex-col gap-4">
          {/* Perfil editable */}
          {user && (
            <form
              onSubmit={(e) => void handleSaveProfile(e)}
              className={`${CARD} flex flex-col gap-5`}
            >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#cfd5c9] bg-[#f4f6f2] text-lg font-semibold text-[#2c3327] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  aria-label={t("account.changePhoto")}
                >
                  {shownAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shownAvatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="block size-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Camera size={20} />
                  </span>
                </button>

                <div className="flex min-w-0 flex-col items-start gap-2">
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
                    className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#cfd5c9] bg-white px-3.5 text-xs font-medium text-[#171a15] transition-colors hover:border-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    <Camera size={14} />
                    {t("account.changePhoto")}
                  </button>
                  <span className="text-xs leading-snug text-[#6b7066]">
                    {t("account.photoHint")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="display-name-input"
                  className="text-xs font-medium text-[#242820]"
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
                  className="h-11 w-full rounded-md border border-[#cfd5c9] bg-white px-3 text-base text-[#171a15] placeholder:text-[#9aa095] focus:border-[#171a15] focus:outline-none focus:ring-2 focus:ring-lime/40 sm:text-sm"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#171a15] px-5 text-sm font-medium text-white transition-colors hover:bg-[#30372c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171a15] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      {t("account.saving")}
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {t("account.saveChanges")}
                    </>
                  )}
                </button>

                {feedback && (
                  <p
                    role="status"
                    className={`m-0 text-xs leading-snug ${
                      feedback.type === "success"
                        ? "font-medium text-[#3f6f2a]"
                        : "text-[#a24132]"
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </div>
            </form>
          )}

          {/* GitHub */}
          <div className="flex flex-col gap-3">
            <div className={`${CARD} flex items-center gap-3`}>
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f4f6f2] text-[#171a15]"
              >
                <SiGithub size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-sm text-[#242820]">
                  {t("account.githubAccount")}
                </strong>
                <span className="truncate text-xs text-[#6b7066]">
                  {hasGitHub
                    ? `${user?.githubUsername ? `@${user.githubUsername}` : ""}${user?.email ? ` · ${user.email}` : ""}`
                    : t("wallet.githubNotConnected")}
                </span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  hasGitHub
                    ? "border-[#cfe8c4] bg-[#eef8e9] text-[#3f6f2a]"
                    : "border-[#e1e5dd] bg-[#f4f5f2] text-[#6b7066]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.75 rounded-full ${hasGitHub ? "bg-lime" : "bg-[#b4bab0]"}`}
                />
                {hasGitHub
                  ? t("wallet.githubConnected")
                  : t("wallet.githubNotConnected")}
              </span>
            </div>

            {!hasGitHub && <GitHubSignInButton />}
          </div>

          {/* Wallet de Solana */}
          <div className={`${CARD} flex flex-col gap-4`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#242820]">
                <Wallet size={16} />
                {t("register.solanaDevnet")}
              </span>
              {user?.linkedWallet && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-[#3f6f2a]">
                    {user.linkedWallet.slice(0, 4)}…
                    {user.linkedWallet.slice(-4)} · {t("wallet.walletVerified")}
                  </span>
                  <Link
                    href={`/profile/${user.linkedWallet}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#171a15] underline underline-offset-4 hover:opacity-75"
                  >
                    {t("account.viewPublicProfile")} <ExternalLink size={12} />
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
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
          {user ? <SignOutButton /> : <span />}
          <Link
            href="/bounties"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-lime px-5 text-sm font-semibold text-[#171a15] no-underline transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171a15] sm:w-auto"
          >
            {t("account.goToKredoWork")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-start gap-3 border-t border-line py-4 text-xs text-[#6b7066] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <Brand compact variant="footer" />
        <span>{t("common.builtForMaintainers")}</span>
      </footer>
    </main>
  );
}
