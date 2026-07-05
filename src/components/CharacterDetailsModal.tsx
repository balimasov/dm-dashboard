"use client";

import { useEffect } from "react";
import {
  Character,
  Feature,
  formatModifier,
  KnownSpell,
  RECOVERY_LABELS,
  RECOVERY_SHORT_LABELS,
  RecoveryType,
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
import { SyncTimestamp } from "./SyncTimestamp";

function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrips" : `${ordinalLevel(level)} Level`;
}

/** Same dot-meter + recovery abbreviation used for Resources/Spell Slots on the main card, reused here for any Feature or Spell that turns out to have its own charge pool. */
function ChargeBadge({ current, max, recovery }: { current: number; max: number; recovery: RecoveryType }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      {max > 0 && max <= 6 ? (
        <DotMeter current={current} max={max} />
      ) : (
        <span className="text-sm font-medium text-slate-100">
          {current}/{max}
        </span>
      )}
      <span className="text-xs text-slate-500" title={RECOVERY_LABELS[recovery]}>
        {RECOVERY_SHORT_LABELS[recovery]}
      </span>
    </span>
  );
}

/** Small muted tag showing where a Feature/Spell comes from — kept separate from ChargeBadge so usage (right edge) and origin (this) never share the same slot. */
function TypeTag({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{children}</span>;
}

const CATEGORY_LABELS: Record<Feature["category"], string> = {
  race: "Race",
  class: "Class",
  subclass: "Subclass",
  feat: "Feat",
  background: "Background",
};

const CATEGORY_ORDER: Feature["category"][] = ["race", "class", "subclass", "feat", "background"];

/** Buckets a Feature list into Race/Class/Subclass/Feat/Background sub-sections (only non-empty ones, in that order), each sorted alphabetically by name. */
function groupFeaturesByCategory(features: Feature[]): Array<[Feature["category"], Feature[]]> {
  const byCategory = new Map<Feature["category"], Feature[]>();
  for (const feature of features) {
    const group = byCategory.get(feature.category) ?? [];
    group.push(feature);
    byCategory.set(feature.category, group);
  }
  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => [
    category,
    byCategory.get(category)!.sort((a, b) => a.name.localeCompare(b.name)),
  ]);
}

function SpellPanel({ spell }: { spell: KnownSpell }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-100">
        {spell.name}
        {spell.school && <span className="text-slate-500"> ({spell.school})</span>}
      </p>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {spell.source}
        {spell.components && ` · ${spell.components}`}
      </p>
      {spell.materialComponent && <p className="text-slate-500">Material: {spell.materialComponent}</p>}
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

  // Without this, touch-scrolling the modal's backdrop on mobile also scrolls
  // the dashboard page underneath it — the backdrop is `fixed`, but the body
  // behind it is still a normal scrollable document as far as the browser's
  // touch-scroll gesture is concerned.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

  const groupedVisibleFeatures = groupFeaturesByCategory(c.features.filter((f) => !f.filteredReason));
  const groupedReviewFeatures = groupFeaturesByCategory(c.features.filter((f) => f.filteredReason));
  const hasSpells = spellLevels.length > 0;
  const hasFeatures = c.features.length > 0;

  return (
    <div
      // Deliberately not `items-center`: a flex container that centers an
      // overflowing child clips the excess at the *start* with no way to
      // scroll to it (scrollTop can't go negative) — confirmed on a real
      // Sorcerer with 22 spells/18 features, where this hid the header and
      // close button above the viewport with no way to reach them. Top
      // alignment always keeps the start of the content reachable at
      // scrollTop 0, at the cost of short modals sitting near the top
      // instead of dead center.
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]"
      onClick={onClose}
    >
      <div
        className="my-4 flex w-full max-w-4xl flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/40"
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

        {/* Sync — same block as the main card's footer, so this modal doesn't hide whether the data on screen is fresh. */}
        {!c.synced && c.dndBeyondUrl && (
          <div className="rounded-md border border-amber-900 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
            Not synced with D&D Beyond — fill in manually.
          </div>
        )}
        {c.dndBeyondUrl && (
          <div className="text-xs">
            <a href={c.dndBeyondUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
              D&D Beyond ↗
            </a>
            {c.lastSyncedAt && (
              <span className="ml-2 text-slate-500">
                Synced: <SyncTimestamp iso={c.lastSyncedAt} />
              </span>
            )}
          </div>
        )}

        {/* Skills — full width, since wrapped chips make better use of a wide row than a half-width column would */}
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((skill) => {
              const color = skill.expertise
                ? "amber"
                : skill.proficient
                  ? "sky"
                  : skill.halfProficiency
                    ? "teal"
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

        {/* Spells and Features and Traits run side by side on wide screens (each can get long on its own) instead of always stacking, which was pushing the modal well past the viewport height. */}
        {(hasSpells || hasFeatures) && (
          <div className={`grid grid-cols-1 gap-4 ${hasSpells && hasFeatures ? "lg:grid-cols-2" : ""}`}>
            {hasSpells && (
              <div className="border-t border-slate-800 pt-3">
                <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Spells</h3>
                <div className="space-y-3">
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
                              <div key={spell.id} className="flex items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 text-slate-300">
                                  <InfoTooltip panel={<SpellPanel spell={spell} />}>{spell.name}</InfoTooltip>
                                </span>
                                {spell.components && <TypeTag>{spell.components}</TypeTag>}
                                {spell.max !== undefined && (
                                  <ChargeBadge current={spell.current!} max={spell.max} recovery={spell.recovery!} />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasFeatures && (
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-slate-500">Features and Traits</h3>
                {groupedVisibleFeatures.map(([category, features]) => (
                  <div key={category} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-600">{CATEGORY_LABELS[category]}</p>
                    {features.map((feature) => (
                      <div key={feature.id} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 text-slate-300">
                          <InfoTooltip panel={<FeaturePanel feature={feature} />}>{feature.name}</InfoTooltip>
                        </span>
                        {feature.max !== undefined && (
                          <ChargeBadge current={feature.current!} max={feature.max} recovery={feature.recovery!} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Temporary review area: not a permanent UI, just surfacing the new filter heuristics
                    (ability-score bumps, subclass-choice announcements, rulebook boilerplate, Sense
                    duplicates) separately so they can be checked against real characters before those
                    heuristics start dropping entries outright. */}
                {groupedReviewFeatures.length > 0 && (
                  <div className="mt-3 border-t border-dashed border-slate-700 pt-2 space-y-2">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-600">
                      Filtered out for review (not shown on the main card)
                    </p>
                    {groupedReviewFeatures.map(([category, features]) => (
                      <div key={category} className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-slate-700">{CATEGORY_LABELS[category]}</p>
                        {features.map((feature) => (
                          <div key={feature.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="min-w-0 flex-1">
                              <InfoTooltip panel={<FeaturePanel feature={feature} />}>{feature.name}</InfoTooltip>
                            </span>
                            <span className="whitespace-nowrap italic">{feature.filteredReason}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!hasSpells && !hasFeatures && (
          <p className="border-t border-slate-800 pt-3 text-sm text-slate-500">
            No spells or features on record yet — sync with D&D Beyond or add them on the edit page.
          </p>
        )}
      </div>
    </div>
  );
}
