"use client";

import Link from "next/link";
import { Character, characterInfoLine } from "@/lib/types";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";

export function SortableCharacterRow({
  character,
  syncing,
  onResync,
  onRemove,
  onToggleHidden,
}: {
  character: Character;
  syncing: boolean;
  onResync: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  return (
    <RosterRow
      id={character.id}
      dimmed={character.hidden}
      avatar={<CharacterAvatar character={character} />}
      actions={
        <div className="flex items-center gap-3">
          <Link href={`/characters/${character.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onToggleHidden(character.id)}
            className="text-slate-400 hover:text-slate-200"
          >
            {character.hidden ? "Show" : "Hide"}
          </button>
          <button
            onClick={() => {
              const confirmed = window.confirm(`Remove "${character.name}" from this campaign? This can't be undone.`);
              if (confirmed) onRemove(character.id);
            }}
            className="text-red-500/80 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      }
    >
      <p
        title={character.name}
        className="truncate text-lg font-semibold text-slate-100 transition-colors hover:text-white"
      >
        {character.name}
        {character.hidden && <span className="ml-2 text-xs font-normal text-slate-500">(hidden)</span>}
      </p>
      <p
        title={characterInfoLine(character)}
        className="truncate text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        {characterInfoLine(character)}
      </p>
      <p className="text-xs text-slate-600">Lvl {character.level}</p>
      <div className="mt-1">
        <DdbSyncStatus
          dndBeyondUrl={character.dndBeyondUrl}
          synced={character.synced}
          lastSyncedAt={character.lastSyncedAt}
          syncing={syncing}
          onSync={() => onResync(character.id)}
        />
      </div>
    </RosterRow>
  );
}
