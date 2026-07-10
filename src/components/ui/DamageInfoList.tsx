import { InfoTooltip } from "@/components/InfoTooltip";

export interface DamageInfoEntry {
  label: string;
  value?: string;
  panel: React.ReactNode;
}

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
      {visible.map((e) => (
        // A `div`, not a `p` — the tooltip's own hint text is a `<p>`, and
        // React renders that panel into the DOM even while hidden (only its
        // `hidden`/`block` class toggles), so a `<p>` wrapper here would put
        // a `<p>` inside a `<p>` and trip a hydration mismatch (confirmed).
        <div key={e.label}>
          <InfoTooltip inline panel={e.panel}>
            <span className="text-slate-500">{e.label}:</span>
          </InfoTooltip>{" "}
          {e.value}
        </div>
      ))}
    </div>
  );
}
