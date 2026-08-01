import { Character, Creature } from "./types";

export type AiAvailability = Record<string, string>;

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Availability suffix ("3rd lvl, 1/2 slots", "2/3 charges") for every
 * limited sheet option, keyed by the same `source_id` `AiGlossary`
 * (`aiGlossary.tsx`) uses. Computed here from the character's own current
 * state rather than left to the model to write into `name` itself — the
 * model was inconsistent about actually including it every time (see the
 * prompt's NAMING LIMITED OPTIONS section), where this is exact and free
 * since the frontend already has the same data it uses to build the
 * glossary. A creature has no current/max tracking on its traits (just
 * free-text recharge info), so this is always empty for one.
 */
export function buildAiAvailability(entity: Character | Creature): AiAvailability {
  if (!("className" in entity)) return {};
  const c = entity;
  const availability: AiAvailability = {};
  for (const r of c.resources) availability[r.id] = `${r.current}/${r.max} charges`;
  for (const f of c.features) {
    if (f.max != null) availability[f.id] = `${f.current}/${f.max} charges`;
  }
  for (const s of c.knownSpells) {
    if (s.max != null) {
      availability[s.id] = `${s.current}/${s.max} charges`;
    } else if (s.level > 0) {
      const slot = c.spellSlots.find((sl) => sl.level === s.level);
      if (slot) availability[s.id] = `${ordinal(s.level)} lvl, ${slot.current}/${slot.max} slots`;
    }
  }
  return availability;
}
