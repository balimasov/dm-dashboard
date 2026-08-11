"use client";

import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { useDdbSync } from "@/hooks/useDdbSync";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { CARD_META_CLS, CARD_SUBTITLE_CLS, CARD_TITLE_CLS } from "./ui/typography";

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
      singleRow
      avatar={<CharacterAvatar character={character} />}
      actions={
        <EntityActionsMenu
          onEdit={() => onEdit(character)}
          name={character.name}
          hidden={character.hidden}
          onToggleHidden={() => onToggleHidden(character.id)}
          linkUrl={character.dndBeyondUrl}
          linkLabel="Open D&D Beyond"
          onSync={character.dndBeyondUrl ? sync : undefined}
          syncing={syncing}
          onRemove={() => onRemove(character.id)}
        />
      }
    >
      {/* Same three-line recipe as `CharacterHeader`'s own card header
          (`CARD_TITLE_CLS`/`CARD_SUBTITLE_CLS`/`CARD_META_CLS`) — this row
          used to hand-roll a visually different set of sizes/colors
          (`slate-100`/`slate-500`/`slate-600`), which read as a different
          component instead of the same character shown in a list. D&D
          Beyond itself lives in the kebab menu's "Open D&D Beyond" item
          now, not inline here — only the "not synced"/error banner still
          needs `DdbSyncStatus`, and only when there's actually one to show
          — see `CharacterCard`'s own comment on why this is conditionally
          mounted. */}
      <p title={character.name} className={CARD_TITLE_CLS}>
        {character.name}
        {character.hidden && <span className="ml-2 text-xs font-normal text-slate-500">(hidden)</span>}
      </p>
      <p title={characterInfoLine(character)} className={CARD_SUBTITLE_CLS}>
        {characterInfoLine(character)}
      </p>
      <p className={CARD_META_CLS}>Lvl {character.level}</p>
      {character.dndBeyondUrl && !character.synced && (
        <div className="mt-1">
          <DdbSyncStatus dndBeyondUrl={character.dndBeyondUrl} synced={character.synced} showLink={false} />
        </div>
      )}
    </RosterRow>
  );
}
