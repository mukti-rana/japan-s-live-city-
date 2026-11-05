"use client";

import { Loader2 } from "lucide-react";
import { TOOL_LABELS } from "@/lib/ai/tools";
import { useTranslate } from "@/lib/i18n/inline";

export default function ToolActivityPill({ tool }: { tool: string }) {
  const tr = useTranslate();
  const meta = TOOL_LABELS[tool] ?? { label: tool, icon: "🔧" };
  return (
    <span className="flex w-fit items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-[11px] text-muted">
      <Loader2 size={11} className="animate-spin" />
      <span>{meta.icon}</span>
      {tr(meta.label)}…
    </span>
  );
}
