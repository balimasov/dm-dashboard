"use client";

import { useState } from "react";
import { DiceRollerPanel } from "./DiceRollerPanel";

/**
 * Stacks above `QuickLinksButton`/`RemindersFab` in the same fixed
 * bottom-right corner column — same `right-5`/button-height-plus-gap
 * rhythm those two already use (`bottom-5`/`bottom-20`), one more tier up
 * (`bottom-[8.75rem]`, the same 60px step as the existing 5→20 jump) since
 * this FAB, unlike those two, always renders regardless of campaign data.
 * `hasQuickLinks`/`hasReminders` tell it how many of the two lower slots are
 * actually occupied this session, mirroring `RemindersFab`'s own
 * `hasQuickLinks` prop rather than introducing a new stacking mechanism.
 *
 * No popover on click (unlike its two siblings) — this opens the full
 * `DiceRollerPanel` directly, the same "trigger toggles a floating panel"
 * shape `AskAiPill`/`AiAssistantModal` already use, since rolling dice (not
 * a quick glance list) is the whole point of clicking this button.
 *
 * Trigger and panel both sit at `z-[60]` — `Modal`'s own `z-50` convention
 * plus one tier, the same value `Toast.tsx`/a nested modal already use to
 * float above an open `Modal` — deliberately, not `FloatingPanel`'s default
 * `z-[45]`: rolling dice mid-lookup at a character/creature's Details modal
 * is a common table moment, and that trigger needs to stay tappable (and the
 * panel itself needs to render above the modal's backdrop) the whole time
 * one is open, not just before/after it.
 */
export function DiceRollerFab({
  campaignId,
  hasQuickLinks,
  hasReminders,
}: {
  campaignId: string;
  hasQuickLinks: boolean;
  hasReminders: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Each of `QuickLinksButton`/`RemindersFab` occupies exactly one slot when
  // present (never both stacked at the same offset) — how many are present,
  // not *which* ones, decides how far up this FAB sits.
  const occupiedSlotsBelow = Number(hasQuickLinks) + Number(hasReminders);
  const bottomClass = occupiedSlotsBelow === 2 ? "bottom-[8.75rem]" : occupiedSlotsBelow === 1 ? "bottom-20" : "bottom-5";

  return (
    <>
      <div className={`fixed right-5 z-[60] ${bottomClass}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Dice Roller"
          title="Dice Roller"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/40 bg-slate-900 text-xl shadow-lg shadow-black/40 hover:bg-slate-800"
        >
          <span aria-hidden="true">🎲</span>
        </button>
      </div>

      {open && <DiceRollerPanel campaignId={campaignId} onClose={() => setOpen(false)} zIndexClassName="z-[60]" />}
    </>
  );
}
