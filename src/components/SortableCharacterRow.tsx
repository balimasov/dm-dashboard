"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Character, characterInfoLine } from "@/lib/types";
import { SyncTimestamp } from "./SyncTimestamp";
import { CharacterAvatar } from "./CharacterAvatar";

export function SortableCharacterRow({
  character,
  syncing,
  onResync,
  onRemove,
}: {
  character: Character;
  syncing: boolean;
  onResync: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: character.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none px-1 text-slate-600 hover:text-slate-300 active:cursor-grabbing"
          aria-label="Перетягнути для зміни порядку"
        >
          ⠿
        </button>
        <CharacterAvatar character={character} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-100">{character.name}</p>
          <p className="truncate text-xs text-slate-500">{characterInfoLine(character)}</p>
          {character.dndBeyondUrl && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <a
                href={character.dndBeyondUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sky-400 hover:underline"
              >
                D&D Beyond ↗
              </a>
              <span className="text-slate-700">·</span>
              {syncing ? (
                <span className="text-sky-400">Синхронізація...</span>
              ) : character.lastSyncedAt ? (
                <span className="truncate text-slate-600">
                  Синхронізовано <SyncTimestamp iso={character.lastSyncedAt} />
                </span>
              ) : (
                <span className="truncate text-amber-500">Ще не синхронізовано</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {character.dndBeyondUrl && (
          <button
            onClick={() => onResync(character.id)}
            disabled={syncing}
            className="text-sky-400 hover:text-sky-300 disabled:opacity-50"
          >
            Синхронізувати
          </button>
        )}
        <Link href={`/characters/${character.id}/edit`} className="text-slate-400 hover:text-slate-200">
          Редагувати
        </Link>
        <button onClick={() => onRemove(character.id)} className="text-red-500/80 hover:text-red-400">
          Видалити
        </button>
      </div>
    </li>
  );
}
