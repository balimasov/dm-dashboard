import { Character, Creature } from "./types";

export type AiAvailability = Record<string, string>;

type AvailabilityEntry = { id: string; name: string; label: string };

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

function availabilityEntries(c: Character): AvailabilityEntry[] {
  const entries: AvailabilityEntry[] = [];
  for (const r of c.resources) entries.push({ id: r.id, name: r.name, label: `${r.current}/${r.max} charges` });
  for (const f of c.features) {
    if (f.max != null) entries.push({ id: f.id, name: f.name, label: `${f.current}/${f.max} charges` });
  }
  for (const s of c.knownSpells) {
    if (s.max != null) {
      entries.push({ id: s.id, name: s.name, label: `${s.current}/${s.max} charges` });
    } else if (s.level > 0) {
      const slot = c.spellSlots.find((sl) => sl.level === s.level);
      if (slot) entries.push({ id: s.id, name: s.name, label: `${ordinal(s.level)} lvl, ${slot.current}/${slot.max} slots` });
    }
  }
  // Same "x{quantity}" convention `InventoryOverview.tsx` already uses for a
  // stackable item's remaining count — a Potion of Healing or Scroll of
  // Fireball the assistant recommends should show how many are left, same
  // as a spell's own charge pool does.
  for (const item of c.inventory) {
    if (item.category === "Consumable") entries.push({ id: item.id, name: item.name, label: `x${item.quantity}` });
  }
  return entries;
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
  const availability: AiAvailability = {};
  for (const entry of availabilityEntries(entity)) availability[entry.id] = entry.label;
  return availability;
}

/**
 * The same suffixes as `buildAiAvailability`, keyed by trimmed lowercased
 * display name instead of source_id — a fallback for an option whose
 * `source_id` doesn't match anything (same rationale as
 * `buildAiGlossaryByName`), used only when the id lookup misses.
 */
export function buildAiAvailabilityByName(entity: Character | Creature): AiAvailability {
  if (!("className" in entity)) return {};
  const availability: AiAvailability = {};
  for (const entry of availabilityEntries(entity)) availability[entry.name.trim().toLowerCase()] = entry.label;
  return availability;
}
