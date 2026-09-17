"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import MessageList from "@/components/ai/MessageList";
import ChatInputBar, { type AttachedImage } from "@/components/ai/ChatInputBar";
import { readNdjsonStream } from "@/lib/ai/ndjsonStream";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { DEFAULT_LANGUAGE } from "@/lib/ai/languages";
import type { UIMessage } from "@/components/ai/uiTypes";

function newId(): string {
  return Math.random().toString(36).slice(2);
}

export default function ChatAssistant({ configured }: { configured: boolean }) {
  const { language: siteLanguage, ready: siteLanguageReady } = useLanguage();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // Seed the chat's language from the site-wide preference once, right
  // after it's resolved from localStorage post-mount — but only once, so a
  // later change to the global switcher doesn't retroactively change an
  // in-progress conversation's language out from under the user.
  useEffect(() => {
    if (siteLanguageReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(siteLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLanguageReady]);
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function updateMessage(id: string, updater: (m: UIMessage) => UIMessage) {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }

  function handleAttach(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setFetchError("Image is too large — please attach one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, base64] = dataUrl.split(",");
      setImage({ previewUrl: dataUrl, base64, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!configured || !input.trim() || loading) return;

    setFetchError(null);
    const outgoingHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    const userText = input.trim();
    const attachedImage = image;

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: userText, cards: [], pendingTools: [] },
    ]);
    setInput("");
    setImage(null);

    const assistantId = newId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", cards: [], pendingTools: [] },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...outgoingHistory, { role: "user", content: userText }],
          language,
          image: attachedImage
            ? { base64: attachedImage.base64, mediaType: attachedImage.mediaType }
            : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        updateMessage(assistantId, (m) => ({
          ...m,
          error: data?.error ?? "Something went wrong. Please try again.",
        }));
        setLoading(false);
        return;
      }

      for await (const event of readNdjsonStream(res.body)) {
        switch (event.type) {
          case "text":
            updateMessage(assistantId, (m) => ({ ...m, content: m.content + event.delta }));
            break;
          case "tool_start":
            updateMessage(assistantId, (m) => ({
              ...m,
              pendingTools: [...m.pendingTools, { id: event.id, name: event.tool }],
            }));
            break;
          case "tool_end":
            updateMessage(assistantId, (m) => ({
              ...m,
              pendingTools: m.pendingTools.filter((t) => t.id !== event.id),
            }));
            break;
          case "card":
            updateMessage(assistantId, (m) => ({ ...m, cards: [...m.cards, event.card] }));
            break;
          case "error":
            updateMessage(assistantId, (m) => ({ ...m, error: event.message }));
            break;
          case "done":
            break;
        }
      }
    } catch {
      updateMessage(assistantId, (m) => ({
        ...m,
        error: "Couldn't reach LIVE CITY AI. Check your connection and try again.",
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-4">
      {!configured && (
        <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted">
            LIVE CITY AI isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">ANTHROPIC_API_KEY</code>{" "}
            to <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">.env.local</code> and
            restart the dev server to enable it.
          </p>
        </GlassCard>
      )}

      {fetchError && (
        <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
          <p className="text-xs leading-relaxed text-muted">{fetchError}</p>
        </GlassCard>
      )}

      <MessageList messages={messages} />

      <ChatInputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={!configured || loading}
        loading={loading}
        language={language}
        onLanguageChange={setLanguage}
        image={image}
        onAttach={handleAttach}
        onRemoveImage={() => setImage(null)}
      />
    </div>
  );
}
