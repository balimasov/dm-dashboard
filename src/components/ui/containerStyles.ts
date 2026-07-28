/**
 * Two container recipes duplicated byte-for-byte across several files (per a
 * UI-kit audit), named here so a future change to either shape happens in
 * one place instead of N.
 */

/**
 * "Row card" — a bordered row inside a list (roster rows, reminder groups,
 * campaign rows), no shadow. Exact match across `RosterRow.tsx`,
 * `CreatureRosterEditor.tsx`, `RemindersPanel.tsx`, `RemindersFab.tsx`,
 * `CampaignsClient.tsx` — each still layers its own padding/layout classes
 * on top. Deliberately does NOT cover `TraitMechanicsEditor.tsx`'s per-trait
 * row or `partyToolkit/shared.tsx`'s `ChartBox` — both use `bg-slate-900/40`
 * or `bg-slate-950/40` instead of `bg-slate-900/60`, a different (dimmer)
 * fill that turned out to be its own convention, not a near-miss of this one.
 */
export const ROW_CARD_CLS = "rounded-lg border border-slate-800 bg-slate-900/60";

/**
 * Base recipe shared by `ToolkitCard`'s own shell and `CharacterCard`/
 * `CreatureCard`'s outer card — border weight/rounding/padding/shadow are
 * identical, but each still renders its own JSX rather than one calling the
 * other: `ToolkitCard` has 10 existing consumers needing none of
 * `CharacterCard`/`CreatureCard`'s extra needs (`relative` positioning for
 * `StatusRail`'s badge rail, a forced `flex flex-col gap-4` layout, a
 * conditional concentration-ring border/bg swap), and adding those as
 * opt-in props to an already-widely-used component for the sake of one new
 * caller risked destabilizing it. Naming just the shared literal avoids
 * that risk while still keeping "one recipe, one name".
 */
export const ENTITY_CARD_BASE_CLS = "rounded-xl border p-4 shadow-lg shadow-black/20";

/**
 * "Popover-shell" — a floating dropdown/menu panel anchored off a trigger
 * button. Exact match across `SyncAllButton.tsx`, `QuickNoteButton.tsx`,
 * `QuickLinksButton.tsx`, `ui/SelectMenu.tsx`, `ui/MoreMenu.tsx` (both
 * variants), `ui/StatusRail.tsx` — each still layers its own
 * position/z-index/size/padding on top. `Toast.tsx`'s superficially similar
 * shell uses `shadow-xl` instead of `shadow-lg shadow-black/40` and isn't
 * anchored to a trigger — a real difference, not a near-miss, so it's
 * deliberately left out.
 */
export const POPOVER_SHELL_CLS = "rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/40";
