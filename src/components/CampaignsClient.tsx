"use client";

import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/Button";
import { ROW_CARD_CLS } from "@/components/ui/containerStyles";
import {
  EMPTY_STATE_CLS,
  FORM_SECTION_HEADING_CLS,
  LIST_ROW_TITLE_CLS,
  MUTED_BODY_CLS,
} from "@/components/ui/typography";
import { apiFetch } from "@/lib/apiClient";
import { UserRole } from "@/lib/auth";
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

/** `onEdit`/`onRemove` are omitted entirely for a player — same reasoning as `DashboardClient`'s own Settings gating: no reduced version of "delete this campaign" or "edit its roster" exists for that role, so the actions just aren't there rather than being present and broken. Export is skipped too — it dumps the same enemies/NPCs/notes a player never sees on the dashboard itself. */
function CampaignRow({
  campaign,
  onEdit,
  onRemove,
}: {
  campaign: CampaignSummary;
  onEdit?: (campaign: CampaignSummary) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <li className={`relative flex flex-col gap-3 ${ROW_CARD_CLS} px-4 py-3 transition-colors hover:border-slate-700 hover:bg-slate-900 sm:flex-row sm:items-center`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CampaignLogo campaign={campaign} />
        <div className="min-w-0 flex-1">
          {/* `after:absolute after:inset-0` stretches the link's hit area to
              cover the whole `<li>` (the standard "stretched link" card
              pattern) — a positioned pseudo-element always paints above
              non-positioned siblings regardless of DOM order, so it
              intercepts clicks anywhere on the card without needing the logo
              or character count to be links themselves. The Export/Edit/Remove
              buttons opt back out via their own `relative z-10` wrapper below,
              which stacks above this overlay. */}
          <Link
            href={`/campaigns/${campaign.id}`}
            className={`line-clamp-2 break-words after:absolute after:inset-0 ${LIST_ROW_TITLE_CLS}`}
          >
            {campaign.name}
          </Link>
          <p className={MUTED_BODY_CLS}>
            {campaign.characterCount} {campaign.characterCount === 1 ? "character" : "characters"}
          </p>
        </div>
      </div>
      {(onEdit || onRemove) && (
        <div className="relative z-10 flex shrink-0 items-center gap-3 self-end sm:self-auto">
          {/* Same visual recipe as `Button variant="outline"` — can't actually
              be a `<Button>`, since it's a plain download link, and `Button`
              only renders a `<button>` (no polymorphic `as="a"`). */}
          <a
            href={`/api/campaigns/${campaign.id}/export`}
            title="Download this campaign (and its characters/creatures) as JSON"
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Export
          </a>
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(campaign)}
              className="shrink-0 px-3 py-1.5 text-sm"
            >
              Edit
            </Button>
          )}
          {onRemove && (
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
          )}
        </div>
      )}
    </li>
  );
}

export function CampaignsClient({ initialCampaigns, role }: { initialCampaigns: CampaignSummary[]; role: UserRole }) {
  const isDm = role === "dm";
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
        apiFetch(`/api/characters?campaignId=${campaign.id}`),
        apiFetch(`/api/creatures?campaignId=${campaign.id}`),
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
        <h2 className={FORM_SECTION_HEADING_CLS}>Your Campaigns ({campaigns.length})</h2>
        {isDm && (
          <Button type="button" onClick={() => setModalState({ campaign: null, characters: [], creatures: [] })}>
            + New Campaign
          </Button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <p className={EMPTY_STATE_CLS}>No campaigns yet — create one above.</p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              onEdit={isDm ? () => openEdit(c) : undefined}
              onRemove={isDm ? removeCampaign : undefined}
            />
          ))}
        </ul>
      )}
      {loadingEdit && <p className={`mt-3 ${EMPTY_STATE_CLS}`}>Loading...</p>}

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
