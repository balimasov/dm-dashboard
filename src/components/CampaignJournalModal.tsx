"use client";

import { useEffect, useState } from "react";
import { UserRole } from "@/lib/auth";
import { htmlToMarkdown } from "@/lib/journal";
import { JournalEntry, JournalEntryAudience, JournalSessionSummary } from "@/lib/types";
import { useJournal } from "@/hooks/useJournal";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { JournalEntryRow } from "./JournalEntryRow";
import { NotesEditor } from "./NotesEditor";
import { MoreMenu, MORE_MENU_ITEM_CLASS } from "./ui/MoreMenu";
import { SelectMenu, SelectMenuOption } from "./ui/SelectMenu";
import { DownloadIcon } from "./ui/icons";

type JournalTab = "dm" | "party";
type JournalMode = "view" | "edit";

function Composer({ onSubmit }: { onSubmit: (html: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  // `NotesEditor` deliberately never re-syncs its Tiptap document to a
  // changed `value` prop after mount (see its own doc comment) — so
  // `setDraft("")` below updates this component's state but never reaches
  // the already-mounted editor instance. Bumping this key forces a clean
  // remount after every successful submit, which is the only way to make
  // the visible editor content actually clear in sync with the draft.
  const [resetKey, setResetKey] = useState(0);
  const isEmpty = draft.replace(/<[^>]+>/g, "").trim().length === 0;
  // Autofocus only after a successful add (`resetKey > 0`), never on the
  // composer's very first mount — that first mount also happens whenever the
  // modal opens or a session gets auto-selected, and stealing focus there
  // pops the on-screen keyboard on mobile, covering half the screen for no
  // reason the DM asked for.
  const autoFocusEditor = resetKey > 0;

  async function handleAdd() {
    if (isEmpty || saving) return;
    setSaving(true);
    try {
      await onSubmit(draft);
      setDraft("");
      setResetKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  // Same clear-the-visible-editor trick `handleAdd` uses after a successful
  // submit — `setDraft("")` alone wouldn't reach the already-mounted editor
  // (see `NotesEditor`'s own doc comment), so bump `resetKey` to force a
  // clean remount.
  function handleCancel() {
    setDraft("");
    setResetKey((k) => k + 1);
  }

  // No outer card here — `NotesEditor` already draws its own bordered
  // textbox, and wrapping that in a second bordered panel (as this used to)
  // just stacked two rectangles for no reason. Plain spacing is enough to
  // read as one composer unit.
  return (
    <div className="mb-4">
      <NotesEditor
        key={resetKey}
        value={draft}
        onChange={setDraft}
        placeholder="Write a journal note..."
        autoFocus={autoFocusEditor}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isEmpty || saving}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isEmpty || saving}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Add note
        </button>
      </div>
    </div>
  );
}

interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon?: string;
}

/**
 * Single-line pill group — the shared visual language for *both* toolbar
 * controls in this modal's header row (audience and render mode). They're
 * different kinds of choices, but rendering them as two differently-shaped
 * widgets used to read as bolted-together rather than one toolbar: audience
 * borrowed `TabBar`'s stacked icon-over-label block (built for wider
 * multi-tab strips elsewhere, like `CharacterDetailsModal`'s own tabs),
 * sitting next to mode's slim inline pill. Deliberately NOT reusing the
 * shared `TabBar` component here — changing its layout would ripple into
 * those other call sites; this is a narrower, single-line variant scoped to
 * this modal's two-option toolbar. Renders nothing for a single option,
 * same "no chrome with nothing to choose between" rule `TabBar` follows.
 */
function SegmentedControl<T extends string>({
  options,
  current,
  onChange,
  uppercase = false,
}: {
  options: SegmentOption<T>[];
  current: T;
  onChange: (key: T) => void;
  /** Mode uses this for a visually quieter, "display setting" feel that reads as secondary to the audience switcher next to it — not a difference in interaction, just typography. */
  uppercase?: boolean;
}) {
  if (options.length <= 1) return null;
  return (
    <div className="flex shrink-0 gap-1 rounded-lg bg-slate-800/60 p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold ${uppercase ? "uppercase tracking-wide" : ""} ${
            current === opt.key ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {opt.icon && (
            <span aria-hidden="true" className="text-sm leading-none">
              {opt.icon}
            </span>
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "session"
  );
}

/**
 * Downloads every currently-visible entry — the selected session's,
 * filtered to whichever audience tab is showing — as one Markdown file,
 * exactly what View mode has on screen at the moment the button is
 * clicked. Each entry's own HTML converts through `htmlToMarkdown`
 * (headings/bold/italic/links/lists preserved), separated by a `---` rule
 * so multiple entries in one session don't visually run together once
 * they're no longer each in their own bordered box.
 */
function downloadSessionMarkdown(session: JournalSessionSummary, entries: JournalEntry[]) {
  const body = entries.map((entry) => htmlToMarkdown(entry.text)).join("\n\n---\n\n");
  const markdown = `# ${session.title}\n\n${body}\n`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(session.title)}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Rename/Archive/Delete for one session — shared between the desktop
 * sidebar's per-row "..." and the mobile picker's single "..." (which
 * always targets whichever session is currently selected, since there's
 * no per-row affordance to hang it off on mobile).
 */
function SessionManageMenu({
  session,
  renameSession,
  toggleSessionArchived,
  deleteSession,
  variant = "boxed",
}: {
  session: JournalSessionSummary;
  renameSession: (id: string, title: string) => void;
  toggleSessionArchived: (id: string, archived: boolean) => void;
  deleteSession: (id: string) => void;
  /**
   * `"boxed"` (default) — the standalone mobile-header control, sitting
   * next to other bordered buttons ("+", the session dropdown) as a peer.
   * `"plain"` — the per-row desktop sidebar trigger, which sits *inside*
   * an already-visually-distinct row (its own hover/selected background);
   * a second bordered box there read as a redundant nested control rather
   * than part of the row.
   */
  variant?: "boxed" | "plain";
}) {
  return (
    <MoreMenu label={`Manage "${session.title}"`} portal variant={variant}>
      <button
        type="button"
        className={MORE_MENU_ITEM_CLASS}
        onClick={() => {
          const next = window.prompt("Rename session", session.title)?.trim();
          if (next && next !== session.title) renameSession(session.id, next);
        }}
      >
        Rename
      </button>
      <button type="button" className={MORE_MENU_ITEM_CLASS} onClick={() => toggleSessionArchived(session.id, !session.archived)}>
        {session.archived ? "Unarchive" : "Archive"}
      </button>
      <button
        type="button"
        className={`${MORE_MENU_ITEM_CLASS} text-red-400 hover:text-red-300`}
        onClick={() => {
          const noun = session.entryCount === 1 ? "note" : "notes";
          if (window.confirm(`Delete "${session.title}"? This also deletes all ${session.entryCount} ${noun} in it. This can't be undone.`)) {
            deleteSession(session.id);
          }
        }}
      >
        Delete
      </button>
    </MoreMenu>
  );
}

/**
 * Large two-pane modal — same shell conventions as `CampaignFormModal`
 * (`useScrollLock`, `useEscapeToClose`, backdrop click-outside-closes,
 * `max-h-[90vh]`) but wider (`max-w-4xl`) for the session list + entry pane
 * layout, which no existing modal in this app needed before.
 *
 * A player gets a hard-locked `"party"` view regardless of any stray `tab`
 * state (`visibleTab` below) — `TabBar` itself renders nothing for a
 * single-tab list, so a player never even sees switcher chrome, but the
 * lock is enforced independently of that UI detail. Session management
 * (rename, new session, archive, delete) only renders for a DM, tucked
 * behind each session's own "..." menu; a player only ever sees a plain
 * read/write pane for whichever session they've selected.
 */
export function CampaignJournalModal({
  campaignId,
  role,
  onClose,
}: {
  campaignId: string;
  role: UserRole;
  onClose: () => void;
}) {
  useScrollLock();
  useEscapeToClose(onClose);
  const [tab, setTab] = useState<JournalTab>("dm");
  const [mode, setMode] = useState<JournalMode>("view");
  const [showArchived, setShowArchived] = useState(false);
  const journal = useJournal(campaignId);
  const {
    sessions,
    sessionsError,
    loadSessions,
    selectedSessionId,
    selectSession,
    entries,
    entriesError,
    createEntry,
    updateEntry,
    removeEntry,
    startNewSession,
    renameSession,
    toggleSessionArchived,
    deleteSession,
  } = journal;

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount, same as every other "fetch when this modal opens" pattern in this app
  }, []);

  const visibleTab: JournalTab = role === "dm" ? tab : "party";
  const audienceOptions: SegmentOption<JournalTab>[] =
    role === "dm"
      ? [
          { key: "dm", icon: "🧙", label: "DM" },
          { key: "party", icon: "🧑‍🤝‍🧑", label: "Party" },
        ]
      : [{ key: "party", icon: "🧑‍🤝‍🧑", label: "Party" }];
  const modeOptions: SegmentOption<JournalMode>[] = [
    { key: "view", label: "view" },
    { key: "edit", label: "edit" },
  ];

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);
  const visibleSessions = sessions?.filter((s) => showArchived || !s.archived);
  const visibleEntries = entries?.filter((e) => e.audience === visibleTab);

  const sessionsLoading = sessions === null && !sessionsError;
  const selectedEntriesLoading = selectedSessionId !== null && entries === null && !entriesError;
  // True while either the session list or the auto-selected session's
  // entries are still in flight — the two-pane layout itself doesn't
  // render at all until both are settled (see `stillLoadingInitial`
  // below), and this narrower flag then covers only "just switched
  // sessions" for the rest of the modal's lifetime, gating a small spinner
  // in the entries pane alone.
  const contentLoading = sessionsLoading || selectedEntriesLoading;
  const canExport = !contentLoading && mode === "view" && !!selectedSession && !!visibleEntries && visibleEntries.length > 0;

  // Latches true the first time both the session list *and* the initially
  // selected session's entries have loaded (or failed), and never flips
  // back — so only the very first open blocks on one full-modal spinner.
  // Sessions and their content used to appear in separate steps (session
  // list first, entries a beat later), which is what actually caused the
  // "sessions block blinks and content shifts" complaint: nothing was
  // structurally jumping, the sidebar and header panel just kept mounting
  // in before their content was ready. Waiting for both up front means the
  // whole layout paints once, fully formed.
  // Set directly in the render body (React's documented "adjust state while
  // rendering" pattern), not an effect — an effect would commit the loading
  // UI for one extra frame before flipping, which is exactly the kind of
  // pop-in this whole change exists to remove.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  if (!initialLoadDone && !sessionsLoading && !selectedEntriesLoading) {
    setInitialLoadDone(true);
  }
  const stillLoadingInitial = !initialLoadDone && (sessionsLoading || selectedEntriesLoading);

  const mobileSessionOptions: SelectMenuOption<string>[] =
    sessions?.map((s) => ({
      value: s.id,
      label: (
        <span className={s.archived ? "text-slate-500" : undefined}>
          {s.title}
          {s.archived && <span className="ml-1 text-xs text-slate-500">(archived)</span>}
          <span className="ml-1 text-xs text-slate-500">({s.entryCount})</span>
        </span>
      ),
    })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        // Fixed height (not `max-h-*`) on purpose — with only a max-height,
        // the box hugged whatever little content "Loading sessions..."/
        // "Loading entries..." took up, then visibly grew the moment the
        // real lists arrived a beat later. A stable height from the first
        // paint means loading only ever changes what scrolls *inside* the
        // box, never the box itself.
        className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between sm:mb-4">
          <h2 className="text-lg font-bold text-slate-50">Campaign Journal</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>

        {/* Nothing below the close button renders until the session list
            *and* the initially-selected session's entries have both
            loaded — see `stillLoadingInitial`'s doc comment above. This is
            what actually stops the sidebar and header from painting in
            before their content, which is what read as the whole modal
            "jumping" on open. */}
        {stillLoadingInitial ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          </div>
        ) : (
          // Column on mobile (a single-row session picker up top, entries —
          // the actual point of opening this — get the rest of the height)
          // — row on `sm:` and up (fixed-width vertical sidebar). A rigid
          // 256px sidebar, or the previous horizontal scrolling strip of
          // session pills, both cost real screen space on a ~360px phone;
          // a closed dropdown costs one button row.
          <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex shrink-0 flex-col gap-2 sm:w-64">
              {role === "dm" && (
                <div className="hidden shrink-0 items-center justify-between gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => void startNewSession()}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    + New session
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchived((v) => !v)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showArchived ? "Hide archived" : "Show archived"}
                  </button>
                </div>
              )}

              {/* Mobile-only: one compact row (dropdown + new-session +
                  manage) instead of the sidebar below. Always lists every
                  session, archived included (tagged/dimmed) — the
                  show/hide-archived toggle above exists to declutter an
                  always-visible list, which a closed dropdown never is. */}
              <div className="flex shrink-0 items-center gap-2 sm:hidden">
                {sessionsError ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-red-400">
                    <p className="min-w-0 flex-1 truncate">{sessionsError}</p>
                    <button
                      type="button"
                      onClick={() => void loadSessions()}
                      className="shrink-0 rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
                    >
                      Retry
                    </button>
                  </div>
                ) : sessions && sessions.length === 0 ? (
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-500">No sessions yet — write a note to start one.</p>
                ) : (
                  <SelectMenu
                    value={selectedSessionId ?? ""}
                    options={mobileSessionOptions}
                    onChange={(id) => selectSession(id)}
                    className="min-w-0 flex-1"
                  />
                )}
                {role === "dm" && (
                  <button
                    type="button"
                    onClick={() => void startNewSession()}
                    aria-label="New session"
                    title="New session"
                    className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    +
                  </button>
                )}
                {role === "dm" && selectedSession && (
                  <SessionManageMenu
                    session={selectedSession}
                    renameSession={renameSession}
                    toggleSessionArchived={toggleSessionArchived}
                    deleteSession={deleteSession}
                  />
                )}
              </div>

              <div className="scrollbar-themed hidden gap-1 overflow-x-hidden overflow-y-auto border-slate-800 pr-3 sm:flex sm:flex-col sm:border-r">
                {sessionsError && (
                  <div className="shrink-0 text-sm text-red-400">
                    <p className="mb-2">{sessionsError}</p>
                    <button type="button" onClick={() => void loadSessions()} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800">
                      Retry
                    </button>
                  </div>
                )}
                {visibleSessions?.length === 0 && (
                  <p className="shrink-0 text-sm text-slate-500">No sessions yet — write a note to start one.</p>
                )}
                {visibleSessions?.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative flex shrink-0 items-start gap-1 rounded-lg sm:w-full ${
                      selectedSessionId === session.id ? "bg-slate-700" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className={`min-w-0 flex-1 shrink-0 whitespace-normal rounded-lg px-2 py-1.5 text-left text-sm ${
                        session.archived ? "opacity-60" : ""
                      } ${
                        selectedSessionId === session.id ? "text-slate-100" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {session.title}
                      {session.archived && <span className="ml-1 text-xs text-slate-500">(archived)</span>}
                      <span className="ml-1 text-xs text-slate-500">({session.entryCount})</span>
                    </button>
                    {role === "dm" && (
                      // `items-start` on the row above (not `items-center`)
                      // plus this `pt-1` — pinned to the top-right corner
                      // is the one position that stays consistent whether
                      // the title fits on one line or wraps to three;
                      // center-aligned, this button drifted down into the
                      // middle of a wrapped multi-line title, reading as
                      // "part of the text" instead of a separate control.
                      // `focus-within` isn't decorative either: without it,
                      // `opacity-0` alone would still leave the trigger
                      // focusable (just invisible) for a keyboard user
                      // tabbing through.
                      <div className="shrink-0 pt-1 pr-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                        <SessionManageMenu
                          session={session}
                          renameSession={renameSession}
                          toggleSessionArchived={toggleSessionArchived}
                          deleteSession={deleteSession}
                          variant="plain"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* One panel for both the session title and the audience/mode
                  toolbar — previously these sat loose above the entries list
                  (just the title text, then a separate unboxed row of pills),
                  which read as floating controls rather than a deliberate
                  header. Always mounted (title/export button included) rather
                  than conditionally rendered on `selectedSession`/`mode`, so
                  nothing here changes *shape* when switching sessions, tabs,
                  or mode. The export button itself stays visible (just dimmed
                  and unclickable) rather than fading to `opacity-0` — an
                  invisible-but-present button still read as "popping in and
                  out" on every mode switch; a plain disabled state is the
                  one users already expect not to blink. */}
              <div className="mb-3 shrink-0 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="truncate text-lg font-semibold text-slate-100">{selectedSession?.title}</h3>
                  <button
                    type="button"
                    onClick={() => canExport && downloadSessionMarkdown(selectedSession!, visibleEntries!)}
                    disabled={!canExport}
                    aria-label="Export as Markdown"
                    title="Export as Markdown"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <SegmentedControl options={audienceOptions} current={visibleTab} onChange={setTab} />
                  {role === "dm" && <div aria-hidden="true" className="h-5 w-px shrink-0 bg-slate-700" />}
                  <SegmentedControl options={modeOptions} current={mode} onChange={setMode} uppercase />
                </div>
              </div>

              {!contentLoading && mode === "edit" && selectedSessionId && (
                <Composer onSubmit={(html) => createEntry(html, selectedSessionId, visibleTab as JournalEntryAudience)} />
              )}

              {/* `overflow-x-hidden` isn't decorative — per spec, a lone
                  `overflow-y: auto` silently forces the browser's *computed*
                  `overflow-x` to `auto` too (confirmed via
                  `getComputedStyle`), which reserves a scroll gutter flush
                  against this container's own right edge. Every entry's
                  `NotesEditor` box stretches to 100% of that content width,
                  so its rounded right border ends up sitting immediately
                  against the scrollbar track with zero breathing room —
                  the same "sliced corner" look already fixed once inside
                  `NotesEditor` itself, just one layer further out. The
                  sidebar session list two elements up already carries this
                  same `overflow-x-hidden` for the identical reason; this
                  container was the one place in the modal missing it.
                  `px-2` on top reserves room on both sides — the right for
                  the scrollbar track, and the left because `overflow-x:
                  hidden` clips *any* horizontal bleed at this container's
                  edge, including a focused entry's own focus ring (a
                  box-shadow that extends a couple pixels past its border on
                  every side) and any sub-pixel rounding slop from the entry
                  box being sized to exactly 100% of the container. Entries
                  never rendered flush against either edge before this fix
                  existed; asymmetric padding just swapped which edge the
                  clip showed up on. */}
              <div className="scrollbar-themed flex-1 overflow-x-hidden overflow-y-auto px-2 pt-1">
                {contentLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
                  </div>
                ) : entriesError ? (
                  <div className="text-sm text-red-400">
                    <p className="mb-2">{entriesError}</p>
                    <button
                      type="button"
                      onClick={() => selectSession(selectedSessionId!)}
                      className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
                    >
                      Retry
                    </button>
                  </div>
                ) : !selectedSessionId ? (
                  <p className="text-sm text-slate-500">Select a session to see its notes.</p>
                ) : visibleEntries?.length === 0 ? (
                  <p className="text-sm text-slate-500">No notes in this session yet.</p>
                ) : mode === "edit" ? (
                  // `divide-y` instead of each row owning its own bordered
                  // card — a thin rule between entries reads just as clearly
                  // as a boundary without stacking a rectangle around every
                  // single one, which is what made this list feel heavy.
                  <div className="divide-y divide-slate-800/60">
                    {visibleEntries?.map((entry) => (
                      <JournalEntryRow
                        key={entry.id}
                        entry={entry}
                        canManage={role === "dm" || entry.authorRole === "player"}
                        onUpdate={updateEntry}
                        onRemove={removeEntry}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleEntries?.map((entry, index) => (
                      <div key={entry.id}>
                        {/* Light separator between notes in the reading view —
                            the only visual cue that one entry ended and the
                            next began, now that View mode has no per-entry
                            border/box at all. Skipped before the first entry;
                            nothing to separate it from. */}
                        {index > 0 && <hr className="mb-3 border-slate-800/60" />}
                        <div className="notes-editor-content text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: entry.text }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
