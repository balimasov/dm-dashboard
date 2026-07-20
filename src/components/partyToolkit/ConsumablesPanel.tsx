import { Character, RARITY_COLOR } from "@/lib/types";
import { PartyConsumableEntry, computePartyConsumables } from "@/lib/partyToolkit";
import { DotMeter } from "../ResourceMeter";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChipRow } from "../ui/CharacterChip";
import { ItemHintPanel } from "../ui/ItemHintPanel";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { distributeIntoColumns } from "./shared";

/** Same dot-cap `ResourceMeter` uses before falling back to a bare number — a stack past this is still exactly as "fine," so drawing more dots than that would only add clutter without adding information. */
const MAX_DOTS = 6;

/** A group of consumables sharing the same D&D Beyond `type` (Potion, Scroll, ...) — the label a manually-added item with no `type` on file falls into instead of guessing at one. */
const OTHER_TYPE_LABEL = "Other";

interface TypeGroup {
  label: string;
  entries: PartyConsumableEntry[];
}

/**
 * Groups already-alphabetical entries by their D&D Beyond `type` — the only
 * grouping signal available that isn't this app inventing a taxonomy of its
 * own. Order preserved within each group (already alphabetical coming in),
 * and groups themselves are alphabetical by label with `OTHER_TYPE_LABEL`
 * forced last regardless — it's a catch-all, not a real category, so
 * sorting it into the middle of the alphabet would read as a real type that
 * happens to start with "O".
 */
function groupByType(entries: PartyConsumableEntry[]): TypeGroup[] {
  const byLabel = new Map<string, PartyConsumableEntry[]>();
  for (const entry of entries) {
    const label = entry.type || OTHER_TYPE_LABEL;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(entry);
  }
  return Array.from(byLabel.entries())
    .map(([label, groupEntries]) => ({ label, entries: groupEntries }))
    .sort((a, b) => {
      if (a.label === OTHER_TYPE_LABEL) return 1;
      if (b.label === OTHER_TYPE_LABEL) return -1;
      return a.label.localeCompare(b.label);
    });
}

/**
 * One consumable, one row — a dot for (up to `MAX_DOTS` of) its party-wide
 * total plus a "+N" tail for whatever doesn't fit, and the avatar chips of
 * whoever's actually carrying it (its "ownership"). Deliberately dots, not
 * the bar/histogram `Rest Recovery`/`Spell Slots` use right above this
 * panel — a consumable that hits zero is just gone, not "due to recover,"
 * so reusing either of those shapes here would visually claim a refill this
 * item will never get. One plain identity color for every dot (same
 * default `DotMeter` itself already uses for a Resource) rather than a
 * danger tier — the count right next to it already says how much is left,
 * and color-coding on top of that read as a second, redundant signal.
 */
function ConsumableRow({ entry }: { entry: PartyConsumableEntry }) {
  const dotCount = Math.min(entry.totalQuantity, MAX_DOTS);
  const overflow = entry.totalQuantity - dotCount;
  const name = <span className={`min-w-0 truncate ${RARITY_COLOR[entry.rarity]}`}>{entry.name}</span>;

  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip
          panel={
            <ItemHintPanel name={entry.name} rarity={entry.rarity} weight={entry.weight} cost={entry.cost} description={entry.description} />
          }
        >
          {name}
        </InfoTooltip>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1">
          <DotMeter current={dotCount} max={dotCount} />
          {overflow > 0 && <span className="text-xs font-semibold text-slate-500">+{overflow}</span>}
        </span>
        <CharacterChipRow
          holders={entry.holders}
          chipTitle={(h) => (h.quantity > 1 ? `${h.characterName} x${h.quantity}` : h.characterName)}
        />
      </span>
    </div>
  );
}

function ConsumableTypeBlock({ group }: { group: TypeGroup }) {
  return (
    <div>
      <SectionLabel>{group.label}</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        {group.entries.map((entry) => (
          <ConsumableRow key={entry.name} entry={entry} />
        ))}
      </div>
    </div>
  );
}

const COLUMNS = 4;

/**
 * Party-wide Consumables — potions, scrolls, anything one-time-use, which
 * are functionally the same "what's left in the tank" question as a spell
 * slot or a Resource, just without a `max` to recover to. Lives in its own
 * card directly under `Rest & Spell Slots` rather than folded into either of
 * those charts, since the shape it needs (dots per item, not a bar or a
 * histogram) is different enough that stacking it into the same box would
 * blur which numbers can refill and which can't. Grouped by type and laid
 * out across `COLUMNS` columns, same "distribute whole groups, balanced by
 * size" shape `Resources & Coverage` already uses — a party rarely tracks
 * more than a handful of consumables, but a single unbroken column reads as
 * needlessly tall once magic-item hoarding starts making that list longer.
 * `null` when nobody in the party is carrying any, so an empty party
 * doesn't reserve a blank card.
 */
export function ConsumablesPanel({ characters }: { characters: Character[] }) {
  const entries = computePartyConsumables(characters);
  if (entries.length === 0) return null;

  const groups = groupByType(entries);
  const columns = distributeIntoColumns(groups, (g) => g.entries.length + 1, COLUMNS);

  return (
    <ToolkitCard title="Consumables">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map(
          (column, i) =>
            column.length > 0 && (
              <div key={i} className="space-y-3">
                {column.map((group) => (
                  <ConsumableTypeBlock key={group.label} group={group} />
                ))}
              </div>
            )
        )}
      </div>
    </ToolkitCard>
  );
}
