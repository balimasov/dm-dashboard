"use client";

import { useEffect } from "react";
import {
  Character,
  Feature,
  formatModifier,
  KnownSpell,
  SKILL_ABBR,
  SKILL_LABELS,
  SkillProficiency,
  skillBonus,
  SkillName,
} from "@/lib/types";
import { CharacterHeader, ordinalLevel, Pill, SkillPanel, StatBox } from "./CharacterCard";
import { DotMeter } from "./ResourceMeter";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";

function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrips" : `${ordinalLevel(level)} Level`;
}

function SpellPanel({ spell }: { spell: KnownSpell }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">
        {spell.name}
        {spell.school && <span className="text-slate-500"> ({spell.school})</span>}
      </p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{spell.source}</p>
      {spell.description && (
        <p>
          <RichText text={spell.description} />
        </p>
      )}
    </div>
  );
}

function FeaturePanel({ feature }: { feature: Feature }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">{feature.name}</p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{feature.source}</p>
      {feature.description && (
        <p>
          <RichText text={feature.description} />
        </p>
      )}
    </div>
  );
}

export function CharacterDetailsModal({ character, onClose }: { character: Character; onClose: () => void }) {
  const c = character;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const allSkills: SkillProficiency[] = (Object.keys(SKILL_LABELS) as SkillName[])
    .map((name) => c.skillProficiencies.find((s) => s.name === name) ?? { name, proficient: false, expertise: false })
    .sort((a, b) => SKILL_LABELS[a.name].localeCompare(SKILL_LABELS[b.name]));

  const spellsByLevel = new Map<number, KnownSpell[]>();
  for (const spell of c.knownSpells) {
    const list = spellsByLevel.get(spell.level) ?? [];
    list.push(spell);
    spellsByLevel.set(spell.level, list);
  }
  const spellLevels = Array.from(spellsByLevel.keys()).sort((a, b) => a - b);

  const sortedFeatures = c.features.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable] sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-4 flex w-full max-w-lg flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <CharacterHeader character={c} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Skills */}
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((skill) => {
              const color = skill.expertise
                ? "amber"
                : skill.proficient
                  ? "sky"
                  : skill.halfProficiency
                    ? "cyan"
                    : "slate";
              return (
                <Pill key={skill.name} panel={<SkillPanel skill={skill} />} color={color}>
                  {formatModifier(skillBonus(c, skill))} {SKILL_ABBR[skill.name]}
                  {skill.advantage === "advantage" && <span className="ml-0.5 text-emerald-400">▲</span>}
                  {skill.advantage === "disadvantage" && <span className="ml-0.5 text-red-400">▼</span>}
                </Pill>
              );
            })}
          </div>
        </div>

        {/* Spells */}
        {spellLevels.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h3 className="text-xs uppercase tracking-wide text-slate-500 -mb-1.5">Spells</h3>
            {c.spellcasting && (
              <div className="grid grid-cols-3 gap-1.5">
                <StatBox label="Modifier" value={formatModifier(c.spellcasting.modifier)} />
                <StatBox label="Attack" value={formatModifier(c.spellcasting.attack)} />
                <StatBox label="Save DC" value={String(c.spellcasting.saveDc)} />
              </div>
            )}
            {spellLevels.map((level) => {
              const slot = c.spellSlots.find((s) => s.level === level);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">{spellLevelLabel(level)}</span>
                    {slot &&
                      (slot.max > 0 && slot.max <= 6 ? (
                        <DotMeter current={slot.current} max={slot.max} colorClass="bg-violet-400" />
                      ) : (
                        <span className="font-medium text-slate-100">
                          {slot.current}/{slot.max}
                        </span>
                      ))}
                  </div>
                  <div className="mt-1 space-y-1">
                    {(spellsByLevel.get(level) ?? [])
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((spell) => (
                        <div key={spell.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 flex-1 text-slate-300">
                            <InfoTooltip panel={<SpellPanel spell={spell} />}>{spell.name}</InfoTooltip>
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features and Traits */}
        {sortedFeatures.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-1.5">
            <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Features and Traits</h3>
            {sortedFeatures.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 text-slate-300">
                  <InfoTooltip panel={<FeaturePanel feature={feature} />}>{feature.name}</InfoTooltip>
                </span>
                <span className="whitespace-nowrap text-xs text-slate-500">{feature.source}</span>
              </div>
            ))}
          </div>
        )}

        {sortedFeatures.length === 0 && spellLevels.length === 0 && (
          <p className="border-t border-slate-800 pt-3 text-sm text-slate-500">
            No spells or features on record yet — sync with D&D Beyond or add them on the edit page.
          </p>
        )}
      </div>
    </div>
  );
}
