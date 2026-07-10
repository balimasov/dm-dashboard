/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbilityScores, Feature, RecoveryType, Resource } from "../types";
import { computeLimitedUseCharges, diceTypeNote, resolveSnippetTemplate, shortDescription } from "./shared";

/**
 * Race, class, and feat data each carry D&D Beyond's own "don't show this on
 * the details/sheet page" flags (`hideOnDetailsPage`/`hideInSheet`) — used to
 * drop entries that are just restating stats already shown elsewhere (e.g. a
 * racial trait literally named "Speed") or a level-gated feature's
 * lower-level, now-superseded restatement (both copies share a name; only one
 * has `hideInSheet: false`). Class features are further filtered by
 * `requiredLevel` because D&D Beyond lists a class's *entire* feature table up
 * to level 20 regardless of the character's actual level. These are hard
 * excludes (never returned at all) — D&D Beyond's own flags, not a heuristic.
 *
 * Everything else used to go through a custom "is this actually useful"
 * heuristic (boilerplate/ability-score/subclass-announcement name matching).
 * That's gone now in favor of mirroring D&D Beyond's own Actions tab instead:
 * `data.actions.*` already carries an `activation.activationType` for every
 * genuinely-usable ability, which is a strictly better signal than guessing
 * from feature names/text — see `activationGroup` below. Anything not present
 * there (passive traits, proficiency grants, ability-score bumps, subclass
 * announcements, rulebook boilerplate) simply lands in the "other" group.
 */

/** Strips a trailing parenthetical (e.g. "Rage (Enter)" -> "rage") so a Feature can be matched against the same ability tracked elsewhere under a plainer name — used only for that cross-reference, never for de-duplication (two distinctly-suffixed actions like "Radiant Fire (Fire)"/"Radiant Fire (Radiant)" must not collide). */
function normalizeFeatureName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "");
}

/**
 * D&D Beyond's own `activationType` codes (confirmed against real exports):
 * 1/2/5 are all "action" variants, 3 is bonus action, 4 is reaction, 8 is
 * "special" (no action cost, e.g. a triggered passive-ish ability like a
 * racial "Relentless Endurance"). 0/6/7/missing (none, minute-, hour-long
 * activations) don't fit any of those and fall back to "other" alongside
 * everything that isn't in `actions.*` at all.
 */
function activationGroup(activationType: number | null | undefined): Feature["group"] {
  switch (activationType) {
    case 1:
    case 2:
    case 5:
      return "action";
    case 3:
      return "bonusAction";
    case 4:
      return "reaction";
    case 8:
      return "special";
    default:
      return "other";
  }
}

export function computeFeatures(
  data: any,
  resources: Resource[],
  abilities: AbilityScores,
  profBonus: number,
  level: number,
  speed: number
): Feature[] {
  const features: Feature[] = [];
  const seen = new Set<string>();
  // Some abilities are described *twice* in D&D Beyond's data under genuinely
  // different names — a weapon mastery property shows up once via
  // `actions.*` as "Vex (Handaxe)" and again via `options.*` as "Handaxe
  // (Vex)" (word order swapped), and a chosen Metamagic option similarly
  // appears as both "Metamagic: Careful Spell" and bare "Careful Spell" —
  // confirmed on real exports, always with byte-identical rules text. Name
  // matching can't catch this (the strings genuinely differ), so the fully
  // resolved description text is the de-dupe signal instead; whichever copy
  // is processed first wins (actions are processed before classFeatures/
  // racialTraits/feats/options below, so the properly action-grouped copy
  // wins over the generic "other" one describing the same thing).
  const seenDescriptions = new Set<string>();

  // Lets an `options.*`/`actions.*` entry (see below) report the *specific*
  // feature that granted the choice — e.g. "Maneuvers" or "Metamagic
  // Options" — instead of just the broad group it came from, and inherit
  // that parent's real origin type. Confirmed on real exports: an option's
  // `componentId` matches the `definition.id` of its parent racial trait/
  // class feature/feat (a Battle Master's chosen maneuvers all share
  // `componentId` with the "Maneuvers" class feature; a Sorcerer's Metamagic
  // choices share it with "Metamagic Options", a *different* class feature
  // from the "Metamagic" one that's otherwise shown).
  //
  // But `componentId` doesn't always point at a definition's own `id` —
  // D&D Beyond implements *any* feature/trait/feat's internal "choose one of
  // these" mechanism via a generic, reusable `grantedFeats[].featIds[]` link
  // to an entity that's typed as a "feat" internally regardless of what
  // actually grants it, and that *same* entity is *also* separately listed as
  // its own entry in `data.feats[]` (confirmed on a real Fighter/Barbarian
  // export: the *class feature* "Weapon Mastery" has `grantedFeats:
  // [{featIds: [X]}]`, and `data.feats[]` independently contains its own
  // entry with `definition.id === X` and the *same* name "Weapon Mastery" —
  // a technical placeholder, not a real chosen feat). So a direct id/name
  // match in `data.feats[]` is *not* reliable ground truth here — the
  // `grantedFeats` link is, since it's the actual feature declaring "I own
  // this choice". Indirect (`grantedFeats`) registrations therefore win: they
  // run first, and the direct definition-id pass below only fills in ids
  // that indirect registration didn't already claim.
  const parentInfoById = new Map<number, { name: string; originType: Feature["originType"] }>();

  function registerGrantedFeatLinks(definition: any, name: string | undefined, originType: Feature["originType"]) {
    if (!name) return;
    for (const grant of definition?.grantedFeats ?? []) {
      for (const featId of grant.featIds ?? []) {
        parentInfoById.set(featId, { name, originType });
      }
    }
  }

  for (const trait of data.race?.racialTraits ?? []) {
    registerGrantedFeatLinks(trait.definition, trait.definition?.name, "species");
  }
  for (const cls of data.classes ?? []) {
    for (const cf of cls.classFeatures ?? []) {
      registerGrantedFeatLinks(cf.definition, cf.definition?.name, "class");
    }
  }
  for (const feat of data.feats ?? []) {
    registerGrantedFeatLinks(feat.definition, feat.definition?.name, "feat");
  }
  registerGrantedFeatLinks(data.background?.definition, data.background?.definition?.featureName, "background");

  function registerDirect(id: number | null | undefined, name: string | undefined, originType: Feature["originType"]) {
    if (id != null && name && !parentInfoById.has(id)) parentInfoById.set(id, { name, originType });
  }

  for (const trait of data.race?.racialTraits ?? []) {
    registerDirect(trait.definition?.id, trait.definition?.name, "species");
  }
  for (const cls of data.classes ?? []) {
    for (const cf of cls.classFeatures ?? []) {
      registerDirect(cf.definition?.id, cf.definition?.name, "class");
    }
  }
  for (const feat of data.feats ?? []) {
    registerDirect(feat.definition?.id, feat.definition?.name, "feat");
  }

  // "race"/"class"/"feat" here is D&D Beyond's own data grouping, not the
  // renamed 2024 terminology — the fallback `originType` for an action/option
  // whose `componentId` doesn't resolve via `parentInfoById` above.
  const originTypeByDdbGroup: Record<"race" | "class" | "feat", Feature["originType"]> = {
    race: "species",
    class: "class",
    feat: "feat",
  };

  // A charge pool's D&D Beyond `action` entry is very often named
  // differently from the Feature that grants it (a Fighter's "Superiority
  // Dice" action vs. its "Combat Superiority" classFeature; a Sorcerer's
  // "Font of Magic: Sorcery Points" action vs. its "Font of Magic"
  // classFeature) — name-matching alone misses these. Confirmed on real
  // exports: the action's `componentId` matches the `definition.id` of the
  // classFeature/racialTrait/feat that grants it, the same relationship
  // `options.*` uses above, so charges can be looked up by id instead.
  const actionChargesById = new Map<number, { current: number; max: number; recovery: RecoveryType }>();
  for (const group of ["race", "class", "feat"] as const) {
    for (const action of data.actions?.[group] ?? []) {
      if (action.componentId == null || !action.limitedUse) continue;
      const charges = computeLimitedUseCharges(action.limitedUse, abilities, profBonus);
      if (charges) actionChargesById.set(action.componentId, charges);
    }
  }

  function add(
    name: string | undefined,
    rawDescription: string | undefined,
    source: string,
    group: Feature["group"],
    originType: Feature["originType"],
    explicitCharges?: { current: number; max: number; recovery: RecoveryType },
    dice?: any
  ) {
    const trimmedName = (name || "").trim();
    // The exact (non-normalized) name is the de-dupe key — normalizing away a
    // trailing parenthetical here would collide two *distinct* abilities that
    // happen to share a base name (e.g. "Radiant Fire (Fire)" vs "Radiant
    // Fire (Radiant)"), silently dropping one. `normalizeFeatureName` is only
    // for the resource cross-reference below, where that's the point (e.g.
    // matching the classFeature "Rage" against the action "Rage (Enter)").
    const dedupeKey = trimmedName.toLowerCase();
    if (!dedupeKey || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const matchedResource = resources.find((r) => normalizeFeatureName(r.name) === normalizeFeatureName(trimmedName));
    const charges = explicitCharges ?? matchedResource;
    const description = rawDescription
      ? (resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges?.max, speed) +
          diceTypeNote(trimmedName, dice)
        ).trim()
      : undefined;

    if (description) {
      if (seenDescriptions.has(description)) return;
      seenDescriptions.add(description);
    }

    features.push({
      id: `feature-${features.length}`,
      name: trimmedName,
      source,
      group,
      originType,
      ...(description ? { description } : {}),
      ...(charges ? { current: charges.current, max: charges.max, recovery: charges.recovery } : {}),
    });
  }

  // D&D Beyond's own Actions tab entries — anything genuinely usable via an
  // Action/Bonus Action/Reaction/Special activation. Processed first so these
  // win the de-dupe against the more generic classFeature/racialTrait/option
  // entry describing the same umbrella ability (e.g. the "Rage" classFeature
  // vs. the "Rage (Enter)" action) when their names coincide exactly.
  const actionFallbackSource: Record<"race" | "class" | "feat", string> = {
    race: "Race",
    class: "Class",
    feat: "Feat",
  };
  for (const group of ["race", "class", "feat"] as const) {
    for (const action of data.actions?.[group] ?? []) {
      if (!action.name) continue;
      const parentInfo = parentInfoById.get(action.componentId);
      const source = parentInfo?.name || actionFallbackSource[group];
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      const charges = action.limitedUse ? computeLimitedUseCharges(action.limitedUse, abilities, profBonus) ?? undefined : undefined;
      add(
        action.name,
        shortDescription(action.snippet, action.description),
        source,
        activationGroup(action.activation?.activationType),
        originType,
        charges,
        action.dice
      );
    }
  }

  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition ?? {};
    if (df.hideOnDetailsPage || df.hideInSheet) continue;
    add(df.name, shortDescription(df.snippet, df.description), "Race", "other", "species", actionChargesById.get(df.id));
  }

  for (const cls of data.classes ?? []) {
    const subclassId = cls.subclassDefinition?.id;
    const className = cls.definition?.name || "Class";
    const subclassName = cls.subclassDefinition?.name || className;
    for (const cf of cls.classFeatures ?? []) {
      const df = cf.definition ?? {};
      if (df.hideInSheet) continue;
      if (df.requiredLevel != null && df.requiredLevel > (cls.level ?? 0)) continue;
      const isSubclassFeature = subclassId != null && df.classId === subclassId;
      add(
        df.name,
        shortDescription(df.snippet, df.description),
        isSubclassFeature ? subclassName : className,
        "other",
        "class",
        actionChargesById.get(df.id)
      );
    }
  }

  for (const feat of data.feats ?? []) {
    const df = feat.definition ?? {};
    add(df.name, shortDescription(df.snippet, df.description), "Feat", "other", "feat", actionChargesById.get(df.id));
  }

  // The *specific* choices a player made for a feature that offers options —
  // which Battle Master maneuvers, which Fighting Style, which Metamagic,
  // which racial lineage — live here, separately from the classFeatures/
  // racialTraits/feats definitions above (which only describe the umbrella
  // feature, e.g. "Maneuvers", not which ones were picked). Without this,
  // exactly the specific abilities a DM most wants to know about a character
  // were the ones missing.
  const optionGroups: Array<["race" | "class" | "feat", string]> = [
    ["race", "Race"],
    ["class", "Class"],
    ["feat", "Feat"],
  ];
  for (const [group, fallbackSource] of optionGroups) {
    for (const opt of data.options?.[group] ?? []) {
      const df = opt.definition ?? {};
      const parentInfo = parentInfoById.get(opt.componentId);
      const source = parentInfo?.name || fallbackSource;
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      add(df.name, shortDescription(df.snippet, df.description), source, "other", originType, actionChargesById.get(df.id));
    }
  }

  const bg = data.background?.definition;
  if (bg?.featureName && bg?.featureDescription && !bg?.featureIsFeat) {
    add(bg.featureName, shortDescription(undefined, bg.featureDescription), "Background", "other", "background");
  }

  return features;
}
