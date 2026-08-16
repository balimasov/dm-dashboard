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

/** Same five-point star path as `ProficiencyIcon` — visually identical, but a separate, semantically-scoped export (Heroic Inspiration, not the Proficiency stat), following the same "same shape, different meaning gets its own name" convention as `TrashOutlineIcon` vs. `TrashIcon`. `viewBox="0 -2 24 24"` (not `0 0 24 24`) — a 5-point star's own visual weight sits higher than its bounding box's vertical center (the path's own y-extent is roughly [2, 18.3], not [0, 24]), so centering the *box* inside a circular badge left the star reading as sitting slightly above true-center; shifting the viewBox's top down by 2 re-centers the actual glyph instead of its box. */
export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -2 24 24" fill="currentColor" className={className}>
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

export function ToolIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Battle-axe silhouette — Weapon proficiencies. Traced from a reference icon
 * the user supplied (a compound outline path, drawn as a filled shape whose
 * inner subpaths already carve out the "outline" gaps), so this one keeps
 * that icon's own 512×512 coordinate space and `fill="currentColor"`
 * instead of stroke, unlike the monoline `ShieldIcon`/`ToolIcon`/
 * `LanguageIcon` next to it — the same "filled glyph" convention `StarIcon`/
 * `InitiativeIcon`/`ProficiencyIcon` already use elsewhere in this file. The
 * viewBox doesn't need to match theirs; SVG scales it to whatever box
 * `className` gives it, so it still renders at the same 16×16 size in place.
 */
export function AxeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" className={className}>
      <path d="M253.6 1.1C204.7 6.7 157.1 40.7 133.7 86.7C123.2 107.3 118.2 126.5 117.3 149.5C116.7 164.3 118.1 179.3 120.5 183.9C124.2 191.2 130.6 192.9 141.6 189.4C159.1 183.8 181.1 182.5 197.9 186C208.6 188.2 221.1 193.7 230.5 200.5L236.7 204.9L235.1 211.4L233.5 218L118.3 333.2C5.9 445.8 3.1 448.6 1.6 453.9C-0.5 461.1 -0.4 464.8 2 471.2C3.6 475.6 6.5 479.1 19.8 492.3C32.8 505.3 36.4 508.4 40.8 510C47.1 512.4 52 512.5 58.6 510.4C63.1 508.9 73 499.3 178.8 393.6L294 278.5L300.6 276.9L307.2 275.3L310.6 279.9C315.7 286.8 322.8 301.5 325.1 310C329.4 326.2 328.5 350.7 323 369C319.5 380.5 321.1 387.9 327.9 391.4C337.7 396.5 370.3 396 392.2 390.5C421 383.1 443 370.6 464.8 349C491 323.1 505.5 294.8 510.5 260C513 242 511.7 217.4 507.9 211C503.2 203.4 497.8 202.7 480.5 207.5C471.3 210.1 469 210.3 452.5 210.4C438.1 210.5 433.1 210.1 427.5 208.7C418.4 206.3 401.7 198.1 396.2 193.3C392.1 189.8 391.9 189.3 392.9 186.7C393.5 185.1 394 182.7 394 181.3C394 179.3 396.6 176.1 404.1 168.3C416.4 155.7 418.4 151.7 417.8 141.6C417.5 137.6 416.5 133 415.5 131C414.5 129.1 407.4 121.1 399.6 113.3C383.4 97 378.6 94 368.5 94C359.7 94 355.2 96.6 343.6 107.9C335 116.2 332.9 117.8 329.5 118.3C327.3 118.6 324.6 119.2 323.5 119.5C319 120.7 307.6 100.7 303.3 84.1C301.3 76.3 300.8 72 300.8 61.5C300.7 47.3 301.7 40.2 305.7 26.6C309.4 13.8 307.9 7.2 300.5 3.6C293.8 0.4 270.1 -0.9 253.6 1.1ZM289.5 18.2C289.8 18.4 288.9 23 287.5 28.3C279.1 61.6 283.8 94.8 300.4 119.7C302.9 123.4 305.7 127.5 306.6 128.8C308.3 131.1 308.3 131.2 278.1 161.4L247.8 191.7L240.1 186.3C221.2 172.7 201.6 166.7 176.6 166.8C164 166.9 151.9 168.6 141.2 171.7C138.2 172.5 135.5 172.9 135.2 172.5C134.8 172.1 134.5 163.4 134.6 153.2C134.7 135.6 134.9 133.8 137.8 122.9C141.7 108.2 148.2 93.5 155.5 82.4C161.5 73.5 176.9 56.4 186.1 48.4C202.9 34.1 225.8 23.3 247 19.7C252.2 18.8 257.6 17.9 259 17.6C262.1 17 288.9 17.6 289.5 18.2ZM386.8 125.3C400.1 138.7 401 139.9 401 143.4C401 146.8 400.2 148.1 394 154.4L387.1 161.5L368.8 143.2L350.5 124.9L357.6 118C364 111.7 365.2 111 368.7 111C372.4 111 373.3 111.8 386.8 125.3ZM356.7 155.3C376.2 174.8 377 175.8 377 179.5C377 183.4 376.1 184.4 338.7 221.7C301.2 259.3 300.4 260 296.5 260C292.6 260 291.8 259.3 272.2 239.7C250.9 218.3 249.8 216.8 252.8 211.5C253.4 210.4 270.7 192.7 291.2 172.2C327.6 136 328.7 135 332.5 135C336.2 135 337.3 135.9 356.7 155.3ZM384 205.5C386.1 208 400.2 216.6 407.5 219.8C429.9 229.5 456 231.1 483.4 224.4C488.9 223.1 493.6 222.3 493.9 222.6C494.2 222.9 494.5 230.7 494.4 239.8C494.4 258.4 492.4 270.2 487 284.9C478.7 307.5 467.1 324 446.3 343.2C420.5 366.7 388.1 378.8 353 377.8C345.9 377.7 339.9 377.2 339.6 376.9C339.3 376.6 340.3 371.2 341.7 364.9C344.2 354.5 344.5 351.8 344.4 334.5C344.4 317.2 344.1 314.6 341.7 305.7C338.6 294.2 331.9 280.1 325.1 271L320.2 264.5L350.4 234.2C366.9 217.6 381 204 381.6 204C382.2 204 383.3 204.7 384 205.5ZM165.7 382.7C60.7 487.8 53.2 495 50.1 495C47 495 45.1 493.5 32.3 480.8C24.5 473 17.7 465.8 17.4 464.7C17.1 463.7 17.1 461.7 17.5 460.2C17.9 458.4 55.4 420.2 129.8 345.8L241.5 234L259.8 252.3L278 270.5L165.7 382.7Z" />
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

/** Death-save success — "still clinging to life," paired with `SkullIcon` for failures. Filled, not stroked, like `BloodDropIcon` — reads clearer at the 12-16px this renders at than a thin outline would. */
export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}

/**
 * Death-save failure, paired with `HeartIcon` for successes. This is the
 * original prototype's outline (the one confirmed to actually look right,
 * teeth and all — an in-between attempt at "fixing" its asymmetry read as
 * more lopsided, not less), scaled 1.28x wider around its own vertical
 * midline (y untouched, so nothing pushes past the 0-24 viewBox) to fill
 * roughly the same ~80% share of the box `HeartIcon` does — the original
 * only filled ~62%, reading noticeably smaller at matching container
 * sizes despite being drawn to the same scale.
 */
export function SkullIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.24 2 2.4 5.3 2.4 9.7c0 2.9 1.79 4.8 3.71 6V18a1.28 1 0 0 0 1.28 1h1.54v-1.8h1.28v1.8h3.58v-1.8h1.28V19H16.61a1.28 1 0 0 0 1.28-1v-2.3c1.92-1.2 3.71-3.1 3.71-6C21.6 5.3 17.76 2 12 2zM8.54 9.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zm6.92 0a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z" />
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
