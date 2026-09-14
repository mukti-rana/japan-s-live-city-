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
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-azure/40"
      />
    </label>
  );
}
