"use client";

import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { useDdbSync } from "@/hooks/useDdbSync";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { ExternalLinkIcon } from "./ui/icons";

/** Same `useDdbSync` hook `CharacterCard`'s own kebab menu uses — this row's "Sync" action used to be missing entirely, having drifted from the card's menu since nothing here ever fed `EntityActionsMenu` an `onSync`. Calling the exact same hook here (instead of hand-rolling a second sync trigger) is what keeps the two menus identical by construction rather than by remembering to update both. */
export function SortableCharacterRow({
  character,
  onUpdate,
  onEdit,
  onRemove,
  onToggleHidden,
}: {
  character: Character;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onEdit: (character: Character) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  const { syncing, sync } = useDdbSync(character, onUpdate);

  return (
    <RosterRow
      id={character.id}
      dimmed={character.hidden}
      avatar={<CharacterAvatar character={character} />}
      actions={
        <EntityActionsMenu
          onEdit={() => onEdit(character)}
          name={character.name}
          hidden={character.hidden}
          onToggleHidden={() => onToggleHidden(character.id)}
          onSync={character.dndBeyondUrl ? sync : undefined}
          syncing={syncing}
          onRemove={() => onRemove(character.id)}
        />
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
      {/* D&D Beyond link inline on the "Lvl N" line, no clock — same
          treatment as `CharacterHeader`'s own Lvl line on the card. Only the
          "not synced"/error banners still need `DdbSyncStatus`, and only
          when there's actually one to show — see `CharacterCard`'s own
          comment on why this is conditionally mounted. */}
      <p className="flex items-center gap-1 text-xs text-slate-600">
        <span className="shrink-0">Lvl {character.level}</span>
        {character.dndBeyondUrl && (
          <>
            <span className="shrink-0">·</span>
            <a
              href={character.dndBeyondUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 shrink items-center gap-0.5 truncate text-sky-400 hover:underline"
            >
              D&amp;D Beyond <ExternalLinkIcon className="h-3 w-3 shrink-0" />
            </a>
          </>
        )}
      </p>
      {character.dndBeyondUrl && !character.synced && (
        <div className="mt-1">
          <DdbSyncStatus dndBeyondUrl={character.dndBeyondUrl} synced={character.synced} showLink={false} />
        </div>
      )}
    </RosterRow>
  );
}
