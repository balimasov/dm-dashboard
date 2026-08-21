import { TOGGLE_PILL_ACTIVE_CLS, TOGGLE_PILL_INACTIVE_CLS } from "./containerStyles";

/**
 * A row of small toggle-pill filter chips sitting above a list, letting a
 * player narrow it down without hiding anything from the underlying data —
 * just from the current render. Same on/off color pair `StatusRail`'s
 * condition pills already use app-wide (`TOGGLE_PILL_ACTIVE_CLS`/
 * `TOGGLE_PILL_INACTIVE_CLS`, confirmed as the one settled "toggle pill"
 * convention rather than reinvented here) — without the dashed border, which
 * is specifically `StatusRail`'s own homebrew-content marker, not part of
 * this recipe.
 *
 * Fully generic on selection: `isActive`/`onClick` are the caller's own
 * logic rather than a built-in single/multi-select mode, so both real
 * shapes a filter row needs here work with the same component — a
 * mutually-exclusive "one active chip at a time" row (Actions/Features
 * tabs, clicking a chip swaps the active one) and an independent
 * multi-toggle row (Spells tab, where one spell can carry several tags at
 * once and any subset of tags can be active simultaneously), including an
 * "Все" chip that clears every other selection — no special-casing needed
 * inside this component either way.
 */
export function FilterChipRow({
  options,
  isActive,
  onClick,
}: {
  options: { value: string; label: string }[];
  isActive: (value: string) => boolean;
  onClick: (value: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = isActive(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onClick(opt.value)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              active ? TOGGLE_PILL_ACTIVE_CLS : TOGGLE_PILL_INACTIVE_CLS
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
