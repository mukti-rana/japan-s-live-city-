"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import CardRenderer from "@/components/ai/cards";
import ToolActivityPill from "@/components/ai/ToolActivityPill";
import type { UIMessage } from "@/components/ai/uiTypes";

export default function MessageList({ messages }: { messages: UIMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
        <Sparkles size={22} className="text-sakura" />
        <p className="text-sm">Ask LIVE CITY AI anything about Japan — weather, trains, festivals, places, news, or plan a trip.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`flex max-w-[85%] flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
            {message.content && (
              <div
                className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-sakura/20 to-gold/20 text-foreground"
                    : "border border-glass-border bg-glass-bg text-foreground"
                }`}
              >
                {message.content}
              </div>
            )}

            {message.pendingTools.map((tool) => (
              <ToolActivityPill key={tool.id} tool={tool.name} />
            ))}

            {message.cards.map((card, i) => (
              <CardRenderer key={`${card.kind}-${i}`} card={card} />
            ))}

            {message.error && (
              <div className="rounded-xl border border-sakura/25 bg-sakura/5 px-3 py-2 text-xs text-muted">
                {message.error}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
