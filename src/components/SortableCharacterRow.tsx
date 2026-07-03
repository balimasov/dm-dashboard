"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Character } from "@/lib/types";

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
      className={`flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none px-1 text-slate-600 hover:text-slate-300 active:cursor-grabbing"
          aria-label="Перетягнути для зміни порядку"
        >
          ⠿
        </button>
        <div>
          <p className="text-sm font-medium text-slate-100">{character.name}</p>
          {character.dndBeyondUrl && (
            <a
              href={character.dndBeyondUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-400 hover:underline"
            >
              {character.dndBeyondUrl}
            </a>
          )}
          {syncing && <p className="text-xs text-sky-400">Синхронізація...</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
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
