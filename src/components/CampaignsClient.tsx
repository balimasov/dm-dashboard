"use client";

import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { CampaignSummary, Character, Creature } from "@/lib/types";

function CampaignLogo({ campaign }: { campaign: CampaignSummary }) {
  if (campaign.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image can't optimize it
      <img
        src={campaign.logoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-md border border-slate-800 object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-800 text-lg font-semibold text-slate-600">
      {campaign.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function CampaignRow({
  campaign,
  onEdit,
  onRemove,
}: {
  campaign: CampaignSummary;
  onEdit: (campaign: CampaignSummary) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <CampaignLogo campaign={campaign} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="block break-words text-lg font-semibold text-slate-100 hover:underline"
        >
          {campaign.name}
        </Link>
        <p className="text-sm text-slate-500">
          {campaign.characterCount} {campaign.characterCount === 1 ? "character" : "characters"}
        </p>
      </div>
      <a
        href={`/api/campaigns/${campaign.id}/export`}
        title="Download this campaign (and its characters/creatures) as JSON"
        className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        Export
      </a>
      <button
        type="button"
        onClick={() => onEdit(campaign)}
        className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => {
          const confirmed = window.confirm(
            `Delete "${campaign.name}"? This also deletes all ${campaign.characterCount} character(s) in it. This can't be undone.`
          );
          if (confirmed) onRemove(campaign.id);
        }}
        className="shrink-0 text-sm text-red-500/80 hover:text-red-400"
      >
        Remove
      </button>
    </li>
  );
}

function Hero() {
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
      <img src="/logo.png" alt="" width={72} height={72} />
      <h1 className="text-2xl font-bold text-slate-50">DM Dashboard</h1>
      <p className="max-w-xl text-sm text-slate-400">
        Running a campaign means juggling character sheets, notes, and a dozen D&D Beyond tabs with no single
        place that has it all. DM Dashboard pulls a whole party — combat stats, inventory, spells, and notes —
        into one screen that stays in sync. Built for my own table, now shared with the rest of the DM community.
      </p>
    </div>
  );
}

export function CampaignsClient({ initialCampaigns }: { initialCampaigns: CampaignSummary[] }) {
  const { campaigns, addCampaign, updateCampaign, removeCampaign, setCampaignSummary } =
    useCampaigns(initialCampaigns);
  const [modalState, setModalState] = useState<{
    campaign: CampaignSummary | null;
    characters: Character[];
    creatures: Creature[];
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);

  async function openEdit(campaign: CampaignSummary) {
    setLoadingEdit(campaign.id);
    try {
      const [charactersRes, creaturesRes] = await Promise.all([
        fetch(`/api/characters?campaignId=${campaign.id}`),
        fetch(`/api/creatures?campaignId=${campaign.id}`),
      ]);
      const characters = charactersRes.ok ? ((await charactersRes.json()) as Character[]) : [];
      const creatures = creaturesRes.ok ? ((await creaturesRes.json()) as Creature[]) : [];
      setModalState({ campaign, characters, creatures });
    } finally {
      setLoadingEdit(null);
    }
  }

  function closeModal(updated?: CampaignSummary) {
    if (updated) setCampaignSummary(updated);
    setModalState(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Hero />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Your Campaigns ({campaigns.length})</h2>
        <button
          type="button"
          onClick={() => setModalState({ campaign: null, characters: [], creatures: [] })}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          + New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-slate-600">No campaigns yet — create one above.</p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              onEdit={() => openEdit(c)}
              onRemove={removeCampaign}
            />
          ))}
        </ul>
      )}
      {loadingEdit && <p className="mt-3 text-sm text-slate-600">Loading...</p>}

      {modalState && (
        <CampaignFormModal
          campaign={modalState.campaign}
          initialCharacters={modalState.characters}
          initialCreatures={modalState.creatures}
          actions={{ addCampaign, updateCampaign }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
