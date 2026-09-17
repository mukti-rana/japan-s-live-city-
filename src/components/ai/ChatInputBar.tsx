"use client";

import { useRef } from "react";
import { Sparkles, Loader2, Paperclip, X } from "lucide-react";
import { LANGUAGES, type LanguageCode } from "@/lib/ai/languages";

export interface AttachedImage {
  previewUrl: string;
  base64: string;
  mediaType: string;
}

export default function ChatInputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  loading,
  language,
  onLanguageChange,
  image,
  onAttach,
  onRemoveImage,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
  language: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  image: AttachedImage | null;
  onAttach: (file: File) => void;
  onRemoveImage: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-glass-border bg-glass-bg p-3">
      {image && (
        <div className="relative w-fit">
          <img src={image.previewUrl} alt="Attached" className="h-16 w-16 rounded-lg object-cover" />
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted hover:text-sakura"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask LIVE CITY AI anything about Japan…"
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted outline-none disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
            disabled={disabled}
            className="rounded-lg border border-glass-border bg-glass-bg px-2 py-1 text-[11px] text-muted outline-none disabled:opacity-50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-glass-border text-muted transition-colors hover:text-azure disabled:opacity-50"
            title="Attach an image"
          >
            <Paperclip size={13} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAttach(file);
              e.target.value = "";
            }}
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sakura to-gold px-4 py-2 text-xs font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
