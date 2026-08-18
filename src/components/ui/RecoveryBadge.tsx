import { ReactNode } from "react";
import { Feature, RECOVERY_LABELS, RECOVERY_SHORT_LABELS, RecoveryType, Resource } from "@/lib/types";
import { AbilityHintPanel } from "./AbilityHintPanel";
import { CHIP_TONE_CLASSES, ChipTone } from "./chipTones";
import { HintFact } from "./HintFact";
import { MetaBadge } from "./MetaBadge";

/**
 * SR/LR/Manual colors were picked by hand in the interactive chip-color
 * prototype (click a hue, nudge a per-chip lightness slider) rather than
 * derived from a single named Tailwind hue — see `sr`/`lr`/`steel` in
 * `CHIP_TONE_CLASSES` for the exact values. `lr` deliberately reuses a
 * blue-family hex (that tone's own doc comment explains why blue is
 * otherwise reserved for the Limited Use identity dot). Manual gets its
 * own `steel` tone, distinct from `neutral` even though both start from
 * the same gray, so it doesn't read identical to Custom. Custom stays on
 * plain `neutral` — no color, no meaning, matches its existing
 * dashed-border "not official content" convention.
 */
const RECOVERY_TONE: Record<RecoveryType, ChipTone> = {
  "short-rest": "sr",
  "long-rest": "lr",
  manual: "steel",
  dawn: "lime",
  daily: "pink",
  encounter: "fuchsia",
  custom: "neutral",
};

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
      colorClassName={`${CHIP_TONE_CLASSES[RECOVERY_TONE[recovery]]}${recovery === "custom" ? " border-dashed" : ""}`}
    />
  );
}

/**
 * The "can I use this right now" line every trackable-ability hover-hint
 * shows for a pool-kind resource (`AbilityHintPanel`'s `status` prop,
 * `SpellHintPanel`) — a labeled "Recovery" line matching the same
 * `HintFact` grammar every other line in these hints already uses
 * (`Duration`, `Components`, `Save DC`). Used to be a bare sentence ("Short
 * Rest recovery · 1/2") with no label of its own and a lighter font weight
 * than its neighbors — the one line in the panel that didn't follow that
 * grammar, which read as bolted on rather than part of the same list. One
 * shared source instead of each caller hand-rolling its own
 * `<span className="text-sky-400">...</span>` (this used to be duplicated
 * byte-for-byte across `CharacterDetailsModal.tsx`, `aiGlossary.tsx` ×2,
 * `ResourceMeter.tsx`, `ResourceCoveragePanel.tsx`,
 * `SpellSlotsResourcesPanel.tsx`). `current`/`max` are optional since a
 * party-wide aggregate view doesn't always have one exact count to show.
 */
export function recoveryStatusLine(recovery: RecoveryType, current?: number, max?: number) {
  return (
    <HintFact
      label="Recovery"
      value={RECOVERY_LABELS[recovery]}
      trailing={current !== undefined && max !== undefined ? ` · ${current}/${max}` : undefined}
    />
  );
}

/**
 * `AbilityHintPanel` assembled for a `Feature`, `recoveryStatusLine` included
 * whenever the feature has its own charge pool — the one place every caller
 * showing a feature's hover hint builds it, instead of each hand-rolling the
 * same `name`/`metaLines`/`status`/`description` props and risking exactly
 * the drift that happened here once already: the Features tab passed
 * `status`, `characterReminders`' copy of this same panel didn't, so a
 * flagged feature with limited charges silently lost its "can I use this
 * right now" line the moment it showed up in the Reminders panel instead of
 * its own tab. `emptyDescription` stays a param (not hardcoded) since the
 * tab and the Reminders panel deliberately differ there — a bare feature row
 * shows nothing when it has no description, but a reminder wants an explicit
 * "No description." rather than a suspiciously empty hint.
 */
export function FeatureHintPanel({
  feature,
  emptyDescription,
  footer,
}: {
  feature: Feature;
  emptyDescription?: string;
  /** A "Full feature: X" back-reference for a feature that's a named concretization of a broader parent shown elsewhere in the same list (e.g. "Font of Magic: Sorcery Points" -> "Font of Magic") — see `CharacterDetailsModal.tsx`'s `buildFeatureLinks`, the only current caller that passes this. */
  footer?: ReactNode;
}) {
  return (
    <AbilityHintPanel
      name={feature.name}
      metaLines={[feature.source]}
      status={feature.max !== undefined && recoveryStatusLine(feature.recovery!, feature.current, feature.max)}
      description={feature.description}
      emptyDescription={emptyDescription}
      footer={footer}
    />
  );
}

/** Same idea as `FeatureHintPanel`, for a `Resource` — its charge pool is never optional the way a `Feature`'s is, so `status` needs no `!== undefined` guard. */
export function ResourceHintPanel({ resource }: { resource: Resource }) {
  return (
    <AbilityHintPanel
      name={resource.name}
      metaLines={[resource.source]}
      status={recoveryStatusLine(resource.recovery, resource.current, resource.max)}
      description={resource.description}
    />
  );
}
