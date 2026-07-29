import { QUICK_MENU_SHELL_CLS } from "./containerStyles";
import { PANEL_HEADING_CLS } from "./typography";

/**
 * Shared shell + header for the app's three corner-pinned quick-action
 * popovers (`RemindersFab`, `QuickLinksButton`, `QuickNoteButton`) — same
 * dark card, same `icon + title + (count)` header row, same hairline
 * divider under it. Only the header's own content is standardized here;
 * positioning (`absolute`/`fixed`, corner offsets, width) and scrolling
 * (`max-h`, `overflow-y-auto`, `scrollbar-themed`) stay owned by each
 * caller via `className`, since those genuinely differ per trigger — and
 * everything below the header (the reminder list, the link list, the note
 * textarea) is each caller's own content, untouched.
 *
 * `min-h-[1.375rem]` + `box-content` on the header row: without it, a
 * header with a trailing `manageAction` icon button (only `QuickLinksButton`
 * has one today) came out visibly taller than one without, since a flex
 * row's cross-axis size is whichever child is tallest — `box-content`
 * makes the min-height apply to the row's content area alone, decoupled
 * from this row's own `pb-2`/border, so every header lands at the same
 * total height whether or not it has a trailing button.
 */
export function QuickMenuPanel({
  icon,
  title,
  count,
  manageAction,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  /** Trailing header action (e.g. the "edit quick links" `IconButton`) — omit entirely for menus with nothing to manage. */
  manageAction?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${QUICK_MENU_SHELL_CLS} ${className}`.trim()}>
      <div className="mb-2.5 box-content flex min-h-[1.375rem] items-center gap-2 border-b border-slate-800/60 pb-2">
        {icon}
        <h2 className={PANEL_HEADING_CLS}>
          {title}
          {count !== undefined && <span className="font-normal text-slate-500"> ({count})</span>}
        </h2>
        {manageAction && <div className="-mr-1 ml-auto">{manageAction}</div>}
      </div>
      {children}
    </div>
  );
}
