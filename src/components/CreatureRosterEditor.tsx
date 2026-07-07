"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddCreatureInput, useCreatures } from "@/hooks/useCreatures";
import { Character, Creature, CreatureTemplate, creatureInfoLine } from "@/lib/types";
import { emptyCreatureFormValue } from "@/components/CreatureFormFields";
import { formValueToAddCreatureInput, templateToFormValue } from "@/lib/creatureForm";

/**
 * Deliberately minimal, same weight as the character roster's "paste a
 * D&D Beyond link" add step — search for the general name, pick a match (or
 * add it blank if nothing's found), done. No stat-block form shown here at
 * all; the full stat block is filled in afterwards via each creature's own
 * `/creatures/[id]/edit` page, same as a character's details live on its own
 * edit page rather than inline in this list.
 */
function AddCreaturePanel({ onAdd }: { onAdd: (input: AddCreatureInput) => Promise<Creature> }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatureTemplate[]>([]);
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
      setSearched(true);
    } catch {
      setSearchError("Search failed — you can still add this creature manually below.");
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function addTemplate(template: CreatureTemplate) {
    setAdding(true);
    try {
      await onAdd(formValueToAddCreatureInput(templateToFormValue(template), template.id));
      reset();
    } finally {
      setAdding(false);
    }
  }

  async function addManual() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAdd(formValueToAddCreatureInput({ ...emptyCreatureFormValue(), templateName: trimmed }));
      reset();
    } finally {
      setAdding(false);
    }
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Search the SRD bestiary or your own saved creatures by name — pick a match to add it, or add it blank and
        fill in the stat block on its own edit page afterwards.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
          placeholder="Unicorn, Wolf, Imp..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearched(false);
          }}
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

      {searched && results.length > 0 && (
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
                onClick={() => addTemplate(t)}
                disabled={adding}
                className="shrink-0 text-sm text-sky-400 hover:underline disabled:opacity-50"
              >
                {adding ? "Adding..." : "Use"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className="text-sm text-slate-600">
          No matches for &quot;{query.trim()}&quot; — likely not free SRD content (e.g. a Monster Manual exclusive).{" "}
          <button type="button" onClick={addManual} disabled={adding} className="text-sky-400 hover:underline disabled:opacity-50">
            {adding ? "Adding..." : "Add it anyway"}
          </button>
          , then fill in its stat block on its own edit page.
        </p>
      )}
    </div>
  );
}

function CreatureRow({
  creature,
  characters,
  onRemove,
}: {
  creature: Creature;
  characters: Character[];
  onRemove: (id: string) => Promise<void>;
}) {
  const owner = characters.find((c) => c.id === creature.ownerCharacterId);

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
        <Link href={`/creatures/${creature.id}/edit`} className="text-slate-400 hover:text-slate-200">
          Edit
        </Link>
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
  const { creatures, addCreature, removeCreature } = useCreatures(campaignId, initialCreatures);

  useEffect(() => {
    onCountChange?.(creatures.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatures.length]);

  return (
    <div>
      <AddCreaturePanel onAdd={addCreature} />

      <h3 className="mb-3 mt-5 text-sm uppercase tracking-wide text-slate-500">Added Creatures ({creatures.length})</h3>
      {creatures.length === 0 ? (
        <p className="text-sm text-slate-600">No companions or summons yet.</p>
      ) : (
        <ul className="space-y-2">
          {creatures.map((creature) => (
            <CreatureRow key={creature.id} creature={creature} characters={characters} onRemove={removeCreature} />
          ))}
        </ul>
      )}
    </div>
  );
}
