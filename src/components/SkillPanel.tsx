import { SKILL_ABILITY, SKILL_DESCRIPTIONS, SKILL_LABELS, SkillProficiency } from "@/lib/types";

export function SkillPanel({ skill }: { skill: SkillProficiency }) {
  const advantageLabel =
    skill.advantage === "advantage" ? "Advantage" : skill.advantage === "disadvantage" ? "Disadvantage" : null;
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">
        {SKILL_LABELS[skill.name]} <span className="text-slate-500">({SKILL_ABILITY[skill.name].toUpperCase()})</span>
      </p>
      <p>{SKILL_DESCRIPTIONS[skill.name]}</p>
      {advantageLabel && (
        <p className={advantageLabel === "Advantage" ? "text-emerald-400" : "text-red-400"}>
          {advantageLabel}
          {skill.advantageNote ? `: ${skill.advantageNote}` : ""}
        </p>
      )}
    </div>
  );
}
