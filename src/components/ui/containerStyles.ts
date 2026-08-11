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
 * row or `CampaignJournalModal.tsx`'s selected-session header — those use
 * the dimmer `DIM_ROW_CARD_CLS` below instead.
 */
export const ROW_CARD_CLS = "rounded-lg border border-slate-800 bg-slate-900/60";

/**
 * Dimmer sibling of `ROW_CARD_CLS` (`bg-slate-900/40` instead of `/60`) — a
 * separate, real convention rather than a near-miss of the row card above.
 * Exact match across `TraitMechanicsEditor.tsx`'s per-trait row and
 * `CampaignJournalModal.tsx`'s selected-session header panel.
 */
export const DIM_ROW_CARD_CLS = "rounded-lg border border-slate-800 bg-slate-900/40";

/**
 * Base recipe shared by `ToolkitCard`'s own shell and `CharacterCard`/
 * `CreatureCard`'s outer card — border weight/rounding/shadow are
 * identical, but each still renders its own JSX rather than one calling the
 * other: `ToolkitCard` has 10 existing consumers needing none of
 * `CharacterCard`/`CreatureCard`'s extra needs (`relative` positioning for
 * `StatusRail`'s badge rail, a forced `flex flex-col` layout, a
 * conditional concentration-ring border/bg swap), and adding those as
 * opt-in props to an already-widely-used component for the sake of one new
 * caller risked destabilizing it. Naming just the shared literal avoids
 * that risk while still keeping "one recipe, one name".
 *
 * Padding is deliberately NOT part of this shared literal (each caller adds
 * its own `p-*`) — `CharacterCard`/`CreatureCard` tightened theirs to `p-3.5`
 * to claw back vertical room, and appending a second padding utility after
 * this constant in the same template string wouldn't reliably win anyway:
 * Tailwind resolves same-specificity utility collisions by each utility's
 * position in the *generated* stylesheet (build/scan order), not by where
 * it sits in a JSX template literal, so a caller's own `p-3.5` tacked on
 * after this string could just as easily lose to `ToolkitCard`'s `p-4`
 * depending on scan order — confirmed the only reliable fix is not to have
 * two conflicting padding utilities in play for the same element at all.
 */
export const ENTITY_CARD_BASE_CLS = "rounded-xl border shadow-lg shadow-black/20";

/**
 * "Popover-shell" — a floating dropdown/menu panel anchored off a trigger
 * button. Exact match across `SyncAllButton.tsx`, `QuickNotePopover.tsx`,
 * `QuickLinksButton.tsx`, `ui/SelectMenu.tsx`, `ui/MoreMenu.tsx` (both
 * variants), `ui/StatusRail.tsx` — each still layers its own
 * position/z-index/size/padding on top. `Toast.tsx`'s superficially similar
 * shell uses `shadow-xl` instead of `shadow-lg shadow-black/40` and isn't
 * anchored to a trigger — a real difference, not a near-miss, so it's
 * deliberately left out.
 */
export const POPOVER_SHELL_CLS = "rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/40";

/**
 * Shell for the app's floating "quick action" popovers — `RemindersFab`,
 * `QuickLinksButton`, unified into one look (and one `QuickMenuPanel`
 * component) after those two drifted into slightly different
 * header/background treatments. Deliberately darker
 * (`bg-slate-950`) than `POPOVER_SHELL_CLS`'s `bg-slate-900` — that's this
 * family's own established look (`RemindersFab`'s original recipe), not a
 * near-miss of the more common dropdown/kebab-menu shell above.
 */
export const QUICK_MENU_SHELL_CLS = "rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl";

/**
 * Barely-there background tint for a block that needs to read as "its own
 * area" without competing for attention the way a bordered card does — no
 * border, just `bg-white/[0.025]` layered over whatever's underneath. Exact
 * match across `AiResponseText.tsx`'s Tactics summary block and its
 * per-option Conditions callout (the border-left accent on the latter is
 * that call site's own addition, not part of this shared recipe).
 */
export const FAINT_TINT_CLS = "bg-white/[0.025]";

/**
 * A small clickable rounded-full pill — the AI assistant's quick-suggestion
 * chips ("Why is this best?", "How to save resources?"). No prior exact
 * match in the codebase (an audit found only non-clickable avatar/badge
 * chips), so this combines `ReminderBadge.tsx`'s border/bg/hover recipe
 * (the closest real clickable rounded-full pill) with this feature's own
 * `px-2.5 py-1 text-xs font-semibold` sizing (matching its sibling
 * "Refine"-style action buttons in the same panel).
 */
export const AI_CHIP_CLS =
  "rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:border-sky-700 hover:bg-sky-950/60";

/**
 * Soft, borderless row shell for `CharacterCard`/`CreatureCard`'s (and
 * their matching Details modals') reminder/AI/kebab row — previously a bare
 * `flex` row with no shared container, which read as controls scattered in
 * a spot rather than one panel. Grouping now comes from a faint `white/3.5`
 * tint alone, not a border: this row's own `ReminderBadge`/`AskAiPill`
 * chips are borderless too (see their own comments), and stacking this
 * shell's border around two more nested pill borders read as three frames
 * nested in a small area — worst on a short creature card, where the
 * toolbar is most of what's visible under the name. One soft band groups
 * the row exactly as before; color/fill alone (not a stroke) now
 * distinguishes each chip inside it.
 */
export const TOOLBAR_SHELL_CLS = "rounded-lg bg-white/[0.035]";
