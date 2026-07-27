import { ButtonHTMLAttributes } from "react";

/**
 * A small icon-only button — the ✕/🗑 affordance that 9+ files across the
 * app each hand-roll slightly differently (`rounded` vs `rounded-md`,
 * `hover:text-slate-200` vs `hover:bg-slate-800 hover:text-slate-200`).
 * Two tones, matching the two genuinely different things this button does
 * in the app today (kept separate rather than merged into one — closing a
 * modal and deleting a row are different affordances, they just happened
 * to share no common home before this):
 * - `neutral` — dismiss/close (a modal's ✕), formalizing the majority
 *   existing pattern.
 * - `danger` — remove/delete a row, formalizing the less common but
 *   already-present red-hover pattern.
 *
 * The tone classes below are written as full static strings rather than
 * built from `designTokens.ts` at runtime (e.g. `` `hover:${DESIGN_TOKENS.danger.text}` ``)
 * — Tailwind's class scanner only picks up class names that appear as
 * literal text in a source file, so a runtime-concatenated `hover:` variant
 * would silently produce no CSS. `danger`'s colors are still the same
 * `DESIGN_TOKENS.danger.bg`/`.text` values, just spelled out so Tailwind can
 * see them.
 */
export type IconButtonTone = "neutral" | "danger";

const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral: "text-slate-500 hover:bg-slate-800 hover:text-slate-200",
  danger: "text-slate-500 hover:bg-red-950/30 hover:text-red-400",
};

export function IconButton({
  tone = "neutral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: IconButtonTone }) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center rounded p-1 ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
