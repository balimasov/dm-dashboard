/** Renders the markdown-lite `**bold**`/`*italic*` markers ddbParser leaves in cleaned rules text, plus real line breaks for bullet-point lists. */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line !== "");
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((part) => part !== "");
        return (
          <span key={li} className="block">
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
