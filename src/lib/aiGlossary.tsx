import { ReactNode } from "react";
import { CreatureAbilityHintPanel } from "@/components/CreatureAbilitiesPanel";
import { AttackHintPanel } from "@/components/ui/AttackDisplay";
import { AbilityHintPanel } from "@/components/ui/AbilityHintPanel";
import { SpellHintPanel } from "@/components/ui/SpellDisplay";
import { creatureSpellSourceId, creatureTraitSourceId } from "./aiSourceIds";
import { Character, Creature, RECOVERY_LABELS } from "./types";

export type AiGlossary = Record<string, ReactNode>;

/**
 * Keyed by the exact `source_id` the assistant's structured response uses
 * (see `schemas.ts`'s `aiOptionSchema` and the `[[ability:id|name]]` token
 * in `game_plan.summary`) — `Feature`/`KnownSpell`/`Attack`/`Resource`'s own
 * `.id`, or `aiSourceIds.ts`'s `trait-N`/`spell-G-N` for a creature, whose
 * traits/spellcasting-spell-names have no `.id` on the data model. Maps to
 * the exact same hover-hint component the rest of the app already renders
 * for that thing — `AbilityHintPanel` for a feature/resource,
 * `SpellHintPanel` for a known spell, `AttackHintPanel` for a weapon,
 * `CreatureAbilityHintPanel` for a creature trait — instead of a bespoke
 * "name + raw description" panel, so hovering an ability reference in the
 * assistant's answer now shows literally the same hint a DM would get
 * hovering the name on the card itself, description formatting and all.
 */
export function buildCharacterGlossary(c: Character): AiGlossary {
  const glossary: AiGlossary = {};
  for (const r of c.resources) {
    glossary[r.id] = (
      <AbilityHintPanel
        name={r.name}
        metaLines={[r.source]}
        status={<span className="text-sky-400">{RECOVERY_LABELS[r.recovery]} recovery</span>}
        description={r.description}
      />
    );
  }
  for (const f of c.features) {
    glossary[f.id] = (
      <AbilityHintPanel
        name={f.name}
        metaLines={[f.source]}
        status={f.max != null && <span className="text-sky-400">{RECOVERY_LABELS[f.recovery!]} recovery</span>}
        description={f.description}
      />
    );
  }
  for (const s of c.knownSpells) {
    glossary[s.id] = (
      <SpellHintPanel spell={s} status={s.max != null && <span className="text-sky-400">{RECOVERY_LABELS[s.recovery!]} recovery</span>} />
    );
  }
  for (const a of c.attacks) {
    glossary[a.id] = <AttackHintPanel attack={a} />;
  }
  return glossary;
}

export function buildCreatureGlossary(cr: Creature): AiGlossary {
  const glossary: AiGlossary = {};
  cr.traits.forEach((t, index) => {
    glossary[creatureTraitSourceId(index)] = <CreatureAbilityHintPanel trait={t} />;
  });
  if (cr.spellcasting) {
    cr.spellcasting.spellGroups.forEach((group, groupIndex) => {
      group.spells.forEach((spellName, spellIndex) => {
        glossary[creatureSpellSourceId(groupIndex, spellIndex)] = <AbilityHintPanel name={spellName} metaLines={["Spell"]} />;
      });
    });
  }
  return glossary;
}

export function buildAiGlossary(entity: Character | Creature): AiGlossary {
  return "className" in entity ? buildCharacterGlossary(entity) : buildCreatureGlossary(entity);
}
