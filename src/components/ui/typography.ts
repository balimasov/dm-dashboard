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

/**
 * Follow-up round — a full-codebase audit of every repeated *heading/body*
 * text recipe (not just the label tier above), each wired into every call
 * site found. Values are exact-match strings pulled straight from the
 * dominant existing usage, not invented.
 */

/** Uppercase section header inside a full edit form (`Basic Info`, `Combat`, `Stats`...) — 25 call sites across 6 files before this round. */
export const FORM_SECTION_HEADING_CLS = "text-sm uppercase tracking-wide text-slate-500";
/** Secondary descriptive copy under a section title, or "nothing here" body text in modals — 18 call sites across 10 files. */
export const MUTED_BODY_CLS = "text-sm text-slate-500";
/** "No X yet" / empty-list / loading body text — one shade darker than `MUTED_BODY_CLS`, a distinct existing convention, not a near-miss of it — 13 call sites across 9 files. */
export const EMPTY_STATE_CLS = "text-sm text-slate-600";
/** Inline form/save error message — 8 call sites (`<p>` and `<div>` wrappers) across 6 files. */
export const INLINE_ERROR_CLS = "text-sm text-red-400";
/** Compact variant of `INLINE_ERROR_CLS` for tighter contexts (journal conflict banner, quick-note save error) — 2 call sites. */
export const INLINE_ERROR_XS_CLS = "text-xs text-red-400";
/** Recoverable-but-notable warning text (search/sync issues) — 2 call sites. */
export const WARNING_TEXT_CLS = "text-sm text-amber-400";
/** Tiny uppercase group/category label inside ability/spell lists — a distinct color (`slate-600`) from `MICRO_LABEL_CLS`'s `slate-500`, not a near-miss — 6 call sites across 2 files. */
export const MICRO_ITEM_LABEL_CLS = "text-[10px] uppercase tracking-wide text-slate-600";
/** Bolder 11px sibling of `MICRO_LABEL_CLS` used for attack/spell-card mini-headers (`font-semibold`, one size step up) — 6 call sites across 4 files. */
export const MICRO_LABEL_STRONG_CLS = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
/** Modal dialog `<h2>` title — already used inline by `ui/Modal.tsx`; exported here so the 6 modals that don't (yet) use the shared `Modal` shell can match it exactly — 7 call sites. */
export const MODAL_TITLE_CLS = "text-lg font-bold text-slate-50";
/** Page-level / big-section `<h1>`/heading — 2 call sites. */
export const PAGE_TITLE_CLS = "text-2xl font-bold text-slate-50";
/** Small floating-panel header (Reminders FAB/badge) — 2 call sites. */
export const PANEL_HEADING_CLS = "text-sm font-bold text-slate-50";
/** Prominent row/list-item title — shared by the app's error/not-found page `<h1>`s and roster/journal-session list-row titles, which turned out to be the exact same recipe — 6 call sites across 6 files. */
export const LIST_ROW_TITLE_CLS = "text-lg font-semibold text-slate-100";
/** Clickable character/creature name in a card header, with its hover-to-white transition — only the 2 exact matches (`CharacterHeader`/`CreatureHeader`); `SortableCharacterRow`'s superficially similar title uses a different shade and a plain (non-`group-`) hover, a real behavioral difference, so it's deliberately left alone. */
export const CARD_TITLE_CLS = "truncate text-lg font-semibold text-slate-50 transition-colors group-hover:text-white";
/** Secondary info line under `CARD_TITLE_CLS` (class/level, size/type) — 2 exact matches. */
export const CARD_SUBTITLE_CLS = "truncate text-sm text-slate-400 transition-colors group-hover:text-slate-200";
/** Third header line under `CARD_SUBTITLE_CLS` ("Lvl N" / "CR N") — same size/color as `CARD_SUBTITLE_CLS` so the two read as one consistent tier instead of a dimmer third size, but with `leading-4` (16px) instead of the default text-sm leading (20px): `CARD_TITLE_CLS` (28px) + `CARD_SUBTITLE_CLS` (20px) + this at 20px would total 68px, spilling 4px past the `h-16` (64px) avatar next to it — at 16px it stays flush with the avatar's bottom edge, same as the block's total height before this line existed at this size. */
export const CARD_META_CLS = "truncate text-sm text-slate-400 leading-4";
/** Clickable reminder title inside the Reminders panel/FAB — 2 exact matches. */
export const REMINDER_LINK_TITLE_CLS =
  "min-w-0 max-w-full truncate text-left text-sm font-semibold text-slate-100 hover:opacity-80";
/** `Field`'s own hint-line style (already used inline by `ui/Field.tsx`), exported so the 5 empty-state messages that happen to share the exact same recipe can use it too instead of re-hardcoding it. */
export const HINT_TEXT_CLS = "text-[11px] text-slate-600";
