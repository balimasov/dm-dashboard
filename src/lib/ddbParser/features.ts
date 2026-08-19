import { AbilityScores, Feature, RecoveryType, Resource } from "../types";
import { buildComponentSourceIndex, classFeatureDisplayName, computeLimitedUseCharges, diceTypeNote, extractFeatKind, formatSource, resolveSnippetTemplate, shortDescription } from "./shared";
import { RawDdbAny, RawDdbData } from "./rawTypes";

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
  data: RawDdbData,
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

  // TEMPORARY diagnostic, added 2026-08-18 — names claimed specifically by
  // an `actions.*` entry (the first loop below), so the later racialTraits/
  // classFeatures/feats loops can tell "this name is taken by an action"
  // (the "Action Surge" classFeature vs. the "Action Surge" action pattern
  // the test duplicate below targets) apart from "this name is taken by
  // some other classFeature/racialTrait/feat" (an unrelated collision that
  // should keep silently deduping exactly as it always has). Remove
  // alongside `isTestDuplicate` once a decision is made.
  const actionDedupeKeys = new Set<string>();

  // Lets an `options.*`/`actions.*` entry (see below) report the *specific*
  // feature that granted the choice — e.g. "Maneuvers" or "Metamagic
  // Options" — instead of just the broad group it came from, and inherit
  // that parent's real origin type. Confirmed on real exports: an option's
  // `componentId` matches the `definition.id` of its parent racial trait/
  // class feature/feat (a Battle Master's chosen maneuvers all share
  // `componentId` with the "Maneuvers" class feature; a Sorcerer's Metamagic
  // choices share it with "Metamagic Options", a *different* class feature
  // from the "Metamagic" one that's otherwise shown). Built once here via the
  // shared `buildComponentSourceIndex` (see its own doc comment for the full
  // resolution/priority rules) — `spells.ts` builds the exact same index for
  // its own bonus-spell sources, instead of a second parallel implementation.
  const parentInfoById = buildComponentSourceIndex(data);

  // Racial traits D&D Beyond itself flags `hideOnDetailsPage`/`hideInSheet`
  // (e.g. "Elven Lineage Spells" — boilerplate the real sheet never shows,
  // confirmed on a real Elf export) never get their own `add()` call below,
  // so `parentInfoById` still resolves their id to a name, but nothing in
  // `features` ever has that name. Without this, an action/option whose
  // `componentId` points at one of these (e.g. "Drow Lineage -
  // Intelligence") survives as an orphan with a `parentFeatureName` no row
  // will ever match — same broken-link shape as a de-duped-away parent
  // (see `Feature.parentFeatureName`'s own doc comment), except this one is
  // fully avoidable: D&D Beyond already told us up front this trait was
  // never meant to be seen, so anything that only exists to detail it
  // shouldn't be either. Collected before the actions loop below (which
  // runs first) rather than inline in the racialTraits loop further down,
  // since something needs this before that loop has run.
  const hiddenParentIds = new Set<number>();
  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition ?? {};
    if ((df.hideOnDetailsPage || df.hideInSheet) && df.id != null) hiddenParentIds.add(df.id);
  }

  // "race"/"class"/"feat" here is D&D Beyond's own data grouping, not the
  // renamed 2024 terminology — the fallback `originType` for an action/option
  // whose `componentId` doesn't resolve via `parentInfoById` above.
  const originTypeByDdbGroup: Record<"race" | "class" | "feat", Feature["originType"]> = {
    race: "species",
    class: "class",
    feat: "feat",
  };

  // `parentInfoById`'s own third pass (see `buildComponentSourceIndex`'s doc
  // comment) deliberately collapses a chosen `options.*` entry's own id past
  // itself, straight to whatever *its own* componentId resolves to — right
  // for a bonus spell/resource's `source` label (confirmed: D&D Beyond shows
  // "Species (Elven Lineage Spells)", not "Species (High Elf -
  // Intelligence)"), wrong for nesting an *action*: a Battle Master's
  // "Maneuver: Trip Attack (Str.)"/"(Dex.)" both carry `componentId` equal to
  // the chosen "Trip Attack" option's own `definition.id` — confirmed on a
  // real Fighter export, same shape for every maneuver ("Maneuver: Evasive
  // Footwork" -> its own "Evasive Footwork" option, not the umbrella
  // "Maneuver Options" classFeature) — and D&D Beyond's own Features &
  // Traits tab nests each one under that specific maneuver, not the generic
  // "Maneuver Options" row. This second, un-collapsed index lets the actions
  // loop below prefer the option's own name when one exists, without
  // touching the shared, already-confirmed-correct `parentInfoById`
  // spells.ts/resources.ts still rely on.
  const optionSelfById = new Map<number, { name: string; originType: Feature["originType"] }>();
  for (const group of ["race", "class", "feat"] as const) {
    for (const opt of data.options?.[group] ?? []) {
      const id = opt.definition?.id;
      const name = opt.definition?.name;
      if (id != null && name) optionSelfById.set(id, { name, originType: originTypeByDdbGroup[group] });
    }
  }

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

  // Parallel to `actionChargesById` above (same `definition.id` == action's
  // own `componentId` cross-reference), but for a class feature/racial
  // trait/feat's own per-level-scaling value rather than its resource charge
  // count — this is what a snippet's `{{scalevalue}}`/`{{limiteduse}}`
  // actually resolves from whenever there's no charge pool to fall back to.
  // Sometimes a plain number (e.g. "You know {{scalevalue}} Metamagic
  // options" from a `fixedValue`), sometimes a die notation used as the
  // whole placeholder's value (a Dazzling Footwork Bard's Unarmed Strike
  // damage die — "you can deal {{scalevalue}}{{modifier:dex#signed}}
  // Bludgeoning damage" needs literally "1d8", not a count). Confirmed on a
  // real level-5 Bard export: the "Bardic Damage" *action* has no
  // `limitedUse` at all (it's not a charge-tracked resource, just a
  // damage-die swap), so without this the snippet silently dropped the whole
  // "{{scalevalue}}" placeholder and rendered "+2" instead of "1d8+2" —
  // while the parent "Dazzling Footwork" class feature carries exactly that
  // die, already resolved to the character's current level, on its own
  // `levelScale.dice`.
  const levelScaleById = new Map<number, number | string>();
  function registerLevelScale(id: number | null | undefined, levelScale: RawDdbAny | null | undefined) {
    if (id == null) return;
    const value = levelScale?.dice?.diceString ?? (levelScale?.fixedValue != null ? levelScale.fixedValue : undefined);
    if (value !== undefined) levelScaleById.set(id, value);
  }
  for (const trait of data.race?.racialTraits ?? []) {
    registerLevelScale(trait.definition?.id, trait.levelScale);
  }
  for (const cls of data.classes ?? []) {
    for (const cf of cls.classFeatures ?? []) {
      registerLevelScale(cf.definition?.id, cf.levelScale);
    }
  }
  for (const feat of data.feats ?? []) {
    registerLevelScale(feat.definition?.id, feat.levelScale);
  }

  function add(
    name: string | undefined,
    rawDescription: string | undefined,
    source: string,
    group: Feature["group"],
    originType: Feature["originType"],
    explicitCharges?: { current: number; max: number; recovery: RecoveryType },
    extra?: {
      dice?: RawDdbAny;
      scaleValue?: number | string;
      /** Same `parentInfo?.name` `source` above was built from — kept identical on purpose, see `Feature.parentFeatureName`'s own doc comment. Omitted by the racialTraits/classFeatures/feats/background loops below, which *are* the parents, not a child of one. */
      parentFeatureName?: string;
      /** Set only by the `actions.*` loop below, so `actionDedupeKeys` can record which names came from an action specifically (see that set's own doc comment). */
      isAction?: boolean;
      /** Set only by the feats loop below, from `extractFeatKind` — see `Feature.featPrerequisite`'s own doc comment. */
      featPrerequisite?: string;
    }
  ) {
    const trimmedName = (name || "").trim();
    // The exact (non-normalized) name is the de-dupe key — normalizing away a
    // trailing parenthetical here would collide two *distinct* abilities that
    // happen to share a base name (e.g. "Radiant Fire (Fire)" vs "Radiant
    // Fire (Radiant)"), silently dropping one. `normalizeFeatureName` is only
    // for the resource cross-reference below, where that's the point (e.g.
    // matching the classFeature "Rage" against the action "Rage (Enter)").
    const dedupeKey = trimmedName.toLowerCase();
    if (!dedupeKey) return;
    const isNameCollision = seen.has(dedupeKey);
    // TEMPORARY diagnostic, added 2026-08-18 — only a collision against a
    // name specifically claimed by an action (not against some other
    // classFeature/racialTrait/feat, which keeps silently deduping as
    // before) is let through, marked `isTestDuplicate: true`, instead of
    // being dropped — see `actionDedupeKeys`'s own doc comment. Remove
    // alongside that set once a decision is made.
    const isTestDuplicate = isNameCollision && !extra?.isAction && actionDedupeKeys.has(dedupeKey);
    if (isNameCollision && !isTestDuplicate) return;
    if (!isNameCollision) {
      seen.add(dedupeKey);
      if (extra?.isAction) actionDedupeKeys.add(dedupeKey);
    }

    const matchedResource = resources.find((r) => normalizeFeatureName(r.name) === normalizeFeatureName(trimmedName));
    const charges = explicitCharges ?? matchedResource;
    const description = rawDescription
      ? (resolveSnippetTemplate(rawDescription, level, abilities, profBonus, charges?.max, speed, extra?.scaleValue) +
          diceTypeNote(trimmedName, extra?.dice)
        ).trim()
      : undefined;

    // Skipped for the forced test duplicate — its whole point is to
    // surface even when the text is a near-identical paraphrase of the
    // action's own description (true for "Action Surge"/"Tactical Mind",
    // confirmed on real exports; "Second Wind" happens to differ enough in
    // wording that this check would have let it through anyway).
    if (description && !isTestDuplicate) {
      if (seenDescriptions.has(description)) return;
      seenDescriptions.add(description);
    }

    // A feature can't be its own parent — `formatSource` already treats a
    // resolved parent name equal to the feature's own name as "no specific
    // parent" (falls back to the bare category), so `parentFeatureName`
    // mirrors that same guard rather than pointing a feature at itself.
    const parentFeatureName =
      extra?.parentFeatureName && extra.parentFeatureName.trim().toLowerCase() !== trimmedName.toLowerCase()
        ? extra.parentFeatureName
        : undefined;

    features.push({
      id: `feature-${features.length}`,
      name: trimmedName,
      source,
      group,
      originType,
      ...(description ? { description } : {}),
      ...(charges ? { current: charges.current, max: charges.max, recovery: charges.recovery } : {}),
      ...(parentFeatureName ? { parentFeatureName } : {}),
      ...(isTestDuplicate ? { isTestDuplicate: true } : {}),
      ...(extra?.featPrerequisite ? { featPrerequisite: extra.featPrerequisite } : {}),
    });
  }

  // D&D Beyond's own Actions tab entries — anything genuinely usable via an
  // Action/Bonus Action/Reaction/Special activation. Processed first so these
  // win the de-dupe against the more generic classFeature/racialTrait/option
  // entry describing the same umbrella ability (e.g. the "Rage" classFeature
  // vs. the "Rage (Enter)" action) when their names coincide exactly.
  const actionFallbackSource: Record<"race" | "class" | "feat", string> = {
    race: "Species",
    class: "Class",
    feat: "Feat",
  };
  for (const group of ["race", "class", "feat"] as const) {
    for (const action of data.actions?.[group] ?? []) {
      if (!action.name) continue;
      if (action.componentId != null && hiddenParentIds.has(action.componentId)) continue;
      const parentInfo = optionSelfById.get(action.componentId) ?? parentInfoById.get(action.componentId);
      // D&D Beyond injects "Initiate a Circle Spell" and its six "Circle
      // Spell: Augment/Distribute/Expand/Prolong/Safeguard/Supplant"
      // siblings — the group-spellcasting "Circle Casting" optional rule —
      // onto *every* caster's actions list regardless of class or subclass,
      // confirmed on real Bard/Cleric/Druid/Artificer/Rogue/Sorcerer
      // exports, none of which show it on D&D Beyond's own character sheet.
      // Every genuine class-feature action shares this same `componentTypeId`
      // (12168134 — distinct from 258900837, which options like Maneuvers/
      // Metamagic use, and which legitimately never resolve to a
      // classFeature either) but still cross-references back to a real
      // granted classFeature/racialTrait/feat via `componentId` (e.g. Bardic
      // Damage -> Dazzling Footwork); Circle Casting's componentId never
      // resolves to anything on any of the eight sample exports that carry
      // it, regardless of class — the one reliable, data-driven way to tell
      // it apart from a real feature sharing the same type.
      if (action.componentTypeId === 12168134 && !parentInfo) continue;
      const source = formatSource(actionFallbackSource[group], parentInfo?.name, action.name);
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      const charges = action.limitedUse ? computeLimitedUseCharges(action.limitedUse, abilities, profBonus) ?? undefined : undefined;
      add(
        action.name,
        shortDescription(action.snippet, action.description),
        source,
        activationGroup(action.activation?.activationType),
        originType,
        charges,
        { dice: action.dice, scaleValue: levelScaleById.get(action.componentId), parentFeatureName: parentInfo?.name, isAction: true }
      );
    }
  }

  for (const trait of data.race?.racialTraits ?? []) {
    const df = trait.definition ?? {};
    if (df.hideOnDetailsPage || df.hideInSheet) continue;
    add(
      df.name,
      shortDescription(df.snippet, df.description),
      "Species",
      "other",
      "species",
      actionChargesById.get(df.id),
      { scaleValue: levelScaleById.get(df.id) }
    );
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
      const name = classFeatureDisplayName(df.name, df.requiredLevel);
      add(
        name,
        shortDescription(df.snippet, df.description),
        formatSource("Class", isSubclassFeature ? subclassName : className, name),
        "other",
        "class",
        actionChargesById.get(df.id),
        { scaleValue: levelScaleById.get(df.id) }
      );
    }
  }

  for (const feat of data.feats ?? []) {
    const df = feat.definition ?? {};
    // D&D Beyond stuffs a couple of things that aren't real, player-visible
    // feats into this same `feats` array, each flagged with its own internal
    // category tag — confirmed absent from D&D Beyond's own Feats tab across
    // every real character export this parser has been checked against, so
    // excluded here the same way hideOnDetailsPage/hideInSheet are above
    // (real D&D Beyond flags, not a heuristic):
    //  - `__INITIAL_ASI`: the background's baked-in ability score bump,
    //    restated generically (e.g. "Soldier Ability Score Improvements").
    //    The actual choice already surfaces as its origin feat's own nested
    //    child (e.g. "Increase two scores (+2 / +1)" under "Savage
    //    Attacker", linked via `parentFeatureName`), so this adds nothing
    //    but noise.
    //  - `__DISGUISE_FEAT`: either a duplicate of a real class feature
    //    stored feat-shaped for D&D Beyond's own bookkeeping (e.g. "4:
    //    Weapon Mastery" — harmless to exclude explicitly here even though
    //    it was already losing the name-collision de-dupe race to its real
    //    classFeature copy) or a companion UI widget D&D Beyond bolts onto
    //    every one of its own pre-built example characters ("Dark Bargain",
    //    "Character Threads", "Runestones") that was never a feat to begin
    //    with.
    const hiddenFeatTags = new Set(["__INITIAL_ASI", "__DISGUISE_FEAT"]);
    if (df.categories?.some((cat: RawDdbAny) => hiddenFeatTags.has(cat.tagName))) continue;
    const { kind, prerequisite, rest } = extractFeatKind(df.description);
    add(
      df.name,
      shortDescription(df.snippet, rest),
      formatSource("Feat", kind),
      "other",
      "feat",
      actionChargesById.get(df.id),
      { scaleValue: levelScaleById.get(df.id), featPrerequisite: prerequisite }
    );
  }

  // The *specific* choices a player made for a feature that offers options —
  // which Battle Master maneuvers, which Fighting Style, which Metamagic,
  // which racial lineage — live here, separately from the classFeatures/
  // racialTraits/feats definitions above (which only describe the umbrella
  // feature, e.g. "Maneuvers", not which ones were picked). Without this,
  // exactly the specific abilities a DM most wants to know about a character
  // were the ones missing.
  const optionGroups: Array<["race" | "class" | "feat", string]> = [
    ["race", "Species"],
    ["class", "Class"],
    ["feat", "Feat"],
  ];
  for (const [group, fallbackSource] of optionGroups) {
    for (const opt of data.options?.[group] ?? []) {
      if (opt.componentId != null && hiddenParentIds.has(opt.componentId)) continue;
      const df = opt.definition ?? {};
      const parentInfo = parentInfoById.get(opt.componentId);
      const source = formatSource(fallbackSource, parentInfo?.name, df.name);
      const originType = parentInfo?.originType ?? originTypeByDdbGroup[group];
      add(df.name, shortDescription(df.snippet, df.description), source, "other", originType, actionChargesById.get(df.id), {
        parentFeatureName: parentInfo?.name,
      });
    }
  }

  const bg = data.background?.definition;
  if (bg?.featureName && bg?.featureDescription && !bg?.featureIsFeat) {
    add(bg.featureName, shortDescription(undefined, bg.featureDescription), "Background", "other", "background");
  }

  return features;
}
