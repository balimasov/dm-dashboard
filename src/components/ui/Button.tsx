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
 */
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${className}`.trim()}
      {...props}
    />
  );
}
