import { ReactNode } from "react";
import { CreatureAbilityHintPanel } from "@/components/CreatureAbilitiesPanel";
import { AttackHintPanel } from "@/components/ui/AttackDisplay";
import { AbilityHintPanel } from "@/components/ui/AbilityHintPanel";
import { ItemHintPanel } from "@/components/ui/ItemHintPanel";
import { SpellHintPanel } from "@/components/ui/SpellDisplay";
import { creatureSpellSourceId, creatureTraitSourceId } from "./aiSourceIds";
import { Character, Creature, RECOVERY_LABELS } from "./types";

export type AiGlossary = Record<string, ReactNode>;

type GlossaryEntry = { id: string; name: string; hint: ReactNode };

function characterGlossaryEntries(c: Character): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  for (const r of c.resources) {
    entries.push({
      id: r.id,
      name: r.name,
      hint: (
        <AbilityHintPanel
          name={r.name}
          metaLines={[r.source]}
          status={<span className="text-sky-400">{RECOVERY_LABELS[r.recovery]} recovery</span>}
          description={r.description}
        />
      ),
    });
  }
  for (const f of c.features) {
    entries.push({
      id: f.id,
      name: f.name,
      hint: (
        <AbilityHintPanel
          name={f.name}
          metaLines={[f.source]}
          status={f.max != null && <span className="text-sky-400">{RECOVERY_LABELS[f.recovery!]} recovery</span>}
          description={f.description}
        />
      ),
    });
  }
  for (const s of c.knownSpells) {
    entries.push({
      id: s.id,
      name: s.name,
      hint: <SpellHintPanel spell={s} status={s.max != null && <span className="text-sky-400">{RECOVERY_LABELS[s.recovery!]} recovery</span>} />,
    });
  }
  for (const a of c.attacks) {
    entries.push({ id: a.id, name: a.name, hint: <AttackHintPanel attack={a} /> });
  }
  // A weapon the model suggests switching to (e.g. "try the Pike instead")
  // isn't always one of `c.attacks` — a character can own a weapon without
  // having it set up as a ready-to-roll attack — so without this, a plain
  // inventory item mentioned by name in the summary/description had nothing
  // to link a hint to at all, unlike everything else on the sheet.
  for (const item of c.inventory) {
    entries.push({
      id: item.id,
      name: item.name,
      hint: <ItemHintPanel name={item.name} rarity={item.rarity} weight={item.weight} cost={item.cost} description={item.description} />,
    });
  }
  return entries;
}

function creatureGlossaryEntries(cr: Creature): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  cr.traits.forEach((t, index) => {
    entries.push({ id: creatureTraitSourceId(index), name: t.name, hint: <CreatureAbilityHintPanel trait={t} /> });
  });
  if (cr.spellcasting) {
    cr.spellcasting.spellGroups.forEach((group, groupIndex) => {
      group.spells.forEach((spellName, spellIndex) => {
        entries.push({
          id: creatureSpellSourceId(groupIndex, spellIndex),
          name: spellName,
          hint: <AbilityHintPanel name={spellName} metaLines={["Spell"]} />,
        });
      });
    });
  }
  return entries;
}

function glossaryEntries(entity: Character | Creature): GlossaryEntry[] {
  return "className" in entity ? characterGlossaryEntries(entity) : creatureGlossaryEntries(entity);
}

/**
 * Keyed by the exact `source_id` the assistant's structured response uses
 * (see `schemas.ts`'s `aiOptionSchema` and the `[[ability:id|name]]` token
 * in `game_plan.summary`) — `Feature`/`KnownSpell`/`Attack`/`Resource`/
 * `InventoryItem`'s own `.id`, or `aiSourceIds.ts`'s `trait-N`/`spell-G-N`
 * for a creature, whose traits/spellcasting-spell-names have no `.id` on
 * the data model. Maps to
 * the exact same hover-hint component the rest of the app already renders
 * for that thing — `AbilityHintPanel` for a feature/resource,
 * `SpellHintPanel` for a known spell, `AttackHintPanel` for a weapon,
 * `CreatureAbilityHintPanel` for a creature trait — instead of a bespoke
 * "name + raw description" panel, so hovering an ability reference in the
 * assistant's answer now shows literally the same hint a DM would get
 * hovering the name on the card itself, description formatting and all.
 */
export function buildAiGlossary(entity: Character | Creature): AiGlossary {
  const glossary: AiGlossary = {};
  for (const entry of glossaryEntries(entity)) glossary[entry.id] = entry.hint;
  return glossary;
}

/**
 * Strips a trailing enhancement-bonus suffix a synced D&D Beyond item/weapon
 * name often carries ("Pike, +1", "Rapier +2") — in conversation (and in the
 * model's own prose) a DM overwhelmingly refers to it by the bare name
 * ("switch to Pike"), so without this alias a plain mention of the base name
 * would never resolve to the sheet's more specific, bonus-qualified one.
 */
function stripEnhancementSuffix(name: string): string {
  return name.replace(/,?\s*\+\d+$/, "").trim();
}

/**
 * The same hints as `buildAiGlossary`, keyed by trimmed lowercased display
 * name instead of source_id — a fallback for a summary token or option
 * whose id doesn't match anything in `buildAiGlossary` (the model garbled
 * or hallucinated it), used only when the id lookup misses, since `name` is
 * read straight off the sheet text and has proven far more reliable than
 * an opaque id round-tripped through free-form generation. Also registers
 * each entry's bare name (see `stripEnhancementSuffix`) as a second key,
 * added only in a pass *after* every entry's own exact name is registered
 * so a real distinct entry (e.g. an actual "Longsword") always wins over
 * another entry's bare-name alias, regardless of iteration order.
 */
export function buildAiGlossaryByName(entity: Character | Creature): AiGlossary {
  const entries = glossaryEntries(entity);
  const glossary: AiGlossary = {};
  for (const entry of entries) glossary[entry.name.trim().toLowerCase()] = entry.hint;
  for (const entry of entries) {
    const baseKey = stripEnhancementSuffix(entry.name).toLowerCase();
    if (baseKey && !(baseKey in glossary)) glossary[baseKey] = entry.hint;
  }
  return glossary;
}
