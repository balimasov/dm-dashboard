/**
 * Sixth step of the UI-kit plan — formalizes two label roles that sit
 * outside the two already-named ones (`SubHeading`, `text-xs
 * uppercase tracking-wide text-slate-500`, and `SectionLabel` inside
 * `ToolkitCard.tsx`, `text-[11px] font-semibold uppercase tracking-wide
 * text-slate-600`), both of which stay untouched.
 *
 * Values are the per-axis majority found across the codebase (audit grep),
 * not an invented look:
 *
 * `MUTED_LABEL_CLS` — plain `text-xs` captions/hints (not uppercase, not a
 * section header). `text-slate-500` is used 16 times vs. 6 for `-400` and
 * 5 for `-600` (label-role `-400` instances already covered by `Field`'s
 * own className are excluded from that count).
 *
 * `MICRO_LABEL_CLS` — the 19+ `text-[10-11px] uppercase tracking-wide`
 * family used for small in-card headers (damage/heal group titles, avatar
 * "Total" labels, spell/attack source lines). No single exact string
 * dominates (two 6-way ties), so each axis was resolved independently by
 * count: size `10px` (13 of 21) over `11px` (8), no `font-semibold` (11 of
 * 21) over `font-semibold` (10), and `text-slate-500` (11 of 21) over
 * `text-slate-600` (10).
 */
export const MUTED_LABEL_CLS = "text-xs text-slate-500";
export const MICRO_LABEL_CLS = "text-[10px] uppercase tracking-wide text-slate-500";
