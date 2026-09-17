import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import SignAssistantForm from "@/components/sign-assistant/SignAssistantForm";

export const metadata: Metadata = {
  title: "Japan Sign Assistant — Live City Japan",
  description: "Photograph a Japanese sign, notice, or menu and get a full explanation in your language.",
};

export default function SignAssistantPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            LIVE CITY AI
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Japan Sign Assistant
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Photograph a sign, notice, or menu — LIVE CITY AI reads the Japanese, translates it,
            and explains what to do.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <SignAssistantForm configured={configured} />
      </Reveal>
    </div>
  );
}
