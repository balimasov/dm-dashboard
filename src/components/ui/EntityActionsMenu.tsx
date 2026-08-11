"use client";

import { useState } from "react";
import { confirmRemoveFromCampaign } from "@/lib/confirm";
import { ClockIcon, CopyIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, PencilIcon, RefreshIcon, TrashIcon } from "./icons";
import { MoreMenu, MORE_MENU_ITEM_CLASS } from "./MoreMenu";

/** Upper bound on the inline duplicate-count stepper — well past any real encounter's need for one more of the same creature, just there so the +/- pair can't be held down into something absurd. */
const MAX_DUPLICATE_COUNT = 20;

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
  onEdit,
  name,
  hidden,
  onToggleHidden,
  linkUrl,
  linkLabel,
  onSync,
  syncing,
  onDuplicate,
  onShowHpHistory,
  onRemove,
  variant = "plain",
}: {
  onEdit: () => void;
  name: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  /** External reference link (D&D Beyond for characters, SRD/Reference for creatures) — rendered as a real `<a>` so native middle-click/ctrl-click/"open in new tab" still work, right after Edit and ahead of every other action. */
  linkUrl?: string;
  linkLabel?: string;
  onSync?: () => void;
  syncing?: boolean;
  onDuplicate?: (count: number) => void;
  onShowHpHistory?: () => void;
  onRemove?: () => void;
  variant?: "boxed" | "plain";
}) {
  // Local to this menu instance, not the entity — always starts (and resets
  // back to) 1, the same "click Duplicate, get one copy" behavior as before
  // this stepper existed. Raising it only changes the *next* click's count;
  // it's a one-shot modifier on the action, not a sticky preference.
  const [duplicateCount, setDuplicateCount] = useState(1);

  return (
    <MoreMenu label="Actions" portal variant={variant}>
      <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onEdit}>
        <PencilIcon className="h-4 w-4 shrink-0" />
        Edit
      </button>
      {linkUrl && (
        <a href={linkUrl} target="_blank" rel="noreferrer" className={MORE_MENU_ITEM_CLASS}>
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
          {linkLabel}
        </a>
      )}
      {onSync && (
        <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={onSync} disabled={syncing}>
          <RefreshIcon className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </button>
      )}
      {onDuplicate && (
        <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-slate-300 hover:text-slate-100"
            onClick={() => {
              onDuplicate(duplicateCount);
              setDuplicateCount(1);
            }}
          >
            <CopyIcon className="h-4 w-4 shrink-0" />
            Duplicate
          </button>
          {/* `stopPropagation` here, not on each button — `MoreMenu`'s panel
              closes on any click inside it (see its own doc comment), which
              would otherwise dismiss the menu on every +/- tap instead of
              letting the count be bumped a few times before actually
              duplicating. */}
          <span
            className="flex shrink-0 items-center overflow-hidden rounded border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fewer copies"
              disabled={duplicateCount <= 1}
              onClick={() => setDuplicateCount((n) => Math.max(1, n - 1))}
              className="flex h-5 w-5 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              −
            </button>
            <span className="w-5 text-center text-xs font-semibold text-sky-400 tabular-nums">{duplicateCount}</span>
            <button
              type="button"
              aria-label="More copies"
              disabled={duplicateCount >= MAX_DUPLICATE_COUNT}
              onClick={() => setDuplicateCount((n) => Math.min(MAX_DUPLICATE_COUNT, n + 1))}
              className="flex h-5 w-5 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              +
            </button>
          </span>
        </div>
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
            if (confirmRemoveFromCampaign(name)) onRemove();
          }}
        >
          <TrashIcon className="h-4 w-4 shrink-0" />
          Remove
        </button>
      )}
    </MoreMenu>
  );
}
