import { SKILL_ABILITY, SKILL_DESCRIPTIONS, SKILL_LABELS, SkillProficiency } from "@/lib/types";
import { HintPanel } from "./ui/HintPanel";

export function SkillPanel({ skill }: { skill: SkillProficiency }) {
  const advantageLabel =
    skill.advantage === "advantage" ? "Advantage" : skill.advantage === "disadvantage" ? "Disadvantage" : null;
  return (
    <HintPanel
      title={
        <>
          {SKILL_LABELS[skill.name]} <span className="text-slate-500">({SKILL_ABILITY[skill.name].toUpperCase()})</span>
        </>
      }
      description={
        <>
          <span className="block">{SKILL_DESCRIPTIONS[skill.name]}</span>
          {advantageLabel && (
            <span className={`block ${advantageLabel === "Advantage" ? "text-emerald-400" : "text-red-400"}`}>
              {advantageLabel}
              {skill.advantageNote ? `: ${skill.advantageNote}` : ""}
            </span>
          )}
        </>
      }
    />
  );
}
