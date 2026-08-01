import { ReactNode } from "react";
import { CreatureAbilityHintPanel } from "@/components/CreatureAbilitiesPanel";
import { AttackHintPanel } from "@/components/ui/AttackDisplay";
import { AbilityHintPanel } from "@/components/ui/AbilityHintPanel";
import { SpellHintPanel } from "@/components/ui/SpellDisplay";
import { Character, Creature, RECOVERY_LABELS } from "./types";

export type AiGlossary = Record<string, ReactNode>;

function set(glossary: AiGlossary, name: string | undefined, node: ReactNode) {
  if (!name) return;
  glossary[name.trim().toLowerCase()] = node;
}

/**
 * Maps a character/creature's own resource/feature/spell/attack/trait names
 * (lowercased) to the exact same hover-hint component the rest of the app
 * already renders for that thing — `AbilityHintPanel` for a feature/resource,
 * `SpellHintPanel` for a known spell, `AttackHintPanel` for a weapon,
 * `CreatureAbilityHintPanel` for a creature trait — instead of a bespoke
 * "name + raw description" panel. `AiResponseText` bolds an item's name
 * exactly the way the character card does (`**Tail Attack**`), so hovering
 * it there now shows literally the same hint a DM would get hovering the
 * name on the card itself, description formatting and all.
 */
export function buildCharacterGlossary(c: Character): AiGlossary {
  const glossary: AiGlossary = {};
  for (const r of c.resources) {
    set(
      glossary,
      r.name,
      <AbilityHintPanel
        name={r.name}
        metaLines={[r.source]}
        status={<span className="text-sky-400">{RECOVERY_LABELS[r.recovery]} recovery</span>}
        description={r.description}
      />
    );
  }
  for (const f of c.features) {
    set(
      glossary,
      f.name,
      <AbilityHintPanel
        name={f.name}
        metaLines={[f.source]}
        status={f.max != null && <span className="text-sky-400">{RECOVERY_LABELS[f.recovery!]} recovery</span>}
        description={f.description}
      />
    );
  }
  for (const s of c.knownSpells) {
    set(
      glossary,
      s.name,
      <SpellHintPanel
        spell={s}
        status={s.max != null && <span className="text-sky-400">{RECOVERY_LABELS[s.recovery!]} recovery</span>}
      />
    );
  }
  for (const a of c.attacks) {
    set(glossary, a.name, <AttackHintPanel attack={a} />);
  }
  return glossary;
}

export function buildCreatureGlossary(cr: Creature): AiGlossary {
  const glossary: AiGlossary = {};
  for (const t of cr.traits) {
    set(glossary, t.name, <CreatureAbilityHintPanel trait={t} />);
  }
  if (cr.spellcasting) {
    for (const group of cr.spellcasting.spellGroups) {
      for (const spellName of group.spells) {
        set(glossary, spellName, <AbilityHintPanel name={spellName} metaLines={["Spell"]} />);
      }
    }
  }
  return glossary;
}

export function buildAiGlossary(entity: Character | Creature): AiGlossary {
  return "className" in entity ? buildCharacterGlossary(entity) : buildCreatureGlossary(entity);
}
