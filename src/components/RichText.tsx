/**
 * Renders the markdown-lite `**bold**`/`*italic*` markers ddbParser leaves in
 * cleaned rules text, plus real line breaks for bullet-point lists. The
 * first line stays inline (not `block`) so this can be dropped right after
 * an inline prefix — e.g. a trait's bold "Name." — without forcing it onto
 * its own line when there's only one line of description to begin with;
 * any further lines (a genuine multi-line block like a spell list) still
 * get their own line each.
 */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line !== "");
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((part) => part !== "");
        return (
          <span key={li} className={li > 0 ? "block" : undefined}>
            {parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("*") && part.endsWith("*")) {
                return <em key={i}>{part.slice(1, -1)}</em>;
              }
              return <span key={i}>{part}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}
