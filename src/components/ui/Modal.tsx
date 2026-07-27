import { ReactNode, useId } from "react";
import { IconButton } from "./IconButton";

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
 * Only the overlay/panel shell is standardized — `panelClassName` covers
 * the size/padding/shadow differences between call sites (a compact form
 * vs. a wide roster editor vs. a tall read-view card), and the actual
 * content stays fully custom via `children`. A caller with its own
 * non-generic panel styling (e.g. `CharacterDetailsModal`'s violet
 * concentration ring) isn't a fit for this and can keep hand-rolling its
 * wrapper — this primitive isn't wired into any existing modal yet.
 */
export type ModalVariant = "centered" | "scrollable";

const OVERLAY_CLASSES: Record<ModalVariant, string> = {
  centered: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
  scrollable:
    "scrollbar-themed fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]",
};

export function Modal({
  variant = "centered",
  onClose,
  title,
  panelClassName = "w-full max-w-lg",
  children,
}: {
  variant?: ModalVariant;
  onClose: () => void;
  title?: ReactNode;
  /** Extends/overrides the panel's size (`max-w-*`), spacing, and `my-*` for the `scrollable` variant — the shell's own `rounded-xl border border-slate-800 bg-slate-950` stays fixed. */
  panelClassName?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div className={OVERLAY_CLASSES[variant]}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 ${panelClassName}`}
      >
        {title && (
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-bold text-slate-50">
              {title}
            </h2>
            <IconButton onClick={onClose} aria-label="Close">
              ✕
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
