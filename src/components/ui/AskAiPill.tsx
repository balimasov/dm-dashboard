"use client";

/**
 * Explicit "✨ AI" pill on `CharacterCard`/`CreatureCard`'s sync+actions row —
 * same box model as `ReminderBadge`'s "🔥 N" pill (rounded-full, px-2 py-0.5,
 * text-xs font-semibold, gap-1) so the two read as the same family of
 * control, just a different accent. Sits immediately next to the kebab
 * (`EntityActionsMenu`) because it's always present, unlike the reminder
 * badge which only renders when there are flagged reminders — that badge
 * goes on the *other* side of this pill, so its appearing/disappearing never
 * shifts this button's position relative to the kebab.
 */
export function AskAiPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ask AI"
      className="flex shrink-0 items-center gap-1 rounded-full border border-sky-600/35 bg-sky-600/10 px-2 py-0.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/20"
    >
      <span aria-hidden="true">✨</span>
      AI
    </button>
  );
}
