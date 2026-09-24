import T from "@/components/i18n/T";
import { TRAIN_STATUS_META, TRAIN_STATUS_ORDER } from "@/lib/data/trainStatus";

export default function TrainStatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {TRAIN_STATUS_ORDER.map((status) => {
        const meta = TRAIN_STATUS_META[status];
        return (
          <span key={status} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
            <T k={meta.labelKey} />
          </span>
        );
      })}
    </div>
  );
}
