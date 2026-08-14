import { Creature, CustomConditionTemplate } from "@/lib/types";
import { StatusRail } from "./ui/StatusRail";

/**
 * Thin wrapper around `StatusRail` that wires its props from a `Creature` —
 * the exact same call was duplicated byte-for-byte between `CreatureCard`
 * and `CreatureDetailsModal` (confirmed by a UI-kit audit), same reasoning as
 * `CharacterStatusRail`'s own doc comment. Unlike the character version,
 * this one DOES pass `onConditionsChange`/`onExhaustionChange` — a
 * creature's standard conditions/exhaustion toggle from this same popover,
 * both existing call sites already did so identically, so this preserves
 * that difference exactly rather than unifying it away.
 */
export function CreatureStatusRail({
  creature,
  onUpdate,
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  creature: Creature;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  return (
    <StatusRail
      conditions={creature.conditions}
      exhaustion={creature.exhaustion}
      concentrating={Boolean(creature.concentrating)}
      customConditionIds={creature.customConditionIds ?? []}
      customConditionLibrary={customConditionLibrary}
      onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
      onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
      onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
      onCustomConditionIdsChange={onUpdate ? (customConditionIds) => onUpdate(creature.id, { customConditionIds }) : undefined}
      onCustomConditionLibraryChange={onCustomConditionLibraryChange}
    />
  );
}
