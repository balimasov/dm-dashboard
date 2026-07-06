"use client";

import { useRef } from "react";

function wrapSelection(textarea: HTMLTextAreaElement, marker: string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue = value.slice(0, selectionStart) + marker + selected + marker + value.slice(selectionEnd);
  const cursorStart = selectionStart + marker.length;
  return { newValue, cursorStart, cursorEnd: cursorStart + selected.length };
}

/** Prefixes every line touched by the current selection with `- `, so selecting a whole paragraph turns it into a bullet list in one click, not one line at a time. */
function prefixLines(textarea: HTMLTextAreaElement, prefix: string) {
  const { selectionStart, selectionEnd, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : prefix + line))
    .join("\n");
  const newValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { newValue, cursorStart: lineStart, cursorEnd: lineStart + prefixed.length };
}

/** Textarea plus a small markdown-syntax toolbar (Bold/Italic/Bullet list) — no live preview, just faster syntax insertion around the current selection. */
export function NotesEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyFormat(kind: "bold" | "italic" | "list") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = kind === "list" ? prefixLines(textarea, "- ") : wrapSelection(textarea, kind === "bold" ? "**" : "*");
    onChange(result.newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorStart, result.cursorEnd);
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        {(
          [
            ["bold", "B", "Bold", "font-bold"],
            ["italic", "I", "Italic", "italic"],
            ["list", "≡", "Bullet list", ""],
          ] as const
        ).map(([kind, label, title, cls]) => (
          <button
            key={kind}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat(kind)}
            title={title}
            aria-label={title}
            className={`rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 ${cls}`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-600"
      />
    </div>
  );
}
