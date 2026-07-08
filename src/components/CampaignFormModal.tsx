"use client";

import { ReactNode, useEffect, useState } from "react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignRosterEditor } from "@/components/CampaignRosterEditor";
import { CreatureRosterEditor } from "@/components/CreatureRosterEditor";
import { CampaignLogoPicker } from "@/components/CampaignLogoPicker";
import { NotesEditor } from "@/components/NotesEditor";
import { Campaign, CampaignSummary, Character, Creature } from "@/lib/types";

type Actions = Pick<ReturnType<typeof useCampaigns>, "updateCampaign"> & {
  /** Omitted by callers that only ever open this modal in edit mode (e.g. the dashboard's Settings button) — there's no campaign-less create path there. */
  addCampaign?: ReturnType<typeof useCampaigns>["addCampaign"];
};

/**
 * One titled block of the modal — keeps every section's heading/spacing
 * identical instead of each field row inventing its own label style.
 * `divider` defaults on (a border-top separating it from the section
 * before), but Notes sits right under the name/logo row with its own
 * heading already doing the separating, so a line there read as redundant.
 */
function Section({
  title,
  description,
  children,
  divider = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <section className={`pt-5 first:pt-0 ${divider ? "border-t border-slate-800/80 first:border-t-0" : ""}`}>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

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
  initialCreatures,
  actions,
  onClose,
}: {
  campaign: CampaignSummary | null;
  initialCharacters: Character[];
  initialCreatures: Creature[];
  actions: Actions;
  onClose: (updated?: CampaignSummary, creatureCount?: number, rosterOrderChanged?: boolean) => void;
}) {
  const [current, setCurrent] = useState<CampaignSummary | null>(campaign);
  const [name, setName] = useState(campaign?.name ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(campaign?.logoUrl);
  const [characters, setCharacters] = useState(initialCharacters);
  const [characterCount, setCharacterCount] = useState(campaign?.characterCount ?? 0);
  const [creatureCount, setCreatureCount] = useState(initialCreatures.length);
  const [rosterOrderChanged, setRosterOrderChanged] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = current !== null;

  // Without this, scrolling this modal's own content on a page too short to
  // need scrolling itself instead scrolls the dashboard behind it (the
  // backdrop is `fixed`, but the body underneath is still a normal
  // scrollable document as far as the browser's wheel/touch-scroll gesture
  // is concerned) — same fix already applied to CharacterDetailsModal.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function close() {
    onClose(current ? { ...current, characterCount } : undefined, creatureCount, rosterOrderChanged);
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

        <div className="scrollbar-themed overflow-y-auto px-1">
          <form onSubmit={handleCreate}>
            <Section title="Details">
              <div className="flex items-center gap-3">
                <CampaignLogoPicker
                  logoUrl={logoUrl}
                  name={name}
                  onChange={(dataUrl) => {
                    setLogoUrl(dataUrl);
                    if (isEditing) saveField({ logoUrl: dataUrl });
                  }}
                />
                <div className="min-w-0 flex-1">
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
                    className="w-full min-w-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>
            </Section>

            <Section title="Notes" divider={false}>
              <NotesEditor
                value={notes}
                onChange={setNotes}
                onBlur={() => {
                  if (isEditing) saveField({ notes });
                }}
                placeholder="Campaign notes..."
              />
            </Section>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            {!isEditing && (
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Campaign"}
              </button>
            )}
          </form>

          {isEditing && (
            <Section title="Characters" description="Add D&D Beyond character links to have them show up on the dashboard.">
              <CampaignRosterEditor
                campaignId={current.id}
                initialCharacters={characters}
                onCountChange={setCharacterCount}
                onReorder={() => setRosterOrderChanged(true)}
              />
            </Section>
          )}

          {isEditing && (
            <Section
              title="Creatures"
              description="Companions & summons — search the bestiary by name, or add one blank and fill in its stat block afterwards."
            >
              <CreatureRosterEditor
                campaignId={current.id}
                initialCreatures={initialCreatures}
                characters={characters}
                onCountChange={setCreatureCount}
                onReorder={() => setRosterOrderChanged(true)}
              />
            </Section>
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
