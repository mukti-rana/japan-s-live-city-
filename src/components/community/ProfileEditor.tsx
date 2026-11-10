"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/lib/i18n/inline";
import { preparePhoto, PhotoError } from "@/lib/community/clientImage";
import { PROFILE_LIMITS, validateProfileInput, type ProfileErrors } from "@/lib/community/validation";
import type { CommunityProfile } from "@/lib/community/types";
import Avatar from "@/components/community/Avatar";

const input = "w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";
const label = "mb-1.5 block text-xs font-semibold text-foreground";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type PrefKey = "likes" | "comments" | "answers" | "helpful";
const PREF_TEXT: { key: PrefKey; label: string; hint: string }[] = [
  { key: "likes", label: "Likes on my posts", hint: "Someone likes a photo you shared." },
  { key: "comments", label: "Comments and replies", hint: "Someone comments on your post or replies to you." },
  { key: "answers", label: "Answers to my questions", hint: "Someone answers a question you asked." },
  { key: "helpful", label: "Helpful votes", hint: "Someone finds your answer or review helpful." },
];

// Edit your community profile: picture, username, name, bio, what you share
// publicly, and which notifications you want. Your email never appears here
// or on your public profile.
export default function ProfileEditor({ profile }: { profile: CommunityProfile }) {
  const tr = useTranslate();
  const router = useRouter();
  const { user } = useAuth();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [showStats, setShowStats] = useState(profile.showStats);
  const [showVisited, setShowVisited] = useState(profile.showVisited);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({ likes: true, comments: true, answers: true, helpful: true });
  const [prefMsg, setPrefMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Your notification choices (only you can read them).
  useEffect(() => {
    if (!user) return;
    let active = true;
    createClient()
      .from("community_notification_prefs")
      .select("likes,comments,answers,helpful")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setPrefs(data as Record<PrefKey, boolean>);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const err = (k: keyof ProfileErrors) =>
    errors[k] ? (
      <p id={`pe-err-${k}`} role="alert" className="mt-1.5 text-xs font-medium text-sakura">
        {tr(errors[k]!)}
      </p>
    ) : null;
  const bad = (k: keyof ProfileErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `pe-err-${k}` : undefined });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    const checked = validateProfileInput({ username, displayName, bio, showStats, showVisited }, profile.username);
    if (!checked.ok) {
      setErrors(checked.errors);
      setMessage({ tone: "error", text: "Please check the highlighted fields." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/community/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.value) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: ProfileErrors };
      if (res.ok) {
        setMessage({ tone: "ok", text: "Your profile was saved." });
        router.refresh();
        setBusy(false);
        return;
      }
      if (data.fields) setErrors(data.fields);
      setMessage({ tone: "error", text: data.error ?? "We couldn't save your profile. Please try again." });
    } catch {
      setMessage({ tone: "error", text: "We couldn't save your profile. Please try again." });
    }
    setBusy(false);
  }

  async function pickAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarMsg("");
    try {
      const { blob } = await preparePhoto(file);
      const body = new FormData();
      body.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/community/avatar", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) router.refresh();
      else setAvatarMsg(data.error ?? "We couldn't save that photo. Please try again.");
    } catch (e) {
      setAvatarMsg(e instanceof PhotoError ? (e.code === "type" ? "That file isn't a photo." : e.code === "size" ? "That photo is too large. Please use one under 30 MB." : "We couldn't open that photo. Try a JPEG or PNG (iPhone photos work best as 'Most Compatible').") : "We couldn't save that photo. Please try again.");
    }
    setAvatarBusy(false);
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarMsg("");
    const res = await fetch("/api/community/avatar", { method: "DELETE" });
    if (res.ok) router.refresh();
    else setAvatarMsg("We couldn't remove your picture. Please try again.");
    setAvatarBusy(false);
  }

  async function togglePref(key: PrefKey) {
    if (!user) return;
    const next = !prefs[key];
    setPrefMsg("");
    setPrefs((p) => ({ ...p, [key]: next }));
    const { error } = await createClient().from("community_notification_prefs").upsert({ user_id: user.id, [key]: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      setPrefMsg("That didn't work. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="pe-pic" className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <h2 id="pe-pic" className="text-base font-semibold text-foreground">
          {tr("Profile picture")}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size={72} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} className={`inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-4 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-60 ${ring}`}>
              {avatarBusy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
              {tr("Choose a picture")}
            </button>
            {profile.avatarUrl && (
              <button type="button" onClick={removeAvatar} disabled={avatarBusy} className={`inline-flex h-10 items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 text-sm font-medium text-foreground transition hover:border-white/30 disabled:opacity-60 ${ring}`}>
                <Trash2 size={15} aria-hidden="true" />
                {tr("Remove")}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pickAvatar(f);
            }}
          />
        </div>
        <p className="mt-3 text-xs text-foreground/80">{tr("Your picture is cropped to a square and saved without any location or camera details.")}</p>
        {avatarMsg && (
          <p role="alert" className="mt-2 text-xs font-medium text-sakura">
            {tr(avatarMsg)}
          </p>
        )}
      </section>

      <form onSubmit={save} noValidate className="flex flex-col gap-5 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <h2 className="text-base font-semibold text-foreground">{tr("Public profile")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pe-username" className={label}>
              {tr("Username")}
            </label>
            <input id="pe-username" value={username} onChange={(e) => { setUsername(e.target.value); setErrors((x) => ({ ...x, username: undefined })); }} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} h-11`} {...bad("username")} />
            {err("username")}
            <p className="mt-1.5 text-[11px] text-foreground/70">{tr("Shown on everything you share. You can change it once every 30 days.")}</p>
          </div>
          <div>
            <label htmlFor="pe-name" className={label}>
              {tr("Display name")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
            </label>
            <input id="pe-name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setErrors((x) => ({ ...x, displayName: undefined })); }} maxLength={PROFILE_LIMITS.displayNameMax} className={`${input} h-11`} {...bad("displayName")} />
            {err("displayName")}
          </div>
        </div>
        <div>
          <label htmlFor="pe-bio" className={label}>
            {tr("Short bio")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
          </label>
          <textarea id="pe-bio" value={bio} onChange={(e) => { setBio(e.target.value); setErrors((x) => ({ ...x, bio: undefined })); }} maxLength={PROFILE_LIMITS.bioMax} rows={3} placeholder={tr("Tell people a little about you and your Japan.")} className={`${input} py-2.5`} {...bad("bio")} />
          <p className="mt-1 text-right text-[11px] text-foreground/70">
            {bio.length} / {PROFILE_LIMITS.bioMax}
          </p>
          {err("bio")}
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold text-foreground">{tr("What others can see")}</legend>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c4b5fd]" />
            <span>
              {tr("Show my contribution numbers")}
              <span className="block text-xs text-foreground/75">{tr("Photos shared, reviews written, questions asked and helpful votes.")}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={showVisited} onChange={(e) => setShowVisited(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c4b5fd]" />
            <span>
              {tr("Share the places I've been")}
              <span className="block text-xs text-foreground/75">{tr("Off by default: your list is private unless you turn this on.")}</span>
            </span>
          </label>
          <p className="text-xs text-foreground/75">{tr("Your email address is never shown. Saved places are always private.")}</p>
        </fieldset>

        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm text-foreground ${message.tone === "error" ? "border-sakura/40 bg-sakura/10" : "border-mint/40 bg-mint/10"}`}>
            {tr(message.text)}
          </p>
        )}
        <div>
          <button type="submit" disabled={busy} aria-busy={busy} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {tr("Save profile")}
          </button>
        </div>
      </form>

      <section aria-labelledby="pe-notify" className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <h2 id="pe-notify" className="text-base font-semibold text-foreground">
          {tr("Community notifications")}
        </h2>
        <p className="mt-1 text-xs text-foreground/80">{tr("They appear in the bell at the top. Likes and helpful votes are combined so you are not flooded.")}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {PREF_TEXT.map((p) => (
            <li key={p.key}>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                <input type="checkbox" checked={prefs[p.key]} onChange={() => togglePref(p.key)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c4b5fd]" />
                <span>
                  {tr(p.label)}
                  <span className="block text-xs text-foreground/75">{tr(p.hint)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {prefMsg && (
          <p role="alert" className="mt-3 text-xs font-medium text-sakura">
            {tr(prefMsg)}
          </p>
        )}
      </section>
    </div>
  );
}
