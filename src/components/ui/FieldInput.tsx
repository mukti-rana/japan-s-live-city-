export default function FieldInput({
  label,
  suffix,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 focus-within:border-azure/40">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="shrink-0 text-xs text-muted">{suffix}</span>
        )}
      </div>
    </label>
  );
}
