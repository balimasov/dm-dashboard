/**
 * Renders the markdown-lite `**bold**`/`*italic*` markers ddbParser leaves in
 * cleaned rules text, plus real line breaks for bullet-point lists and a
 * visible blank-line gap between paragraphs (`\n\n`, from a source `</p>`/
 * `</div>` — see `cleanRulesText`'s own doc comment). D&D Beyond itself
 * renders each named sub-effect of a spell/feature as its own paragraph
 * (e.g. Prestidigitation's "Sensory Effect."/"Fire Play."/...); collapsing
 * all of those onto touching lines with no gap read as one dense wall of
 * text, which is exactly what this two-level split (paragraphs, then lines
 * within each) fixes. The very first line overall stays inline (not
 * `block`) so this can be dropped right after an inline prefix — e.g. a
 * trait's bold "Name." — without forcing it onto its own line when there's
 * only one line of description to begin with.
 */
export function RichText({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter((p) => p !== "");
  return (
    <>
      {paragraphs.map((paragraph, pi) =>
        paragraph
          .split("\n")
          .filter((line) => line !== "")
          .map((line, li) => {
            const isFirstOverall = pi === 0 && li === 0;
            const isNewParagraph = li === 0 && pi > 0;
            const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((part) => part !== "");
            return (
              <span
                key={`${pi}-${li}`}
                className={isFirstOverall ? undefined : isNewParagraph ? "mt-2 block" : "block"}
              >
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
          })
      )}
    </>
  );
}
