import { InfoTooltip } from "@/components/InfoTooltip";
import { ImmuneIcon, ResistIcon, VulnerableIcon } from "./icons";

export interface DamageInfoEntry {
  label: string;
  value?: string;
  panel: React.ReactNode;
}

/**
 * Same "small muted icon before the label" convention `IconStat`/
 * `SenseEntries` use — keyed by the exact label string every caller already
 * passes. "Condition Immunities" (creature-only) shares `ImmuneIcon` with
 * plain "Immune" — both are "nothing gets through" at the same generic
 * circle-slash mark; that reuse only became sensible once `ImmuneIcon`
 * stopped being a shield with a checkmark (which specifically read as a
 * *damage* outcome) and became a plain "blocked" glyph with no damage-only
 * connotation of its own.
 */
const DAMAGE_ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  Resist: ResistIcon,
  Immune: ImmuneIcon,
  Vulnerable: VulnerableIcon,
  "Condition Immunities": ImmuneIcon,
};

/**
 * The Resist/Immune/Vulnerable (and, for a creature, Condition Immunities)
 * list — shared so both cards and the character details modal render it
 * from one place. Entries with no value are skipped; the hint anchors to
 * the label only, same convention as every other hint in these cards.
 */
export function DamageInfoList({ entries }: { entries: DamageInfoEntry[] }) {
  const visible = entries.filter((e) => e.value);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1 text-sm text-slate-300">
      {visible.map((e) => {
        const Icon = DAMAGE_ICONS[e.label];
        return (
          // A previous pass here nested `label`+`value` inside their own
          // `flex items-baseline` box to fix the icon's vertical position —
          // that fixed single-line rows but broke long, wrapping values
          // (confirmed against a real screenshot): a flex child has no
          // hanging indent, so a long `value` either wrapped flush against
          // the row's left edge instead of under its own first line, or (for
          // "Condition Immunities") the *label* itself split mid-phrase once
          // shrunk for space. Back to plain inline text flow for label+value
          // — the shape that already wrapped correctly before that pass —
          // wrapped in a `<span>`, not a `<p>` (the tooltip's own hint text
          // is a `<p>`, and a `<p>` wrapper here would nest one inside the
          // other and trip a hydration mismatch, confirmed). The icon's
          // vertical position is fixed separately: `items-start` on the
          // outer row plus a small `mt-0.5` nudge on the icon centers it
          // against the label's first line specifically (same recipe the
          // Advantages list already uses for its ▲/▼ glyph, `mt-px` there
          // since a bold text glyph and a 16px stroke icon don't sit at
          // quite the same offset) instead of centering against the whole
          // (possibly multi-line) block, which would push it too low again
          // the moment a value wraps.
          <div key={e.label} className="flex items-start gap-1">
            {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
            <span>
              <InfoTooltip inline panel={e.panel}>
                <span className="whitespace-nowrap text-slate-500">{e.label}:</span>
              </InfoTooltip>{" "}
              {e.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
