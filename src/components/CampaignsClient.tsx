"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignSummary } from "@/lib/types";

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19 3 20l1-4 12.5-12.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Name is a `Link` into the campaign, so renaming needs its own affordance rather than click-to-edit on the name itself (which QuickNoteRow uses, but there nothing else competes for that click). */
function CampaignRow({
  campaign,
  onRename,
  onRemove,
}: {
  campaign: CampaignSummary;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.name);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== campaign.name) onRename(campaign.id, trimmed);
    else setDraft(campaign.name);
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              else if (e.key === "Escape") {
                setDraft(campaign.name);
                setEditing(false);
              }
            }}
            onBlur={commitRename}
            className="w-full rounded-md border border-sky-700 bg-slate-800 px-2 py-1 text-lg font-semibold text-slate-100 outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="truncate text-lg font-semibold text-slate-100 hover:underline"
            >
              {campaign.name}
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft(campaign.name);
                setEditing(true);
              }}
              aria-label="Rename campaign"
              title="Rename campaign"
              className="shrink-0 rounded p-0.5 text-slate-600 hover:text-sky-400"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <p className="text-sm text-slate-500">
          {campaign.characterCount} {campaign.characterCount === 1 ? "character" : "characters"}
        </p>
      </div>
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

export function CampaignsClient({ initialCampaigns }: { initialCampaigns: CampaignSummary[] }) {
  const { campaigns, addCampaign, renameCampaign, removeCampaign } = useCampaigns(initialCampaigns);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);
    try {
      const campaign = await addCampaign(trimmed);
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign.");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-slate-50">Campaigns</h1>
      <p className="mb-6 text-sm text-slate-500">Pick a campaign to manage its party, or start a new one.</p>

      <form onSubmit={handleSubmit} className="mb-1 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Campaign name"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "+ New Campaign"}
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <h2 className="mb-3 mt-6 text-sm uppercase tracking-wide text-slate-500">Your Campaigns ({campaigns.length})</h2>

      {campaigns.length === 0 ? (
        <p className="text-sm text-slate-600">No campaigns yet — create one above.</p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} onRename={renameCampaign} onRemove={removeCampaign} />
          ))}
        </ul>
      )}
    </div>
  );
}
