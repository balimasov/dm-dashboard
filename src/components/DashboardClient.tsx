"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { HeaderPortal } from "@/components/HeaderPortal";
import { InventoryOverview } from "@/components/InventoryOverview";
import { NotesEditor } from "@/components/NotesEditor";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { Campaign, CampaignSummary, Character } from "@/lib/types";

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
}: {
  campaign: Campaign;
  initialCharacters: Character[];
}) {
  const { characters, removeCharacter, updateCharacter } = useCharacters(initialCharacters);
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

  function closeSettings(updated?: CampaignSummary) {
    setSettingsOpen(false);
    if (!updated) return;
    setCampaignState((c) => ({ ...c, name: updated.name, notes: updated.notes, logoUrl: updated.logoUrl }));
    // The roster editor inside the modal keeps its own character list state,
    // separate from this page's — a simple reload is the least-risky way to
    // reflect any add/remove/sync that happened in there, without wiring two
    // independent `useCharacters` instances together.
    if (updated.characterCount !== characters.length) window.location.reload();
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
              <span className="whitespace-nowrap text-xs text-slate-500">
                Synced: <SyncTimestamp iso={lastSyncedAt} />
              </span>
            )}
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {syncingAll ? "Syncing..." : "Sync All"}
            </button>
          </div>
        </HeaderPortal>
      )}

      <CollapsibleSection title={`Campaign: "${campaignState.name}"`} storageKey="dm-dashboard-campaign-open">
        <p className="mb-4 text-sm text-slate-500">Overview and notes for this campaign.</p>
        <CampaignNotes
          campaign={campaignState}
          onSaved={(notes) => setCampaignState((c) => ({ ...c, notes }))}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Party" storageKey="dm-dashboard-characters-open">
        <p className="mb-4 text-sm text-slate-500">
          {characters.length} {characters.length === 1 ? "character" : "characters"} — combat state, resources,
          and notes for each.
        </p>

        {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

        {characters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 p-16 text-center text-slate-500">
            <p>No characters yet. Add some by editing this campaign from the Campaigns page.</p>
          </div>
        ) : (
          // Status badges straddle each card's *top* border and can bleed
          // sideways too once there are several of them — `overflow-x-auto`
          // here forces this row's own overflow-y to compute as non-"visible"
          // regardless of what's set (the same quirk noted on StatusRail),
          // which clips anything that pokes out above the row's own box, and
          // the row has no scroll room to the left/right of its first/last
          // card either. `pt-8`/`px-8` reserve room on every side so the
          // leftmost, rightmost, and topmost badges always have somewhere to
          // bleed into before hitting a clipping edge (confirmed clipped
          // without this).
          <div className="scrollbar-themed flex gap-4 overflow-x-auto px-8 pb-2 pt-8">
            {characters.map((character) => (
              <div key={character.id} className="w-[300px] shrink-0">
                <CharacterCard character={character} onRemove={removeCharacter} onUpdate={updateCharacter} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Inventory" storageKey="dm-dashboard-inventory-open">
        <p className="mb-4 text-sm text-slate-500">Items and gold across the whole party.</p>
        <InventoryOverview characters={characters} />
      </CollapsibleSection>

      {settingsOpen && (
        <CampaignFormModal
          campaign={{ ...campaignState, characterCount: characters.length }}
          initialCharacters={characters}
          actions={{ updateCampaign: patchCampaign }}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
