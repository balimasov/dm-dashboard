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

/**
 * The "can I use this right now" line every trackable-ability hover-hint
 * shows for a pool-kind resource (`AbilityHintPanel`'s `status` prop,
 * `SpellHintPanel`) — a labeled "Recovery" line matching the same "muted
 * label, bold sky value" grammar every other line in these hints already
 * uses (`Duration`, `Components`, `Save DC`). Used to be a bare sentence
 * ("Short Rest recovery · 1/2") with no label of its own and a lighter font
 * weight than its neighbors — the one line in the panel that didn't follow
 * that grammar, which read as bolted on rather than part of the same list.
 * One shared source instead of each caller hand-rolling its own
 * `<span className="text-sky-400">...</span>` (this used to be duplicated
 * byte-for-byte across `CharacterDetailsModal.tsx`, `aiGlossary.tsx` ×2,
 * `ResourceMeter.tsx`, `ResourceCoveragePanel.tsx`,
 * `SpellSlotsResourcesPanel.tsx`). `current`/`max` are optional since a
 * party-wide aggregate view doesn't always have one exact count to show.
 */
export function recoveryStatusLine(recovery: RecoveryType, current?: number, max?: number) {
  return (
    <span className="block">
      <span className="text-slate-500">Recovery</span>{" "}
      <span className="font-semibold text-sky-400">
        {RECOVERY_LABELS[recovery]}
        {current !== undefined && max !== undefined ? ` · ${current}/${max}` : ""}
      </span>
    </span>
  );
}
