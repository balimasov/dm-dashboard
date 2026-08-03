import { Character, Creature } from "./types";

export type AiAvailability = Record<string, string>;

/** `remaining` is the raw current count behind `label`'s formatted text — kept alongside it so a caller can filter on "is this actually 0" without re-parsing the label string. */
type AvailabilityEntry = { id: string; name: string; label: string; remaining: number };

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
  for (const r of c.resources) entries.push({ id: r.id, name: r.name, label: `${r.current}/${r.max} charges`, remaining: r.current });
  for (const f of c.features) {
    if (f.max != null) entries.push({ id: f.id, name: f.name, label: `${f.current}/${f.max} charges`, remaining: f.current ?? 0 });
  }
  for (const s of c.knownSpells) {
    if (s.max != null) {
      entries.push({ id: s.id, name: s.name, label: `${s.current}/${s.max} charges`, remaining: s.current ?? 0 });
    } else if (s.level > 0) {
      const slot = c.spellSlots.find((sl) => sl.level === s.level);
      if (slot) entries.push({ id: s.id, name: s.name, label: `${ordinal(s.level)} lvl, ${slot.current}/${slot.max} slots`, remaining: slot.current });
    }
  }
  // Same "x{quantity}" convention `InventoryOverview.tsx` already uses for a
  // stackable item's remaining count — a Potion of Healing or Scroll of
  // Fireball the assistant recommends should show how many are left, same
  // as a spell's own charge pool does.
  //
  // Non-consumable magic gear (rings, wondrous items, magic armor —
  // `assistantContext.ts`'s "Other magic items" block) gets the same
  // treatment: weapons are excluded (a wielded magic weapon's own combat
  // line already covers it) and so is anything with a matching
  // item-sourced `Resource` entry (its charges are tracked — and filtered
  // at 0 — there instead, see the loop above).
  const itemResourceNames = new Set(c.resources.filter((r) => r.source === "Item").map((r) => r.name.trim().toLowerCase()));
  for (const item of c.inventory) {
    if (item.category === "Consumable") {
      entries.push({ id: item.id, name: item.name, label: `x${item.quantity}`, remaining: item.quantity });
    } else if (item.category !== "Weapon" && item.rarity !== "Common" && !itemResourceNames.has(item.name.trim().toLowerCase())) {
      entries.push({ id: item.id, name: item.name, label: `x${item.quantity}`, remaining: item.quantity });
    }
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

/**
 * The `source_id`s and lowercased names of every limited-use option that's
 * *actually* at 0 remaining right now — used server-side (`route.ts`) to
 * drop an option the model returned anyway despite the prompt's own "never
 * recommend a feature with no remaining uses" rule (confirmed happening in
 * practice: the model has recommended a bonus-action feature sitting at
 * "0/2 charges" the sheet itself supplied). Same id-then-name matching
 * shape as `resolveAiHint`/`buildAiAvailability` above, computed from this
 * exact data rather than trusted to the model, for the same reason
 * `buildAiAvailability`'s own doc comment gives: this is real state the app
 * already has, not something worth leaving to chance. A creature has no
 * current/max tracking (see `buildAiAvailability`'s doc comment), so this
 * is always empty for one — nothing to filter there.
 */
export function buildAiZeroAvailability(entity: Character | Creature): { ids: Set<string>; names: Set<string> } {
  if (!("className" in entity)) return { ids: new Set(), names: new Set() };
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of availabilityEntries(entity)) {
    if (entry.remaining > 0) continue;
    ids.add(entry.id);
    names.add(entry.name.trim().toLowerCase());
  }
  return { ids, names };
}
