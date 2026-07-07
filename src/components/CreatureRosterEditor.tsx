"use client";

import { useEffect, useState } from "react";
import { useCreatures } from "@/hooks/useCreatures";
import { Character, Creature, CreatureTemplate, creatureInfoLine } from "@/lib/types";
import { CreatureFormFields, CreatureFormValue, emptyCreatureFormValue } from "@/components/CreatureFormFields";
import { creatureToFormValue, formValueToAddCreatureInput, formValueToCreatureUpdates, templateToFormValue } from "@/lib/creatureForm";

function AddCreaturePanel({
  characters,
  onAdd,
}: {
  characters: Character[];
  onAdd: (value: CreatureFormValue, templateId?: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatureTemplate[] | null>(null);
  const [draft, setDraft] = useState<CreatureFormValue | null>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/bestiary?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as CreatureTemplate[];
      setResults(data);
      if (data.length === 0 && !draft) {
        // Nothing found — jump straight to a blank manual form pre-filled with the searched name.
        setDraft({ ...emptyCreatureFormValue(), templateName: trimmed });
      }
    } catch {
      setSearchError("Search failed — you can still add this creature manually below.");
      setDraft((d) => d ?? { ...emptyCreatureFormValue(), templateName: trimmed });
    } finally {
      setSearching(false);
    }
  }

  function pickResult(template: CreatureTemplate) {
    setDraft(templateToFormValue(template));
    setPickedTemplateId(template.id);
    setResults(null);
  }

  function startManual() {
    setDraft({ ...emptyCreatureFormValue(), templateName: query.trim() });
    setResults(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.templateName.trim()) return;
    setAdding(true);
    try {
      await onAdd(draft, pickedTemplateId);
      setDraft(null);
      setPickedTemplateId(undefined);
      setQuery("");
      setResults(null);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Search the SRD bestiary or your own saved creatures by name, then fill in (or adjust) the stat block.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
          placeholder="Unicorn, Wolf, Imp..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>
      {searchError && <p className="text-sm text-amber-400">{searchError}</p>}

      {results && results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{t.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {creatureInfoLine(t)} · AC {t.ac} · {t.maxHp} HP
                  <span className="ml-1.5 text-slate-600">{t.origin === "srd" ? "(SRD)" : "(Saved)"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => pickResult(t)}
                className="shrink-0 text-sm text-sky-400 hover:underline"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && !draft && (
        <p className="text-sm text-slate-600">
          No matches — likely not free SRD content (e.g. a Monster Manual exclusive).{" "}
          <button type="button" onClick={startManual} className="text-sky-400 hover:underline">
            Add it manually
          </button>
          .
        </p>
      )}

      {draft && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-800 p-3">
          <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => (d ? { ...d, ...u } : d))} characters={characters} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setPickedTemplateId(undefined);
              }}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!draft.templateName.trim() || adding}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {adding ? "Adding..." : "Add Creature"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function CreatureRow({
  creature,
  characters,
  onUpdate,
  onRemove,
}: {
  creature: Creature;
  characters: Character[];
  onUpdate: (id: string, updates: Partial<Creature>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreatureFormValue>(() => creatureToFormValue(creature));
  const [saving, setSaving] = useState(false);
  const owner = characters.find((c) => c.id === creature.ownerCharacterId);

  function startEdit() {
    setDraft(creatureToFormValue(creature));
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(creature.id, formValueToCreatureUpdates(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <form onSubmit={handleSave} className="space-y-3">
          <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => ({ ...d, ...u }))} characters={characters} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-100">{creature.name}</p>
        <p className="truncate text-xs text-slate-500">
          {creatureInfoLine(creature)} · AC {creature.ac} · {creature.hp}/{creature.maxHp} HP
          {owner && <span className="text-slate-600"> · {owner.name}</span>}
          {creature.source && <span className="text-slate-600"> · {creature.source}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <button type="button" onClick={startEdit} className="text-slate-400 hover:text-slate-200">
          Edit
        </button>
        <button type="button" onClick={() => onRemove(creature.id)} className="text-red-500/80 hover:text-red-400">
          Remove
        </button>
      </div>
    </li>
  );
}

/** The add/edit/remove creature-companion UI, embedded inside `CampaignFormModal` below the character roster editor — same shape as `CampaignRosterEditor`, but for companions/summons instead of player characters. */
export function CreatureRosterEditor({
  campaignId,
  initialCreatures,
  characters,
  onCountChange,
}: {
  campaignId: string;
  initialCreatures: Creature[];
  characters: Character[];
  onCountChange?: (count: number) => void;
}) {
  const { creatures, addCreature, updateCreature, removeCreature } = useCreatures(campaignId, initialCreatures);

  useEffect(() => {
    onCountChange?.(creatures.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatures.length]);

  async function handleAdd(value: CreatureFormValue, templateId?: string) {
    await addCreature(formValueToAddCreatureInput(value, templateId));
  }

  return (
    <div>
      <AddCreaturePanel characters={characters} onAdd={handleAdd} />

      <h3 className="mb-3 mt-5 text-sm uppercase tracking-wide text-slate-500">Added Creatures ({creatures.length})</h3>
      {creatures.length === 0 ? (
        <p className="text-sm text-slate-600">No companions or summons yet.</p>
      ) : (
        <ul className="space-y-2">
          {creatures.map((creature) => (
            <CreatureRow
              key={creature.id}
              creature={creature}
              characters={characters}
              onUpdate={updateCreature}
              onRemove={removeCreature}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
