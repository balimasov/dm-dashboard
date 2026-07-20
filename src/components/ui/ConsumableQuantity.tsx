import { DotMeter } from "../ResourceMeter";

/** Same dot-cap `ResourceMeter` uses before falling back to a bare number — a stack past this is still exactly as "fine," so drawing more dots than that would only add clutter without adding information. */
const MAX_DOTS = 6;

/**
 * A consumable's remaining count — dots up to `MAX_DOTS`, or (past that) a
 * plain number in the same style `ResourceMeter` falls back to once a pool's
 * own `max` outgrows dots. One flat identity color for every dot (same
 * default `DotMeter` itself already uses for a Resource) rather than a
 * danger tier — the count right next to it already says how much is left,
 * and color-coding on top of that reads as a second, redundant signal.
 * Shared by every place a consumable's quantity shows up (a character's own
 * Consumables tab, the party-wide Actions & Resources Consumables tab), so
 * "how much is left" always looks the same regardless of which list it's
 * read from.
 */
export function ConsumableQuantity({ quantity }: { quantity: number }) {
  if (quantity > MAX_DOTS) {
    return <span className="text-slate-100 font-medium">{quantity}</span>;
  }
  return <DotMeter current={quantity} max={quantity} />;
}
