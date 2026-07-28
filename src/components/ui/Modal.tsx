import { ReactNode, useId } from "react";
import { IconButton } from "./IconButton";
import { MODAL_TITLE_CLS } from "./typography";

/**
 * The two `fixed inset-0` overlay shapes 8 files across the app each
 * hand-roll independently (per a UI-kit audit): `centered` — no scroll
 * handling, backdrop `bg-black/70`, used by the majority (campaign/creature/
 * character edit forms, HP history, roster manager) — and `scrollable` —
 * top-aligned with its own scrollbar, backdrop `bg-black/60`, used by the
 * two read-view details modals (`CharacterDetailsModal`/
 * `CreatureDetailsModal`) whose content can run taller than the viewport.
 * Neither existing modal has `role="dialog"`/`aria-modal` anywhere in the
 * app; both are added here.
 *
 * `panelClassName`'s default (`w-full max-w-lg gap-4 border-slate-800
 * bg-slate-950 p-4`) is a real, fully-replaceable default rather than
 * always-on classes with extras appended after — a caller passing its own
 * `panelClassName` REPLACES all of size/spacing/border-color/background/
 * padding, not just adds to them. This matters because two Tailwind
 * utilities for the same CSS property (e.g. the shell's own `p-4` and a
 * caller's `p-5`, or `border-slate-800` vs. a caller's `border-violet-500`)
 * both being present in the class string is a real bug, not a style
 * preference: which one wins depends on Tailwind's generated stylesheet
 * order, not on the className string's runtime order, so silently
 * "layering" a caller's classes on top used to be unreliable. `gap-4` is
 * part of the default rather than fixed too — `EditCharacterModal`/
 * `EditCreatureModal`'s header sits flush against a `border-b` divider
 * with no gap at all (the line itself is the separator), so a genuinely
 * fixed `gap-4` would add unwanted space there. Only `flex flex-col
 * rounded-xl border` (shape + the border's *width*, not its color) stays
 * truly fixed, since every modal in the app wants that.
 *
 * `title` covers the common case — a plain heading plus the standard close
 * button. `header` is an escape hatch for a call site with its own header
 * content the standard shape can't express (an extra action button next to
 * close, a full custom component instead of a `<h2>`, a `border-b`
 * divider) — the caller owns the whole row, including its own close
 * button, when using it.
 */
export type ModalVariant = "centered" | "scrollable";

/** z-index kept separate from the rest of the overlay recipe — a modal opened from inside an already-open modal (`AvatarPicker`'s crop dialog, launched from `CampaignFormModal`/the creature edit form) needs to stack above that parent's own `z-50`, the same `z-[60]` convention `Toast.tsx` already uses for the same reason. */
const OVERLAY_CLASSES: Record<ModalVariant, string> = {
  centered: "fixed inset-0 flex items-center justify-center bg-black/70 p-4",
  scrollable:
    "scrollbar-themed fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]",
};

export function Modal({
  variant = "centered",
  onClose,
  title,
  header,
  panelClassName = "w-full max-w-lg gap-4 border-slate-800 bg-slate-950 p-4",
  zIndexClassName = "z-50",
  children,
}: {
  variant?: ModalVariant;
  onClose: () => void;
  title?: ReactNode;
  /** Full custom header row — replaces the `title` + auto close-button row entirely. The caller is responsible for its own close button when using this. */
  header?: ReactNode;
  /** Replaces the panel's size (`max-w-*`), spacing (`gap-*`), border color, background, and padding entirely — see the doc comment above for why this is a full replacement rather than additive classes. */
  panelClassName?: string;
  /** Overrides the overlay's stacking order — every modal defaults to `z-50`; a modal nested inside another one needs something higher (`z-[60]`, matching `Toast.tsx`'s own convention) so it renders above its parent's overlay instead of behind it. */
  zIndexClassName?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div className={`${OVERLAY_CLASSES[variant]} ${zIndexClassName}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`flex flex-col rounded-xl border ${panelClassName}`}
      >
        {header ??
          (title && (
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className={MODAL_TITLE_CLS}>
                {title}
              </h2>
              <IconButton onClick={onClose} aria-label="Close">
                ✕
              </IconButton>
            </div>
          ))}
        {children}
      </div>
    </div>
  );
}
