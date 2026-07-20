import { Character, RARITY_COLOR } from "@/lib/types";
import { PartyConsumableEntry, computePartyConsumables } from "@/lib/partyToolkit";
import { DotMeter } from "../ResourceMeter";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChipRow } from "../ui/CharacterChip";
import { ItemHintPanel } from "../ui/ItemHintPanel";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { splitIntoColumns } from "./shared";

/** Same dot-cap `ResourceMeter` uses before falling back to a bare number — a stack past this is still exactly as "fine," so drawing more dots than that would only add clutter without adding information. */
const MAX_DOTS = 6;

/** A group of consumables sharing the same D&D Beyond `type` (Potion, Scroll, ...) — the label a manually-added item with no `type` on file falls into instead of guessing at one. */
const OTHER_TYPE_LABEL = "Other";

const COLUMNS = 4;

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

type ConsumableListRow =
  | { kind: "header"; label: string; continued?: boolean }
  | { kind: "item"; label: string; entry: PartyConsumableEntry };

function flattenToRows(groups: TypeGroup[]): ConsumableListRow[] {
  return groups.flatMap((g) => [
    { kind: "header" as const, label: g.label },
    ...g.entries.map((entry): ConsumableListRow => ({ kind: "item", label: g.label, entry })),
  ]);
}

/**
 * One consumable, one row — a dot for its party-wide total, or (past
 * `MAX_DOTS`) a plain number in the same style `ResourceMeter` falls back to
 * once a pool's own `max` outgrows dots — plus the avatar chips of whoever's
 * actually carrying it (its "ownership"). Deliberately dots, not the
 * bar/histogram `Rest Recovery`/`Spell Slots` use right above this panel —
 * a consumable that hits zero is just gone, not "due to recover," so
 * reusing either of those shapes here would visually claim a refill this
 * item will never get. One plain identity color for every dot (same default
 * `DotMeter` itself already uses for a Resource) rather than a danger tier —
 * the count right next to it already says how much is left, and
 * color-coding on top of that read as a second, redundant signal.
 */
function ConsumableRow({ entry }: { entry: PartyConsumableEntry }) {
  const overflow = entry.totalQuantity > MAX_DOTS;
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
        {overflow ? (
          <span className="text-slate-100 font-medium">{entry.totalQuantity}</span>
        ) : (
          <DotMeter current={entry.totalQuantity} max={entry.totalQuantity} />
        )}
        <CharacterChipRow
          holders={entry.holders}
          chipTitle={(h) => (h.quantity > 1 ? `${h.characterName} x${h.quantity}` : h.characterName)}
        />
      </span>
    </div>
  );
}

/** One column's worth of rows — headers and item rows both, since a type group's rows can carry over from the previous column (see `splitIntoColumns`). Row dividers (not a wrapping `divide-y`) since a group's rows aren't necessarily all in the same `<div>` anymore. */
function ConsumablesColumn({ rows }: { rows: ConsumableListRow[] }) {
  return (
    <div>
      {rows.map((row, idx) => {
        if (row.kind === "header") {
          return (
            <SectionLabel key={`header-${row.label}-${idx}`} className={idx > 0 ? "mt-3" : ""}>
              {row.label}
              {row.continued && <span className="ml-1 normal-case text-slate-700"> (continued)</span>}
            </SectionLabel>
          );
        }
        const continuesGroup = rows[idx - 1]?.kind === "item";
        return (
          <div key={`${row.label}-${row.entry.name}`} className={continuesGroup ? "border-t border-slate-800/60" : ""}>
            <ConsumableRow entry={row.entry} />
          </div>
        );
      })}
    </div>
  );
}

function ConsumablesBody({ entries }: { entries: PartyConsumableEntry[] }) {
  const groups = groupByType(entries);
  const columns = splitIntoColumns(
    flattenToRows(groups),
    COLUMNS,
    (row) => row.kind === "header",
    (firstRestRow) => ({ kind: "header" as const, label: firstRestRow.label, continued: true })
  );

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col, i) => col.length > 0 && <ConsumablesColumn key={i} rows={col} />)}
    </div>
  );
}

/**
 * Party-wide Consumables — potions, scrolls, anything one-time-use, which
 * are functionally the same "what's left in the tank" question as a spell
 * slot or a Resource, just without a `max` to recover to. Lives in its own
 * card directly under `Rest & Spell Slots` rather than folded into either of
 * those charts, since the shape it needs (dots per item, not a bar or a
 * histogram) is different enough that stacking it into the same box would
 * blur which numbers can refill and which can't. Grouped by type and laid
 * out across `COLUMNS` columns via `splitIntoColumns`, same row-level
 * column-splitting `InventoryOverview` uses — a type group is free to carry
 * over into the next column, so a party with only one or two types still
 * fills all four columns instead of leaving most of them empty. Always
 * renders (with a placeholder when nobody's carrying anything) rather than
 * disappearing — same as every other Party Toolkit panel, so an empty party
 * doesn't look like the block is missing rather than just empty.
 */
export function ConsumablesPanel({ characters }: { characters: Character[] }) {
  const entries = computePartyConsumables(characters);

  return (
    <ToolkitCard title="Consumables">
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No consumables tracked on any character.</p>
      ) : (
        <ConsumablesBody entries={entries} />
      )}
    </ToolkitCard>
  );
}
