"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Coins, TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import FieldInput from "@/components/ui/FieldInput";
import CurrencySelect from "@/components/ui/CurrencySelect";
import {
  CURRENCY_LIST,
  type CurrencyCode,
  type JpyRates,
} from "@/lib/services/currency";
import Tx from "@/components/i18n/Tx";
import { useTranslate } from "@/lib/i18n/inline";

const ALL_CODES: CurrencyCode[] = ["JPY", ...CURRENCY_LIST];

const QUICK_TARGETS: CurrencyCode[] = [
  "USD",
  "EUR",
  "CNY",
  "KRW",
  "INR",
  "PHP",
  "THB",
  "AUD",
];

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export default function YenConverter({ rates }: { rates: JpyRates | null }) {
  const tr = useTranslate();
  const [amount, setAmount] = useState("10000");
  const [from, setFrom] = useState<CurrencyCode>("JPY");
  const [to, setTo] = useState<CurrencyCode>("USD");

  const result = useMemo(() => {
    if (!rates) return null;
    const parsed = parseFloat(amount) || 0;
    const amountInJpy = parsed / rates.rates[from];
    return amountInJpy * rates.rates[to];
  }, [rates, amount, from, to]);

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Coins size={17} />
          </div>
          <p className="text-sm font-semibold text-foreground"><Tx en="Convert" /></p>
        </div>

        {!rates ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3.5">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-gold" />
            <p className="text-xs leading-relaxed text-muted">
              <Tx en="Live exchange rates couldn't be loaded right now. Please try again shortly — we never show made-up rates." />
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-col gap-3">
                <FieldInput label="Amount" value={amount} onChange={setAmount} />
                <CurrencySelect
                  label="From"
                  value={from}
                  onChange={setFrom}
                  options={ALL_CODES}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
                aria-label={tr("Swap currencies")}
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg text-azure transition-colors hover:border-azure/40 hover:text-sakura sm:mb-[3px]"
              >
                <ArrowLeftRight size={16} />
              </button>

              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-xs font-medium text-muted">
                    <Tx en="Converted" />
                  </span>
                  <div className="mt-1.5 rounded-xl border border-sakura/25 bg-sakura/5 px-3.5 py-2.5">
                    <p className="truncate text-lg font-semibold tabular-nums text-foreground">
                      {formatAmount(result ?? 0)}
                    </p>
                  </div>
                </div>
                <CurrencySelect
                  label="To"
                  value={to}
                  onChange={setTo}
                  options={ALL_CODES}
                />
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted">
              {tr("Rates from the European Central Bank via Frankfurter, updated {date}. For reference only — banks and exchanges add their own margin.").replace("{date}", rates.date)}
            </p>
          </>
        )}
      </GlassCard>

      {rates && (
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            <Tx en="100 JPY is roughly" />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {QUICK_TARGETS.map((code) => (
              <div
                key={code}
                className="rounded-xl border border-glass-border bg-glass-bg px-3 py-2.5 text-center"
              >
                <p className="text-[10px] text-muted">{code}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(100 * rates.rates[code])}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
