import { Character, CustomConditionTemplate } from "@/lib/types";
import { StatusRail } from "./ui/StatusRail";

/**
 * Thin wrapper around `StatusRail` that wires its props from a `Character` —
 * the exact same 9-prop call was duplicated byte-for-byte between
 * `CharacterCard` and `CharacterDetailsModal` (confirmed by a UI-kit audit),
 * the same "two copies of one bit of wiring can drift" risk the JSX-heavy
 * extractions elsewhere in this file guard against, just for prop plumbing
 * instead of markup. Deliberately does NOT pass `onConditionsChange`/
 * `onExhaustionChange` — unlike `CreatureStatusRail`, a character's standard
 * conditions/exhaustion aren't toggled from this popover (both existing call
 * sites already omitted them identically, so this preserves behavior exactly
 * rather than changing it as a side effect of deduplicating).
 */
export function CharacterStatusRail({
  character,
  onUpdate,
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  character: Character;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const c = character;
  return (
    <StatusRail
      conditions={c.combat.conditions}
      exhaustion={c.combat.exhaustion}
      concentrating={Boolean(c.concentrating)}
      heroicInspiration={c.heroicInspiration}
      customConditionIds={c.combat.customConditionIds ?? []}
      customConditionLibrary={customConditionLibrary}
      onToggleConcentration={onUpdate ? () => onUpdate(c.id, { concentrating: !c.concentrating }) : undefined}
      onCustomConditionIdsChange={
        onUpdate ? (customConditionIds) => onUpdate(c.id, { combat: { ...c.combat, customConditionIds } }) : undefined
      }
      onCustomConditionLibraryChange={onCustomConditionLibraryChange}
    />
  );
}
