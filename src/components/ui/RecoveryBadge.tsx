import { RECOVERY_LABELS, RECOVERY_SHORT_LABELS, RecoveryType } from "@/lib/types";

/** Boxed recovery-type abbreviation (LR/SR/...), full name on hover — shared by every place a resource or spell charge shows its recovery type. */
export function RecoveryBadge({ recovery }: { recovery: RecoveryType }) {
  return (
    <span
      title={RECOVERY_LABELS[recovery]}
      className="shrink-0 rounded border border-slate-700 px-1 text-[10px] font-medium uppercase text-slate-500"
    >
      {RECOVERY_SHORT_LABELS[recovery]}
    </span>
  );
}
