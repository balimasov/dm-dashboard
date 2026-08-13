"use client";

import { InfoTooltip } from "@/components/InfoTooltip";

/**
 * Explicit "✨ Ask AI" pill on `CharacterCard`/`CreatureCard`'s sync+actions
 * row — same box model as `ReminderBadge`'s "🔥 N" pill (rounded-full,
 * px-2 py-0.5, text-xs font-semibold, gap-1) so the two read as the same
 * family of control, just a different accent. Sits immediately next to the
 * kebab (`EntityActionsMenu`) because it's always present, unlike the
 * reminder badge which only renders when there are flagged reminders — that
 * badge goes on the *other* side of this pill, so its appearing/disappearing
 * never shifts this button's position relative to the kebab.
 */
export function AskAiPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 rounded-full border border-sky-600/35 bg-sky-600/10 px-2 py-0.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/20"
    >
      {/* `disableTap` — this button already has its own `onClick` (opening
          `AiAssistantModal`); without it, a tap on a touch screen would
          fight between opening this hint and opening the modal instead,
          same reasoning as every other `InfoTooltip` nested inside its own
          clickable parent (e.g. `StatusRail`'s `ConcentrationToggleRow`). */}
      <InfoTooltip
        hoverOnly
        disableTap
        panel={<p>Ask AI — quick rules answers or a suggested move, right from this card.</p>}
      >
        <span className="flex items-center gap-1">
          <span aria-hidden="true">✨</span>
          Ask AI
        </span>
      </InfoTooltip>
    </button>
  );
}
