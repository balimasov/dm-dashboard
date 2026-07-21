/**
 * Pure helpers for the Campaign Journal feature — no DB/server dependency
 * (unlike `db.ts`), so these are trivially unit-testable in isolation.
 */

/**
 * "YYYY-MM-DD" in the given IANA zone — the DM's local calendar day, not
 * the server's/UTC's. A game session can easily run past midnight
 * server-time (or past midnight UTC while it's still evening locally);
 * bucketing by the wrong day would silently split one real session into
 * two "date sessions". `en-CA`'s locale date format is the one built-in
 * `Intl` option that already comes out in exactly this "YYYY-MM-DD" order.
 */
export function dateKeyForTimeZone(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** e.g. "July 20, 2026" — the auto-created session's only title until a rename UI exists. Parsed as UTC midnight (matching `dateKey`'s own "no time-of-day" meaning) so formatting never shifts the date a day off in a different display timezone. */
export function formatSessionTitle(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * Quick Note's plain-textarea input → the same HTML-paragraph shape
 * `NotesEditor`/`JournalEntry.text` already use everywhere else. Splits on
 * "\n" (each Shift+Enter-inserted line becomes its own `<p>`), HTML-escapes
 * reserved characters, and drops blank lines — so an entry created via
 * Quick Note is byte-for-byte the same kind of HTML a Tiptap edit would
 * have produced, and can be opened and continued in the full editor with
 * no format conversion.
 */
export function plainTextToParagraphHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}

/**
 * Tiny HTML → tree parser, purpose-built for `JournalEntry.text`'s own
 * closed universe of markup (whatever Tiptap's `StarterKit` — see
 * `NotesEditor.tsx` — or `plainTextToParagraphHtml` above can produce),
 * not general-purpose HTML. No `DOMParser`/`jsdom` dependency on purpose:
 * this needs to run both in the browser (the actual export button) and in
 * plain Node under vitest (this file's whole reason for existing is being
 * "no DOM/server dependency" — see the top-of-file doc comment), and a
 * regex-based tag/text tokenizer is more than this always-well-formed,
 * always-Tiptap-produced input needs.
 */
type MdNode = { type: "text"; value: string } | { type: "element"; tag: string; attrs: Record<string, string>; children: MdNode[] };

const VOID_TAGS = new Set(["br", "hr", "img"]);

function decodeHtmlEntities(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

function parseHtmlFragment(html: string): MdNode[] {
  const tokenRe = /<\/?([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  const root: Extract<MdNode, { type: "element" }> = { type: "element", tag: "#root", attrs: {}, children: [] };
  const stack: Extract<MdNode, { type: "element" }>[] = [root];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(html))) {
    const [full, tagName, attrsStr, selfClose, text] = match;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      top.children.push({ type: "text", value: decodeHtmlEntities(text) });
      continue;
    }
    const tag = tagName.toLowerCase();
    if (full.startsWith("</")) {
      // Pop back to the matching open tag, defensively — this input is
      // expected to always be well-formed, but a malformed close tag
      // shouldn't corrupt the rest of the tree.
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z-]+)="([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(attrsStr))) attrs[attrMatch[1]] = decodeHtmlEntities(attrMatch[2]);
    const node: Extract<MdNode, { type: "element" }> = { type: "element", tag, attrs, children: [] };
    top.children.push(node);
    if (!selfClose && !VOID_TAGS.has(tag)) stack.push(node);
  }
  return root.children;
}

function renderInline(nodes: MdNode[]): string {
  return nodes
    .map((node): string => {
      if (node.type === "text") return node.value;
      switch (node.tag) {
        case "strong":
        case "b":
          return `**${renderInline(node.children)}**`;
        case "em":
        case "i":
          return `*${renderInline(node.children)}*`;
        case "s":
        case "strike":
        case "del":
          return `~~${renderInline(node.children)}~~`;
        case "code":
          return `\`${renderInline(node.children)}\``;
        case "a":
          return `[${renderInline(node.children)}](${node.attrs.href ?? ""})`;
        case "br":
          return "  \n";
        default:
          return renderInline(node.children);
      }
    })
    .join("");
}

/** `ol`/`ul` → Markdown list lines, recursing for nested lists (Tiptap nests a child `ul`/`ol` directly inside the parent `li`, same as the HTML spec). */
function renderList(node: Extract<MdNode, { type: "element" }>, depth: number): string {
  const ordered = node.tag === "ol";
  const indent = "  ".repeat(depth);
  const lines: string[] = [];
  let index = 1;
  for (const child of node.children) {
    if (child.type !== "element" || child.tag !== "li") continue;
    const nestedLists = child.children.filter((c): c is Extract<MdNode, { type: "element" }> => c.type === "element" && (c.tag === "ul" || c.tag === "ol"));
    const ownContent = child.children.filter((c) => !(c.type === "element" && (c.tag === "ul" || c.tag === "ol")));
    const marker = ordered ? `${index}.` : "-";
    lines.push(`${indent}${marker} ${renderBlocks(ownContent).trim()}`);
    for (const nested of nestedLists) lines.push(renderList(nested, depth + 1));
    index++;
  }
  return lines.join("\n");
}

function renderBlocks(nodes: MdNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const trimmed = node.value.trim();
      if (trimmed) parts.push(trimmed);
      continue;
    }
    switch (node.tag) {
      case "p": {
        // Tiptap's document model always ends in (and freely allows) an
        // empty paragraph node — pressing Enter twice, or just the
        // document's own trailing one — which would otherwise surface as a
        // stray blank line in the exported Markdown.
        const text = renderInline(node.children).trim();
        if (text) parts.push(text);
        break;
      }
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const text = renderInline(node.children).trim();
        if (text) parts.push(`${"#".repeat(Number(node.tag[1]))} ${text}`);
        break;
      }
      case "blockquote":
        parts.push(
          renderBlocks(node.children)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        );
        break;
      case "hr":
        parts.push("---");
        break;
      case "ul":
      case "ol":
        parts.push(renderList(node, 0));
        break;
      case "pre":
        parts.push(`\`\`\`\n${renderInline(node.children)}\n\`\`\``);
        break;
      default: {
        // Unrecognized wrapper (or the `#root` node itself) — recurse into
        // its children as blocks rather than dropping unknown content.
        const inner = renderBlocks(node.children);
        if (inner) parts.push(inner);
      }
    }
  }
  return parts.join("\n\n");
}

/**
 * `JournalEntry.text` (Tiptap-produced HTML) → Markdown, preserving
 * headings/bold/italic/links/lists/blockquotes — used by the Journal
 * modal's "Export as Markdown" button (View mode) so a downloaded session
 * still reads like formatted notes, not an HTML tag dump.
 */
export function htmlToMarkdown(html: string): string {
  return renderBlocks(parseHtmlFragment(html)).trim();
}
