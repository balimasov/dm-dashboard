"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

const TOOLBAR_BUTTONS = [
  { key: "bold", label: "B", title: "Bold", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleBold().run(), active: (e: Editor) => e.isActive("bold") },
  { key: "italic", label: "I", title: "Italic", cls: "italic", run: (e: Editor) => e.chain().focus().toggleItalic().run(), active: (e: Editor) => e.isActive("italic") },
  { key: "h1", label: "H1", title: "Heading 1", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e: Editor) => e.isActive("heading", { level: 1 }) },
  { key: "h2", label: "H2", title: "Heading 2", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e: Editor) => e.isActive("heading", { level: 2 }) },
  { key: "h3", label: "H3", title: "Heading 3", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e: Editor) => e.isActive("heading", { level: 3 }) },
  { key: "bulletList", label: "≡", title: "Bullet list", cls: "", run: (e: Editor) => e.chain().focus().toggleBulletList().run(), active: (e: Editor) => e.isActive("bulletList") },
  { key: "orderedList", label: "1.", title: "Numbered list", cls: "", run: (e: Editor) => e.chain().focus().toggleOrderedList().run(), active: (e: Editor) => e.isActive("orderedList") },
] as const;

/** Prompts for a URL and applies/removes a link on the current selection — the one toolbar action that needs input up front, so it can't be a plain declarative `run(editor)` like the toggle buttons above. */
function setLink(editor: Editor) {
  const previousUrl = (editor.getAttributes("link").href as string | undefined) ?? "";
  const url = window.prompt("Link URL (leave empty to remove)", previousUrl);
  if (url === null) return;
  const chain = editor.chain().focus().extendMarkRange("link");
  if (url === "") {
    chain.unsetLink().run();
  } else {
    chain.setLink({ href: url }).run();
  }
}

/** Rich-text notes editor (Tiptap) with a small toolbar — Bold/Italic/Heading/Bullet/Numbered list/Link apply and render live, rather than inserting raw markdown syntax around the selection. Stores/loads its content as HTML. */
export function NotesEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Opt-in only — most `NotesEditor` instances (campaign notes, editing an existing entry) shouldn't steal focus just for mounting. Meant for a composer that's the obvious next thing to type into, like the Campaign Journal's entry composer. */
  autoFocus?: boolean;
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          // Links only navigate when the editor isn't editable — this
          // instance always is, so a click just places the cursor instead
          // of jumping away mid-edit.
          link: { openOnClick: "whenNotEditable" },
        }),
        Placeholder.configure({ placeholder: placeholder ?? "" }),
      ],
      content: value,
      immediatelyRender: false,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onBlur: () => onBlur?.(),
      editorProps: {
        attributes: {
          // Border/rounding/focus-ring live on the wrapping `EditorContent`
          // below, not here — this is the element that actually scrolls
          // (`overflow-y-auto`), and its native scrollbar track is a plain
          // rectangle that doesn't know about `rounded-lg`, so pairing
          // border+radius+scroll on the same box let the scrollbar visibly
          // slice through the rounded corner once content was tall enough
          // to scroll. Splitting them into a clipping outer box and a
          // scrolling inner box keeps the scrollbar contained within the
          // rounded shape instead.
          class:
            "notes-editor-content scrollbar-themed min-h-24 max-h-72 w-full overflow-y-auto px-3 py-2 text-sm text-slate-100 focus:outline-none",
        },
      },
    },
    // With an empty deps array, `useEditor` re-diffs every option (including
    // `content`) on each render and pushes changes into the live editor —
    // and `value` here is this very editor's own last `onUpdate` output,
    // round-tripped through the parent's state. Left at the default, that
    // feeds the editor's last keystroke back in as a fresh "content" on the
    // very next render, resetting the document mid-edit (confirmed: typed
    // text came out scrambled). A non-empty, per-mount-stable deps array
    // instead makes the editor instance-only — created once, then left
    // alone for its whole mounted lifetime, exactly like the plain
    // `<textarea>` this replaced.
    [placeholder]
  );

  // `editor` is `null` for the first render (see the comment below on
  // `immediatelyRender: false`), so focusing has to wait for the effect
  // that runs once it's ready rather than happening inline during render.
  useEffect(() => {
    if (autoFocus) editor?.commands.focus("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only meant to run once when this editor instance first becomes ready, not on every `editor`/`autoFocus` identity change
  }, [editor]);

  // `immediatelyRender: false` (required so Next.js doesn't hydration-mismatch
  // on Tiptap's own SSR output) means `editor` is null for one render on
  // every mount — returning `null` here left a visible gap where the
  // toolbar/textbox briefly vanished and popped back in a moment later.
  // Rendering a static, non-editable stand-in of the exact same shape (same
  // toolbar buttons, same `.notes-editor-content` box with the same content
  // or placeholder) means that moment is invisible: it's plain HTML, so the
  // server and the pre-mount client render identically, and the real editor
  // then swaps in without shifting anything.
  if (!editor) {
    return (
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {TOOLBAR_BUTTONS.map(({ key, label, cls }) => (
            <span key={key} aria-hidden className={`rounded px-2 py-1 text-xs text-slate-400 ${cls}`}>
              {label}
            </span>
          ))}
          <span aria-hidden className="rounded px-2 py-1 text-xs text-slate-400 underline">
            Link
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <div
            className="notes-editor-content scrollbar-themed min-h-24 max-h-72 w-full overflow-y-auto px-3 py-2 text-sm text-slate-100"
            dangerouslySetInnerHTML={{
              __html: value || `<p class="is-editor-empty" data-placeholder="${placeholder ?? ""}"></p>`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {TOOLBAR_BUTTONS.map(({ key, label, title, cls, run, active }) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(editor)}
            title={title}
            aria-label={title}
            aria-pressed={active(editor)}
            className={`rounded px-2 py-1 text-xs hover:bg-slate-800 hover:text-slate-100 ${cls} ${
              active(editor) ? "bg-slate-800 text-sky-400" : "text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setLink(editor)}
          title="Link"
          aria-label="Link"
          aria-pressed={editor.isActive("link")}
          className={`rounded px-2 py-1 text-xs underline hover:bg-slate-800 hover:text-slate-100 ${
            editor.isActive("link") ? "bg-slate-800 text-sky-400" : "text-slate-400"
          }`}
        >
          Link
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 focus-within:ring-2 focus-within:ring-sky-600"
      />
    </div>
  );
}
