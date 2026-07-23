"use client";

import Link from "next/link";
import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { EyeIcon, EyeOffIcon, PencilIcon, TrashIcon } from "./ui/icons";

export function SortableCharacterRow({
  character,
  syncing,
  onRemove,
  onToggleHidden,
}: {
  character: Character;
  syncing: boolean;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  return (
    <RosterRow
      id={character.id}
      dimmed={character.hidden}
      avatar={<CharacterAvatar character={character} />}
      actions={
        <div className="flex items-center gap-1">
          <Link
            href={`/characters/${character.id}/edit`}
            title="Edit"
            aria-label="Edit"
            className="rounded p-1 text-slate-400 hover:text-slate-200"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => onToggleHidden(character.id)}
            title={character.hidden ? "Show" : "Hide"}
            aria-label={character.hidden ? "Show" : "Hide"}
            className="rounded p-1 text-slate-400 hover:text-slate-200"
          >
            {character.hidden ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(`Remove "${character.name}" from this campaign? This can't be undone.`);
              if (confirmed) onRemove(character.id);
            }}
            title="Remove"
            aria-label="Remove"
            className="rounded p-1 text-red-500/80 hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
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
        />
      </div>
    </RosterRow>
  );
}
