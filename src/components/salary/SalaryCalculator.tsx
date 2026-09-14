"use client";

import { useMemo, useState } from "react";
import { Wallet, Calculator, TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import FieldInput from "@/components/ui/FieldInput";
import { calculateSalary, type PayType } from "@/lib/calc/salary";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export default function SalaryCalculator() {
  const [payType, setPayType] = useState<PayType>("hourly");
  const [hourlyWage, setHourlyWage] = useState("1200");
  const [monthlySalary, setMonthlySalary] = useState("250000");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [overtimeHoursPerWeek, setOvertimeHoursPerWeek] = useState("5");

  const result = useMemo(
    () =>
      calculateSalary({
        payType,
        hourlyWage: parseFloat(hourlyWage) || 0,
        monthlySalary: parseFloat(monthlySalary) || 0,
        hoursPerWeek: parseFloat(hoursPerWeek) || 0,
        overtimeHoursPerWeek: parseFloat(overtimeHoursPerWeek) || 0,
      }),
    [payType, hourlyWage, monthlySalary, hoursPerWeek, overtimeHoursPerWeek],
  );

  const stats = [
    { label: "Hourly equivalent", value: `${yen.format(result.hourlyEquivalent)}/hr` },
    { label: "Base pay (monthly)", value: yen.format(result.basePayMonthly) },
    { label: "Overtime pay (monthly)", value: yen.format(result.overtimePayMonthly) },
    { label: "Total monthly", value: yen.format(result.totalMonthly), accent: true },
    { label: "Total annual", value: yen.format(result.totalAnnual), accent: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GlassCard className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sakura/15 text-sakura">
            <Calculator size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground">Your pay details</p>
        </div>

        <SegmentedToggle
          options={[
            { value: "hourly" as const, label: "Hourly" },
            { value: "monthly" as const, label: "Monthly" },
          ]}
          value={payType}
          onChange={setPayType}
        />

        {payType === "hourly" ? (
          <FieldInput
            label="Hourly wage"
            suffix="¥ / hr"
            value={hourlyWage}
            onChange={setHourlyWage}
          />
        ) : (
          <FieldInput
            label="Monthly salary"
            suffix="¥ / mo"
            value={monthlySalary}
            onChange={setMonthlySalary}
          />
        )}

        <FieldInput
          label="Hours per week"
          suffix="hrs"
          value={hoursPerWeek}
          onChange={setHoursPerWeek}
        />

        <FieldInput
          label="Overtime hours per week"
          suffix="hrs"
          value={overtimeHoursPerWeek}
          onChange={setOvertimeHoursPerWeek}
        />

        <p className="text-[11px] leading-relaxed text-muted">
          Overtime is estimated at a 1.25× premium, Japan&apos;s statutory
          minimum. Actual rates vary by employer and time of day/week.
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Wallet size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground">Estimated income</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                stat.accent
                  ? "border-sakura/25 bg-sakura/5"
                  : "border-glass-border bg-glass-bg"
              }`}
            >
              <span className="text-xs text-muted">{stat.label}</span>
              <span
                className={`tabular-nums font-semibold ${
                  stat.accent ? "text-lg text-foreground" : "text-sm text-foreground/90"
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-1 flex gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-[11px] leading-relaxed text-muted">
            These are rough estimates only — not tax or legal advice. Income
            tax, resident tax, and social insurance deductions are not
            included yet.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
