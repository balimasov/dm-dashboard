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

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <NotesEditor
        key={resetKey}
        value={draft}
        onChange={setDraft}
        placeholder="Write a journal entry..."
        autoFocus={autoFocusEditor}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isEmpty || saving}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Add entry
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

  // Covers both "just opened the modal" (sessions themselves still in
  // flight) and "just switched sessions" (the newly-selected one's entries
  // still in flight) with one flag, so the content pane goes from "loading"
  // straight to "fully ready" in one step — instead of the previous
  // sequence of differently-sized interim states (a session list arriving,
  // then "Select a session", then "Loading entries...", then the real
  // content) popping in one after another and reading as the whole pane
  // jumping around.
  const contentLoading = (sessions === null && !sessionsError) || (selectedSessionId !== null && entries === null && !entriesError);
  const canExport = !contentLoading && mode === "view" && !!selectedSession && !!visibleEntries && visibleEntries.length > 0;

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

        {/* Column on mobile (sessions as a short horizontal strip up top,
            entries — the actual point of opening this — get the rest of the
            height) — row on `sm:` and up (fixed-width sidebar, same as
            before). A rigid 256px sidebar on a ~360px phone screen left
            almost nothing for the entries pane, which is what this modal is
            actually for. */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="flex shrink-0 flex-col gap-2 sm:w-64">
            {role === "dm" && (
              <div className="flex shrink-0 items-center justify-between gap-2">
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
            <div className="scrollbar-themed flex max-h-28 gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-800 pb-2 sm:max-h-none sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
              {sessions === null && sessionsError === null && <p className="shrink-0 text-sm text-slate-500">Loading sessions...</p>}
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
                  className={`group relative flex shrink-0 items-center gap-1 rounded-lg sm:w-full ${
                    selectedSessionId === session.id ? "bg-slate-700" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSession(session.id)}
                    className={`min-w-0 flex-1 shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-left text-sm sm:whitespace-normal ${
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
                    // Always visible on mobile (`opacity-100` below `sm:`,
                    // where hover doesn't exist) — reveals on hover/focus
                    // at `sm:` and up, matching this file's existing
                    // `sm:`-keyed mobile/desktop split everywhere else.
                    // `focus-within` isn't decorative: without it, `opacity-0`
                    // alone would still leave the trigger focusable (just
                    // invisible) for a keyboard user tabbing through.
                    <div className="shrink-0 pr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <MoreMenu label={`Manage "${session.title}"`} portal>
                        <button
                          type="button"
                          className={MORE_MENU_ITEM_CLASS}
                          onClick={() => {
                            const next = window.prompt("Rename session", session.title)?.trim();
                            if (next && next !== session.title) void renameSession(session.id, next);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className={MORE_MENU_ITEM_CLASS}
                          onClick={() => void toggleSessionArchived(session.id, !session.archived)}
                        >
                          {session.archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          type="button"
                          className={`${MORE_MENU_ITEM_CLASS} text-red-400 hover:text-red-300`}
                          onClick={() => {
                            const noun = session.entryCount === 1 ? "entry" : "entries";
                            if (
                              window.confirm(
                                `Delete "${session.title}"? This also deletes all ${session.entryCount} ${noun} in it. This can't be undone.`
                              )
                            ) {
                              void deleteSession(session.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </MoreMenu>
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
                or mode — only the export button's own enabled state does,
                via `disabled:opacity-0` (space reserved, not collapsed),
                which is what actually fixes it visibly jumping before. */}
            <div className="mb-3 shrink-0 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="truncate text-lg font-semibold text-slate-100">{selectedSession?.title}</h3>
                <button
                  type="button"
                  onClick={() => canExport && downloadSessionMarkdown(selectedSession!, visibleEntries!)}
                  disabled={!canExport}
                  aria-label="Export as Markdown"
                  title="Export as Markdown"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:pointer-events-none disabled:opacity-0"
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

            <div className="scrollbar-themed flex-1 overflow-y-auto">
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
                <p className="text-sm text-slate-500">Select a session to see its entries.</p>
              ) : visibleEntries?.length === 0 ? (
                <p className="text-sm text-slate-500">No entries in this session yet.</p>
              ) : mode === "edit" ? (
                <div className="space-y-2">
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
                <div className="space-y-6">
                  {visibleEntries?.map((entry, index) => (
                    <div key={entry.id}>
                      {/* Light separator between notes in the reading view —
                          the only visual cue that one entry ended and the
                          next began, now that View mode has no per-entry
                          border/box at all. Skipped before the first entry;
                          nothing to separate it from. */}
                      {index > 0 && <hr className="mb-6 border-slate-800/60" />}
                      <div className="notes-editor-content text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: entry.text }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
