import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import SalaryCalculator from "@/components/salary/SalaryCalculator";

export const metadata: Metadata = {
  title: "Salary Calculator — Live City Japan",
  description:
    "Estimate your monthly and annual income in Japan from hourly or monthly pay, including overtime.",
};

export default function SalaryCalculatorPage() {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Money
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Salary Calculator
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Estimate your income in Japan from hourly or monthly pay.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <SalaryCalculator />
      </Reveal>
    </div>
  );
}
