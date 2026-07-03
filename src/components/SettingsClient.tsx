"use client";

import { useState } from "react";
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

export function SettingsClient({ initialCharacters }: { initialCharacters: Character[] }) {
  const { characters, addFromUrl, removeCharacter, updateCharacter, reorderCharacters } =
    useCharacters(initialCharacters);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    const id = extractDndBeyondCharacterId(trimmed);
    if (!id) {
      setError(
        "Не вдалося розпізнати лінк. Очікується формат: https://www.dndbeyond.com/characters/1234567"
      );
      return;
    }
    if (characters.some((c) => c.dndBeyondUrl && extractDndBeyondCharacterId(c.dndBeyondUrl) === id)) {
      setError("Цей персонаж вже додано.");
      return;
    }

    setError(null);
    setSyncError(null);

    let character;
    try {
      character = await addFromUrl(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати персонажа.");
      return;
    }
    setUrl("");

    setSyncingId(character.id);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      await updateCharacter(character.id, synced);
    } catch (err) {
      const message = err instanceof Error ? err.message : "невідома помилка";
      setSyncError(
        `Не вдалося синхронізувати "${character.name}": ${message} Дані можна заповнити вручну на сторінці редагування.`
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
      setSyncError(
        `Не вдалося синхронізувати "${character.name}": ${
          err instanceof Error ? err.message : "невідома помилка"
        }.`
      );
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-50 mb-1">Налаштування</h1>
      <p className="text-sm text-slate-500 mb-6">
        Додайте лінки на персонажів D&D Beyond, щоб вони з&apos;явились на дашборді.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.dndbeyond.com/characters/27964361"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Додати
        </button>
      </form>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {syncError && <p className="text-sm text-amber-400 mb-4">{syncError}</p>}

      <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-300 mb-8">
        При додаванні лінка застосунок автоматично намагається підтягнути дані з
        D&D Beyond (стати, HP, AC, ресурси, spell slots). Це неофіційний API,
        тому персонаж має бути публічним, а деякі поля (роль, нотатки, AC для
        нестандартних білдів) варто перевірити й підправити вручну.
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">
          Додані персонажі ({characters.length})
        </h2>
        {characters.length > 1 && (
          <p className="text-xs text-slate-600">Перетягуйте ⠿, щоб змінити порядок на дашборді</p>
        )}
      </div>

      {characters.length === 0 && <p className="text-sm text-slate-600">Список порожній.</p>}

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
