import { ButtonHTMLAttributes } from "react";

/**
 * The app's one primary/solid button style — the sky-600 pill used for every
 * "do the main thing" action (submit a form, confirm a modal, open Settings,
 * retry after an error...). Was 14 hand-copied instances of the exact same
 * className string before being pulled into one place; the two disabled
 * treatments that had drifted apart (`disabled:opacity-50` on a few forms vs.
 * `disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`
 * everywhere else) are unified on the latter, more complete one here.
 * `className` appends extra utilities (`w-full`, `mt-5`, ...) per call site.
 *
 * `variant="ghost"` is the second real pattern a later audit found: a plain
 * text "Cancel" next to this button, hand-copied byte-for-byte across 3 form
 * modals before being pulled in here too. Unlike `panelClassName` on `Modal`,
 * this variant's base intentionally omits padding/font-size — every call
 * site needs a different one (a modal footer vs. an inline row), so forcing
 * one via `className` would risk the same silent Tailwind-conflict bug that
 * motivated `Modal`'s own full-replacement fix; leaving sizing to the caller
 * sidesteps it entirely.
 *
 * `focus-visible:ring-2 focus-visible:ring-sky-600` — same ring color as
 * `Field`'s inputs, but on `focus-visible` rather than plain `focus`: a
 * button (unlike a text field, which you're about to type into regardless
 * of input method) is clicked far more often with a mouse than reached by
 * Tab, and `focus-visible`'s browser heuristic keeps the ring for keyboard
 * navigation only rather than flashing it on every mouse click too. Before
 * this, keyboard Tab-focus on any button in the app fell back to the
 * browser's own default outline, since none of the three shared button
 * primitives (this one, `IconButton`, `IconFab`) set anything themselves.
 */
export function Button({
  className = "",
  variant = "solid",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" }) {
  const base =
    variant === "ghost"
      ? "rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:text-slate-600"
      : "rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500";
  return <button className={`${base} ${className}`.trim()} {...props} />;
}
