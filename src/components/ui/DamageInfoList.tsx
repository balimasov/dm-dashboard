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
          // A `div`, not a `p` — the tooltip's own hint text is a `<p>`, and
          // React renders that panel into the DOM even while hidden (only its
          // `hidden`/`block` class toggles), so a `<p>` wrapper here would put
          // a `<p>` inside a `<p>` and trip a hydration mismatch (confirmed).
          //
          // `IconStat`'s own nested-flex recipe, not a bare `inline-block`/
          // `align-middle` icon followed by plain sibling text — that earlier
          // shape put the icon, the `InfoTooltip`-forced-`align-top` label,
          // and the plain-baseline `e.value` on three different vertical
          // anchors in the same line box, which is what made the icon read as
          // sitting visibly lower than `IconStat`'s AC/Speed/Initiative rows
          // above it (confirmed against a real screenshot). Outer `flex
          // items-center` centers the icon against the row the same way
          // `IconStat` does; inner `flex items-baseline` keeps label and
          // value aligned against *each other*, same as `IconStat`'s own
          // inner span.
          <div key={e.label} className="flex items-center gap-1.5">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500" />}
            <span className="flex items-baseline gap-1">
              <InfoTooltip inline panel={e.panel}>
                <span className="text-slate-500">{e.label}:</span>
              </InfoTooltip>
              <span>{e.value}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
