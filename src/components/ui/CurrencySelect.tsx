import { CURRENCY_LABELS, type CurrencyCode } from "@/lib/services/currency";

export default function CurrencySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  options: CurrencyCode[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className="mt-1.5 w-full appearance-none rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-sm font-medium text-foreground outline-none focus:border-azure/40"
      >
        {options.map((code) => (
          <option key={code} value={code} className="bg-panel text-foreground">
            {code} — {CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
