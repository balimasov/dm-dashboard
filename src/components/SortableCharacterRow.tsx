"use client";

import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { IconButton } from "./ui/IconButton";
import { EyeIcon, EyeOffIcon, PencilIcon, TrashIcon } from "./ui/icons";

export function SortableCharacterRow({
  character,
  syncing,
  onEdit,
  onRemove,
  onToggleHidden,
}: {
  character: Character;
  syncing: boolean;
  onEdit: (character: Character) => void;
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
          <IconButton tone="muted" onClick={() => onEdit(character)} title="Edit" aria-label="Edit">
            <PencilIcon className="h-4 w-4" />
          </IconButton>
          <IconButton
            tone="muted"
            onClick={() => onToggleHidden(character.id)}
            title={character.hidden ? "Show" : "Hide"}
            aria-label={character.hidden ? "Show" : "Hide"}
          >
            {character.hidden ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
          </IconButton>
          <IconButton
            tone="danger"
            onClick={() => {
              const confirmed = window.confirm(`Remove "${character.name}" from this campaign? This can't be undone.`);
              if (confirmed) onRemove(character.id);
            }}
            title="Remove"
            aria-label="Remove"
          >
            <TrashIcon className="h-4 w-4" />
          </IconButton>
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
