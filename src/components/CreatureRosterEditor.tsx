"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { AddCreatureInput, useCreatures } from "@/hooks/useCreatures";
import { Character, Creature, CreatureSearchHit, CreatureTemplate, creatureInfoLine } from "@/lib/types";
import { emptyCreatureFormValue } from "@/components/CreatureFormFields";
import { formValueToAddCreatureInput, templateToFormValue } from "@/lib/creatureForm";
import { Avatar } from "@/components/Avatar";
import { RosterRow } from "@/components/RosterRow";

/**
 * Deliberately minimal, same weight as the character roster's "paste a
 * D&D Beyond link" add step — search for the general name, pick a match (or
 * add it blank if nothing's found), done. No stat-block form shown here at
 * all; the full stat block is filled in afterwards via each creature's own
 * `/creatures/[id]/edit` page, same as a character's details live on its own
 * edit page rather than inline in this list.
 *
 * Search results are lightweight previews (name/type/size/CR) — a popular
 * query can return upwards of a hundred creature hits, so the full stat
 * block is only fetched (`/api/bestiary/resolve`) for the one actually
 * picked, not for every row in the list.
 */
function AddCreaturePanel({ onAdd }: { onAdd: (input: AddCreatureInput) => Promise<Creature> }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatureSearchHit[]>([]);
  const [adding, setAdding] = useState(false);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/bestiary?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as CreatureSearchHit[];
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

  async function addHit(hit: CreatureSearchHit) {
    setAdding(true);
    try {
      const res = await fetch(`/api/bestiary/resolve?id=${encodeURIComponent(hit.id)}`);
      if (!res.ok) throw new Error("Failed to load stat block.");
      const template = (await res.json()) as CreatureTemplate;
      await onAdd(formValueToAddCreatureInput(templateToFormValue(template), template.id));
      reset();
    } catch {
      setSearchError(`Failed to load "${hit.name}"'s stat block — try again.`);
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
        <ul className="scrollbar-themed max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {results.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{t.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {creatureInfoLine(t)}
                  {t.challengeRating && ` · CR ${t.challengeRating}`}
                  <span className="ml-1.5 text-slate-600">{t.origin === "srd" ? "(SRD)" : "(Saved)"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => addHit(t)}
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
  const infoLine = [creatureInfoLine(creature), creature.challengeRating && `CR ${creature.challengeRating}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <RosterRow
      id={creature.id}
      avatar={<Avatar label={creature.name} />}
      actions={
        <>
          <Link href={`/creatures/${creature.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          <button type="button" onClick={() => onRemove(creature.id)} className="text-red-500/80 hover:text-red-400">
            Remove
          </button>
        </>
      }
    >
      <p title={creature.name} className="truncate text-lg font-semibold text-slate-100">
        {creature.name}
      </p>
      <p title={infoLine} className="truncate text-xs text-slate-500">
        {infoLine}
      </p>
      <p className="truncate text-xs text-slate-600">
        AC {creature.ac} · {creature.hp}/{creature.maxHp} HP
        {owner && ` · ${owner.name}`}
        {creature.source && ` · ${creature.source}`}
      </p>
    </RosterRow>
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
  const { creatures, addCreature, removeCreature, reorderCreatures } = useCreatures(campaignId, initialCreatures);

  useEffect(() => {
    onCountChange?.(creatures.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatures.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = creatures.findIndex((c) => c.id === active.id);
    const newIndex = creatures.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(creatures, oldIndex, newIndex);
    reorderCreatures(reordered.map((c) => c.id));
  }

  return (
    <div>
      <AddCreaturePanel onAdd={addCreature} />

      <div className="mb-3 mt-5 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wide text-slate-500">Added Creatures ({creatures.length})</h3>
        {creatures.length > 1 && <p className="text-xs text-slate-600">Drag ⠿ to reorder on the dashboard</p>}
      </div>
      {creatures.length === 0 ? (
        <p className="text-sm text-slate-600">No companions or summons yet.</p>
      ) : (
        <DndContext id="creatures-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={creatures.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {creatures.map((creature) => (
                <CreatureRow key={creature.id} creature={creature} characters={characters} onRemove={removeCreature} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
