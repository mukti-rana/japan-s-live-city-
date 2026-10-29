// Uncontrolled input for use with Server Action forms (FormData-based),
// unlike FieldInput which is a controlled component for client-side state.
export default function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 h-12 w-full rounded-xl border border-glass-border bg-glass-bg px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted/80 hover:border-white/20 focus:border-azure/60 focus:bg-glass-bg-strong focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
      />
    </label>
  );
}
