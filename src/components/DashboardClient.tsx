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
import { SyncAllButton } from "@/components/SyncAllButton";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { apiFetch } from "@/lib/apiClient";
import { Campaign, CampaignSummary, Character, Creature } from "@/lib/types";

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

/** Shared empty-state for the Party/Creatures blocks — same look, same "Open Settings" action, so adding either always starts from the one place both actually live. */
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
  campaign: boolean;
  characters: boolean;
  creatures: boolean;
  inventory: boolean;
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
  // up here live — only the campaign's own name/notes/logo need copying back.
  function closeSettings(updated?: CampaignSummary) {
    setSettingsOpen(false);
    if (!updated) return;
    setCampaignState((c) => ({ ...c, name: updated.name, notes: updated.notes, logoUrl: updated.logoUrl }));
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

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8">
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {linkedCharacters.length > 0 && (
            <>
              {lastSyncedAt && (
                <span className="whitespace-nowrap text-xs text-slate-500">
                  Synced: <SyncTimestamp iso={lastSyncedAt} />
                </span>
              )}
              <SyncAllButton onSync={handleSyncAll} syncing={syncingAll} campaignId={campaign.id} />
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
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 items-center rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              Settings
            </button>
            <CampaignLogo campaign={campaignState} />
          </div>
        </div>
      </div>

      <CollapsibleSection
        title={`Campaign: "${campaignState.name}"`}
        storageKey="dm-dashboard-campaign-open"
        initialOpen={initialOpen.campaign}
      >
        <div className="px-3">
          <p className="mb-4 text-sm text-slate-500">Overview and notes for this campaign.</p>
          <CampaignNotes
            campaign={campaignState}
            onSaved={(notes) => setCampaignState((c) => ({ ...c, notes }))}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Party" storageKey="dm-dashboard-characters-open" initialOpen={initialOpen.characters}>
        <p className="mb-4 px-3 text-sm text-slate-500">Combat state, resources, and notes for each.</p>

        {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

        {characters.length === 0 ? (
          <EmptyRosterState message="No characters yet." onOpenSettings={() => setSettingsOpen(true)} />
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
            {characters.map((character) => (
              <div key={character.id} className="w-[300px] shrink-0">
                <CharacterCard character={character} onRemove={removeCharacter} onUpdate={updateCharacter} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Creatures" storageKey="dm-dashboard-creatures-open" initialOpen={initialOpen.creatures}>
        <p className="mb-4 px-3 text-sm text-slate-500">
          Companions and summons — mounts, Wild Shape forms, familiars, and the like.
        </p>
        {creatures.length === 0 ? (
          <EmptyRosterState message="No creatures yet." onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <div className="scrollbar-themed flex gap-4 overflow-x-auto px-3 pb-2">
            {creatures.map((creature) => {
              const owner = characters.find((c) => c.id === creature.ownerCharacterId);
              return (
                <div key={creature.id} className="w-[300px] shrink-0">
                  <CreatureCard
                    creature={creature}
                    owner={owner}
                    onUpdate={updateCreature}
                    onRemove={removeCreature}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Inventory" storageKey="dm-dashboard-inventory-open" initialOpen={initialOpen.inventory}>
        <div className="px-3">
          <p className="mb-4 text-sm text-slate-500">Items and gold across the whole party.</p>
          <InventoryOverview characters={characters} />
        </div>
      </CollapsibleSection>

      {settingsOpen && (
        <CampaignFormModal
          campaign={{ ...campaignState, characterCount: characters.length }}
          charactersState={charactersState}
          creaturesState={creaturesState}
          actions={{ updateCampaign: patchCampaign }}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
