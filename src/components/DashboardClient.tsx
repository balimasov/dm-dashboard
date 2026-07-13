"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CreatureCard } from "@/components/CreatureCard";
import { InventoryOverview } from "@/components/InventoryOverview";
import { NotesEditor } from "@/components/NotesEditor";
import { PartyToolkit } from "@/components/PartyToolkit";
import { QuickLinksButton } from "@/components/QuickLinksButton";
import { RemindersPanel } from "@/components/RemindersPanel";
import { SyncAllButton } from "@/components/SyncAllButton";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
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

type SettingsTab = "campaign" | "roster";

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
 */
function SectionTitle({ emoji, label, count }: { emoji: string; label: React.ReactNode; count?: number }) {
  return (
    <span className="inline-flex items-end gap-2">
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
      {count !== undefined && <span className="text-base font-normal text-slate-500">({formatCardCount(count)})</span>}
    </span>
  );
}

/** Shared empty-state for the Party/Creatures blocks — same look, same "Open Settings" action (jumping straight to the roster tab), so adding either always starts from the one place both actually live. */
function EmptyRosterState({ message, onOpenSettings }: { message: string; onOpenSettings: () => void }) {
  return (
    <div className="mx-3 flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 p-16 text-center text-slate-500">
      <p>{message}</p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Open Settings
      </button>
    </div>
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
  onRemove,
  onOpenSettings,
}: {
  category: CreatureCategory;
  creatures: Creature[];
  characters: Character[];
  storageKey: string;
  initialOpen: boolean;
  onUpdate: (id: string, updates: Partial<Creature>) => void;
  onRemove: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const inCategory = creatures.filter((c) => c.category === category);
  const filtered = inCategory.filter((c) => !c.hidden);

  return (
    <CollapsibleSection
      title={<SectionTitle emoji={CREATURE_CATEGORY_EMOJI[category]} label={CREATURE_CATEGORY_LABELS[category]} count={filtered.length} />}
      storageKey={storageKey}
      initialOpen={initialOpen}
    >
      <p className="mb-4 px-3 text-sm text-slate-500">{CREATURE_SECTION_DESCRIPTION[category]}</p>
      {filtered.length === 0 ? (
        <EmptyRosterState
          message={
            inCategory.length > 0
              ? "All of these are hidden — unhide them in Settings."
              : CREATURE_SECTION_EMPTY_MESSAGE[category]
          }
          onOpenSettings={onOpenSettings}
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
                <CreatureCard creature={creature} owner={owner} onUpdate={onUpdate} onRemove={onRemove} />
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
}: {
  campaign: Campaign;
  initialCharacters: Character[];
  initialCreatures: Creature[];
  initialOpen: OpenSections;
}) {
  const charactersState = useCharacters(initialCharacters);
  const creaturesState = useCreatures(campaign.id, initialCreatures);
  const { characters, removeCharacter, updateCharacter } = charactersState;
  const { creatures, updateCreature, removeCreature } = creaturesState;
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState(campaign);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("campaign");

  function openSettings(tab: SettingsTab = "campaign") {
    setSettingsTab(tab);
    setSettingsOpen(true);
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
  // instances (passed down below), so roster edits made in there already show
  // up here live — only the campaign's own name/notes/logo/quickLinks need
  // copying back.
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

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8">
      <QuickLinksButton links={campaignState.quickLinks ?? []} onManage={() => openSettings("campaign")} />

      <div className="mb-4 space-y-2">
        {/* Below `sm`, the timestamp + all four actions don't fit one line at
            once and used to wrap onto a second row — same fix already applied
            to the Party/Creatures card rows: scroll sideways instead of
            wrapping, so it's always one row. `justify-end` (the normal,
            everything-fits desktop layout) and horizontal scroll don't mix
            well — an overflowing `justify-end` row can leave content
            unreachable by scrolling in some browsers — so the scrollable
            mobile layout starts left-aligned instead, and only switches back
            to `justify-end`/wrapping once `sm:` has room to spare. */}
        <div className="flex flex-nowrap items-center justify-start gap-2 overflow-x-auto scrollbar-themed sm:flex-wrap sm:justify-end sm:overflow-visible">
          {linkedCharacters.length > 0 && (
            <>
              {lastSyncedAt && (
                <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
                  Synced <SyncTimestamp iso={lastSyncedAt} />
                </span>
              )}
              <div className="shrink-0">
                <SyncAllButton onSync={handleSyncAll} syncing={syncingAll} campaignId={campaign.id} />
              </div>
            </>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/api/campaigns/${campaign.id}/export`}
              title="Download this campaign (and its characters/creatures) as JSON"
              className="flex h-9 items-center rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              Export
            </a>
            <button
              type="button"
              onClick={() => openSettings("campaign")}
              className="flex h-9 items-center rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              Settings
            </button>
            <CampaignLogo campaign={campaignState} />
          </div>
        </div>
      </div>

      <RemindersPanel
        characters={characters}
        creatures={creatures}
        onUpdateCharacter={updateCharacter}
        onUpdateCreature={updateCreature}
        storageKey="dm-dashboard-reminders-open"
        initialOpen={initialOpen.reminders}
      />

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

      <CollapsibleSection
        title={<SectionTitle emoji="🛡️" label="Party" count={visibleCharacters.length} />}
        storageKey="dm-dashboard-characters-open"
        initialOpen={initialOpen.characters}
      >
        <p className="mb-4 px-3 text-sm text-slate-500">Combat stats, resources, and notes for each character.</p>

        {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

        {visibleCharacters.length === 0 ? (
          <EmptyRosterState
            message={characters.length > 0 ? "All characters are hidden — unhide them in Settings." : "No characters yet."}
            onOpenSettings={() => openSettings("roster")}
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

      <CollapsibleSection
        title={<SectionTitle emoji="🧭" label="Party Toolkit" />}
        storageKey="dm-dashboard-party-toolkit-open"
        initialOpen={initialOpen.partyToolkit}
      >
        <p className="mb-4 px-3 text-sm text-slate-500">
          Who&apos;s best at what, and what the party notices passively — reference only, no rolls.
        </p>
        <div className="px-3">
          <PartyToolkit characters={visibleCharacters} />
        </div>
      </CollapsibleSection>

      <CreatureCategorySection
        category="companion"
        creatures={creatures}
        characters={characters}
        storageKey="dm-dashboard-companions-open"
        initialOpen={initialOpen.companions}
        onUpdate={updateCreature}
        onRemove={removeCreature}
        onOpenSettings={() => openSettings("roster")}
      />

      <CreatureCategorySection
        category="enemy"
        creatures={creatures}
        characters={characters}
        storageKey="dm-dashboard-enemies-open"
        initialOpen={initialOpen.enemies}
        onUpdate={updateCreature}
        onRemove={removeCreature}
        onOpenSettings={() => openSettings("roster")}
      />

      <CreatureCategorySection
        category="npc"
        creatures={creatures}
        characters={characters}
        storageKey="dm-dashboard-npcs-open"
        initialOpen={initialOpen.npcs}
        onUpdate={updateCreature}
        onRemove={removeCreature}
        onOpenSettings={() => openSettings("roster")}
      />

      <CollapsibleSection
        title={<SectionTitle emoji="💎" label="Inventory" />}
        storageKey="dm-dashboard-inventory-open"
        initialOpen={initialOpen.inventory}
      >
        <div className="px-3">
          <p className="mb-4 text-sm text-slate-500">Items and gold shared across the whole party.</p>
          <InventoryOverview characters={characters} />
        </div>
      </CollapsibleSection>

      {settingsOpen && (
        <CampaignFormModal
          campaign={{ ...campaignState, characterCount: characters.length }}
          initialTab={settingsTab}
          charactersState={charactersState}
          creaturesState={creaturesState}
          actions={{ updateCampaign: patchCampaign }}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
