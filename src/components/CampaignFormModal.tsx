"use client";

import { useState } from "react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignRosterEditor } from "@/components/CampaignRosterEditor";
import { CampaignLogoPicker } from "@/components/CampaignLogoPicker";
import { NotesEditor } from "@/components/NotesEditor";
import { Campaign, CampaignSummary, Character } from "@/lib/types";

type Actions = Pick<ReturnType<typeof useCampaigns>, "updateCampaign"> & {
  /** Omitted by callers that only ever open this modal in edit mode (e.g. the dashboard's Settings button) — there's no campaign-less create path there. */
  addCampaign?: ReturnType<typeof useCampaigns>["addCampaign"];
};

/**
 * Create mode (`campaign === null`): name/notes/logo only — no roster section
 * since the campaign doesn't exist yet. On successful create, switches to
 * edit mode in place instead of closing, so the roster editor for the new
 * campaign appears immediately.
 *
 * Edit mode: same fields, each field saves individually via `updateCampaign`
 * (blur/change), plus the roster editor with characters already loaded.
 */
export function CampaignFormModal({
  campaign,
  initialCharacters,
  actions,
  onClose,
}: {
  campaign: CampaignSummary | null;
  initialCharacters: Character[];
  actions: Actions;
  onClose: (updated?: CampaignSummary) => void;
}) {
  const [current, setCurrent] = useState<CampaignSummary | null>(campaign);
  const [name, setName] = useState(campaign?.name ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(campaign?.logoUrl);
  const [characters, setCharacters] = useState(initialCharacters);
  const [characterCount, setCharacterCount] = useState(campaign?.characterCount ?? 0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = current !== null;

  function close() {
    onClose(current ? { ...current, characterCount } : undefined);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!actions.addCampaign) return;

    setCreating(true);
    setError(null);
    try {
      const created = await actions.addCampaign({ name: trimmed, notes, logoUrl });
      setCurrent({ ...created, characterCount: 0 });
      setCharacters([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  }

  function saveField(updates: Partial<Campaign>) {
    if (!current) return;
    actions.updateCampaign(current.id, updates);
    setCurrent({ ...current, ...updates });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">{isEditing ? "Edit Campaign" : "New Campaign"}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="scrollbar-themed overflow-y-auto pr-1">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-start gap-3">
              <CampaignLogoPicker
                logoUrl={logoUrl}
                name={name}
                onChange={(dataUrl) => {
                  setLogoUrl(dataUrl);
                  if (isEditing) saveField({ logoUrl: dataUrl });
                }}
              />
              <div className="flex-1">
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  onBlur={() => {
                    const trimmed = name.trim();
                    if (isEditing && trimmed && trimmed !== current.name) saveField({ name: trimmed });
                  }}
                  placeholder="Campaign name"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Notes</label>
              <NotesEditor
                value={notes}
                onChange={setNotes}
                onBlur={() => {
                  if (isEditing) saveField({ notes });
                }}
                placeholder="Campaign notes..."
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {!isEditing && (
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Campaign"}
              </button>
            )}
          </form>

          {isEditing && (
            <div className="mt-6">
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Characters</label>
              <CampaignRosterEditor
                campaignId={current.id}
                initialCharacters={characters}
                onCountChange={setCharacterCount}
              />
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
