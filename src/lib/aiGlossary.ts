import { Character, Creature } from "./types";

export type AiGlossary = Record<string, string>;

function set(glossary: AiGlossary, name: string | undefined, hint: string | undefined) {
  if (!name || !hint) return;
  glossary[name.trim().toLowerCase()] = hint;
}

/**
 * Maps a character's own resource/feature/spell/attack names (lowercased) to
 * a short hover-hint description, sourced from the same short-blurb fields
 * the card's own hints already show — reused rather than re-fetched, so
 * `/api/assistant/suggest`'s bolded item names (e.g. "**Tail Attack**") can
 * be hovered in `AiResponseText` for the same detail the card already
 * surfaces, instead of the AI's answer being a dead end back to the sheet.
 */
export function buildCharacterGlossary(c: Character): AiGlossary {
  const glossary: AiGlossary = {};
  for (const r of c.resources) {
    set(glossary, r.name, [r.source, r.description].filter(Boolean).join(" — "));
  }
  for (const f of c.features) {
    set(glossary, f.name, [f.source, f.description].filter(Boolean).join(" — "));
  }
  for (const s of c.knownSpells) {
    set(glossary, s.name, [s.description, s.duration].filter(Boolean).join(" — "));
  }
  for (const a of c.attacks) {
    set(glossary, a.name, `${a.attackBonus >= 0 ? "+" : ""}${a.attackBonus} to hit, ${a.damage}${a.damageType ? ` ${a.damageType}` : ""}`);
  }
  return glossary;
}

export function buildCreatureGlossary(cr: Creature): AiGlossary {
  const glossary: AiGlossary = {};
  for (const t of cr.traits) {
    set(glossary, t.name, [t.description, t.recharge ? `Recharge: ${t.recharge}` : undefined].filter(Boolean).join(" — "));
  }
  return glossary;
}

export function buildAiGlossary(entity: Character | Creature): AiGlossary {
  return "className" in entity ? buildCharacterGlossary(entity) : buildCreatureGlossary(entity);
}
