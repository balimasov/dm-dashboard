"use client";

import { ReactNode, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useCampaignData } from "@/contexts/CampaignDataContext";
import { CampaignLogoPicker } from "@/components/CampaignLogoPicker";
import { RosterManagerModal } from "@/components/RosterManagerModal";
import { NotesEditor } from "@/components/NotesEditor";
import { RosterRow } from "@/components/RosterRow";
import { getLinkVisual } from "@/lib/linkIcons";
import { Campaign, CampaignSummary, Character, Creature, QuickLink } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const MAX_QUICK_LINKS = 15;

/** Fixed-size slot for the icon/fallback badge — the two used to render at different sizes (16px icon vs. 20px fallback circle), which shifted every field to its right depending on whether a link's domain was recognized. */
function QuickLinkIcon({ url }: { url: string }) {
  const visual = url ? getLinkVisual(url) : null;
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {visual?.kind === "known" ? (
        <visual.Icon className={`h-4 w-4 ${visual.colorClass}`} />
      ) : (
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
          style={
            visual
              ? {
                  color: `hsl(${visual.hue}, 80%, 78%)`,
                  backgroundColor: `hsla(${visual.hue}, 70%, 50%, 0.18)`,
                  border: `1px solid hsl(${visual.hue}, 70%, 50%)`,
                }
              : undefined
          }
        >
          {visual?.kind === "fallback" ? visual.abbr : null}
        </span>
      )}
    </span>
  );
}

/** Local draft for label/url so typing doesn't PATCH on every keystroke — only committed (via `onSave`) on blur, same convention as the campaign Name field just above it in this same modal. */
function QuickLinkRow({
  link,
  onSave,
  onDelete,
}: {
  link: QuickLink;
  onSave: (updates: Partial<Pick<QuickLink, "label" | "url">>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);

  return (
    <RosterRow
      id={link.id}
      singleRow
      avatar={<QuickLinkIcon url={url} />}
      actions={
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove link"
          className="shrink-0 rounded p-1 text-slate-500 hover:text-red-400"
        >
          ✕
        </button>
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label !== link.label) onSave({ label });
          }}
          placeholder="Label"
          className="w-20 shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600 sm:w-56"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            if (url !== link.url) onSave({ url });
          }}
          placeholder="https://..."
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
      </div>
    </RosterRow>
  );
}

function QuickLinksSection({
  quickLinks,
  onChange,
}: {
  quickLinks: QuickLink[];
  onChange: (next: QuickLink[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = quickLinks.findIndex((l) => l.id === active.id);
    const newIndex = quickLinks.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(quickLinks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2">
      <DndContext id="quick-links-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={quickLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <QuickLinkRow
                key={link.id}
                link={link}
                onSave={(updates) => onChange(quickLinks.map((l) => (l.id === link.id ? { ...l, ...updates } : l)))}
                onDelete={() => onChange(quickLinks.filter((l) => l.id !== link.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {quickLinks.length < MAX_QUICK_LINKS ? (
        <button
          type="button"
          onClick={() => onChange([...quickLinks, { id: `link-${Date.now()}`, label: "", url: "" }])}
          className="text-sm text-sky-400 hover:text-sky-300"
        >
          + Add Link
        </button>
      ) : (
        <p className="text-xs text-slate-600">Max {MAX_QUICK_LINKS} links.</p>
      )}
    </div>
  );
}

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
 * edit mode in place instead of closing, and immediately opens
 * `RosterManagerModal` on top of it (see `rosterOpen`) — adding characters
 * is the obvious next step right after creating a campaign.
 *
 * Edit mode: same fields, each saves individually via `updateCampaign`
 * (blur/change). Character/creature roster management no longer lives here
 * at all — it moved to its own bigger `RosterManagerModal`, reachable from
 * the dashboard's per-section "+" buttons and kebab menu, since the old
 * combined "Campaign" + "Characters & Creatures" tabs crammed into this
 * modal's `max-w-2xl` had grown too cramped to manage a large roster in.
 */
export function CampaignFormModal({
  campaign,
  initialCharacters = [],
  initialCreatures = [],
  actions,
  onClose,
}: {
  campaign: CampaignSummary | null;
  initialCharacters?: Character[];
  initialCreatures?: Creature[];
  actions: Actions;
  onClose: (updated?: CampaignSummary) => void;
}) {
  const [current, setCurrent] = useState<CampaignSummary | null>(campaign);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [name, setName] = useState(campaign?.name ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(campaign?.logoUrl);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always called (rules of hooks) — unused whenever a page-level
  // `CampaignDataProvider` supplies its own live state below, in which case
  // this "own" instance just sits idle.
  const ownCharactersState = useCharacters(initialCharacters);
  const ownCreaturesState = useCreatures(current?.id ?? "", initialCreatures);
  const campaignData = useCampaignData();
  const charactersState = campaignData?.charactersState ?? ownCharactersState;
  const creaturesState = campaignData?.creaturesState ?? ownCreaturesState;

  const isEditing = current !== null;

  useScrollLock();

  function close() {
    onClose(current ? { ...current, characterCount: charactersState.characters.length } : undefined);
  }

  useEscapeToClose(close);

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
      setRosterOpen(true);
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
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-950 p-5"
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
                  <Button type="submit" disabled={!name.trim() || creating} className="mt-5 w-full">
                    {creating ? "Creating..." : "Create Campaign"}
                  </Button>
                )}
              </form>

              {isEditing && (
                <Section
                  title="Quick Links"
                  description="Reference docs/links you want reachable mid-session — shown behind a floating button on every page of this campaign."
                  divider={false}
                >
                  <QuickLinksSection
                    quickLinks={current.quickLinks ?? []}
                    onChange={(next) => saveField({ quickLinks: next })}
                  />
                </Section>
              )}
        </div>

        {isEditing && (
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={close}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>

    {rosterOpen && current && (
      <RosterManagerModal
        campaignId={current.id}
        initialTab="characters"
        charactersState={charactersState}
        creaturesState={creaturesState}
        characters={charactersState.characters}
        onClose={() => setRosterOpen(false)}
      />
    )}
    </>
  );
}
