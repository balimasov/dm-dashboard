import { ButtonHTMLAttributes } from "react";

/**
 * The larger, bordered "fab"-style icon button — `QuickNoteButton` and
 * Journal's export button each hand-rolled this shape independently
 * (`flex h-9/h-7 w-9/w-7 items-center justify-center rounded-lg border
 * border-slate-700 ... hover:bg-slate-800`). A genuinely different shape
 * from `IconButton` (bordered, its own background, meant to stand alone
 * next to other bordered controls) — not a size variant of it. The kebab
 * trigger built into `MoreMenu.tsx` uses this same "boxed" shape too, but
 * stays self-contained there since it already switches between two
 * deliberately different variants (`boxed`/`plain`) of its own.
 */
export type IconFabSize = "sm" | "md";

const SIZE_CLASSES: Record<IconFabSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export function IconFab({
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: IconFabSize }) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30 ${SIZE_CLASSES[size]} ${className}`.trim()}
      {...props}
    />
  );
}
