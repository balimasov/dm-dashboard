"use client";

import { useState } from "react";
import {
  Attack,
  Character,
  CustomConditionTemplate,
  Feature,
  InventoryItem,
  KnownSpell,
  RARITY_COLOR,
  RecoveryType,
  SKILL_ABBR,
  SKILL_LABELS,
  SkillProficiency,
  SkillName,
  STAT_ORDER,
} from "@/lib/types";
import { advantagesHeading, parseAdvantageEntry } from "@/lib/advantages";
import { abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus } from "@/lib/characterMath";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { formatModifier, ordinalLevel } from "@/lib/format";
import { dedupeInventoryItems, groupConsumablesByType } from "@/lib/partyToolkit";
import { characterReminders } from "@/lib/reminders";
import { characterSyncIssue } from "@/lib/sync";
import { AiAssistantModal } from "./AiAssistantModal";
import { CharacterHeader } from "./CharacterHeader";
import { EditCharacterModal } from "./EditCharacterModal";
import { SkillPanel } from "./SkillPanel";
import { AskAiPill } from "./ui/AskAiPill";
import { AttackName, AttackTrailing } from "./ui/AttackDisplay";
import { ConsumableQuantity } from "./ui/ConsumableQuantity";
import { TOOLBAR_SHELL_CLS } from "./ui/containerStyles";
import { DamageInfoList } from "./ui/DamageInfoList";
import { FlaggableRow } from "./ui/FlaggableRow";
import { HpBar } from "./ui/HpBar";
import { IconButton } from "./ui/IconButton";
import { IconStat } from "./ui/IconStat";
import { InitiativeIcon, LanguageIcon, ProficiencyIcon, ShieldIcon, SpeedIcon, ToolIcon } from "./ui/icons";
import {
  AC_HINT_PANEL,
  IMMUNE_HINT_PANEL,
  INITIATIVE_HINT_PANEL,
  LANGUAGES_HINT_PANEL,
  PASSIVE_INSIGHT_HINT_PANEL,
  PASSIVE_INVESTIGATION_HINT_PANEL,
  PASSIVE_PERCEPTION_HINT_PANEL,
  PROFICIENCY_HINT_PANEL,
  RESIST_HINT_PANEL,
  SPEED_HINT_PANEL,
  TOOLS_HINT_PANEL,
  VULNERABLE_HINT_PANEL,
} from "./ui/combatStatHints";
import { ItemHintPanel } from "./ui/ItemHintPanel";
import { NotesSection } from "./ui/NotesSection";
import { Pill } from "./ui/Pill";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { RecoveryBadge, recoveryStatusLine } from "./ui/RecoveryBadge";
import { ReminderBadge } from "./ui/ReminderBadge";
import { SectionDivider } from "./ui/SectionDivider";
import { SenseEntries } from "./ui/SenseEntries";
import { Modal } from "./ui/Modal";
import { AbilityScoreBox } from "./ui/AbilityScoreBox";
import { AbilityScoreHintPanel } from "./ui/AbilityScoreHintPanel";
import { StatBox } from "./ui/StatBox";
import { StatusRail } from "./ui/StatusRail";
import { SyncIssuePill } from "./ui/SyncIssuePill";
import { SyncStatusChip } from "./ui/SyncStatusChip";
import { SubHeading } from "./ui/SubHeading";
import { MICRO_ITEM_LABEL_CLS, MUTED_BODY_CLS } from "./ui/typography";
import { useDdbSync } from "@/hooks/useDdbSync";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { DotMeter, ResourceTrackerBar, averageOverallPercent } from "./ResourceMeter";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { InfoTooltip } from "./InfoTooltip";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { SpellBadges, SpellHintPanel, SpellTrailing } from "./ui/SpellDisplay";
import { TabBar } from "./ui/TabBar";

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
      <RecoveryBadge recovery={recovery} />
    </span>
  );
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

function FeatureRow({ feature, flagged, onToggleFlag }: { feature: Feature; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <FlaggableRow
      flagged={flagged}
      onToggleFlag={onToggleFlag}
      trailing={feature.max !== undefined && <ChargeBadge current={feature.current!} max={feature.max} recovery={feature.recovery!} />}
    >
      <InfoTooltip
        panel={
          <AbilityHintPanel
            name={feature.name}
            metaLines={[feature.source]}
            status={feature.max !== undefined && recoveryStatusLine(feature.recovery!, feature.current, feature.max)}
            description={feature.description}
          />
        }
      >
        {feature.name}
      </InfoTooltip>
    </FlaggableRow>
  );
}

/** One weapon attack, flaggable like any Feature/Spell — the actual row visuals (name/hint, bonus/damage/mastery) are shared with Party Toolkit's grouped Weapons list and Reminders via `AttackName`/`AttackTrailing`. */
function AttackRow({ attack, flagged, onToggleFlag }: { attack: Attack; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <FlaggableRow flagged={flagged} onToggleFlag={onToggleFlag} trailing={<AttackTrailing attack={attack} />}>
      <AttackName attack={attack} />
    </FlaggableRow>
  );
}

/** One consumable item, flaggable like any Feature/Spell/Weapon — same rarity-colored name + title/weight/cost/description hint every item hint in the app uses, with the remaining count as the trailing content instead of a `ChargeBadge` (a consumable doesn't recover, it just runs out). */
function ConsumableRow({ item, flagged, onToggleFlag }: { item: InventoryItem; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <FlaggableRow flagged={flagged} onToggleFlag={onToggleFlag} trailing={<ConsumableQuantity quantity={item.quantity} />}>
      <InfoTooltip
        panel={<ItemHintPanel name={item.name} rarity={item.rarity} weight={item.weight} cost={item.cost} description={item.description} />}
      >
        <span className={RARITY_COLOR[item.rarity]}>{item.name}</span>
      </InfoTooltip>
    </FlaggableRow>
  );
}

type DetailsTab = "weapons" | "features" | "spells" | "consumables";

export function CharacterDetailsModal({
  character,
  onClose,
  onUpdate,
  onRemove,
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  character: Character;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  onRemove?: (id: string) => void;
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const c = character;
  const { syncing, sync } = useDdbSync(c, onUpdate);
  const syncIssue = characterSyncIssue(c);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const flaggedAbilities = c.flaggedAbilities ?? [];
  function toggleFlag(name: string) {
    const next = flaggedAbilities.includes(name)
      ? flaggedAbilities.filter((n) => n !== name)
      : [...flaggedAbilities, name];
    onUpdate?.(c.id, { flaggedAbilities: next });
  }

  useEscapeToClose(onClose);

  useScrollLock();

  const isDown = c.combat.hp <= 0;

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
  const sortedAttacks = c.attacks.slice().sort((a, b) => a.name.localeCompare(b.name));
  const hasAttacks = sortedAttacks.length > 0;
  const hasSpells = spellLevels.length > 0;
  const hasFeatures = c.features.length > 0;
  const consumables = dedupeInventoryItems(c.inventory.filter((item) => item.category === "Consumable"));
  const consumableGroups = groupConsumablesByType(consumables);
  const hasConsumables = consumables.length > 0;

  const tabs: Array<{ key: DetailsTab; icon: string; text: string }> = [
    ...(hasAttacks ? [{ key: "weapons" as const, icon: CONTENT_KIND_ICON.weapons, text: "Weapons" }] : []),
    ...(hasFeatures ? [{ key: "features" as const, icon: CONTENT_KIND_ICON.features, text: "Features" }] : []),
    ...(hasSpells ? [{ key: "spells" as const, icon: CONTENT_KIND_ICON.spells, text: "Spells" }] : []),
    ...(hasConsumables ? [{ key: "consumables" as const, icon: CONTENT_KIND_ICON.consumables, text: "Consumables" }] : []),
  ];
  const [activeTab, setActiveTab] = useState<DetailsTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <>
    {/* Deliberately not `items-center`: a flex container that centers an
        overflowing child clips the excess at the *start* with no way to
        scroll to it (scrollTop can't go negative) — confirmed on a real
        Sorcerer with 22 spells/18 features, where this hid the header and
        close button above the viewport with no way to reach them. Top
        alignment always keeps the start of the content reachable at
        scrollTop 0, at the cost of short modals sitting near the top
        instead of dead center. */}
    <Modal
      variant="scrollable"
      onClose={onClose}
      header={
        <>
          <StatusRail
            conditions={c.combat.conditions}
            exhaustion={c.combat.exhaustion}
            concentrating={Boolean(c.concentrating)}
            heroicInspiration={c.heroicInspiration}
            customConditionIds={c.combat.customConditionIds ?? []}
            customConditionLibrary={customConditionLibrary}
            onToggleConcentration={onUpdate ? () => onUpdate(c.id, { concentrating: !c.concentrating }) : undefined}
            onCustomConditionIdsChange={
              onUpdate ? (customConditionIds) => onUpdate(c.id, { combat: { ...c.combat, customConditionIds } }) : undefined
            }
            onCustomConditionLibraryChange={onCustomConditionLibraryChange}
          />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CharacterHeader character={c} />
            </div>
            <IconButton onClick={onClose} aria-label="Close">
              ✕
            </IconButton>
          </div>
        </>
      }
      panelClassName={`relative my-4 w-full max-w-lg gap-3.5 p-3.5 shadow-2xl shadow-black/40 ${
        c.concentrating
          ? "concentrating-ring border-violet-500 bg-slate-950 bg-gradient-to-b from-violet-950/60 to-slate-950"
          : "border-slate-800 bg-slate-950"
      }`}
    >
        {/* D&D Beyond link lives inline on the header's "Lvl N" line now (see
            `CharacterHeader`), and any sync problem shows as the toolbar's
            own `SyncIssuePill` below plus the header's avatar-corner dot —
            no separate banner needed here anymore (see `CharacterCard`'s own
            comment on the redundant amber banner this replaced). */}

        {/* Reminder/AI/kebab — same bordered toolbar as the compact card's
            own row (`CharacterCard`), not a bare flex row — this modal is a
            superset of the card, not a different view of the same actions.
            `-mb-2` trims the leftover gap the same way — see that file's
            own comment. */}
        <div className={`-mx-2 -mb-2 flex items-center gap-1.5 px-2 py-1.5 ${TOOLBAR_SHELL_CLS}`}>
          <AskAiPill onClick={() => setAiOpen(true)} />
          <SyncStatusChip dndBeyondUrl={c.dndBeyondUrl} syncing={syncing} lastSyncedAt={c.lastSyncedAt} />
          <ReminderBadge
            group={characterReminders(c)}
            onRemove={onUpdate ? (name) => onUpdate(c.id, { flaggedAbilities: flaggedAbilities.filter((n) => n !== name) }) : undefined}
          />
          {syncIssue && (
            <SyncIssuePill
              label={syncIssue.label}
              message={syncIssue.message}
              onRetry={onUpdate ? sync : undefined}
              syncing={syncing}
            />
          )}
          <div className="ml-auto">
            <EntityActionsMenu
              onEdit={() => setEditOpen(true)}
              name={c.name}
              hidden={c.hidden}
              onToggleHidden={onUpdate ? () => onUpdate(c.id, { hidden: !c.hidden }) : undefined}
              linkUrl={c.dndBeyondUrl}
              linkLabel="Open D&D Beyond"
              onSync={onUpdate && c.dndBeyondUrl ? sync : undefined}
              syncing={syncing}
              onRemove={onRemove ? () => onRemove(c.id) : undefined}
            />
          </div>
        </div>

        {/* Combat state — same block as the main card (no divider above it, matching the card's own spacing between this and the sync block), so this modal is a superset of it rather than a different view. */}
        <div>
          <HpBar
            hp={c.combat.hp}
            maxHp={c.combat.maxHp}
            tempHp={c.combat.tempHp}
            isDown={isDown}
            deathSaves={c.combat.deathSaves}
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm text-slate-300">
            <IconStat
              icon={<ShieldIcon className="h-4 w-4 shrink-0 text-slate-500" />}
              panel={AC_HINT_PANEL}
              label="AC"
            >
              {c.combat.ac}
            </IconStat>
            <IconStat
              className="pl-4"
              icon={<SpeedIcon className="h-4 w-4 shrink-0 text-slate-500" />}
              panel={SPEED_HINT_PANEL}
              label="Speed"
            >
              {c.combat.speed}ft
            </IconStat>
            <IconStat
              icon={<InitiativeIcon className="h-4 w-4 shrink-0 text-slate-500" />}
              panel={INITIATIVE_HINT_PANEL}
              label="Initiative"
            >
              {formatModifier(c.initiative)}
            </IconStat>
            <IconStat
              className="pl-4"
              icon={<ProficiencyIcon className="h-4 w-4 shrink-0 text-slate-500" />}
              panel={PROFICIENCY_HINT_PANEL}
              label="Prof"
            >
              {formatModifier(proficiencyBonus(c.level))}
            </IconStat>
            {c.languages.length > 0 && (
              <IconStat
                className="col-span-2"
                icon={<LanguageIcon className="h-4 w-4 shrink-0 text-slate-500" />}
                panel={LANGUAGES_HINT_PANEL}
                label="Languages"
                valueTitle={c.languages.join(", ")}
              >
                {c.languages.join(", ")}
              </IconStat>
            )}
            {c.toolProficiencies.length > 0 && (
              <IconStat
                className="col-span-2"
                icon={<ToolIcon className="h-4 w-4 shrink-0 text-slate-500" />}
                panel={TOOLS_HINT_PANEL}
                label="Tools"
                valueTitle={c.toolProficiencies.join(", ")}
              >
                {c.toolProficiencies.join(", ")}
              </IconStat>
            )}
          </div>
        </div>

        {/* Senses — same block as the main card. */}
        <SectionDivider compact>
          <SubHeading>Senses</SubHeading>
          <div className="grid grid-cols-3 gap-1.5">
            <Pill panel={PASSIVE_PERCEPTION_HINT_PANEL}>
              {SKILL_ABBR.perception} {c.combat.passivePerception}
            </Pill>
            <Pill panel={PASSIVE_INVESTIGATION_HINT_PANEL}>
              {SKILL_ABBR.investigation} {c.combat.passiveInvestigation}
            </Pill>
            <Pill panel={PASSIVE_INSIGHT_HINT_PANEL}>
              {SKILL_ABBR.insight} {c.combat.passiveInsight}
            </Pill>
          </div>
          {c.senses.length > 0 && (
            <div className="mt-4">
              <SenseEntries senses={c.senses} />
            </div>
          )}
        </SectionDivider>

        {/* Ability Scores — same block as the main card (Stats + Saving Throws merged, see `AbilityScoreBox`'s own doc comment). */}
        <SectionDivider compact>
          <SubHeading>Ability Scores</SubHeading>
          <div className="grid grid-cols-6 gap-1.5">
            {STAT_ORDER.map((key) => {
              const mod = abilityModifier(c.stats[key]);
              const save = savingThrowBonus(c, key);
              const proficient = c.savingThrowProficiencies.includes(key);
              return (
                <AbilityScoreBox
                  key={key}
                  label={key.toUpperCase()}
                  modifier={formatModifier(mod)}
                  save={formatModifier(save)}
                  highlight={proficient}
                  panel={
                    <AbilityScoreHintPanel
                      abilityKey={key}
                      score={c.stats[key]}
                      modifier={formatModifier(mod)}
                      save={formatModifier(save)}
                      highlight={proficient}
                      advantages={c.advantages}
                    />
                  }
                />
              );
            })}
          </div>
        </SectionDivider>

        {/* Resistances / Immunities / Vulnerabilities — same block as the main card. */}
        <DamageInfoList
          entries={[
            { label: "Resist", value: c.resistances.join(", "), panel: RESIST_HINT_PANEL },
            { label: "Immune", value: c.immunities.join(", "), panel: IMMUNE_HINT_PANEL },
            {
              label: "Vulnerable",
              value: c.vulnerabilities.join(", "),
              panel: VULNERABLE_HINT_PANEL,
            },
          ]}
        />

        {/* Advantages — general advantage/disadvantage grants not tied to one skill/save (e.g. Concentration checks), shown here only — this modal is the one place with room for the full restriction text, unlike the compact card. Heading and per-line glyph both react to the actual mix of entries (`advantagesHeading`/`parseAdvantageEntry`) rather than assuming every entry is an advantage — a disadvantage (e.g. Stealth in heavy armor) can land in this same list, same as an advantage can. Placed after Resist/Immune/Vulnerable (not between Ability Scores and it) and in its own `SectionDivider` like every other section here — it used to be a bare, borderless `<div>` wedged between two bordered sections, which read as a stray fragment rather than a section of its own. */}
        {c.advantages.length > 0 && (
          <SectionDivider compact>
            <SubHeading>{advantagesHeading(c.advantages)}</SubHeading>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {c.advantages.map((a) => {
                const { kind, subject, restriction } = parseAdvantageEntry(a);
                return (
                  <li key={a} className="flex items-start gap-1.5">
                    <span className={`mt-px shrink-0 font-bold ${kind === "advantage" ? "text-emerald-400" : "text-red-400"}`}>
                      {kind === "advantage" ? "▲" : "▼"}
                    </span>
                    <span>
                      {/* `text-slate-200`, not the brighter `text-slate-100` every other emphasized value in this modal uses — full white read as too loud for a plain list entry with no number/stat attached to justify the extra pop. */}
                      <b className="font-semibold text-slate-200">{subject}</b>
                      {restriction && `: ${restriction}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </SectionDivider>
        )}

        {/* Skills — full width, since wrapped chips make better use of a wide row than a half-width column would */}
        <SectionDivider compact>
          <SubHeading>Skills</SubHeading>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((skill) => {
              const color = skill.expertise
                ? "rose"
                : skill.proficient
                  ? "amber"
                  : skill.halfProficiency
                    ? "orange"
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
        </SectionDivider>

        {/* Resources tracker — same block as the main card (own "Resources"
            label baked in, see ResourceTrackerBar's doc comment), quick-glance
            "how topped-up is this character" before diving into the
            Features/Spells tabs below (which don't otherwise show it). */}
        {averageOverallPercent(c.resources, c.spellSlots) !== null && (
          <SectionDivider compact>
            <ResourceTrackerBar resources={c.resources} spellSlots={c.spellSlots} pactSlots={c.className.includes("Warlock")} />
          </SectionDivider>
        )}

        {/* Weapons / Features / Spells / Consumables — tabbed instead of
            side-by-side columns so each reads as a single, comfortably narrow
            list. Only characters with more than one populated tab get a tab
            switcher; a martial character with no spells or consumables just
            sees Features directly, no empty tab to click into.
            Consumables (the character's own `InventoryItem`s of category
            "Consumable") is flaggable with the same reminder flame as every
            other tab here, so a DM can mark "remind them to drink that potion"
            just like a spell or feature — it then surfaces in `RemindersPanel`
            the same way. */}
        {tabs.length > 0 && (
          <SectionDivider compact>
            <TabBar tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-3" />

            {currentTab === "weapons" && (
              <div className="space-y-1">
                {sortedAttacks.map((attack) => (
                  <AttackRow
                    key={attack.id}
                    attack={attack}
                    flagged={flaggedAbilities.includes(attack.name)}
                    onToggleFlag={() => toggleFlag(attack.name)}
                  />
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
                          <p className={MICRO_ITEM_LABEL_CLS}>{ORIGIN_LABELS[origin]}</p>
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
                      <p className={MICRO_ITEM_LABEL_CLS}>{GROUP_LABELS[group]}</p>
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
                        <p className={MICRO_ITEM_LABEL_CLS}>{spellLevelLabel(level)}</p>
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
                              <FlaggableRow
                                key={spell.id}
                                flagged={flagged}
                                onToggleFlag={() => toggleFlag(spell.name)}
                                trailing={
                                  <>
                                    <SpellTrailing spell={spell} />
                                    {spell.max !== undefined && (
                                      <ChargeBadge current={spell.current!} max={spell.max} recovery={spell.recovery!} />
                                    )}
                                  </>
                                }
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <InfoTooltip
                                    className="min-w-0"
                                    panel={
                                      <SpellHintPanel
                                        spell={spell}
                                        status={spell.max !== undefined && recoveryStatusLine(spell.recovery!, spell.current, spell.max)}
                                      />
                                    }
                                  >
                                    {spell.name}
                                  </InfoTooltip>
                                  <SpellBadges spell={spell} />
                                </span>
                              </FlaggableRow>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {currentTab === "consumables" && (
              <div className="space-y-3">
                {consumableGroups.map(({ label, entries }) => (
                  <div key={label} className="space-y-1">
                    <p className={MICRO_ITEM_LABEL_CLS}>{label}</p>
                    {entries.map((item) => (
                      <ConsumableRow
                        key={item.id}
                        item={item}
                        flagged={flaggedAbilities.includes(item.name)}
                        onToggleFlag={() => toggleFlag(item.name)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </SectionDivider>
        )}

        {tabs.length === 0 && (
          <p className={`border-t border-slate-800 pt-3 ${MUTED_BODY_CLS}`}>
            No spells or features on record yet — sync with D&D Beyond or add them on the edit page.
          </p>
        )}

        {/* Notes/Quick Notes — same fields as the compact card, but Notes is
            editable here (save-on-blur) instead of read-only; the edit page
            remains an option too, this is just the faster path mid-session. */}
        <NotesSection notes={c.notes} onChange={onUpdate ? (notes) => onUpdate(c.id, { notes }) : undefined} compact />
        <QuickNotesSection
          notes={c.quickNotes ?? []}
          onChange={onUpdate ? (quickNotes) => onUpdate(c.id, { quickNotes }) : undefined}
          compact
        />
    </Modal>

    {editOpen && onUpdate && (
      <EditCharacterModal character={c} onClose={() => setEditOpen(false)} onUpdate={onUpdate} />
    )}

    {aiOpen && (
      <AiAssistantModal
        name={c.name}
        target={{ campaignId: c.campaignId, characterId: c.id }}
        entity={c}
        customConditionLibrary={customConditionLibrary}
        onClose={() => setAiOpen(false)}
        // Opened from inside this already-open Modal (z-50) via the "Ask AI"
        // pill above — needs to land above it, not behind it. See
        // `FloatingPanel`'s own doc comment.
        zIndexClassName="z-[60]"
      />
    )}
    </>
  );
}
