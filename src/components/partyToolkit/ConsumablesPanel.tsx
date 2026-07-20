import { Character } from "@/lib/types";
import { PartyConsumableEntry, computePartyConsumables } from "@/lib/partyToolkit";
import { DotMeter } from "../ResourceMeter";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { CharacterChipRow } from "../ui/CharacterChip";
import { ToolkitCard } from "../ui/ToolkitCard";

/** Same dot-cap `ResourceMeter` uses before falling back to a bare number — a stack past this is still exactly as "fine," so drawing more dots than that would only add clutter without adding information. */
const MAX_DOTS = 6;
/** A consumable has no `max` to read a percentage against (unlike a spell slot or a Resource), so its danger tier is judged on the raw count left instead: 0-1 left is the one DM actually needs to notice before it's gone, 2-3 is worth a glance, 4+ reads as fine. */
const LOW_STOCK = 1;
const WATCH_STOCK = 3;

function stockColorClass(quantity: number): string {
  if (quantity <= LOW_STOCK) return "bg-red-400";
  if (quantity <= WATCH_STOCK) return "bg-amber-400";
  return "bg-emerald-400";
}

/**
 * One consumable, one row — a dot for (up to `MAX_DOTS` of) its party-wide
 * total plus a "+N" tail for whatever doesn't fit, colored by how worried a
 * DM should be about it running out, and the avatar chips of whoever's
 * actually carrying it (its "ownership"). Deliberately dots, not the bar/
 * histogram `Rest Recovery`/`Spell Slots` use right above this panel — a
 * consumable that hits zero is just gone, not "due to recover," so reusing
 * either of those shapes here would visually claim a refill this item will
 * never get.
 */
function ConsumableRow({ entry }: { entry: PartyConsumableEntry }) {
  const dotCount = Math.min(entry.totalQuantity, MAX_DOTS);
  const overflow = entry.totalQuantity - dotCount;
  const name = <span className="min-w-0 truncate text-slate-300">{entry.name}</span>;

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0 flex-1">
        {entry.description ? (
          <InfoTooltip
            panel={
              <p>
                <RichText text={entry.description} />
              </p>
            }
          >
            {name}
          </InfoTooltip>
        ) : (
          name
        )}
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1">
          <DotMeter current={dotCount} max={dotCount} colorClass={stockColorClass(entry.totalQuantity)} />
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

/**
 * Party-wide Consumables — potions, scrolls, anything one-time-use, which
 * are functionally the same "what's left in the tank" question as a spell
 * slot or a Resource, just without a `max` to recover to. Lives in its own
 * card directly under `Rest & Spell Slots` rather than folded into either of
 * those charts, since the shape it needs (dots per item, not a bar or a
 * histogram) is different enough that stacking it into the same box would
 * blur which numbers can refill and which can't. `null` when nobody in the
 * party is carrying any, so an empty party doesn't reserve a blank card.
 */
export function ConsumablesPanel({ characters }: { characters: Character[] }) {
  const entries = computePartyConsumables(characters);
  if (entries.length === 0) return null;

  return (
    <ToolkitCard title="Consumables">
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <ConsumableRow key={entry.name} entry={entry} />
        ))}
      </div>
    </ToolkitCard>
  );
}
