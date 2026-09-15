import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import RentCalculator from "@/components/rent/RentCalculator";

export const metadata: Metadata = {
  title: "Rent Calculator — Live City Japan",
  description:
    "Estimate the total move-in cost for an apartment in Japan — deposit, key money, agency fee, and more.",
};

export default function RentCalculatorPage() {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Money
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Rent Calculator
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Japan&apos;s move-in costs catch a lot of newcomers off guard —
            estimate what you&apos;ll actually need upfront.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <RentCalculator />
      </Reveal>
    </div>
  );
}
