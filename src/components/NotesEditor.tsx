"use client";

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
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
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
          class:
            "notes-editor-content min-h-24 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600",
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

  if (!editor) return null;

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
      <EditorContent editor={editor} />
    </div>
  );
}
