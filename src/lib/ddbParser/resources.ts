/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbilityScores, ordinalLevel, Resource } from "../types";
import { computeLimitedUseCharges, diceTypeNote, resolveSnippetTemplate, shortDescription } from "./shared";
import { computePactMagicSlots } from "./spells";

export function computeResources(data: any, abilities: AbilityScores, profBonus: number, level: number, speed: number): Resource[] {
  function fromLimitedUse(
    name: string,
    lu: any,
    keyPrefix: string,
    idx: number,
    rawDescription: string | undefined,
    source: string,
    dice?: any
  ): Resource | null {
    const charges = computeLimitedUseCharges(lu, abilities, profBonus);
    if (!charges) return null;
    const baseDescription = rawDescription
      ? resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges.max, speed)
      : "";
    const description = (baseDescription + diceTypeNote(name ?? "", dice)).trim() || undefined;
    return {
      id: `${keyPrefix}-${idx}`,
      name: name || "Resource",
      current: charges.current,
      max: charges.max,
      recovery: charges.recovery,
      source,
      ...(description ? { description } : {}),
    };
  }

  const resources: Resource[] = [];
  const actionGroups: Array<[string, string, any[]]> = [
    ["race", "Race", data.actions?.race ?? []],
    ["class", "Class", data.actions?.class ?? []],
    ["feat", "Feat", data.actions?.feat ?? []],
  ];
  for (const [group, source, actions] of actionGroups) {
    actions.forEach((action: any, idx: number) => {
      const resource = fromLimitedUse(
        action.name,
        action.limitedUse,
        `action-${group}`,
        idx,
        shortDescription(action.snippet, action.description),
        source,
        action.dice
      );
      if (resource) resources.push(resource);
    });
  }

  // Innate spells with their own charge pool (e.g. a Drow's Faerie Fire/
  // Darkness, a Tiefling's Hellish Rebuke, a feat-granted Spider Climb) —
  // same `spells.{race,class,background,item,feat}` groups `computeSpells`
  // reads, so a spell shows up there *and* here whenever it actually tracks
  // charges, matching D&D Beyond's own character sheet (which lists these
  // under both Spells and the Limited Uses/resources tracker). The spell's
  // level is folded into the name (`Faerie Fire (1st)`) since `Resource` has
  // no separate level field to hang it off of.
  const spellResourceGroups: Array<[string, string]> = [
    ["race", "Race"],
    ["class", "Class"],
    ["background", "Background"],
    ["item", "Item"],
    ["feat", "Feat"],
  ];
  for (const [key, source] of spellResourceGroups) {
    (data.spells?.[key] ?? []).forEach((entry: any, idx: number) => {
      const df = entry?.definition;
      if (!df?.name) return;
      const name = df.level > 0 ? `${df.name} (${ordinalLevel(df.level)})` : df.name;
      const resource = fromLimitedUse(
        name,
        entry.limitedUse,
        `spell-${key}`,
        idx,
        shortDescription(df.snippet, df.description),
        source
      );
      if (resource) resources.push(resource);
    });
  }

  (data.inventory ?? [])
    .filter((item: any) => item.equipped && item.limitedUse)
    .forEach((item: any, idx: number) => {
      const resource = fromLimitedUse(
        item.definition?.name,
        item.limitedUse,
        "item",
        idx,
        shortDescription(item.definition?.snippet, item.definition?.description),
        "Item"
      );
      if (resource) resources.push(resource);
    });

  computePactMagicSlots(data).forEach((slot) => {
    resources.push({
      id: `pact-${slot.level}`,
      name: `Pact Magic Slot L${slot.level}`,
      current: slot.current,
      max: slot.max,
      source: "Pact Magic",
      recovery: "short-rest",
    });
  });

  return dedupeResourcesByName(resources);
}

/**
 * When a class feature is restated at a higher level (e.g. a Bard's
 * "Bardic Inspiration" being upgraded by level 5's Font of Inspiration,
 * which changes its recharge to Short or Long Rest), D&D Beyond doesn't
 * remove the original lower-level action entry — both stay in the actions
 * array, each independently flagged as limited-use, producing two resources
 * with the same name (confirmed on a real level 5 Bard export). The later
 * entry in the array reflects the character's current level, so it wins.
 */
function dedupeResourcesByName(resources: Resource[]): Resource[] {
  const byName = new Map<string, Resource>();
  for (const resource of resources) {
    byName.set(resource.name.trim().toLowerCase(), resource);
  }
  return resources.filter((r) => byName.get(r.name.trim().toLowerCase()) === r);
}
