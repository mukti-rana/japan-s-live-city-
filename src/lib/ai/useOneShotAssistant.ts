"use client";

import { useCallback, useState } from "react";
import { readNdjsonStream } from "@/lib/ai/ndjsonStream";
import type { CardData } from "@/lib/ai/types";

export type AssistantMode = "explain-japanese" | "sign-assistant";

interface SubmitOptions {
  text: string;
  language: string;
  mode: AssistantMode;
  image?: { base64: string; mediaType: string };
}

export function useOneShotAssistant() {
  const [content, setContent] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (opts: SubmitOptions) => {
    setLoading(true);
    setError(null);
    setContent("");
    setCards([]);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: opts.text }],
          language: opts.language,
          mode: opts.mode,
          image: opts.image,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      for await (const event of readNdjsonStream(res.body)) {
        switch (event.type) {
          case "text":
            setContent((prev) => prev + event.delta);
            break;
          case "card":
            setCards((prev) => [...prev, event.card]);
            break;
          case "error":
            setError(event.message);
            break;
          case "tool_start":
          case "tool_end":
          case "done":
            break;
        }
      }
    } catch {
      setError("Couldn't reach LIVE CITY AI. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, content, cards, loading, error };
}
