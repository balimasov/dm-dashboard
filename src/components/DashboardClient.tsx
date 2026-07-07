"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CreatureCard } from "@/components/CreatureCard";
import { HeaderPortal } from "@/components/HeaderPortal";
import { InventoryOverview } from "@/components/InventoryOverview";
import { NotesEditor } from "@/components/NotesEditor";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
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
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    onSaved(notes);
  }

  return <NotesEditor value={notes} onChange={setNotes} onBlur={saveNotes} placeholder="Campaign notes..." />;
}

export function DashboardClient({
  campaign,
  initialCharacters,
  initialCreatures,
}: {
  campaign: Campaign;
  initialCharacters: Character[];
  initialCreatures: Creature[];
}) {
  const { characters, removeCharacter, updateCharacter } = useCharacters(initialCharacters);
  const { creatures, updateCreature, removeCreature } = useCreatures(campaign.id, initialCreatures);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState(campaign);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function patchCampaign(id: string, updates: Partial<Campaign>) {
    setCampaignState((c) => ({ ...c, ...updates }));
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  function closeSettings(updated?: CampaignSummary, creatureCount?: number) {
    setSettingsOpen(false);
    if (!updated) return;
    setCampaignState((c) => ({ ...c, name: updated.name, notes: updated.notes, logoUrl: updated.logoUrl }));
    // The roster editors inside the modal keep their own character/creature
    // list state, separate from this page's — a simple reload is the
    // least-risky way to reflect any add/remove/sync that happened in
    // there, without wiring independent hook instances together.
    if (updated.characterCount !== characters.length || creatureCount !== creatures.length) {
      window.location.reload();
    }
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Breadcrumbs items={[{ label: "Campaigns", href: "/" }, { label: campaignState.name }]} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CampaignLogo campaign={campaignState} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Settings
          </button>
        </div>
      </div>

      {linkedCharacters.length > 0 && (
        <HeaderPortal>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {lastSyncedAt && (
              <span className="hidden whitespace-nowrap text-xs text-slate-500 sm:inline">
                Synced: <SyncTimestamp iso={lastSyncedAt} />
              </span>
            )}
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="min-w-[102px] rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {syncingAll ? "Syncing..." : "Sync All"}
            </button>
          </div>
        </HeaderPortal>
      )}

      <CollapsibleSection title={`Campaign: "${campaignState.name}"`} storageKey="dm-dashboard-campaign-open">
        <div className="px-3">
          <p className="mb-4 text-sm text-slate-500">Overview and notes for this campaign.</p>
          <CampaignNotes
            campaign={campaignState}
            onSaved={(notes) => setCampaignState((c) => ({ ...c, notes }))}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Party" storageKey="dm-dashboard-characters-open">
        <p className="mb-4 px-3 text-sm text-slate-500">
          {characters.length} {characters.length === 1 ? "character" : "characters"} — combat state, resources,
          and notes for each.
        </p>

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

      <CollapsibleSection title="Creatures" storageKey="dm-dashboard-creatures-open">
        <p className="mb-4 px-3 text-sm text-slate-500">
          Companions and summons — mounts, Wild Shape forms, familiars, and the like. Add or edit them from
          Settings.
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

      <CollapsibleSection title="Inventory" storageKey="dm-dashboard-inventory-open">
        <div className="px-3">
          <p className="mb-4 text-sm text-slate-500">Items and gold across the whole party.</p>
          <InventoryOverview characters={characters} />
        </div>
      </CollapsibleSection>

      {settingsOpen && (
        <CampaignFormModal
          campaign={{ ...campaignState, characterCount: characters.length }}
          initialCharacters={characters}
          initialCreatures={creatures}
          actions={{ updateCampaign: patchCampaign }}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
