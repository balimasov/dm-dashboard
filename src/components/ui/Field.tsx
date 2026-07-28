import { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { HINT_TEXT_CLS } from "./typography";

/**
 * Canonical input look. An earlier version of this kit picked the larger
 * `rounded-lg ... px-3 py-2` size as canonical, counting by file (3 files
 * used it vs. 2) — but counting by actual `<input>`/`<textarea>` elements
 * flips the majority hard: the smaller size below covers ~86 fields across
 * `EditCharacterModal.tsx` and the creature form
 * (`creatureForm/shared.tsx`/`CreatureFormFields.tsx`/
 * `TraitMechanicsEditor.tsx`), the two densest, most-field-heavy forms in
 * the app, against ~9 fields in the simpler `CampaignFormModal.tsx`/
 * `CampaignRosterEditor.tsx`/`CreatureRosterEditor.tsx`. Wired into all of
 * them now — the 3 simpler forms get slightly smaller fields, not the two
 * big ones getting bigger.
 */
export const inputCls =
  "rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600";
/** Same look as `inputCls` minus the border — for fields inside a colored/tinted group container that already separates it from its neighbors. */
export const groupInputCls =
  "rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600";

/**
 * Neither constant above bakes in a width — a `w-56 shrink-0`-style caller
 * needs to layer its own width class on top, and baking `w-full` into the
 * constant would fight that override (Tailwind utilities of equal
 * specificity resolve by their order in the generated stylesheet, not by
 * position in the className string, so `${inputCls} w-56` can't reliably
 * beat a `w-full` baked into `inputCls` itself). Every call site that wants
 * the default full-width fill must say so explicitly — `${inputCls} w-full`
 * — rather than relying on the surrounding `Field` label's flex-column
 * stretch to do it implicitly; the two field forms only look the same in a
 * plain `<Field>`/grid layout, and silently diverge the moment a field ends
 * up in a context (nested flex row, `MechanicGroup`, a future layout) where
 * stretch doesn't reach it.
 */


/**
 * Checkbox shape, minus its accent color — `TraitMechanicsEditor`'s
 * mechanic checkboxes each need their own semantic color
 * (`MECHANIC_STYLE[m].accent`), while a plain yes/no checkbox
 * (heroic inspiration, saving-throw proficiency) just wants the app's
 * default sky accent (`checkboxCls` below). Before this, only
 * `TraitMechanicsEditor`'s checkboxes were themed at all — the other two
 * checkboxes in the app rendered with zero styling, i.e. the browser's own
 * default checkbox appearance, clashing with the dark theme.
 */
export const CHECKBOX_BASE_CLS = "h-3.5 w-3.5 rounded border-slate-700 bg-slate-900";
export const checkboxCls = `${CHECKBOX_BASE_CLS} accent-sky-600`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {children}
      {hint && <span className={HINT_TEXT_CLS}>{hint}</span>}
    </label>
  );
}

/** Defaults to full width — the overwhelmingly common case for a `Field`-wrapped input; pass `className="w-56 shrink-0"` (etc.) to opt out. */
export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${className || "w-full"}`.trim()} {...props} />;
}

/** Same full-width default as `TextInput`. */
export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} ${className || "w-full"}`.trim()} {...props} />;
}
