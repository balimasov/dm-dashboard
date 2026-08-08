"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignFormModal } from "@/components/CampaignFormModal";
import { ImportCampaignModal } from "@/components/ImportCampaignModal";
import { Hero } from "@/components/Hero";
import { Toast } from "@/components/Toast";
import { CopyIcon, DownloadIcon, PencilIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { MoreMenu, MORE_MENU_ITEM_CLASS } from "@/components/ui/MoreMenu";
import { POPOVER_SHELL_CLS, ROW_CARD_CLS } from "@/components/ui/containerStyles";
import {
  EMPTY_STATE_CLS,
  FORM_SECTION_HEADING_CLS,
  LIST_ROW_TITLE_CLS,
  MUTED_BODY_CLS,
} from "@/components/ui/typography";
import { apiFetch } from "@/lib/apiClient";
import { UserRole } from "@/lib/auth";
import { CampaignSummary, Character, Creature } from "@/lib/types";

/**
 * Split button (main click = open the existing New Campaign form, caret =
 * Import Campaign) — same shape as `SyncAllButton`'s own sync/auto-sync
 * split, chosen over a single dropdown so adding Import can't change what a
 * plain click on "+ New Campaign" does.
 */
function NewCampaignSplitButton({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative flex h-9 shrink-0">
      <button
        type="button"
        onClick={onNew}
        className="flex h-9 items-center whitespace-nowrap rounded-l-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500"
      >
        + New Campaign
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="More ways to start a campaign"
        title="Import Campaign"
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-r-lg border-l border-sky-800 bg-sky-600 text-white hover:bg-sky-500"
      >
        ▾
      </button>
      {menuOpen && (
        <div className={`absolute right-0 top-10 z-10 min-w-[10rem] py-1 ${POPOVER_SHELL_CLS}`}>
          <button
            type="button"
            className={MORE_MENU_ITEM_CLASS}
            onClick={() => {
              setMenuOpen(false);
              onImport();
            }}
          >
            <UploadIcon className="h-4 w-4 shrink-0" />
            Import Campaign
          </button>
        </div>
      )}
    </div>
  );
}

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

/**
 * `onEdit`/`onRemove`/`onDuplicate` are omitted entirely for a player — same
 * reasoning as `DashboardClient`'s own Settings gating: no reduced version
 * of "delete this campaign" or "edit its roster" exists for that role, so
 * the actions just aren't there rather than being present and broken.
 * Export is skipped too — it dumps the same enemies/NPCs/notes a player
 * never sees on the dashboard itself.
 *
 * All four actions live behind one kebab menu (`MoreMenu`, `variant="plain"`
 * — same shape `EntityActionsMenu` already uses for character/creature
 * cards) instead of separate Export/Edit/Remove controls that used to wrap
 * onto a second line on mobile once Duplicate joined them — a row is now
 * always exactly one line regardless of viewport.
 */
function CampaignRow({
  campaign,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  campaign: CampaignSummary;
  onEdit?: (campaign: CampaignSummary) => void;
  onDuplicate?: (campaign: CampaignSummary) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <li className={`relative flex items-center gap-3 ${ROW_CARD_CLS} px-4 py-3 transition-colors hover:border-slate-700 hover:bg-slate-900`}>
      <CampaignLogo campaign={campaign} />
      <div className="min-w-0 flex-1">
        {/* `after:absolute after:inset-0` stretches the link's hit area to
            cover the whole `<li>` (the standard "stretched link" card
            pattern) — a positioned pseudo-element always paints above
            non-positioned siblings regardless of DOM order, so it
            intercepts clicks anywhere on the card without needing the logo
            or character count to be links themselves. The kebab menu opts
            back out via its own `relative z-10` wrapper below, which stacks
            above this overlay. */}
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
      {(onEdit || onRemove) && (
        <div className="relative z-10 shrink-0">
          {/* `whitespace-nowrap` on every item (not just the longest one) so
              they all size consistently against the popover's own
              content-driven width — "Export Campaign" is the widest label
              here, longer than `MoreMenu`'s `min-w-[9rem]` default fits on
              one line otherwise. */}
          <MoreMenu label="Campaign actions" variant="plain">
            <a href={`/api/campaigns/${campaign.id}/export`} className={`${MORE_MENU_ITEM_CLASS} whitespace-nowrap`}>
              <DownloadIcon className="h-4 w-4 shrink-0" />
              Export Campaign
            </a>
            {onEdit && (
              <button type="button" className={`${MORE_MENU_ITEM_CLASS} whitespace-nowrap`} onClick={() => onEdit(campaign)}>
                <PencilIcon className="h-4 w-4 shrink-0" />
                Edit
              </button>
            )}
            {onDuplicate && (
              <button type="button" className={`${MORE_MENU_ITEM_CLASS} whitespace-nowrap`} onClick={() => onDuplicate(campaign)}>
                <CopyIcon className="h-4 w-4 shrink-0" />
                Duplicate
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className={`${MORE_MENU_ITEM_CLASS} whitespace-nowrap text-red-400 hover:text-red-300`}
                onClick={() => {
                  const confirmed = window.confirm(
                    `Delete "${campaign.name}"? This also deletes all ${campaign.characterCount} character(s) in it. This can't be undone.`
                  );
                  if (confirmed) onRemove(campaign.id);
                }}
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                Remove
              </button>
            )}
          </MoreMenu>
        </div>
      )}
    </li>
  );
}

export function CampaignsClient({ initialCampaigns, role }: { initialCampaigns: CampaignSummary[]; role: UserRole }) {
  const isDm = role === "dm";
  const { campaigns, addCampaign, updateCampaign, removeCampaign, duplicateCampaign, importCampaign, setCampaignSummary } =
    useCampaigns(initialCampaigns);
  const [modalState, setModalState] = useState<{
    campaign: CampaignSummary | null;
    characters: Character[];
    creatures: Creature[];
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

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

  async function handleDuplicate(campaign: CampaignSummary) {
    try {
      await duplicateCampaign(campaign.id);
      setToast({ message: `Duplicated "${campaign.name}".`, variant: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to duplicate campaign.", variant: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Hero />

      <div className="mb-3 flex items-center justify-between">
        <h2 className={`min-w-0 truncate ${FORM_SECTION_HEADING_CLS}`}>Your Campaigns ({campaigns.length})</h2>
        {isDm && (
          <NewCampaignSplitButton
            onNew={() => setModalState({ campaign: null, characters: [], creatures: [] })}
            onImport={() => setImportOpen(true)}
          />
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
              onDuplicate={isDm ? handleDuplicate : undefined}
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
      {importOpen && (
        <ImportCampaignModal
          onClose={() => setImportOpen(false)}
          onImport={importCampaign}
          onResult={(message, variant) => setToast({ message, variant })}
        />
      )}
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
