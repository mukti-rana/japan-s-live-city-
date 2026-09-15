"use client";

import { useMemo, useState } from "react";
import { Home, Receipt, TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import FieldInput from "@/components/ui/FieldInput";
import { calculateMoveInCost } from "@/lib/calc/rent";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export default function RentCalculator() {
  const [monthlyRent, setMonthlyRent] = useState("85000");
  const [depositMonths, setDepositMonths] = useState("1");
  const [keyMoneyMonths, setKeyMoneyMonths] = useState("1");
  const [agencyFeeMonths, setAgencyFeeMonths] = useState("1");
  const [guarantorFeeMonths, setGuarantorFeeMonths] = useState("0.5");
  const [fireInsurance, setFireInsurance] = useState("18000");
  const [keyExchangeFee, setKeyExchangeFee] = useState("20000");

  const result = useMemo(
    () =>
      calculateMoveInCost({
        monthlyRent: parseFloat(monthlyRent) || 0,
        depositMonths: parseFloat(depositMonths) || 0,
        keyMoneyMonths: parseFloat(keyMoneyMonths) || 0,
        agencyFeeMonths: parseFloat(agencyFeeMonths) || 0,
        guarantorFeeMonths: parseFloat(guarantorFeeMonths) || 0,
        fireInsurance: parseFloat(fireInsurance) || 0,
        keyExchangeFee: parseFloat(keyExchangeFee) || 0,
      }),
    [
      monthlyRent,
      depositMonths,
      keyMoneyMonths,
      agencyFeeMonths,
      guarantorFeeMonths,
      fireInsurance,
      keyExchangeFee,
    ],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sakura/15 text-sakura">
            <Home size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Apartment details
          </p>
        </div>

        <FieldInput
          label="Monthly rent"
          suffix="¥ / mo"
          value={monthlyRent}
          onChange={setMonthlyRent}
        />

        <div className="grid grid-cols-2 gap-3">
          <FieldInput
            label="Deposit (敷金)"
            suffix="months"
            value={depositMonths}
            onChange={setDepositMonths}
          />
          <FieldInput
            label="Key money (礼金)"
            suffix="months"
            value={keyMoneyMonths}
            onChange={setKeyMoneyMonths}
          />
          <FieldInput
            label="Agency fee"
            suffix="months"
            value={agencyFeeMonths}
            onChange={setAgencyFeeMonths}
          />
          <FieldInput
            label="Guarantor fee"
            suffix="months"
            value={guarantorFeeMonths}
            onChange={setGuarantorFeeMonths}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldInput
            label="Fire insurance"
            suffix="¥"
            value={fireInsurance}
            onChange={setFireInsurance}
          />
          <FieldInput
            label="Key exchange fee"
            suffix="¥"
            value={keyExchangeFee}
            onChange={setKeyExchangeFee}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          Defaults reflect common Tokyo-area norms — every landlord and
          agency sets its own terms, so treat this as a starting estimate.
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Receipt size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Estimated move-in cost
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {result.lineItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg px-2 py-1.5"
            >
              <span className="text-xs text-muted">
                {item.label} <span className="text-glass-border">·</span>{" "}
                <span className="font-jp">{item.labelJa}</span>
              </span>
              <span className="text-xs font-medium tabular-nums text-foreground">
                {yen.format(item.amount)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-sakura/25 bg-sakura/5 px-4 py-3.5">
          <div>
            <p className="text-xs text-muted">Total move-in cost</p>
            <p className="text-[11px] text-muted">
              ≈ {result.totalInMonthsRent.toFixed(1)}× monthly rent
            </p>
          </div>
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {yen.format(result.total)}
          </span>
        </div>

        <div className="flex gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-[11px] leading-relaxed text-muted">
            An estimate only, not a quote. Actual costs vary by property,
            city, and agency — some charge less (or more), and a few
            no-key-money listings skip 礼金 entirely.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
