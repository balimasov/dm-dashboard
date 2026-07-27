import { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { HINT_TEXT_CLS } from "./typography";

/**
 * Canonical input look, per a UI-kit audit: `creatureForm/shared.tsx` and
 * `EditCharacterModal.tsx` share a byte-identical, smaller `inputCls`
 * (`rounded-md ... px-2 py-1.5`), while `CampaignFormModal.tsx`,
 * `CampaignRosterEditor.tsx`, and `CreatureRosterEditor.tsx` each inline a
 * third, larger variant (`rounded-lg ... px-3 py-2` +
 * `placeholder:text-slate-600`). This kit picks the 3-file majority as the
 * canonical size — not a migration, existing call sites keep their own
 * strings until a future wiring decision.
 */
export const inputCls =
  "rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600";
/** Same look as `inputCls` minus the border — for fields inside a colored/tinted group container that already separates it from its neighbors. */
export const groupInputCls =
  "rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600";

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

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${className}`.trim()} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} ${className}`.trim()} {...props} />;
}
