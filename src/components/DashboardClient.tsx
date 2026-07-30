"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { useDesktopViewport } from "@/hooks/useDesktopViewport";
import { useGlobalHotkey } from "@/hooks/useGlobalHotkey";
import { useScrollPositionMemory } from "@/hooks/useScrollPositionMemory";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CampaignJournalModal } from "@/components/CampaignJournalModal";
import { NotesEditor } from "@/components/NotesEditor";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { CampaignDataProvider } from "@/contexts/CampaignDataContext";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CreatureCard } from "@/components/CreatureCard";
import { CoinsPanel, InventoryOverview } from "@/components/InventoryOverview";
import { InfoTooltip } from "@/components/InfoTooltip";
import { PartyToolkit } from "@/components/PartyToolkit";
import { QuickLinksButton } from "@/components/QuickLinksButton";
import { RemindersFab } from "@/components/RemindersFab";
import { RemindersPanel } from "@/components/RemindersPanel";
import { RosterManagerModal, type RosterTab } from "@/components/RosterManagerModal";
import { SectionNavRail, type SectionNavItem } from "@/components/ui/SectionNavRail";
import { SyncAllButton } from "@/components/SyncAllButton";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { DIM_ROW_CARD_CLS } from "@/components/ui/containerStyles";
import { IconButton } from "@/components/ui/IconButton";
import { IconFab } from "@/components/ui/IconFab";
import { MORE_MENU_ITEM_CLASS, MoreMenu } from "@/components/ui/MoreMenu";
import { ClockIcon, DownloadIcon, GearIcon, NoteIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";
import { MUTED_BODY_CLS, MUTED_LABEL_CLS } from "@/components/ui/typography";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { apiFetch } from "@/lib/apiClient";
import { reorderSubset } from "@/lib/reorderSubset";
import {
  CREATURE_CATEGORY_EMOJI,
  CREATURE_CATEGORY_LABELS,
  Campaign,
  CampaignSummary,
  Character,
  Creature,
  CreatureCategory,
} from "@/lib/types";
import { UserRole } from "@/lib/auth";

/** Sized and bordered to match the adjacent Settings button (same height, same rounded-lg/border-slate-700 treatment) so the two read as one aligned group. */
function CampaignLogo({ campaign }: { campaign: Campaign }) {
  if (campaign.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image can't optimize it
      <img
        src={campaign.logoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg border border-slate-700 object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-600">
      {campaign.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

/** `${n} card` / `${n} cards` — the generic word for whatever's shown in a horizontal card row (characters, companions, enemies, NPCs alike), so the count doesn't have to pick a word specific to just one of them. */
function formatCardCount(n: number): string {
  return `${n} card${n === 1 ? "" : "s"}`;
}

/**
 * A leading emoji instead of a plain heading — gives each dashboard section
 * a quick visual anchor when scanning down the page, same idea previously
 * tried as a colored dot (which read as arbitrary without a legend). `count`
 * is only passed for the horizontal card-row sections (Party and the three
 * creature categories); Campaign/Inventory aren't card rows, so they render
 * without one.
 *
 * Plain inline flow rather than a flex row: a flex container's cross-axis
 * alignment (`items-end`/`items-center`) only sees each child's *overall*
 * height, so once `label` wraps onto a second line, the emoji and the count
 * badge both get pulled down to align with that second line instead of
 * sitting with the first — confirmed on a long title at mobile width. Plain
 * inline content doesn't have that problem: the emoji, being first, always
 * renders on line one, and the count badge sits on its own natural text
 * baseline right after the label instead of being vertically offset by a
 * flex alignment rule.
 */
function SectionTitle({
  emoji,
  label,
  inProgress,
}: {
  emoji: string;
  label: React.ReactNode;
  /** Small muted "(in progress)" suffix for a section still being built out across iterations — remove once it's done. */
  inProgress?: boolean;
}) {
  return (
    <>
      <span aria-hidden="true" className="mr-2">
        {emoji}
      </span>
      {label}
      {inProgress && <span className="ml-2 whitespace-nowrap text-base font-normal text-slate-500">(in progress)</span>}
    </>
  );
}

/** Shared empty-state for the Party/Creatures blocks — same look, same "Add" action opening `RosterManagerModal` on the matching tab, so adding either always starts from the one place both actually live. `onAdd` is omitted entirely for a player, who has no roster manager to open (the button just wouldn't do anything for them). */
function EmptyRosterState({ message, onAdd }: { message: string; onAdd?: () => void }) {
  return (
    <div className="mx-3 flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 p-16 text-center text-slate-500">
      <p>{message}</p>
      {onAdd && (
        <Button type="button" onClick={onAdd}>
          Add
        </Button>
      )}
    </div>
  );
}

/**
 * The card-count pill doubles as the section's "manage" trigger — passed
 * into `CollapsibleSection`'s `actions` slot (a sibling of the
 * collapse-toggle button, not nested inside it, so it never conflicts with
 * the section's own expand/collapse click), landing right where a plain
 * "N cards" label used to sit. Opens `RosterManagerModal` straight on
 * that section's own tab — add, edit, hide, remove, and reorder, not just
 * adding. `onClick` is omitted for a player viewing a section they can't
 * manage (Party/Companions stay visible to players, just without the
 * button) — the count then renders as plain muted text, same as before
 * this became a button at all, rather than a control that looks
 * interactive but does nothing.
 *
 * No separate icon button sitting elsewhere in the row: a dedicated gear
 * either stayed always-visible (cluttering a row that already has a
 * chevron/emoji/title) or hid until hover (undiscoverable on touch, and one
 * more thing to visually track). Folding the trigger into the count itself
 * keeps the row exactly as many elements as before this feature existed.
 * A faint background at rest marks it as a real control rather than static
 * text; hover/focus swaps to the accent tint so the state change reads
 * clearly (not just "slightly brighter grey") — the `title` tooltip already
 * spells out what the button does, so no icon needs to appear on top of it.
 */
function SectionCountButton({ count, onClick, label }: { count: number; onClick?: () => void; label: string }) {
  const text = formatCardCount(count);
  if (!onClick) {
    return <span className="whitespace-nowrap text-base font-normal text-slate-500">{text}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="whitespace-nowrap rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-base font-normal text-slate-500 transition-colors hover:border-sky-800 hover:bg-sky-950/50 hover:text-sky-300 focus-visible:border-sky-800 focus-visible:bg-sky-950/50 focus-visible:text-sky-300"
    >
      {text}
    </button>
  );
}

/**
 * Read-only render of the campaign's saved description, with DM-only inline
 * editing right on the block — no trip to Settings needed anymore. Same
 * "strip markup, only real text counts" emptiness check the Journal
 * composer uses (`Composer`'s own `isEmpty`), so a `NotesEditor` that only
 * ever produced an empty `<p></p>` still reads as no description rather than
 * rendering an empty box. Reuses the exact `.notes-editor-content` rendering
 * `CampaignJournalModal`'s View mode already uses for the same underlying
 * HTML shape (bold/italic/headings/lists/links from the same editor).
 * Wrapped in `DIM_ROW_CARD_CLS` (the same dim card recipe `TraitMechanicsEditor`/
 * `CampaignJournalModal` use) so the text reads as its own block instead of
 * sitting directly on the page background with nothing to visually separate
 * it from the section around it — same treatment for the empty-state message.
 *
 * The pencil only ever mounts for `isDm` — a player gets the exact same
 * read-only render and nothing else, no "view only" messaging needed since
 * there's simply nothing clickable to explain away. Reveal is hover/focus
 * only above the `sm` breakpoint (`sm:opacity-0 sm:group-hover:opacity-100
 * sm:group-focus-within:opacity-100`, the same pattern `CampaignJournalModal`'s
 * session-manage trigger uses) rather than a persistent icon, so the block
 * reads as plain text on desktop until a DM actually goes looking for the
 * edit affordance — below `sm` (phones) there's no hover to reveal it with,
 * so it stays always-visible (`opacity-100` is the mobile-first base).
 *
 * Edit mode swaps in the same `NotesEditor` + explicit Save/Cancel pair
 * `JournalEntryRow` already uses for the same kind of in-place rich-text
 * edit, deliberately not save-on-blur (see that component's own doc comment
 * for why) — clicking Save/Cancel is the only way out, so a stray click
 * elsewhere on the page can never silently commit or discard a draft.
 */
function CampaignDescription({ notes, isDm, onSave }: { notes: string; isDm: boolean; onSave: (notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const isEmpty = notes.replace(/<[^>]+>/g, "").trim().length === 0;

  function startEditing() {
    setDraft(notes);
    setEditing(true);
  }

  function save() {
    if (draft !== notes) onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={`p-3 ${DIM_ROW_CARD_CLS}`}>
        <NotesEditor value={draft} onChange={setDraft} placeholder="Campaign notes..." autoFocus />
        <div className="mt-2 flex justify-end gap-2 text-sm">
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="px-3 py-1.5">
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={save} className="px-3 py-1.5 font-semibold">
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative p-3 ${DIM_ROW_CARD_CLS}`}>
      {isDm && (
        <IconButton
          tone="muted"
          onClick={startEditing}
          aria-label="Edit campaign description"
          title="Edit campaign description"
          className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </IconButton>
      )}
      {/* `pr-8` reserves the pencil's own footprint out of the text's line
          box on mobile, where the button is always visible (no hover to
          time it around) — without this, a line that wraps all the way to
          the block's right edge runs straight under the button instead of
          stopping short of it. Only needed below `sm`: above it the button
          is invisible except mid-hover, so the same brief overlap the rest
          of the app already accepts elsewhere is fine again. */}
      {isEmpty ? (
        <p className={`pr-8 sm:pr-0 ${MUTED_BODY_CLS}`}>No description yet.</p>
      ) : (
        <div
          className="notes-editor-content pr-8 text-sm text-slate-200 sm:pr-0"
          dangerouslySetInnerHTML={{ __html: notes }}
        />
      )}
    </div>
  );
}

/** Open/closed state for each collapsible section, read from cookies on the server so the first paint already matches the user's real preference — see `CollapsibleSection`. */
export interface OpenSections {
  reminders: boolean;
  campaign: boolean;
  characters: boolean;
  partyToolkit: boolean;
  resourceCoverage: boolean;
  companions: boolean;
  enemies: boolean;
  npcs: boolean;
  inventory: boolean;
}

const CREATURE_SECTION_DESCRIPTION: Record<CreatureCategory, string> = {
  companion: "Creatures the players control — summons, mounts, familiars.",
  enemy: "Monsters and adversaries you run against the party.",
  npc: "Non-player characters you run outside of combat.",
};

const CREATURE_SECTION_EMPTY_MESSAGE: Record<CreatureCategory, string> = {
  companion: "No companions yet.",
  enemy: "No enemies yet.",
  npc: "No NPCs yet.",
};

/** One dashboard section per `CreatureCategory` — same horizontal-scroll-row shape as the Party section above, just filtered and colored per category so Companions/Enemies/NPCs don't get crammed into one long row. */
function CreatureCategorySection({
  category,
  creatures,
  characters,
  storageKey,
  initialOpen,
  onUpdate,
  onDuplicate,
  onClearHpHistory,
  onRemove,
  onAdd,
  onReorder,
  dragEnabled,
  sensors,
}: {
  category: CreatureCategory;
  creatures: Creature[];
  characters: Character[];
  storageKey: string;
  initialOpen: boolean;
  onUpdate: (id: string, updates: Partial<Creature>) => void;
  onDuplicate: (creature: Creature) => void;
  onClearHpHistory: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd?: () => void;
  onReorder: (orderedIds: string[]) => void;
  dragEnabled: boolean;
  sensors: ReturnType<typeof useSensors>;
}) {
  const inCategory = creatures.filter((c) => c.category === category);
  const filtered = inCategory.filter((c) => !c.hidden);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(reorderSubset(creatures, (c) => c.category === category && !c.hidden, String(active.id), String(over.id)));
  }

  return (
    <CollapsibleSection
      title={<SectionTitle emoji={CREATURE_CATEGORY_EMOJI[category]} label={CREATURE_CATEGORY_LABELS[category]} />}
      storageKey={storageKey}
      initialOpen={initialOpen}
      actions={
        <SectionCountButton count={filtered.length} onClick={onAdd} label={`Manage ${CREATURE_CATEGORY_LABELS[category]}`} />
      }
    >
      <p className={`mb-4 px-3 ${MUTED_BODY_CLS}`}>{CREATURE_SECTION_DESCRIPTION[category]}</p>
      {filtered.length === 0 ? (
        <EmptyRosterState
          message={
            inCategory.length > 0
              ? "All of these are hidden — unhide them in the roster manager."
              : CREATURE_SECTION_EMPTY_MESSAGE[category]
          }
          onAdd={onAdd}
        />
      ) : (
        // Same `pt-8`/`px-3` reservation as the Party row above, for the
        // same reason — CreatureCard's own StatusRail badges bleed above
        // and sideways of the card's border and get clipped by this row's
        // own overflow-x-auto without the extra room.
        <DndContext id={`creatures-${category}-dnd`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="scrollbar-themed flex gap-4 overflow-x-auto px-3 pb-2 pt-8">
              {filtered.map((creature) => {
                const owner = characters.find((c) => c.id === creature.ownerCharacterId);
                return (
                  <div key={creature.id} className="w-[300px] shrink-0">
                    <CreatureCard
                      creature={creature}
                      owner={owner}
                      characters={characters}
                      onUpdate={onUpdate}
                      onDuplicate={() => onDuplicate(creature)}
                      onClearHpHistory={onClearHpHistory}
                      onRemove={onRemove}
                      dragEnabled={dragEnabled}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </CollapsibleSection>
  );
}

export function DashboardClient({
  campaign,
  initialCharacters,
  initialCreatures,
  initialOpen,
  role,
}: {
  campaign: Campaign;
  initialCharacters: Character[];
  initialCreatures: Creature[];
  initialOpen: OpenSections;
  role: UserRole;
}) {
  const isDm = role === "dm";
  // Press-and-hold drag never reads well on a touch screen — the same
  // `delay`/`tolerance` gesture that makes a mouse-held card unambiguous is
  // easy to trigger by accident while scrolling the row with a finger, and
  // offers little value on a screen where cards are typically full-width
  // anyway. Gated off below `sm` instead of building a touch-specific
  // affordance for a feature that's DM-desk tooling in the first place.
  const isDesktop = useDesktopViewport();
  const dragEnabled = isDm && isDesktop;
  useScrollPositionMemory(`dashboard-scroll:${campaign.id}`);
  const charactersState = useCharacters(initialCharacters);
  const creaturesState = useCreatures(campaign.id, initialCreatures);
  const { characters, removeCharacter, updateCharacter, reorderCharacters } = charactersState;
  const { creatures, duplicateCreature, updateCreature, clearHpHistory, removeCreature, reorderCreatures } = creaturesState;
  // Shared by every card row below (Party + each creature category) — one
  // `PointerSensor` config, not four. `delay`/`tolerance` (not `distance`,
  // which `CampaignRosterEditor`'s dedicated "⠿" handle uses) is what makes
  // this a press-*and-hold* gesture on the card's own header instead of an
  // instant drag: released before `delay` elapses, or moved past `tolerance`
  // pixels first (a horizontal swipe-scroll of the row, say), and dnd-kit
  // never activates the drag at all — the header's own `onClick` fires
  // normally instead, same as any other tap. Values match the prototype
  // rounds this was validated in before being wired up for real.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState(campaign);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rosterTab, setRosterTab] = useState<RosterTab | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  // A player has no Settings modal to open at all — guarded here too (not
  // just by hiding every button that calls this), so nothing short of
  // editing this component's own source can pop it open for that role.
  function openSettings() {
    if (!isDm) return;
    setSettingsOpen(true);
  }

  // Same DM-only guard as `openSettings` — `RosterManagerModal` is where
  // characters/creatures actually get added/removed, not something a player
  // has any use for.
  function openRoster(tab: RosterTab) {
    if (!isDm) return;
    setRosterTab(tab);
  }

  async function patchCampaign(id: string, updates: Partial<Campaign>) {
    setCampaignState((c) => ({ ...c, ...updates }));
    await apiFetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  // The Settings modal shares this page's own `charactersState`/`creaturesState`
  // instances (via `CampaignDataProvider` below), so roster edits made in
  // there already show up here live — only the campaign's own
  // name/notes/logo/quickLinks need copying back.
  function closeSettings(updated?: CampaignSummary) {
    setSettingsOpen(false);
    if (!updated) return;
    setCampaignState((c) => ({
      ...c,
      name: updated.name,
      notes: updated.notes,
      logoUrl: updated.logoUrl,
      quickLinks: updated.quickLinks,
    }));
  }

  // A hidden character/creature still syncs and still counts everywhere
  // else (Inventory, Settings' roster count...) — `hidden` only controls
  // whether it shows up in the Party/Companions/Enemies/NPCs rows below and
  // in `RemindersPanel`, not whether the app keeps tracking it.
  const visibleCharacters = characters.filter((c) => !c.hidden);

  function handlePartyDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderCharacters(reorderSubset(characters, (c) => !c.hidden, String(active.id), String(over.id)));
  }

  const linkedCharacters = characters.filter((c) => c.dndBeyondUrl);
  const lastSyncedAt = linkedCharacters.reduce<string | undefined>((latest, c) => {
    if (!c.lastSyncedAt) return latest;
    return !latest || c.lastSyncedAt > latest ? c.lastSyncedAt : latest;
  }, undefined);

  async function handleSyncAll() {
    if (linkedCharacters.length === 0) return;

    setSyncingAll(true);
    setSyncSummary(null);

    const results = await Promise.allSettled(
      linkedCharacters.map(async (character) => {
        const synced = await fetchAndParseDdbCharacter(character);
        await updateCharacter(character.id, synced);
      })
    );

    const failed = results
      .map((r, i) => (r.status === "rejected" ? { name: linkedCharacters[i].name, reason: r.reason } : null))
      .filter((x): x is { name: string; reason: unknown } => x !== null);
    const succeededCount = results.length - failed.length;

    setSyncSummary(
      failed.length === 0
        ? `Synced ${succeededCount} of ${linkedCharacters.length}.`
        : `Synced ${succeededCount} of ${linkedCharacters.length}. Failed: ${failed
            .map((f) => `${f.name} (${f.reason instanceof Error ? f.reason.message : "error"})`)
            .join(", ")}`
    );
    setSyncingAll(false);
  }

  useGlobalHotkey("j", () => setJournalOpen(true));
  useGlobalHotkey("s", () => void handleSyncAll(), linkedCharacters.length > 0);

  // Mirrors exactly what's actually on the page for this role (see the
  // matching `id`s below) — a player never gets Campaign/Enemies/NPCs
  // entries since those sections don't render for them at all.
  // Memoized so `SectionNavRail` gets the same array reference across
  // re-renders (this component re-renders on every unrelated bit of local
  // state — a toast, a sync flag, an inline edit — and a fresh array literal
  // each time was tearing down and rebuilding that component's
  // `IntersectionObserver` on every one of those, not just when the actual
  // section list changes).
  const navItems: SectionNavItem[] = useMemo(
    () => [
      ...(isDm ? [{ id: "section-campaign", emoji: "📜", label: "Campaign" }] : []),
      { id: "section-reminders", emoji: "🔥", label: "Reminders" },
      { id: "section-party-toolkit", emoji: "🧭", label: "Party Toolkit" },
      { id: "section-inventory", emoji: "💎", label: "Inventory" },
      { id: "section-party", emoji: "🛡️", label: "Party" },
      { id: "section-companions", emoji: CREATURE_CATEGORY_EMOJI.companion, label: CREATURE_CATEGORY_LABELS.companion },
      ...(isDm
        ? [
            { id: "section-enemies", emoji: CREATURE_CATEGORY_EMOJI.enemy, label: CREATURE_CATEGORY_LABELS.enemy },
            { id: "section-npcs", emoji: CREATURE_CATEGORY_EMOJI.npc, label: CREATURE_CATEGORY_LABELS.npc },
          ]
        : []),
    ],
    [isDm]
  );

  return (
    <div className="mx-auto max-w-[1800px] px-4 pb-8">
      <QuickLinksButton links={campaignState.quickLinks ?? []} onManage={() => openSettings()} />

      {/* `top-[58px]` = the global header's own rendered height (see
          `layout.tsx`'s `sticky top-0` header) — sits flush below it instead
          of guessing a Tailwind spacing step that might not match. Sticky
          rather than living further down the page: Sync/Export/Settings are
          reached constantly through a session, and scrolling back to the top
          every time got old fast once Party Toolkit pushed everything below
          out of view. Compact enough (just Sync + one kebab menu) to always
          fit one row even at phone width, so unlike before this needs no
          horizontal-scroll fallback for narrow viewports. */}
      <div className="sticky top-[58px] z-20 mb-4 border-b border-slate-800 bg-slate-950 py-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {lastSyncedAt && (
            <>
              {/* Full text on desktop, where there's room to spare... */}
              <span className={`hidden shrink-0 whitespace-nowrap sm:inline ${MUTED_LABEL_CLS}`}>
                Synced <SyncTimestamp iso={lastSyncedAt} />
              </span>
              {/* ...a tap/hover-able clock icon on mobile instead of hiding this
                  entirely — otherwise there's no way at all on a phone to tell
                  when the party last synced. */}
              <span className="sm:hidden">
                <InfoTooltip
                  hoverOnly
                  panel={
                    <p>
                      Synced <SyncTimestamp iso={lastSyncedAt} />
                    </p>
                  }
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400">
                    <ClockIcon className="h-4 w-4" />
                  </span>
                </InfoTooltip>
              </span>
            </>
          )}
          {linkedCharacters.length > 0 && (
            <div className="shrink-0">
              <SyncAllButton onSync={handleSyncAll} syncing={syncingAll} campaignId={campaign.id} />
            </div>
          )}
          {/* Quick Note/Journal are shared by both roles now — a DM's Quick
              Note still lands in their own private journal, a player's
              lands in the shared Party journal, and the full Journal modal
              shows each role only the tab(s) it's allowed to see. */}
          <QuickNoteButton campaignId={campaign.id} />
          <IconFab onClick={() => setJournalOpen(true)} aria-label="Campaign Journal" title="Campaign Journal (j)">
            <NoteIcon className="h-4 w-4" />
          </IconFab>
          {/* A player has nothing in this menu — Export dumps the whole
              campaign (including the enemies/NPCs/notes this role otherwise
              never sees), and Settings has no reduced view of its own — so
              the menu itself is skipped rather than left open with an empty
              or half-working dropdown. */}
          {isDm && (
            <MoreMenu>
              <a
                href={`/api/campaigns/${campaign.id}/export`}
                title="Download this campaign (and its characters/creatures) as JSON"
                className={MORE_MENU_ITEM_CLASS}
              >
                <DownloadIcon className="h-4 w-4 shrink-0 text-slate-400" />
                Export
              </a>
              <button type="button" onClick={() => openRoster("characters")} className={MORE_MENU_ITEM_CLASS}>
                <PlusIcon className="h-4 w-4 shrink-0 text-slate-400" />
                Characters &amp; Creatures
              </button>
              <button type="button" onClick={() => openSettings()} className={MORE_MENU_ITEM_CLASS}>
                <GearIcon className="h-4 w-4 shrink-0 text-slate-400" />
                Settings
              </button>
            </MoreMenu>
          )}
          <CampaignLogo campaign={campaignState} />
        </div>
      </div>

      <div id="section-campaign" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="📜" label={`Campaign: "${campaignState.name}"`} />}
          storageKey="dm-dashboard-campaign-open"
          initialOpen={initialOpen.campaign}
        >
          <div className="px-3">
            <CampaignDescription
              notes={campaignState.notes}
              isDm={isDm}
              onSave={(notes) => {
                void patchCampaign(campaignState.id, { notes });
              }}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Visible to both roles. `creatures` needs no role filtering here —
          `page.tsx` already narrows it to Companions-only before it ever
          reaches this component for a player (the same props a player's
          browser receives at all), so a player's reminders can only ever
          surface their characters and their own Companions, never an
          Enemy/NPC's traits they've never been shown. */}
      <div id="section-reminders" className="scroll-mt-[130px]">
        <RemindersPanel
          characters={characters}
          creatures={creatures}
          onUpdateCharacter={updateCharacter}
          onUpdateCreature={updateCreature}
          storageKey="dm-dashboard-reminders-open"
          initialOpen={initialOpen.reminders}
        />
      </div>

      {/* Floating quick-access counterpart to the block above, plus the new
          per-card "🔥 N" badges on `CharacterCard`/`CreatureCard` — same
          data, reachable without scrolling back to this section. Kept
          alongside the block (not replacing it) while this round of
          reminders UX changes is still being tried out. */}
      <RemindersFab
        characters={characters}
        creatures={creatures}
        onUpdateCharacter={updateCharacter}
        onUpdateCreature={updateCreature}
        hasQuickLinks={(campaignState.quickLinks ?? []).length > 0}
      />

      <div id="section-party-toolkit" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="🧭" label="Party Toolkit" />}
          storageKey="dm-dashboard-party-toolkit-open"
          initialOpen={initialOpen.partyToolkit}
        >
          <p className={`mb-4 px-3 ${MUTED_BODY_CLS}`}>
            Party-wide cheat sheet: who&apos;s best at what, what&apos;s left in the tank, and what your spells can
            solve.
          </p>
          <div className="px-3">
            <PartyToolkit characters={visibleCharacters} initialResourceCoverageOpen={initialOpen.resourceCoverage} />
          </div>
        </CollapsibleSection>
      </div>

      <div id="section-inventory" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="💎" label="Inventory" />}
          storageKey="dm-dashboard-inventory-open"
          initialOpen={initialOpen.inventory}
        >
          <div className="px-3 space-y-4">
            <p className={MUTED_BODY_CLS}>Items and gold shared across the whole party.</p>
            <CoinsPanel characters={characters} />
            <InventoryOverview characters={characters} />
          </div>
        </CollapsibleSection>
      </div>

      <div id="section-party" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="🛡️" label="Party" />}
          storageKey="dm-dashboard-characters-open"
          initialOpen={initialOpen.characters}
          actions={
            <SectionCountButton
              count={visibleCharacters.length}
              onClick={isDm ? () => openRoster("characters") : undefined}
              label="Manage characters"
            />
          }
        >
          <p className={`mb-4 px-3 ${MUTED_BODY_CLS}`}>Combat stats, resources, and notes for each character.</p>

          {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

          {visibleCharacters.length === 0 ? (
            <EmptyRosterState
              message={characters.length > 0 ? "All characters are hidden — unhide them in the roster manager." : "No characters yet."}
              onAdd={isDm ? () => openRoster("characters") : undefined}
            />
          ) : (
            // Status badges straddle each card's *top* border and can bleed
            // sideways too once there are several of them — `overflow-x-auto`
            // here forces this row's own overflow-y to compute as non-"visible"
            // regardless of what's set (the same quirk noted on StatusRail),
            // which clips anything that pokes out above the row's own box, and
            // the row has no scroll room to the left/right of its first/last
            // card either. `pt-8`/`px-3` reserve room on every side so the
            // leftmost, rightmost, and topmost badges always have somewhere to
            // bleed into before hitting a clipping edge (confirmed clipped
            // without this) — `px-3` also matches the Campaign/Inventory
            // blocks' own inset so all three line up on the same left edge.
            <DndContext id="party-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePartyDragEnd}>
              <SortableContext items={visibleCharacters.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                <div className="scrollbar-themed flex gap-4 overflow-x-auto px-3 pb-2 pt-8">
                  {visibleCharacters.map((character) => (
                    <div key={character.id} className="w-[300px] shrink-0">
                      <CharacterCard
                        character={character}
                        onRemove={removeCharacter}
                        onUpdate={updateCharacter}
                        dragEnabled={dragEnabled}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CollapsibleSection>
      </div>

      <div id="section-companions" className="scroll-mt-[130px]">
        <CreatureCategorySection
          category="companion"
          creatures={creatures}
          characters={characters}
          storageKey="dm-dashboard-companions-open"
          initialOpen={initialOpen.companions}
          onUpdate={updateCreature}
          onDuplicate={duplicateCreature}
          onClearHpHistory={clearHpHistory}
          onRemove={removeCreature}
          onAdd={isDm ? () => openRoster("companion") : undefined}
          onReorder={reorderCreatures}
          dragEnabled={dragEnabled}
          sensors={sensors}
        />
      </div>

      {/* Enemies and NPCs are DM-only — a player at the table isn't meant
          to see monster stat blocks or NPC secrets the DM hasn't revealed
          yet. Companions stay visible above: those are the players' own
          summons/mounts/familiars, no different from their characters. */}
      {isDm && (
        <>
          <div id="section-enemies" className="scroll-mt-[130px]">
            <CreatureCategorySection
              category="enemy"
              creatures={creatures}
              characters={characters}
              storageKey="dm-dashboard-enemies-open"
              initialOpen={initialOpen.enemies}
              onUpdate={updateCreature}
              onDuplicate={duplicateCreature}
              onClearHpHistory={clearHpHistory}
              onRemove={removeCreature}
              onAdd={() => openRoster("enemy")}
              onReorder={reorderCreatures}
              dragEnabled={dragEnabled}
              sensors={sensors}
            />
          </div>

          <div id="section-npcs" className="scroll-mt-[130px]">
            <CreatureCategorySection
              category="npc"
              creatures={creatures}
              characters={characters}
              storageKey="dm-dashboard-npcs-open"
              initialOpen={initialOpen.npcs}
              onUpdate={updateCreature}
              onDuplicate={duplicateCreature}
              onClearHpHistory={clearHpHistory}
              onRemove={removeCreature}
              onAdd={() => openRoster("npc")}
              onReorder={reorderCreatures}
              dragEnabled={dragEnabled}
              sensors={sensors}
            />
          </div>
        </>
      )}

      <SectionNavRail items={navItems} />

      {settingsOpen && (
        <CampaignDataProvider value={{ charactersState, creaturesState }}>
          <CampaignFormModal
            campaign={{ ...campaignState, characterCount: characters.length }}
            actions={{ updateCampaign: patchCampaign }}
            onClose={closeSettings}
          />
        </CampaignDataProvider>
      )}

      {rosterTab && (
        <CampaignDataProvider value={{ charactersState, creaturesState }}>
          <RosterManagerModal
            campaignId={campaign.id}
            initialTab={rosterTab}
            charactersState={charactersState}
            creaturesState={creaturesState}
            characters={characters}
            onClose={() => setRosterTab(null)}
          />
        </CampaignDataProvider>
      )}

      {journalOpen && <CampaignJournalModal campaignId={campaign.id} role={role} onClose={() => setJournalOpen(false)} />}
    </div>
  );
}
