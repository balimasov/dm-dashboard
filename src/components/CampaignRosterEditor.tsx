"use client";

import { useEffect, useState } from "react";
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
import { useCharacters } from "@/hooks/useCharacters";
import { Character, extractDndBeyondCharacterId } from "@/lib/types";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { SortableCharacterRow } from "@/components/SortableCharacterRow";

/** The add/sync/reorder roster UI, without any page-level chrome — embedded inside `CampaignFormModal`. */
export function CampaignRosterEditor({
  campaignId,
  initialCharacters,
  onCountChange,
}: {
  campaignId: string;
  initialCharacters: Character[];
  /** Roster edits happen inside this component's own `useCharacters` state — this reports count changes up so an enclosing modal can keep a stale `characterCount` in sync without lifting the whole list. */
  onCountChange?: (count: number) => void;
}) {
  const { characters, addFromUrl, removeCharacter, updateCharacter, reorderCharacters } =
    useCharacters(initialCharacters);

  useEffect(() => {
    onCountChange?.(characters.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters.length]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const trimmedUrl = url.trim();
  const ddbId = extractDndBeyondCharacterId(trimmedUrl);
  const canSubmit = ddbId !== null && !adding;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ddbId) {
      setError(
        "Couldn't recognize the link. Expected format: https://www.dndbeyond.com/characters/1234567"
      );
      return;
    }
    if (characters.some((c) => c.dndBeyondUrl && extractDndBeyondCharacterId(c.dndBeyondUrl) === ddbId)) {
      setError("This character has already been added.");
      return;
    }

    setError(null);
    setSyncError(null);
    setAdding(true);

    let character;
    try {
      character = await addFromUrl(trimmedUrl, campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add character. Please try again.");
      setAdding(false);
      return;
    }
    setUrl("");
    setAdding(false);

    setSyncingId(character.id);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      await updateCharacter(character.id, synced);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error.";
      setSyncError(
        `Failed to sync "${character.name}": ${message} You can fill in the data manually on the edit page.`
      );
    } finally {
      setSyncingId(null);
    }
  }

  async function handleResync(id: string) {
    const character = characters.find((c) => c.id === id);
    if (!character) return;
    setSyncError(null);
    setSyncingId(id);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      await updateCharacter(id, synced);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error.";
      setSyncError(`Failed to sync "${character.name}": ${message}`);
    } finally {
      setSyncingId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = characters.findIndex((c) => c.id === active.id);
    const newIndex = characters.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(characters, oldIndex, newIndex);
    reorderCharacters(reordered.map((c) => c.id));
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-1">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://www.dndbeyond.com/characters/27964361"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </form>
      <div className="mb-4 space-y-1">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {syncError && <p className="text-sm text-amber-400">{syncError}</p>}
      </div>

      <h3 className="mb-3 text-sm uppercase tracking-wide text-slate-500">
        Added Characters ({characters.length})
      </h3>

      {characters.length === 0 && <p className="text-sm text-slate-600">The list is empty.</p>}

      <DndContext
        id="characters-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={characters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {characters.map((c) => (
              <SortableCharacterRow
                key={c.id}
                character={c}
                syncing={syncingId === c.id}
                onResync={handleResync}
                onRemove={removeCharacter}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
