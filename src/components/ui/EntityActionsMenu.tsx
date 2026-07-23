"use client";

import Link from "next/link";
import { ClockIcon, CopyIcon, EyeIcon, EyeOffIcon, PencilIcon, RefreshIcon, TrashIcon } from "./icons";
import { MoreMenu, MORE_MENU_ITEM_CLASS } from "./MoreMenu";

/**
 * Kebab-triggered Sync/Edit/Duplicate/HP History/Hide/Remove menu shared by
 * `CharacterCard`/`CreatureCard` and their details modals — replaces what
 * used to be a standalone Edit link + Remove button in the card footer plus
 * separate pencil/trash icons in the modal, so the same actions live in one
 * place with one visual convention across all four call sites. `onSync` is
 * omitted entirely for creatures (no D&D Beyond link to sync from);
 * `onDuplicate`/`onShowHpHistory` are omitted for characters (cloning a D&D
 * Beyond-linked character doesn't make sense, and a character's HP currently
 * only ever changes via sync, not manual editing, so there's no history yet
 * worth showing — only `CreatureCard`/`CreatureDetailsModal` pass either).
 */
export function EntityActionsMenu({
  editHref,
  name,
  hidden,
  onToggleHidden,
  onSync,
  syncing,
  onDuplicate,
  onShowHpHistory,
  onRemove,
  variant = "plain",
}: {
  editHref: string;
  name: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  onDuplicate?: () => void;
  onShowHpHistory?: () => void;
  onRemove?: () => void;
  variant?: "boxed" | "plain";
}) {
  return (
    <MoreMenu label="Actions" portal variant={variant}>
      {onSync && (
        <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onSync} disabled={syncing}>
          <RefreshIcon className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </button>
      )}
      <Link href={editHref} className={MORE_MENU_ITEM_CLASS}>
        <PencilIcon className="h-4 w-4 shrink-0" />
        Edit
      </Link>
      {onDuplicate && (
        <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onDuplicate}>
          <CopyIcon className="h-4 w-4 shrink-0" />
          Duplicate
        </button>
      )}
      {onShowHpHistory && (
        <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onShowHpHistory}>
          <ClockIcon className="h-4 w-4 shrink-0" />
          HP History
        </button>
      )}
      {onToggleHidden && (
        <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onToggleHidden}>
          {hidden ? <EyeIcon className="h-4 w-4 shrink-0" /> : <EyeOffIcon className="h-4 w-4 shrink-0" />}
          {hidden ? "Show" : "Hide"}
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          className={`${MORE_MENU_ITEM_CLASS} text-red-400 hover:text-red-300`}
          onClick={() => {
            const confirmed = window.confirm(`Remove "${name}" from this campaign? This can't be undone.`);
            if (confirmed) onRemove();
          }}
        >
          <TrashIcon className="h-4 w-4 shrink-0" />
          Remove
        </button>
      )}
    </MoreMenu>
  );
}
