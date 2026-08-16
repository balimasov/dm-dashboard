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
} from "@/lib/types";
import { advantagesHeading, parseAdvantageEntry } from "@/lib/advantages";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { formatModifier, ordinalLevel } from "@/lib/format";
import { dedupeInventoryItems, groupConsumablesByType } from "@/lib/partyToolkit";
import { characterReminders } from "@/lib/reminders";
import { characterSyncIssue } from "@/lib/sync";
import { AiAssistantModal } from "./AiAssistantModal";
import { CharacterHeader } from "./CharacterHeader";
import { CharacterStatBlock } from "./CharacterStatBlock";
import { CharacterStatusRail } from "./CharacterStatusRail";
import { EditCharacterModal } from "./EditCharacterModal";
import { AskAiPill } from "./ui/AskAiPill";
import { AttackName, AttackTrailing } from "./ui/AttackDisplay";
import { ConsumableQuantity } from "./ui/ConsumableQuantity";
import { TOOLBAR_ROW_CLS } from "./ui/containerStyles";
import { FlaggableRow } from "./ui/FlaggableRow";
import { IconButton } from "./ui/IconButton";
import { LanguageIcon, ToolIcon } from "./ui/icons";
import { LANGUAGES_HINT_PANEL, TOOLS_HINT_PANEL } from "./ui/combatStatHints";
import { ItemHintPanel } from "./ui/ItemHintPanel";
import { NotesSection } from "./ui/NotesSection";
import { Pill } from "./ui/Pill";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { FeatureHintPanel, RecoveryBadge } from "./ui/RecoveryBadge";
import { ReminderBadge } from "./ui/ReminderBadge";
import { SectionDivider } from "./ui/SectionDivider";
import { Modal } from "./ui/Modal";
import { StatBox } from "./ui/StatBox";
import { SyncIssuePill } from "./ui/SyncIssuePill";
import { SyncStatusChip } from "./ui/SyncStatusChip";
import { SubHeading } from "./ui/SubHeading";
import { MICRO_ITEM_LABEL_CLS, MUTED_BODY_CLS } from "./ui/typography";
import { useDdbSync } from "@/hooks/useDdbSync";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { DotMeter } from "./ResourceMeter";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { InfoTooltip } from "./InfoTooltip";
import { KnownSpellHintPanel, SpellBadges, SpellTrailing } from "./ui/SpellDisplay";
import { TabStrip } from "./ui/TabStrip";
import { DetailsTwoColumn } from "./ui/DetailsTwoColumn";

function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrips" : `${ordinalLevel(level)} Level`;
}

/**
 * Same dot-meter + recovery abbreviation used for Resources/Spell Slots on
 * the main card, reused here for any Feature or Spell that turns out to have
 * its own charge pool. Recovery badge first, dots/count last — the recovery
 * type reads as the trailing-most "other chips, then LR/SR/M, then charges"
 * rule this row's own C/R badges already follow.
 *
 * Two nested spans, not one — the outer is `inline-block`, the exact same
 * "atomic inline-level box" trick `MetaBadge` uses to escape `FlaggableRow`'s
 * dotted name-underline (`RecoveryBadge` already gets it for free, being
 * built on `MetaBadge`). An `inline-flex` outer span (the first attempt at
 * this fix) *looked* like the same trick and tested clean in isolation, but
 * once this badge sits inside `FlaggableRow`'s own flex row it becomes a
 * flex item itself — which "blockifies" `inline-flex` down toward plain
 * `flex` for layout purposes, and some browsers then also stop treating it
 * as the atomic box the exclusion depends on, so the underline crept back in
 * for exactly the dot meter/count this was meant to fix. `inline-block`
 * doesn't need flex layout for the badge's own two children, so the actual
 * `items-center gap-2` row lives on an *inner* span instead.
 */
function ChargeBadge({ current, max, recovery }: { current: number; max: number; recovery: RecoveryType }) {
  return (
    <span className="inline-block shrink-0 whitespace-nowrap no-underline">
      <span className="flex items-center gap-2">
        <RecoveryBadge recovery={recovery} />
        {max > 0 && max <= 6 ? (
          <DotMeter current={current} max={max} />
        ) : (
          <span className="text-sm font-medium text-slate-100">
            {current}/{max}
          </span>
        )}
      </span>
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

interface PillGroupEntry {
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  items: string[];
  panel: React.ReactNode;
}

/**
 * Same "icon + label, hover-hint on the label" convention `IconInfoList`
 * uses for Resist/Immune/Vulnerable — same normal-case "Label:" text at the
 * same `text-sm` size, same single flowing line — but for Proficiencies
 * (Languages/Tools) the value
 * side is a row of `Pill` chips (the same chip Skills already uses below)
 * instead of one comma-separated sentence. Label and chips share one
 * `flex-wrap` line on purpose: the label leads the line the same way it
 * does in `IconInfoList`, and chips wrap onto their own line only once the
 * row genuinely runs out of width, rather than always starting on a
 * separate line of their own. `IconInfoList` itself stays as-is for Resist/
 * Immune/Vulnerable, which really are short comma lists, not proficiency
 * chips. Entries with no items are skipped, same convention as
 * `IconInfoList`.
 */
function PillGroupList({ entries }: { entries: PillGroupEntry[] }) {
  const visible = entries.filter((e) => e.items.length > 0);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1.5 text-sm">
      {visible.map((e) => (
        <div key={e.label} className="flex flex-wrap items-center gap-1.5">
          <e.icon className="h-4 w-4 shrink-0 text-slate-500" />
          <InfoTooltip inline panel={e.panel}>
            <span className="whitespace-nowrap text-slate-500">{e.label}:</span>
          </InfoTooltip>
          {e.items.map((item) => (
            <Pill key={item} color="slate">
              {item}
            </Pill>
          ))}
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ feature, flagged, onToggleFlag }: { feature: Feature; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <FlaggableRow flagged={flagged} onToggleFlag={onToggleFlag}>
      <span className="flex flex-wrap items-center gap-1.5">
        <InfoTooltip panel={<FeatureHintPanel feature={feature} />}>{feature.name}</InfoTooltip>
        {feature.max !== undefined && <ChargeBadge current={feature.current!} max={feature.max} recovery={feature.recovery!} />}
      </span>
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

type DetailsTab = "weapons" | "features" | "spells" | "consumables" | "notes";

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

  // Content tabs only — Weapons/Features/Spells/Consumables, each gated on
  // actually having something to show. Kept separate from `tabs` below so
  // the "no spells or features on record yet" nudge can still key off "is
  // there any actual game content", now that Notes always adds a tab of its
  // own regardless (same as `NotesSection`/`QuickNotesSection` always
  // rendering today, just relocated from a fixed block under the tabs into
  // one of the tabs themselves).
  const contentTabs: Array<{ key: DetailsTab; icon: string; text: string }> = [
    ...(hasAttacks ? [{ key: "weapons" as const, icon: CONTENT_KIND_ICON.weapons, text: "Weapons" }] : []),
    ...(hasFeatures ? [{ key: "features" as const, icon: CONTENT_KIND_ICON.features, text: "Features" }] : []),
    ...(hasSpells ? [{ key: "spells" as const, icon: CONTENT_KIND_ICON.spells, text: "Spells" }] : []),
    ...(hasConsumables ? [{ key: "consumables" as const, icon: CONTENT_KIND_ICON.consumables, text: "Consumables" }] : []),
  ];
  const tabs: Array<{ key: DetailsTab; icon: string; text: string }> = [
    ...contentTabs,
    { key: "notes", icon: "📝", text: "Notes" },
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
          <CharacterStatusRail
            character={c}
            onUpdate={onUpdate}
            customConditionLibrary={customConditionLibrary}
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
      panelClassName={`relative my-4 w-full max-w-[1040px] gap-3.5 p-3.5 shadow-2xl shadow-black/40 md:max-h-[85vh] ${
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
        <div className={TOOLBAR_ROW_CLS}>
          <AskAiPill onClick={() => setAiOpen(true)} />
          <SyncStatusChip
            dndBeyondUrl={c.dndBeyondUrl}
            syncing={syncing}
            lastSyncedAt={c.lastSyncedAt}
            onSync={onUpdate && c.dndBeyondUrl ? sync : undefined}
          />
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

        {/* Two independently-scrolling columns instead of one long stacked
            flow: the old single column made the tab switcher (Weapons/
            Features/Spells/Consumables) something you had to scroll the
            *entire* stat block to reach, and scrolling far enough to compare
            a tab's content against HP/AC meant losing the header off the top
            of the viewport. Left keeps the exact same stat block as the
            compact card (`CharacterStatBlock`, unchanged); right is always
            the tabs, one scroll away from the header at any stat-block
            length. Shared shell (`DetailsTwoColumn`) with `CreatureDetailsModal`
            — see its own doc comment for the width/scroll/focus-ring
            reasoning baked into it. */}
        <DetailsTwoColumn
          left={
            /* HP through Resources — shared with the main card via
               `CharacterStatBlock` (see its own doc comment for why: a
               UI-kit audit found this whole block byte-identical between
               the two, after a fix landed in one and not the other for the
               third time this session). The full Advantages list and
               Languages/Tools "Proficiencies" (in that order, after
               Resources) are this modal's own addition, injected via
               `afterSkills` rather than duplicated inline — both stayed
               modal-only, the compact card has no room for either. */
            <CharacterStatBlock
              character={c}
              compact
              expandedResources
              afterSkills={
                <>
                  {/* Advantages — general advantage/disadvantage grants not tied to one skill/save (e.g. Concentration checks), shown here only — this modal is the one place with room for the full restriction text, unlike the compact card. Heading and per-line glyph both react to the actual mix of entries (`advantagesHeading`/`parseAdvantageEntry`) rather than assuming every entry is an advantage — a disadvantage (e.g. Stealth in heavy armor) can land in this same list, same as an advantage can. */}
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

                  {(c.languages.length > 0 || c.toolProficiencies.length > 0) && (
                    <SectionDivider compact>
                      <SubHeading>Proficiencies</SubHeading>
                      <PillGroupList
                        entries={[
                          { label: "Languages", icon: LanguageIcon, items: c.languages, panel: LANGUAGES_HINT_PANEL },
                          { label: "Tools", icon: ToolIcon, items: c.toolProficiencies, panel: TOOLS_HINT_PANEL },
                        ]}
                      />
                    </SectionDivider>
                  )}
                </>
              }
            />
          }
          right={
            <>
              {/* Weapons / Features / Spells / Consumables / Notes — tabbed
                  instead of stacked sections, reachable without scrolling past
                  the stat block on the left. `TabStrip` (not `TabBar`) — the
                  underline tab-strip style, not the icon-over-label pill
                  segments `TabBar` uses elsewhere; see that component's own doc
                  comment for why this is a second component rather than a
                  variant. Limited Use resources and Spell Slots stay on the
                  left column's Resources block (`expandedResources` on
                  `CharacterStatBlock` — the itemized breakdown always
                  visible there now, not tucked behind a hover, since this
                  modal has the room the compact card doesn't) rather than
                  duplicated inline at the top of Features/Spells too.
                  Consumables (the character's own
                  `InventoryItem`s of category "Consumable") is flaggable with
                  the same reminder flame as every other tab here, so a DM can
                  mark "remind them to drink that potion" just like a spell or
                  feature — it then surfaces in `RemindersPanel` the same way. */}
              {contentTabs.length === 0 && (
                <p className={`mb-3 ${MUTED_BODY_CLS}`}>
                  No spells or features on record yet — sync with D&D Beyond or add them on the edit page.
                </p>
              )}

              <TabStrip tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-3" />

              {/* Grouped Melee/Ranged, same `MICRO_ITEM_LABEL_CLS` group heading
                  the Features tab uses for Action/Bonus Action/... and the
                  Spells tab uses for each spell level — one heading recipe
                  for "a labeled sub-group of rows" across every tab here. */}
              {currentTab === "weapons" && (
              <div className="space-y-3">
                {(["melee", "ranged"] as const).map((attackType) => {
                  const attacks = sortedAttacks.filter((attack) => attack.attackType === attackType);
                  if (attacks.length === 0) return null;
                  return (
                    <div key={attackType} className="space-y-1">
                      <p className={MICRO_ITEM_LABEL_CLS}>{attackType === "melee" ? "Melee" : "Ranged"}</p>
                      {attacks.map((attack) => (
                        <AttackRow
                          key={attack.id}
                          attack={attack}
                          flagged={flaggedAbilities.includes(attack.name)}
                          onToggleFlag={() => toggleFlag(attack.name)}
                        />
                      ))}
                    </div>
                  );
                })}
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
                                trailing={<SpellTrailing spell={spell} />}
                              >
                                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                  <InfoTooltip className="min-w-0" panel={<KnownSpellHintPanel spell={spell} />}>
                                    {spell.name}
                                  </InfoTooltip>
                                  <SpellBadges spell={spell} />
                                  {spell.max !== undefined && (
                                    <ChargeBadge current={spell.current!} max={spell.max} recovery={spell.recovery!} />
                                  )}
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

              {currentTab === "notes" && (
                <div className="space-y-3">
                  {/* Same fields as the compact card, but Notes is editable
                      here (save-on-blur) instead of read-only; the edit page
                      remains an option too, this is just the faster path
                      mid-session. */}
                  <NotesSection
                    notes={c.notes}
                    onChange={onUpdate ? (notes) => onUpdate(c.id, { notes }) : undefined}
                    compact
                    topDivider={false}
                  />
                  <QuickNotesSection
                    notes={c.quickNotes ?? []}
                    onChange={onUpdate ? (quickNotes) => onUpdate(c.id, { quickNotes }) : undefined}
                    compact
                    topDivider={false}
                  />
                </div>
              )}
            </>
          }
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
