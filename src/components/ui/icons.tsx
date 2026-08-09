export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 12h13M12 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InitiativeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4.5 14h5.5l-1.5 8L18 10h-5.5L13 2z" />
    </svg>
  );
}

export function ProficiencyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 2z" />
    </svg>
  );
}

export function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 5h16v10H8l-4 4V5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 15a8 8 0 0 0 13.9 3M18.5 9A8 8 0 0 0 4.6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Same arrow-plus-tray shape as `DownloadIcon` above, flipped upward — kept as its own icon rather than a `rotate-180` on `DownloadIcon`, since a straight rotation would also flip the tray, which needs to stay the same side up in both directions. */
export function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 21V9m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Generic person/creature silhouette — "Characters & Creatures" isn't an add/create action on its own (that lives inside the modal it opens), so a plus sign was the wrong signifier for it. */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 4h16v11l-5 5H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="4" width="18" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 13h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.4 5.14A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a13.9 13.9 0 0 1-3.15 4.02M6.6 6.6C4.2 8.1 2 12 2 12a13.9 13.9 0 0 0 5.13 5.34A10.5 10.5 0 0 0 12 19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A single-path, less-detailed wastebasket than `TrashIcon` above (no interior lines) — visually distinct, not a true duplicate, so kept as its own icon rather than merged into `TrashIcon`. */
export function TrashOutlineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Bloodied" is blood, not health — a drop, not a heart. */
export function BloodDropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5c-.4.6-1.6 2.3-2.8 4.4C7.4 10.2 6 13 6 15.2 6 18.9 8.7 22 12 22s6-3.1 6-6.8c0-2.2-1.4-5-3.2-8.3-1.2-2.1-2.4-3.8-2.8-4.4Z" />
    </svg>
  );
}

export function FlameIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 2.5c-2.2 3-4.5 5.5-4.5 9a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.6-1.2-3.6.3 2-.8 3.3-2 3.3-1.1 0-1.8-.9-1.8-2 0-2.2 1.8-3.6.5-6.7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExhaustionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2" y="7" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10.5v3" strokeLinecap="round" />
      <path d="M6 12h4" strokeLinecap="round" />
    </svg>
  );
}

/** Placeholder icon for the Concentration status badge — a bullseye, standing in until custom art is added. */
export function ConcentrationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** "Ask AI" entry point on the character/creature card kebab menu — a sparkle, the near-universal shorthand for "AI-generated/assisted" at this point. */
export function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11 2l1.6 5.4L18 9l-5.4 1.6L11 16l-1.6-5.4L4 9l5.4-1.6L11 2z" />
      <path d="M18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A picture-frame-plus-mountain glyph — `AiAssistantModal`'s "attach a battlefield photo" trigger. */
export function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.12 0L4 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Diagonal resize-grip glyph — two parallel strokes toward a corner, `FloatingPanel`'s bottom-right resize handle. */
export function ResizeGripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M20 4L4 20M20 12L12 20" strokeLinecap="round" />
    </svg>
  );
}

/** Crescent moon — Darkvision, one of the four named-sense icons before `SenseEntries`' own entries (same "small icon before the label" shape `IconStat` already uses for AC/Speed/Initiative/Prof). */
export function DarkvisionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ripples out from a center point — Blindsight, "senses the area without relying on sight" reads better as an omnidirectional ping than an eye glyph would. */
export function BlindsightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.5" strokeDasharray="2.2 2.4" />
      <circle cx="12" cy="12" r="9.5" strokeDasharray="2.4 2.8" />
    </svg>
  );
}

/** A pulse/seismograph line — Tremorsense, detecting via ground vibration rather than sight. */
export function TremorsenseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M2 17h4l2-6 3 10 3-14 2 10h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** An eye with a small sparkle — Truesight, deliberately not the plain `EyeIcon` (already means "toggle visibility" elsewhere) — the sparkle is what reads as "sees the true, magically-hidden form" instead of just "sees." */
export function TruesightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M19 3.5l.55 1.3L21 5.35l-1.45.55L19 7.25l-.55-1.35L17 5.35l1.45-.55z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Same circle outline, three completely different glyphs inside — Resist/
 * Vulnerable/Immune. Two earlier versions both put the differentiating mark
 * inside a `ShieldIcon` (AC) outline: first a chevron pointing down vs. up,
 * then a full arrow vs. a jagged crack. Both still shared the shield as the
 * dominant silhouette, and a shield reads as "this is about AC" before
 * anyone registers what's inside it — that's what actually needed fixing,
 * not just making the inner glyph bigger. These three glyphs (−, +, a
 * diagonal slash) have nothing in common with each other or with `AC`'s
 * shield, so there's no shared silhouette left to compete with the mark
 * that actually carries the meaning.
 */
export function ResistIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

/** See `ResistIcon`'s own doc comment — same circle, a plus (damage amplified). */
export function VulnerableIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

/** See `ResistIcon`'s own doc comment — same circle, a diagonal slash (the universal "blocked entirely" mark). */
export function ImmuneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.8 5.8l12.4 12.4" strokeLinecap="round" />
    </svg>
  );
}
