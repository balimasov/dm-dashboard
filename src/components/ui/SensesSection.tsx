import { ReactNode } from "react";
import { SKILL_ABBR } from "@/lib/types";
import { PASSIVE_INSIGHT_HINT_PANEL, PASSIVE_INVESTIGATION_HINT_PANEL } from "./combatStatHints";
import { Pill } from "./Pill";
import { SectionDivider } from "./SectionDivider";
import { SenseEntries } from "./SenseEntries";
import { SubHeading } from "./SubHeading";

/**
 * The "Senses" section — three passive-skill pills (Perception/Investigation/
 * Insight) plus the named-senses row (Darkvision, etc.) — shared between
 * `CharacterStatBlock` and `CreatureStatBlock`, byte-identical apart from
 * where the numbers/hint/sense list come from (confirmed by a UI-kit audit;
 * Investigation/Insight already shared the same hint-panel constant on both
 * sides, only Perception's hint text differs between a character and a
 * creature, so that one alone is a prop). `alwaysShow` is the one real
 * behavioral difference: `CharacterStatBlock` passes `true` so the row
 * (with a "No special senses" fallback) always renders — neighboring cards
 * in the same row line up at the same height regardless of who has
 * Darkvision; `CreatureStatBlock` leaves it at the default (hidden entirely
 * when there are no senses), since a creature card has no row of neighbors
 * to align with.
 */
export function SensesSection({
  compact = false,
  passivePerception,
  passivePerceptionPanel,
  passiveInvestigation,
  passiveInsight,
  senses,
  alwaysShow = false,
}: {
  compact?: boolean;
  passivePerception: number;
  passivePerceptionPanel: ReactNode;
  passiveInvestigation: number;
  passiveInsight: number;
  senses: Array<{ name: string; range: number }>;
  alwaysShow?: boolean;
}) {
  return (
    <SectionDivider compact={compact}>
      <SubHeading>Senses</SubHeading>
      {/* `color="box"` — these three read as ability-score-box siblings, not
          a "chip" with a meaningful hue (see `Pill`'s `COLOR_STYLES` doc
          comment for why that tone is pinned separately from `slate`). */}
      <div className="grid grid-cols-3 gap-1.5">
        <Pill panel={passivePerceptionPanel} color="box">
          {SKILL_ABBR.perception} {passivePerception}
        </Pill>
        <Pill panel={PASSIVE_INVESTIGATION_HINT_PANEL} color="box">
          {SKILL_ABBR.investigation} {passiveInvestigation}
        </Pill>
        <Pill panel={PASSIVE_INSIGHT_HINT_PANEL} color="box">
          {SKILL_ABBR.insight} {passiveInsight}
        </Pill>
      </div>
      {alwaysShow ? (
        <div className="mt-4 text-sm">
          {senses.length > 0 ? <SenseEntries senses={senses} /> : <span className="text-slate-600">No special senses</span>}
        </div>
      ) : (
        senses.length > 0 && (
          <div className="mt-4">
            <SenseEntries senses={senses} />
          </div>
        )
      )}
    </SectionDivider>
  );
}
