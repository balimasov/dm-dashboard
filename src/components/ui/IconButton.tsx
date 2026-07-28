import { ButtonHTMLAttributes } from "react";

/**
 * A small icon-only button — the ✕/🗑/✎ affordance that 30+ call sites
 * across the app each hand-rolled slightly differently before a full audit
 * (2026-07-27) catalogued every variant by role rather than by which icon
 * glyph happened to be inside. Four tones, one per role, each a deliberate
 * canonical pick rather than "whichever existing variant was most common" —
 * for `danger` in particular, no real call site actually used
 * `hover:bg-red-950/30` before this (it was extrapolated from
 * `designTokens.ts` but never wired anywhere), so applying it to the 10+
 * delete affordances that used to be plain hover-color-only text links is a
 * deliberate visual unification, not a no-op formalization:
 * - `neutral` — dismiss/close (a modal's ✕).
 * - `muted` — a lower-emphasis row action (edit/duplicate/show-hide) that
 *   shouldn't compete visually with `neutral`'s close button — no
 *   background on hover, just a text-color shift.
 * - `danger` — remove/delete a row.
 * - `accent` — add/create — the one "positive" icon-only action
 *   (`QuickNotesSection`'s "+"), sky-hover to match the app's link/accent
 *   color everywhere else.
 *
 * Bordered, larger "fab"-style icon buttons (`QuickNoteButton`, the
 * kebab-menu trigger, Journal's export button — `h-9 w-9`/`h-7 w-7` with
 * their own border/background) are a genuinely different, separate shape —
 * see `IconFab.tsx`, not this component.
 *
 * The tone classes below are written as full static strings rather than
 * built from `designTokens.ts` at runtime (e.g. `` `hover:${DESIGN_TOKENS.danger.text}` ``)
 * — Tailwind's class scanner only picks up class names that appear as
 * literal text in a source file, so a runtime-concatenated `hover:` variant
 * would silently produce no CSS. `danger`'s colors are still the same
 * `DESIGN_TOKENS.danger.bg`/`.text` values, just spelled out so Tailwind can
 * see them.
 *
 * `focus-visible:ring-2` (not plain `focus:`) — see `Button`'s own doc
 * comment for why icon-only buttons in particular want the keyboard-only
 * variant: these are clicked constantly (close/edit/duplicate on every
 * card), so a ring on every mouse click would be near-constant visual noise.
 */
export type IconButtonTone = "neutral" | "muted" | "danger" | "accent";

const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral: "text-slate-500 hover:bg-slate-800 hover:text-slate-200",
  muted: "text-slate-400 hover:text-slate-200",
  danger: "text-slate-500 hover:bg-red-950/30 hover:text-red-400",
  accent: "text-slate-500 hover:text-sky-400",
};

export function IconButton({
  tone = "neutral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: IconButtonTone }) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center rounded p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
