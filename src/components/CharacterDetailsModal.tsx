"use client";

import { useState, useEffect } from "react";
import {
  abilityModifier,
  Character,
  Feature,
  formatModifier,
  KnownSpell,
  proficiencyBonus,
  RECOVERY_LABELS,
  RECOVERY_SHORT_LABELS,
  RecoveryType,
  savingThrowBonus,
  SKILL_ABBR,
  SKILL_LABELS,
  SkillProficiency,
  skillBonus,
  SkillName,
} from "@/lib/types";
import {
  CharacterHeader,
  HpBar,
  InitiativeIcon,
  ordinalLevel,
  Pill,
  ProficiencyIcon,
  ShieldIcon,
  SkillPanel,
  SpeedIcon,
  STAT_ORDER,
  StatBox,
  StatusRail,
} from "./CharacterCard";
import { DotMeter } from "./ResourceMeter";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";
import { SyncTimestamp } from "./SyncTimestamp";
import { getSenseInfo } from "@/lib/senseInfo";

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

const GROUP_LABELS: Record<Feature["group"], string> = {
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  special: "Special",
  other: "Other",
};

const GROUP_ORDER: Feature["group"][] = ["action", "bonusAction", "reaction", "special", "other"];

/** Buckets a Feature list into Action/Bonus Action/Reaction/Special/Other sub-sections (only non-empty ones, in that order), each sorted alphabetically by name — mirrors D&D Beyond's own Actions tab grouping instead of a custom "is this useful" heuristic. */
function groupFeaturesByGroup(features: Feature[]): Array<[Feature["group"], Feature[]]> {
  const byGroup = new Map<Feature["group"], Feature[]>();
  for (const feature of features) {
    const list = byGroup.get(feature.group) ?? [];
    list.push(feature);
    byGroup.set(feature.group, list);
  }
  return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => [
    group,
    byGroup.get(group)!.sort((a, b) => a.name.localeCompare(b.name)),
  ]);
}

const ORIGIN_LABELS: Record<Feature["originType"], string> = {
  species: "Species Traits",
  class: "Class Features",
  feat: "Feat Features",
  background: "Background Feature",
};

const ORIGIN_ORDER: Feature["originType"][] = ["feat", "class", "background", "species"];

/** Same idea as `groupFeaturesByGroup`, one level down — only used for the "Other" bucket, which mirrors D&D Beyond's separate Features & Traits tab (grouped by where a feature comes from) rather than the Actions-tab-style groups above. Action/Bonus Action/Reaction/Special stay flat since those lists are already short. */
function groupFeaturesByOrigin(features: Feature[]): Array<[Feature["originType"], Feature[]]> {
  const byOrigin = new Map<Feature["originType"], Feature[]>();
  for (const feature of features) {
    const list = byOrigin.get(feature.originType) ?? [];
    list.push(feature);
    byOrigin.set(feature.originType, list);
  }
  return ORIGIN_ORDER.filter((origin) => byOrigin.has(origin)).map((origin) => [
    origin,
    byOrigin.get(origin)!.sort((a, b) => a.name.localeCompare(b.name)),
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

function FlameIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M12 2.5c-2.2 3-4.5 5.5-4.5 9a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.6-1.2-3.6.3 2-.8 3.3-2 3.3-1.1 0-1.8-.9-1.8-2 0-2.2 1.8-3.6.5-6.7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Toggling this marks an ability as a reminder the DM wants to flag for the
 * player (players forget they have a spell/skill) — a lit flame icon plus
 * amber row color, persisted on the character (see `flaggedAbilities`) so it
 * survives a page reload, not just component state.
 */
function FlameToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Remove reminder" : "Flag as a reminder"}
      aria-pressed={active}
      title={active ? "Remove reminder" : "Flag as a reminder"}
      className={`shrink-0 rounded p-0.5 ${active ? "text-amber-400" : "text-slate-600 hover:text-amber-400"}`}
    >
      <FlameIcon className="h-3.5 w-3.5" filled={active} />
    </button>
  );
}

function FeatureRow({ feature, flagged, onToggleFlag }: { feature: Feature; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FlameToggle active={flagged} onToggle={onToggleFlag} />
      <span className={`min-w-0 flex-1 ${flagged ? "text-amber-300" : "text-slate-300"}`}>
        <InfoTooltip panel={<FeaturePanel feature={feature} />}>{feature.name}</InfoTooltip>
      </span>
      {feature.max !== undefined && <ChargeBadge current={feature.current!} max={feature.max} recovery={feature.recovery!} />}
    </div>
  );
}

type DetailsTab = "features" | "spells";

export function CharacterDetailsModal({
  character,
  onClose,
  onUpdate,
}: {
  character: Character;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
}) {
  const c = character;

  const flaggedAbilities = c.flaggedAbilities ?? [];
  function toggleFlag(name: string) {
    const next = flaggedAbilities.includes(name)
      ? flaggedAbilities.filter((n) => n !== name)
      : [...flaggedAbilities, name];
    onUpdate?.(c.id, { flaggedAbilities: next });
  }

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

  const isDown = c.combat.hp <= 0;
  const hasDamageInfo = c.resistances.length + c.immunities.length + c.vulnerabilities.length > 0;

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

  const groupedFeatures = groupFeaturesByGroup(c.features);
  const hasSpells = spellLevels.length > 0;
  const hasFeatures = c.features.length > 0;

  const tabs: Array<{ key: DetailsTab; label: string }> = [
    ...(hasFeatures ? [{ key: "features" as const, label: "Features and Traits" }] : []),
    ...(hasSpells ? [{ key: "spells" as const, label: "Spells" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<DetailsTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

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
      className="scrollbar-themed fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]"
      onClick={onClose}
    >
      <div
        className="relative my-4 flex w-full max-w-lg flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusRail
          conditions={c.combat.conditions}
          exhaustion={c.combat.exhaustion}
          concentrating={Boolean(c.concentrating)}
          onToggleConcentration={onUpdate ? () => onUpdate(c.id, { concentrating: !c.concentrating }) : undefined}
          sticky
        />

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

        {/* Combat state — same block as the main card, so this modal is a superset of it rather than a different view. */}
        <div className="border-t border-slate-800 pt-3">
          <HpBar
            hp={c.combat.hp}
            maxHp={c.combat.maxHp}
            tempHp={c.combat.tempHp}
            isDown={isDown}
            deathSaves={c.combat.deathSaves}
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              AC {c.combat.ac}
            </span>
            <span className="flex items-center gap-1.5 pl-2">
              <SpeedIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              Speed {c.combat.speed}ft
            </span>
            <span className="flex items-center gap-1.5">
              <InitiativeIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              Initiative {formatModifier(c.initiative)}
            </span>
            <span className="flex items-center gap-1.5 pl-2">
              <ProficiencyIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <InfoTooltip
                  panel={
                    <p>Proficiency Bonus — added to attack rolls, saving throws, and skill checks you&apos;re proficient in.</p>
                  }
                >
                  Prof {formatModifier(proficiencyBonus(c.level))}
                </InfoTooltip>
              </span>
            </span>
          </div>
        </div>

        {/* Senses — same block as the main card. */}
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Senses</h3>
          <div className="grid grid-cols-3 gap-1.5">
            <Pill panel={<p>Passive Perception — the score a hidden creature or object must beat to avoid your notice; also what Stealth checks are rolled against.</p>}>
              {SKILL_ABBR.perception} {c.combat.passivePerception}
            </Pill>
            <Pill panel={<p>Passive Investigation — used to notice details or work out clues without an active search.</p>}>
              {SKILL_ABBR.investigation} {c.combat.passiveInvestigation}
            </Pill>
            <Pill panel={<p>Passive Insight — used to sense deception or read intentions without rolling.</p>}>
              {SKILL_ABBR.insight} {c.combat.passiveInsight}
            </Pill>
          </div>
          {c.senses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
              {c.senses.map((s) => {
                const info = getSenseInfo(s.name);
                const label = (
                  <>
                    <span className="text-slate-500">{s.name}:</span> {s.range} ft
                  </>
                );
                return (
                  <span key={s.name}>{info ? <InfoTooltip panel={<p>{info}</p>}>{label}</InfoTooltip> : label}</span>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats — same block as the main card. */}
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Stats</h3>
          <div className="grid grid-cols-6 gap-1.5">
            {STAT_ORDER.map((key) => (
              <StatBox key={key} label={key.toUpperCase()} value={formatModifier(abilityModifier(c.stats[key]))} />
            ))}
          </div>
        </div>

        {/* Saving Throws — same block as the main card. */}
        <div>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Saving Throws</h3>
          <div className="grid grid-cols-6 gap-1.5">
            {STAT_ORDER.map((key) => (
              <StatBox
                key={key}
                label={key.toUpperCase()}
                value={formatModifier(savingThrowBonus(c, key))}
                highlight={c.savingThrowProficiencies.includes(key)}
              />
            ))}
          </div>
        </div>

        {/* Resistances / Immunities / Vulnerabilities — same block as the main card. */}
        {hasDamageInfo && (
          <div className="space-y-1 text-sm text-slate-300">
            {c.resistances.length > 0 && (
              <p>
                <span className="text-slate-500">Resist:</span> {c.resistances.join(", ")}
              </p>
            )}
            {c.immunities.length > 0 && (
              <p>
                <span className="text-slate-500">Immune:</span> {c.immunities.join(", ")}
              </p>
            )}
            {c.vulnerabilities.length > 0 && (
              <p>
                <span className="text-slate-500">Vulnerable:</span> {c.vulnerabilities.join(", ")}
              </p>
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

        {/* Features and Traits / Spells — tabbed instead of side-by-side columns so
            each reads as a single, comfortably narrow list. Only characters with
            more than one populated tab get a tab switcher; a martial character
            with no spells just sees Features and Traits directly, no empty Spells
            tab to click into. More tabs (e.g. Inventory) can slot in here later. */}
        {tabs.length > 0 && (
          <div className="border-t border-slate-800 pt-3">
            {tabs.length > 1 && (
              <div className="mb-3 flex gap-1 rounded-lg bg-slate-800/60 p-1 text-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 rounded-md px-2 py-1 font-medium transition-colors ${
                      currentTab === tab.key ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {currentTab === "features" && (
              <div className="space-y-3">
                {groupedFeatures.map(([group, features], index) =>
                  group === "other" ? (
                    // The "other" bucket sub-groups by origin instead of a flat
                    // list — mirrors D&D Beyond's separate Features & Traits tab
                    // (Species Traits/Class Features/Feat Features/Background
                    // Feature) rather than the Actions-tab-style groups above.
                    // Only divided from those when there actually are any
                    // (index > 0) — a character with no Action/Bonus Action/
                    // Reaction/Special entries has nothing above to separate from.
                    <div
                      key={group}
                      className={`space-y-3 ${index > 0 ? "border-t border-slate-800 pt-3" : ""}`}
                    >
                      {groupFeaturesByOrigin(features).map(([origin, originFeatures]) => (
                        <div key={origin} className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-600">{ORIGIN_LABELS[origin]}</p>
                          {originFeatures.map((feature) => (
                            <FeatureRow
                              key={feature.id}
                              feature={feature}
                              flagged={flaggedAbilities.includes(feature.name)}
                              onToggleFlag={() => toggleFlag(feature.name)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div key={group} className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-600">{GROUP_LABELS[group]}</p>
                      {features.map((feature) => (
                        <FeatureRow
                          key={feature.id}
                          feature={feature}
                          flagged={flaggedAbilities.includes(feature.name)}
                          onToggleFlag={() => toggleFlag(feature.name)}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {currentTab === "spells" && (
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
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-600">{spellLevelLabel(level)}</p>
                        {slot &&
                          (slot.max > 0 && slot.max <= 6 ? (
                            <DotMeter current={slot.current} max={slot.max} colorClass="bg-violet-400" />
                          ) : (
                            <span className="text-sm font-medium text-slate-100">
                              {slot.current}/{slot.max}
                            </span>
                          ))}
                      </div>
                      <div className="mt-1 space-y-1">
                        {(spellsByLevel.get(level) ?? [])
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((spell) => {
                            const flagged = flaggedAbilities.includes(spell.name);
                            return (
                              <div key={spell.id} className="flex items-center gap-2 text-sm">
                                <FlameToggle active={flagged} onToggle={() => toggleFlag(spell.name)} />
                                <span className={`min-w-0 flex-1 ${flagged ? "text-amber-300" : "text-slate-300"}`}>
                                  <InfoTooltip panel={<SpellPanel spell={spell} />}>{spell.name}</InfoTooltip>
                                </span>
                                {spell.components && <TypeTag>{spell.components}</TypeTag>}
                                {spell.max !== undefined && (
                                  <ChargeBadge current={spell.current!} max={spell.max} recovery={spell.recovery!} />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tabs.length === 0 && (
          <p className="border-t border-slate-800 pt-3 text-sm text-slate-500">
            No spells or features on record yet — sync with D&D Beyond or add them on the edit page.
          </p>
        )}
      </div>
    </div>
  );
}
