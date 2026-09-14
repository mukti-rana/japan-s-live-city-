import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import YenConverter from "@/components/currency/YenConverter";
import { getJpyRates } from "@/lib/services/currency";

export const metadata: Metadata = {
  title: "Yen Converter — Live City Japan",
  description:
    "Convert Japanese yen to and from other currencies using live exchange rates.",
};

export default async function YenConverterPage() {
  const rates = await getJpyRates().catch(() => null);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Money
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Yen Converter
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Quickly convert Japanese yen to other currencies, with live rates.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <YenConverter rates={rates} />
      </Reveal>
    </div>
  );
}
