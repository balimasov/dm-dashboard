import { Character, Creature, QuickNote, RARITY_COLOR } from "@/lib/types";
import { ContentKind } from "@/lib/contentKindIcons";
import { dedupeInventoryItems } from "@/lib/partyToolkit";
import { AbilityHintPanel } from "@/components/ui/AbilityHintPanel";
import { AttackHintPanel } from "@/components/ui/AttackDisplay";
import { CreatureAbilityHintPanel } from "@/components/CreatureAbilitiesPanel";
import { ItemHintPanel } from "@/components/ui/ItemHintPanel";
import { FeatureHintPanel } from "@/components/ui/RecoveryBadge";
import { KnownSpellHintPanel } from "@/components/ui/SpellDisplay";

/**
 * A flagged `QuickNote` has no stable "name" the way an ability does — just
 * an `id` and freeform text — so it can't join `flaggedAbilities`/
 * `flaggedTraits`' plain name-list the way every other reminder source does.
 * Prefixing the note's own id keeps `ReminderEntry.name` a single opaque
 * identity key either way (still "never rendered directly," same as its own
 * doc comment already promises) without widening the entry shape itself —
 * every place that un-flags a reminder by name (`CharacterCard`,
 * `CreatureCard`, `RemindersPanel`, `RemindersFab`) checks
 * `quickNoteIdFromReminderName` first and, if it matches, clears that one
 * note's `flagged` instead of touching `flaggedAbilities`/`flaggedTraits`.
 */
const QUICK_NOTE_REMINDER_PREFIX = "quick-note:";

export function quickNoteReminderName(noteId: string): string {
  return `${QUICK_NOTE_REMINDER_PREFIX}${noteId}`;
}

export function quickNoteIdFromReminderName(name: string): string | null {
  return name.startsWith(QUICK_NOTE_REMINDER_PREFIX) ? name.slice(QUICK_NOTE_REMINDER_PREFIX.length) : null;
}

/** Un-flagging a reminder that came from a quick note clears just that note's `flagged` bit, not the whole array — used by every place a `ReminderRow`'s "✕" can fire against a quick-note-sourced entry (`CharacterCard`, `CreatureCard`, `RemindersPanel`, `RemindersFab`). */
export function unflagQuickNote(quickNotes: QuickNote[] | undefined, noteId: string): QuickNote[] {
  return (quickNotes ?? []).map((note) => (note.id === noteId ? { ...note, flagged: false } : note));
}

function quickNoteReminderEntries(quickNotes: QuickNote[] | undefined): ReminderEntry[] {
  return (quickNotes ?? [])
    .filter((note) => note.flagged)
    .map((note) => ({
      name: quickNoteReminderName(note.id),
      label: note.text,
      panel: <AbilityHintPanel name="Quick Note" description={note.text} />,
      kind: "notes" as const,
    }));
}

/**
 * `entry.name` is an opaque identity key (see its own doc comment) — for
 * every *other* reminder source it happens to equal the visible label too,
 * so sorting by it reads as alphabetical-by-label for free. A quick note's
 * `name` is `quick-note:<id>` instead, which would sort the whole group by
 * id rather than by what the DM actually reads — fall back to the plain-
 * string `label` (always a bare string for a quick note, unlike e.g. a
 * rarity-colored weapon name) for those entries specifically.
 */
function reminderSortKey(entry: ReminderEntry): string {
  if (quickNoteIdFromReminderName(entry.name) && typeof entry.label === "string") return entry.label;
  return entry.name;
}

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
        panel: <FeatureHintPanel feature={f} emptyDescription="No description." />,
        kind: "features" as const,
      })),
    ...character.knownSpells
      .filter((s) => flagged.includes(s.name))
      .map((s) => ({
        name: s.name,
        label: s.name,
        panel: <KnownSpellHintPanel spell={s} />,
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
    ...quickNoteReminderEntries(character.quickNotes),
  ]);
  if (entries.length === 0) return null;
  entries.sort((a, b) => reminderSortKey(a).localeCompare(reminderSortKey(b)));
  return { ownerId: character.id, ownerName: character.name, avatarUrl: character.avatarUrl, entries };
}

export function creatureReminders(creature: Creature): ReminderGroup | null {
  const flagged = creature.flaggedTraits ?? [];
  const spellNames = (creature.spellcasting?.spellGroups ?? []).flatMap((g) => g.spells);
  const entries: ReminderEntry[] = dedupeReminderEntries([
    ...creature.traits
      .filter((t) => flagged.includes(t.name))
      .map((t) => ({
        name: t.name,
        label: t.name,
        panel: <CreatureAbilityHintPanel trait={t} />,
        kind: "features" as const,
      })),
    // A creature's spell is just a bare name (no description/components the
    // way a character's `KnownSpell` has), so there's no rich hint to show —
    // a minimal "Spell" tag panel is the best this can do, and that's fine:
    // the point is letting the DM flag "this creature can cast X" at all,
    // which the Spells tab had no way to do before this.
    ...spellNames
      .filter((name) => flagged.includes(name))
      .map((name) => ({
        name,
        label: name,
        panel: <AbilityHintPanel name={name} metaLines={["Spell"]} />,
        kind: "spells" as const,
      })),
    ...quickNoteReminderEntries(creature.quickNotes),
  ]);
  if (entries.length === 0) return null;
  entries.sort((a, b) => reminderSortKey(a).localeCompare(reminderSortKey(b)));
  return { ownerId: creature.id, ownerName: creature.name, avatarUrl: creature.avatarUrl, entries };
}
