"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

const TOOLBAR_BUTTONS = [
  { key: "bold", label: "B", title: "Bold", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleBold().run(), active: (e: Editor) => e.isActive("bold") },
  { key: "italic", label: "I", title: "Italic", cls: "italic", run: (e: Editor) => e.chain().focus().toggleItalic().run(), active: (e: Editor) => e.isActive("italic") },
  { key: "heading", label: "H", title: "Heading", cls: "font-bold", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e: Editor) => e.isActive("heading", { level: 2 }) },
  { key: "bulletList", label: "≡", title: "Bullet list", cls: "", run: (e: Editor) => e.chain().focus().toggleBulletList().run(), active: (e: Editor) => e.isActive("bulletList") },
  { key: "orderedList", label: "1.", title: "Numbered list", cls: "", run: (e: Editor) => e.chain().focus().toggleOrderedList().run(), active: (e: Editor) => e.isActive("orderedList") },
] as const;

/** Rich-text notes editor (Tiptap) with a small toolbar — Bold/Italic/Heading/Bullet/Numbered list apply and render live, rather than inserting raw markdown syntax around the selection. Stores/loads its content as HTML. */
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
        StarterKit.configure({ heading: { levels: [2] } }),
        Placeholder.configure({ placeholder: placeholder ?? "" }),
      ],
      content: value,
      immediatelyRender: false,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onBlur: () => onBlur?.(),
      editorProps: {
        attributes: {
          class:
            "notes-editor-content min-h-24 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-600",
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
      <div className="mb-1.5 flex items-center gap-1">
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
