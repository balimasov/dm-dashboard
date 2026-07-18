import { RECOVERY_LABELS, RECOVERY_SHORT_LABELS, RecoveryType } from "@/lib/types";
import { MetaBadge } from "./MetaBadge";

/**
 * Boxed recovery-type abbreviation (LR/SR/...), full name on hover/tap —
 * shared by every place a resource or spell charge shows its recovery type.
 * Built on the same `MetaBadge` primitive the spell-level/Cantrip badge
 * uses, so both share real hint behavior (works on a mobile tap, not just
 * desktop hover — a plain HTML `title` attribute, what this used to be, does
 * neither) even though their colors stay deliberately different by design.
 */
export function RecoveryBadge({ recovery }: { recovery: RecoveryType }) {
  return (
    <MetaBadge
      label={RECOVERY_SHORT_LABELS[recovery]}
      panel={<p>{RECOVERY_LABELS[recovery]} recovery.</p>}
      colorClassName="border-slate-700 text-slate-500"
    />
  );
}
