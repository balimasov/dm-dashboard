"use client";

import Link from "next/link";
import { Character, characterInfoLine } from "@/lib/types";
import { SyncTimestamp } from "./SyncTimestamp";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";

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
  return (
    <RosterRow
      id={character.id}
      avatar={<CharacterAvatar character={character} />}
      actions={
        <>
          {character.dndBeyondUrl && (
            <button
              onClick={() => onResync(character.id)}
              disabled={syncing}
              className="text-sky-400 hover:text-sky-300 disabled:opacity-50"
            >
              Sync
            </button>
          )}
          <Link href={`/characters/${character.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          <button onClick={() => onRemove(character.id)} className="text-red-500/80 hover:text-red-400">
            Remove
          </button>
        </>
      }
    >
      <p
        title={character.name}
        className="truncate text-lg font-semibold text-slate-100 transition-colors hover:text-white"
      >
        {character.name}
      </p>
      <p
        title={characterInfoLine(character)}
        className="truncate text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        {characterInfoLine(character)}
      </p>
      <p className="text-xs text-slate-600">Lvl {character.level}</p>
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
            <span className="text-sky-400">Syncing...</span>
          ) : character.lastSyncedAt ? (
            <span className="truncate text-slate-600">
              Synced <SyncTimestamp iso={character.lastSyncedAt} />
            </span>
          ) : (
            <span className="truncate text-amber-500">Not synced yet</span>
          )}
        </div>
      )}
    </RosterRow>
  );
}
