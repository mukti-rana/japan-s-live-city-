import type { CardData } from "@/lib/ai/types";

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards: CardData[];
  pendingTools: { id: string; name: string }[];
  error?: string;
}
