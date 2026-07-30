import { SKILL_ABILITY, SKILL_DESCRIPTIONS, SKILL_LABELS, SkillProficiency } from "@/lib/types";
import { AdvantageLine } from "./ui/AdvantageLine";
import { HintPanel } from "./ui/HintPanel";

export function SkillPanel({ skill }: { skill: SkillProficiency }) {
  return (
    <HintPanel
      title={
        <>
          {SKILL_LABELS[skill.name]} <span className="text-slate-500">({SKILL_ABILITY[skill.name].toUpperCase()})</span>
        </>
      }
      description={SKILL_DESCRIPTIONS[skill.name]}
      footer={
        skill.advantage && (
          <AdvantageLine kind={skill.advantage}>
            <b className="text-slate-100">{skill.advantage === "advantage" ? "Advantage" : "Disadvantage"}</b>
            {skill.advantageNote ? ` — ${skill.advantageNote}` : ""}
          </AdvantageLine>
        )
      }
    />
  );
}
