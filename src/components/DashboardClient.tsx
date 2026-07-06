"use client";

import { useState } from "react";
import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { HeaderPortal } from "@/components/HeaderPortal";
import { InventoryOverview } from "@/components/InventoryOverview";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { Toast } from "@/components/Toast";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { Campaign, Character } from "@/lib/types";

/** Local state + save-on-blur — same lightweight pattern used elsewhere in this app, no dedicated save button. */
function CampaignNotes({ campaign }: { campaign: Campaign }) {
  const [notes, setNotes] = useState(campaign.notes);

  async function saveNotes() {
    if (notes === campaign.notes) return;
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={saveNotes}
      placeholder="Campaign notes..."
      rows={4}
      className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-600"
    />
  );
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
      <Breadcrumbs items={[{ label: "Campaigns", href: "/" }, { label: campaign.name }]} />

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

      <CollapsibleSection title={campaign.name} storageKey="dm-dashboard-campaign-open">
        <CampaignNotes campaign={campaign} />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Party (${characters.length})`}
        storageKey="dm-dashboard-characters-open"
        actions={
          <Link
            href={`/campaigns/${campaign.id}/settings`}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Settings
          </Link>
        }
      >
        <p className="mb-4 text-sm text-slate-500">
          Combat state, resources, and notes for every character.
        </p>

        {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

        {characters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 p-16 text-center text-slate-500">
            <p>No characters yet.</p>
            <Link
              href={`/campaigns/${campaign.id}/settings`}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              + Add character
            </Link>
          </div>
        ) : (
          // Status badges now straddle each card's *top* border and bleed
          // above it — `overflow-x-auto` here forces this row's own
          // overflow-y to compute as non-"visible" regardless of what's set
          // (the same quirk noted on StatusRail), which clips anything that
          // pokes out above the row's own box. `pt-5` reserves enough room
          // above the cards so the badges have somewhere to bleed into
          // before that clipping edge.
          <div className="scrollbar-themed flex gap-4 overflow-x-auto pb-2 pt-6">
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
    </div>
  );
}
