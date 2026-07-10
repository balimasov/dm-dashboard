import { InfoTooltip } from "@/components/InfoTooltip";
import { getSenseInfo } from "@/lib/senseInfo";

/**
 * The flex-wrap row of named senses (Darkvision: 60 ft, Blindsight: 30 ft...)
 * shown under the passive-skill pills — shared between a character's
 * structured `Sense[]` and a creature's stat block, which only has this same
 * shape once its free-text Senses line has been parsed back into it. The
 * hint anchors to the sense's name only, not the range next to it.
 */
export function SenseEntries({ senses }: { senses: Array<{ name: string; range: number }> }) {
  if (senses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
      {senses.map((s) => {
        const info = getSenseInfo(s.name);
        const nameLabel = <span className="text-slate-500">{s.name}:</span>;
        return (
          <span key={s.name} className="flex items-baseline gap-1">
            {info ? <InfoTooltip panel={<p>{info}</p>}>{nameLabel}</InfoTooltip> : nameLabel}
            <span>{s.range} ft</span>
          </span>
        );
      })}
    </div>
  );
}
