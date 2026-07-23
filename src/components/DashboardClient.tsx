"use client";

import { useMemo, useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { useGlobalHotkey } from "@/hooks/useGlobalHotkey";
import { useScrollPositionMemory } from "@/hooks/useScrollPositionMemory";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CampaignJournalModal } from "@/components/CampaignJournalModal";
import { QuickNoteButton } from "@/components/QuickNoteButton";
import { CampaignDataProvider } from "@/contexts/CampaignDataContext";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CreatureCard } from "@/components/CreatureCard";
import { CoinsPanel, InventoryOverview } from "@/components/InventoryOverview";
import { InfoTooltip } from "@/components/InfoTooltip";
import { NotesEditor } from "@/components/NotesEditor";
import { PartyToolkit } from "@/components/PartyToolkit";
import { QuickLinksButton } from "@/components/QuickLinksButton";
import { RemindersPanel } from "@/components/RemindersPanel";
import { RosterManagerModal, type RosterTab } from "@/components/RosterManagerModal";
import { SectionNavRail, type SectionNavItem } from "@/components/ui/SectionNavRail";
import { SyncAllButton } from "@/components/SyncAllButton";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { MORE_MENU_ITEM_CLASS, MoreMenu } from "@/components/ui/MoreMenu";
import { ClockIcon, DownloadIcon, GearIcon, NoteIcon, PlusIcon } from "@/components/ui/icons";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { apiFetch } from "@/lib/apiClient";
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
  count,
  inProgress,
}: {
  emoji: string;
  label: React.ReactNode;
  count?: number;
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
      {count !== undefined && (
        <span className="ml-2 whitespace-nowrap text-base font-normal text-slate-500">({formatCardCount(count)})</span>
      )}
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

/** Small "+" quick-add trigger for a section's own header — passed into `CollapsibleSection`'s `actions` slot (a sibling of the collapse-toggle button, not nested inside it, so it never conflicts with the section's own expand/collapse click). Opens `RosterManagerModal` straight on that section's own tab, instead of a DM navigating through the kebab menu each time. */
function SectionAddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-sky-400"
    >
      <PlusIcon className="h-4 w-4" />
    </button>
  );
}

/**
 * Local state + save-on-blur — same lightweight pattern used elsewhere in
 * this app, no dedicated save button. Reports the saved value up via
 * `onSaved` so the Settings modal (a separate notes editor instance) opens
 * with this editor's latest text instead of whatever the page loaded with.
 */
function CampaignNotes({ campaign, onSaved }: { campaign: Campaign; onSaved: (notes: string) => void }) {
  const [notes, setNotes] = useState(campaign.notes);

  async function saveNotes() {
    if (notes === campaign.notes) return;
    await apiFetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    onSaved(notes);
  }

  return <NotesEditor value={notes} onChange={setNotes} onBlur={saveNotes} placeholder="Campaign notes..." />;
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
  onRemove,
  onAdd,
}: {
  category: CreatureCategory;
  creatures: Creature[];
  characters: Character[];
  storageKey: string;
  initialOpen: boolean;
  onUpdate: (id: string, updates: Partial<Creature>) => void;
  onDuplicate: (creature: Creature) => void;
  onRemove: (id: string) => void;
  onAdd?: () => void;
}) {
  const inCategory = creatures.filter((c) => c.category === category);
  const filtered = inCategory.filter((c) => !c.hidden);

  return (
    <CollapsibleSection
      title={<SectionTitle emoji={CREATURE_CATEGORY_EMOJI[category]} label={CREATURE_CATEGORY_LABELS[category]} count={filtered.length} />}
      storageKey={storageKey}
      initialOpen={initialOpen}
      actions={onAdd && <SectionAddButton onClick={onAdd} label={`Add ${CREATURE_CATEGORY_LABELS[category]}`} />}
    >
      <p className="mb-4 px-3 text-sm text-slate-500">{CREATURE_SECTION_DESCRIPTION[category]}</p>
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
        <div className="scrollbar-themed flex gap-4 overflow-x-auto px-3 pb-2 pt-8">
          {filtered.map((creature) => {
            const owner = characters.find((c) => c.id === creature.ownerCharacterId);
            return (
              <div key={creature.id} className="w-[300px] shrink-0">
                <CreatureCard
                  creature={creature}
                  owner={owner}
                  onUpdate={onUpdate}
                  onDuplicate={() => onDuplicate(creature)}
                  onRemove={onRemove}
                />
              </div>
            );
          })}
        </div>
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
  useScrollPositionMemory(`dashboard-scroll:${campaign.id}`);
  const charactersState = useCharacters(initialCharacters);
  const creaturesState = useCreatures(campaign.id, initialCreatures);
  const { characters, removeCharacter, updateCharacter } = charactersState;
  const { creatures, duplicateCreature, updateCreature, removeCreature } = creaturesState;
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
      { id: "section-party", emoji: "🛡️", label: "Party" },
      { id: "section-companions", emoji: CREATURE_CATEGORY_EMOJI.companion, label: CREATURE_CATEGORY_LABELS.companion },
      ...(isDm
        ? [
            { id: "section-enemies", emoji: CREATURE_CATEGORY_EMOJI.enemy, label: CREATURE_CATEGORY_LABELS.enemy },
            { id: "section-npcs", emoji: CREATURE_CATEGORY_EMOJI.npc, label: CREATURE_CATEGORY_LABELS.npc },
          ]
        : []),
      { id: "section-inventory", emoji: "💎", label: "Inventory" },
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
              <span className="hidden shrink-0 whitespace-nowrap text-xs text-slate-500 sm:inline">
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
          <button
            type="button"
            onClick={() => setJournalOpen(true)}
            aria-label="Campaign Journal"
            title="Campaign Journal (j)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <NoteIcon className="h-4 w-4" />
          </button>
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

      {isDm && (
        <div id="section-campaign" className="scroll-mt-[130px]">
          <CollapsibleSection
            title={<SectionTitle emoji="📜" label={`Campaign: "${campaignState.name}"`} />}
            storageKey="dm-dashboard-campaign-open"
            initialOpen={initialOpen.campaign}
          >
            <div className="px-3">
              <p className="mb-4 text-sm text-slate-500">Freeform notes and overview for the campaign.</p>
              <CampaignNotes
                campaign={campaignState}
                onSaved={(notes) => setCampaignState((c) => ({ ...c, notes }))}
              />
            </div>
          </CollapsibleSection>
        </div>
      )}

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

      <div id="section-party-toolkit" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="🧭" label="Party Toolkit" />}
          storageKey="dm-dashboard-party-toolkit-open"
          initialOpen={initialOpen.partyToolkit}
        >
          <p className="mb-4 px-3 text-sm text-slate-500">
            Party-wide cheat sheet: who&apos;s best at what, what&apos;s left in the tank, and what your spells can
            solve.
          </p>
          <div className="px-3">
            <PartyToolkit characters={visibleCharacters} initialResourceCoverageOpen={initialOpen.resourceCoverage} />
          </div>
        </CollapsibleSection>
      </div>

      <div id="section-party" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="🛡️" label="Party" count={visibleCharacters.length} />}
          storageKey="dm-dashboard-characters-open"
          initialOpen={initialOpen.characters}
          actions={isDm && <SectionAddButton onClick={() => openRoster("characters")} label="Add character" />}
        >
          <p className="mb-4 px-3 text-sm text-slate-500">Combat stats, resources, and notes for each character.</p>

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
            <div className="scrollbar-themed flex gap-4 overflow-x-auto px-3 pb-2 pt-8">
              {visibleCharacters.map((character) => (
                <div key={character.id} className="w-[300px] shrink-0">
                  <CharacterCard character={character} onRemove={removeCharacter} onUpdate={updateCharacter} />
                </div>
              ))}
            </div>
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
          onRemove={removeCreature}
          onAdd={isDm ? () => openRoster("companion") : undefined}
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
              onRemove={removeCreature}
              onAdd={() => openRoster("enemy")}
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
              onRemove={removeCreature}
              onAdd={() => openRoster("npc")}
            />
          </div>
        </>
      )}

      <div id="section-inventory" className="scroll-mt-[130px]">
        <CollapsibleSection
          title={<SectionTitle emoji="💎" label="Inventory" />}
          storageKey="dm-dashboard-inventory-open"
          initialOpen={initialOpen.inventory}
        >
          <div className="px-3 space-y-4">
            <p className="text-sm text-slate-500">Items and gold shared across the whole party.</p>
            <CoinsPanel characters={characters} />
            <InventoryOverview characters={characters} />
          </div>
        </CollapsibleSection>
      </div>

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
