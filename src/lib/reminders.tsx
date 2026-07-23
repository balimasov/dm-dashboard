import { Character, Creature, CreatureTrait, RARITY_COLOR } from "@/lib/types";
import { ContentKind } from "@/lib/contentKindIcons";
import { dedupeInventoryItems } from "@/lib/partyToolkit";
import { AbilityHintPanel } from "@/components/ui/AbilityHintPanel";
import { AttackHintPanel } from "@/components/ui/AttackDisplay";
import { ItemHintPanel } from "@/components/ui/ItemHintPanel";
import { SpellHintPanel } from "@/components/ui/SpellDisplay";

const TRAIT_GROUP_LABELS: Record<NonNullable<CreatureTrait["group"]>, string> = {
  trait: "Trait",
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  legendary: "Legendary Action",
};

export interface ReminderEntry {
  /** Identity key — used for `flaggedAbilities`/`flaggedTraits` matching and the toggle-off click, never rendered directly (see `label`). */
  name: string;
  /** The plain rendered name — no tooltip wrapper of its own, since every caller wraps the *whole* row (icon + name) in one shared `InfoTooltip`, not just the name text. */
  label: React.ReactNode;
  /** The hint panel shown for `label` — a plain hinted name for a feature/spell, or `AttackHintPanel` for a weapon attack. */
  panel: React.ReactNode;
  /** Which `CONTENT_KIND_ICON` glyph this row gets — same one shown on the matching tab, so a DM can tell a weapon reminder from a feature/spell one at a glance in a group that mixes all three. A creature trait uses "features", the closest match (same "ability with a description" shape as a character's own Features and Traits tab). */
  kind: ContentKind;
}

export interface ReminderGroup {
  ownerId: string;
  ownerName: string;
  avatarUrl?: string;
  entries: ReminderEntry[];
}

/**
 * Some abilities are legitimately tracked twice in `Character`'s own data —
 * e.g. an innate spell that's *also* resource-charge-limited shows up once
 * in `features` (limited-use charges) and again in `knownSpells` (slot
 * cost), same name both times. Fine on the character's own Features/Spells
 * tabs (each tab needs its own copy), but flagging that one name with the
 * reminder flame then matches it in *both* source lists here, producing two
 * identical-looking reminder rows for what the DM experiences as a single
 * flagged ability. Collapse back to one row per name — keeping the "spells"
 * copy when a name has both, since its hint panel carries the more specific
 * spell info (school/components/material) a plain feature entry lacks.
 */
function dedupeReminderEntries(entries: ReminderEntry[]): ReminderEntry[] {
  const byName = new Map<string, ReminderEntry>();
  for (const entry of entries) {
    const existing = byName.get(entry.name);
    if (!existing || (existing.kind !== "spells" && entry.kind === "spells")) {
      byName.set(entry.name, entry);
    }
  }
  return Array.from(byName.values());
}

export function characterReminders(character: Character): ReminderGroup | null {
  const flagged = character.flaggedAbilities ?? [];
  if (flagged.length === 0) return null;
  const entries: ReminderEntry[] = dedupeReminderEntries([
    ...character.attacks
      .filter((a) => flagged.includes(a.name))
      .map((a) => ({
        name: a.name,
        label: <span className={RARITY_COLOR[a.rarity ?? "Common"]}>{a.name}</span>,
        panel: <AttackHintPanel attack={a} />,
        kind: "weapons" as const,
      })),
    ...character.features
      .filter((f) => flagged.includes(f.name))
      .map((f) => ({
        name: f.name,
        label: f.name,
        panel: <AbilityHintPanel name={f.name} metaLines={[f.source]} description={f.description} emptyDescription="No description." />,
        kind: "features" as const,
      })),
    ...character.knownSpells
      .filter((s) => flagged.includes(s.name))
      .map((s) => ({
        name: s.name,
        label: s.name,
        panel: <SpellHintPanel spell={s} />,
        kind: "spells" as const,
      })),
    ...dedupeInventoryItems(character.inventory.filter((item) => item.category === "Consumable"))
      .filter((item) => flagged.includes(item.name))
      .map((item) => ({
        name: item.name,
        label: <span className={RARITY_COLOR[item.rarity]}>{item.name}</span>,
        panel: <ItemHintPanel name={item.name} rarity={item.rarity} weight={item.weight} cost={item.cost} description={item.description} />,
        kind: "consumables" as const,
      })),
  ]);
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { ownerId: character.id, ownerName: character.name, avatarUrl: character.avatarUrl, entries };
}

export function creatureReminders(creature: Creature): ReminderGroup | null {
  const flagged = creature.flaggedTraits ?? [];
  if (flagged.length === 0) return null;
  const entries: ReminderEntry[] = creature.traits
    .filter((t) => flagged.includes(t.name))
    .map((t) => ({
      name: t.name,
      label: t.name,
      panel: (
        <AbilityHintPanel
          name={t.name}
          metaLines={[TRAIT_GROUP_LABELS[t.group ?? "trait"]]}
          description={t.description}
          emptyDescription="No description."
        />
      ),
      kind: "features" as const,
    }));
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { ownerId: creature.id, ownerName: creature.name, avatarUrl: creature.avatarUrl, entries };
}
