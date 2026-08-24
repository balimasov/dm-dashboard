"use client";

import { useState } from "react";
import { Character, Creature, CreatureTrait, CustomConditionTemplate } from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { CONTENT_KIND_ICON } from "@/lib/contentKindIcons";
import { formatModifier } from "@/lib/format";
import { creatureReminders } from "@/lib/reminders";
import { AiAssistantModal } from "./AiAssistantModal";
import { AbilityTraitChips, AbilityTraitTrailing, CreatureAbilityHintPanel, groupTraits } from "./CreatureAbilitiesPanel";
import { GROUP_LABELS } from "./CreatureStatBlock";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureHpHistoryModal } from "./CreatureHpHistoryModal";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { CreatureStatusRail } from "./CreatureStatusRail";
import { EditCreatureModal } from "./EditCreatureModal";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { AskAiPill } from "./ui/AskAiPill";
import { TOOLBAR_ROW_CLS } from "./ui/containerStyles";
import { DetailsTwoColumn } from "./ui/DetailsTwoColumn";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { FilterChipRow } from "./ui/FilterChipRow";
import { FlaggableRow } from "./ui/FlaggableRow";
import { FloatingPanel } from "./ui/FloatingPanel";
import { IconButton } from "./ui/IconButton";
import { NotesSection } from "./ui/NotesSection";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { ReminderBadge } from "./ui/ReminderBadge";
import { StatBox } from "./ui/StatBox";
import { TabStrip } from "./ui/TabStrip";
import { MICRO_ITEM_LABEL_CLS, MUTED_BODY_CLS } from "./ui/typography";
import { InfoTooltip } from "./InfoTooltip";
import { useMarkEntityDetailsOpen } from "@/hooks/useEntityDetailsOpen";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

type CreatureDetailsTab = "features" | "spells" | "notes";

/**
 * Same shape as `CharacterDetailsModal`, built the exact same way — opened
 * by clicking a creature's header, same shell (a draggable/resizable
 * `FloatingPanel`, Escape-to-close, wide two-column `DetailsTwoColumn`
 * body), and its right column's `tabs`/`activeTab`/
 * `TabStrip`/`{currentTab === "x" && ...}` structure is built inline here
 * exactly like `CharacterDetailsModal` builds its own — Features, Spells
 * (both conditional on actually having content, same as Character's
 * Weapons/Spells/Consumables), and Notes as a peer tab alongside them, not
 * a fixed block below. Previously Features/Spells lived in a separate
 * `CreatureAbilitiesPanel` component with its own nested tab state and
 * Notes sat outside that entirely as an always-visible block — two
 * genuinely different implementations of "an entity's tabbed details"
 * wearing the same clothes. `groupTraits`/`AbilityTraitTrailing`/
 * `CreatureAbilityHintPanel` (still exported from `CreatureAbilitiesPanel.tsx`,
 * which is a pure helpers file now — see its own doc comment) supply the
 * Features tab's per-trait rendering.
 *
 * Unlike the character modal, the stat-block part isn't a superset of the
 * compact card's content: a creature's card already shows its full stat
 * block with nothing hidden, so `CreatureStatBlock` is the exact same
 * shared body in both places — this modal just gives it more room, in the
 * left column. Unlike `CharacterCard`, `CreatureCard` shows no Notes/Quick
 * Notes at all (see that file's own comment) — this modal is the only
 * place a creature's Notes/Quick Notes show, same as it's the only place
 * its Features/Spells show.
 */
export function CreatureDetailsModal({
  creature,
  owner,
  characters,
  onClose,
  onUpdate,
  onDuplicate,
  onClearHpHistory,
  onRemove,
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  creature: Creature;
  owner?: Character;
  characters: Character[];
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onDuplicate?: (count: number) => void;
  onClearHpHistory?: (id: string) => void;
  onRemove?: (id: string) => void;
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [hpHistoryOpen, setHpHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEscapeToClose(onClose);
  useMarkEntityDetailsOpen();

  const flaggedTraits = creature.flaggedTraits ?? [];
  function toggleFlag(name: string) {
    if (!onUpdate) return;
    const next = flaggedTraits.includes(name) ? flaggedTraits.filter((n) => n !== name) : [...flaggedTraits, name];
    onUpdate(creature.id, { flaggedTraits: next });
  }

  const allGroups = groupTraits(creature.traits);
  const hasTraits = allGroups.length > 0;
  const hasSpellcasting = Boolean(creature.spellcasting);

  // Same single-select toggle-chip filter as `CharacterDetailsModal`'s
  // Actions/Features tabs (same `FilterChipRow` component, same "click the
  // active chip again to reset to All" behavior) — options are built from
  // `allGroups` itself, so a group with nothing in it (already dropped by
  // `groupTraits`) never gets a chip of its own.
  const [featureFilter, setFeatureFilter] = useState<"all" | NonNullable<CreatureTrait["group"]>>("all");
  const visibleGroups = allGroups.filter(({ group }) => featureFilter === "all" || featureFilter === group);

  // Content tabs only — Features/Spells, each gated on actually having
  // something to show — kept separate from `tabs` below so the "no traits
  // or spells on record yet" nudge can still key off "is there any actual
  // game content", now that Notes always adds a tab of its own regardless.
  const contentTabs: Array<{ key: CreatureDetailsTab; icon: string; text: string }> = [
    ...(hasTraits ? [{ key: "features" as const, icon: CONTENT_KIND_ICON.features, text: "Features" }] : []),
    ...(hasSpellcasting ? [{ key: "spells" as const, icon: CONTENT_KIND_ICON.spells, text: "Spells" }] : []),
  ];
  const tabs: Array<{ key: CreatureDetailsTab; icon: string; text: string }> = [
    ...contentTabs,
    { key: "notes", icon: "📝", text: "Notes" },
  ];
  const [activeTab, setActiveTab] = useState<CreatureDetailsTab | undefined>(tabs[0]?.key);
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <>
    <FloatingPanel
      onClose={onClose}
      storageKey="entity-details"
      align="center"
      initialWidth={1040}
      initialHeight={720}
      header={
        <div className="flex flex-col gap-3.5">
          <CreatureStatusRail
            creature={creature}
            onUpdate={onUpdate}
            customConditionLibrary={customConditionLibrary}
            onCustomConditionLibraryChange={onCustomConditionLibraryChange}
          />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CreatureHeader creature={creature} owner={owner} />
            </div>
            <IconButton onClick={onClose} aria-label="Close">
              ✕
            </IconButton>
          </div>
        </div>
      }
      panelClassName={
        creature.concentrating
          ? "concentrating-ring border-violet-500 bg-slate-950 bg-gradient-to-b from-violet-950/60 to-slate-950"
          : "border-slate-800 bg-slate-950"
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3.5">
        {/* Reminder badge (conditional) + AI pill + kebab — same bordered
            toolbar as `CreatureCard`'s equivalent row; the Reference link
            now lives inline on the header's own "CR N" line instead (see
            `CreatureHeader`). `-mb-2` trims the leftover gap — see
            `CharacterCard`'s own comment. */}
        <div className={`shrink-0 ${TOOLBAR_ROW_CLS}`}>
          <AskAiPill onClick={() => setAiOpen(true)} />
          <ReminderBadge
            group={creatureReminders(creature)}
            onRemove={onUpdate ? (name) => onUpdate(creature.id, { flaggedTraits: (creature.flaggedTraits ?? []).filter((n) => n !== name) }) : undefined}
          />
          <div className="ml-auto">
            <EntityActionsMenu
              onEdit={() => setEditOpen(true)}
              name={creature.name}
              hidden={creature.hidden}
              onToggleHidden={onUpdate ? () => onUpdate(creature.id, { hidden: !creature.hidden }) : undefined}
              linkUrl={creature.referenceUrl}
              linkLabel="Open Reference"
              onDuplicate={onDuplicate}
              onShowHpHistory={() => setHpHistoryOpen(true)}
              onRemove={onRemove ? () => onRemove(creature.id) : undefined}
            />
          </div>
        </div>

        <DetailsTwoColumn
          left={<CreatureStatBlock creature={creature} onUpdate={onUpdate} compact />}
          right={
            <>
              {contentTabs.length === 0 && (
                <p className={`mb-3 ${MUTED_BODY_CLS}`}>No traits or spells on record yet — add them on the edit page.</p>
              )}

              <TabStrip tabs={tabs} current={currentTab} onChange={setActiveTab} className="mb-3" />

              {currentTab === "features" && (
                <div className="space-y-3">
                  <FilterChipRow
                    options={[
                      { value: "all", label: "All" },
                      ...allGroups
                        .map(({ group }) => ({ value: group, label: GROUP_LABELS[group] }))
                        .sort((a, b) => a.label.localeCompare(b.label)),
                    ]}
                    isActive={(v) => featureFilter === v}
                    onClick={(v) => setFeatureFilter((current) => (v === current ? "all" : (v as typeof featureFilter)))}
                  />
                  {visibleGroups.map(({ group, items }) => (
                    <div key={group} className="space-y-1">
                      <p className={MICRO_ITEM_LABEL_CLS}>{GROUP_LABELS[group]}</p>
                      {items.map((trait, index) => {
                        const flagged = flaggedTraits.includes(trait.name);
                        return (
                          <FlaggableRow
                            key={`${group}-${index}`}
                            flagged={flagged}
                            onToggleFlag={() => toggleFlag(trait.name)}
                            trailing={<AbilityTraitTrailing trait={trait} />}
                          >
                            <span className="flex flex-wrap items-center gap-1.5">
                              <InfoTooltip panel={<CreatureAbilityHintPanel trait={trait} />}>{trait.name}</InfoTooltip>
                              <AbilityTraitChips trait={trait} />
                            </span>
                          </FlaggableRow>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {currentTab === "spells" && creature.spellcasting && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    <StatBox
                      label={creature.spellcasting.ability.toUpperCase()}
                      value={formatModifier(abilityModifier(creature.stats[creature.spellcasting.ability]))}
                    />
                    <StatBox label="Attack" value={formatModifier(creature.spellcasting.attackBonus)} />
                    <StatBox label="Save DC" value={String(creature.spellcasting.saveDc)} />
                  </div>
                  {creature.spellcasting.spellGroups.map((group, i) => {
                    if (group.spells.length === 0) return null;
                    return (
                      <div key={i}>
                        {group.label && <p className={MICRO_ITEM_LABEL_CLS}>{group.label}</p>}
                        {/* Same plain-row shape as the character Spells tab's own per-level list, but flaggable —
                            a creature's spells previously had no reminder flame at all, unlike its traits above, even
                            though "the DM forgets this creature can cast X" is exactly the kind of thing worth
                            flagging. There's no richer per-spell data to show here (just a name, unlike a trait's
                            attack/save/effects), so the hint stays a minimal "Spell" tag rather than going hint-less
                            — `ReminderEntry.panel` always needs *something* to show in the Reminders panel/FAB. */}
                        <div className="mt-1 space-y-1">
                          {group.spells.map((spell, j) => {
                            const flagged = flaggedTraits.includes(spell);
                            return (
                              <FlaggableRow key={j} flagged={flagged} onToggleFlag={() => toggleFlag(spell)}>
                                <InfoTooltip panel={<AbilityHintPanel name={spell} metaLines={["Spell"]} />}>{spell}</InfoTooltip>
                              </FlaggableRow>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentTab === "notes" && (
                <div className="space-y-3">
                  {/* Same fields as `CharacterDetailsModal`'s Notes tab — Notes
                      is editable here (save-on-blur), a faster path than the
                      full `/creatures/[id]/edit` page for a quick mid-session
                      update. */}
                  <NotesSection
                    notes={creature.notes ?? ""}
                    onChange={onUpdate ? (notes) => onUpdate(creature.id, { notes }) : undefined}
                    compact
                    topDivider={false}
                  />
                  <QuickNotesSection
                    notes={creature.quickNotes ?? []}
                    onChange={onUpdate ? (quickNotes) => onUpdate(creature.id, { quickNotes }) : undefined}
                    compact
                    topDivider={false}
                  />
                </div>
              )}
            </>
          }
        />
      </div>
    </FloatingPanel>

    {hpHistoryOpen && (
      <CreatureHpHistoryModal
        creature={creature}
        onClear={onClearHpHistory ? () => onClearHpHistory(creature.id) : undefined}
        onClose={() => setHpHistoryOpen(false)}
      />
    )}

    {editOpen && onUpdate && (
      <EditCreatureModal
        creature={creature}
        characters={characters}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />
    )}

    {aiOpen && (
      <AiAssistantModal
        name={creature.name}
        target={{ campaignId: creature.campaignId, creatureId: creature.id }}
        entity={creature}
        customConditionLibrary={customConditionLibrary}
        onClose={() => setAiOpen(false)}
        // Opened from inside this already-open FloatingPanel via the
        // "Ask AI" pill above — needs to land above it, not behind it. See
        // `FloatingPanel`'s own doc comment.
        zIndexClassName="z-[60]"
      />
    )}
    </>
  );
}
