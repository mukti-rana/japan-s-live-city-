import ArrowLink from "@/components/ui/ArrowLink";
import T from "@/components/i18n/T";

// The one "View All" link used in every homepage section header. It is a real link to the
// section's full page, drawn as a bare animated arrow (no box, no border): the words stay
// for screen readers (see ArrowLink).
export default function ViewAllButton({
  href,
  label,
  className = "",
}: {
  href: string;
  // Spoken name for assistive technology when the visible label is just "View All".
  label?: string;
  className?: string;
}) {
  return (
    <ArrowLink href={href} label={label} className={className}>
      <T k="widget.viewAll" />
    </ArrowLink>
  );
}
