import { CONDITION_INFO } from "@/lib/conditionInfo";
import { AiGlossary } from "@/lib/aiGlossary";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";
import { HintPanel } from "./ui/HintPanel";

/**
 * Renders `/api/assistant/suggest`'s answer — not `RichText`, since this
 * output has real structure `RichText` doesn't parse (`SYSTEM_PROMPT` asks
 * for an opening "game plan" paragraph, then `emoji **Heading**` section
 * markers, then `- ` bullets under each) and reusing `RichText`'s generic
 * paragraph/line splitter left the whole thing reading as one dense block —
 * headings didn't stand out from their own bullets, and bullets didn't
 * stand out from each other. This groups lines into typed blocks first so
 * each gets a distinct treatment: a highlighted callout for the leading
 * game plan, a colored heading row per section, and properly indented,
 * spaced bullet lists under each.
 *
 * Every recognized game term — the character/creature's own abilities
 * (`glossary`, from `buildAiGlossary`) plus the universal condition/ability
 * vocabulary below — gets wrapped in the same hover-hint affordance the
 * rest of the app already uses: `InfoTooltip` as the trigger, `HintPanel`
 * (title + description, the same shape every spell/feature/resource/item
 * hint in the app already renders through) as the panel content — not a
 * bespoke one, so "what does Tail Attack actually do" or "what does
 * Frightened mean" looks like every other hint in the app, not a
 * one-off.
 */

const ABILITY_GLOSSARY: Record<string, string> = {
  strength: "Physical power — melee attacks and damage, Athletics, forcing objects.",
  dexterity: "Agility and reflexes — Armor Class, Initiative, ranged attacks, Stealth.",
  constitution: "Stamina and health — hit points, Concentration checks.",
  intelligence: "Reasoning and memory — Arcana, History, Investigation, Nature, Religion.",
  wisdom: "Awareness and intuition — Perception, Insight, Medicine, Survival.",
  charisma: "Force of personality — Deception, Intimidation, Performance, Persuasion.",
};

const UNIVERSAL_GLOSSARY: Record<string, string> = { ...CONDITION_INFO, ...ABILITY_GLOSSARY };

const UNIVERSAL_TERMS_RE = new RegExp(
  `\\b(${Object.keys(UNIVERSAL_GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi"
);

type Block =
  | { type: "heading"; emoji: string; label: string }
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string };

const HEADING_RE = /^(\p{Extended_Pictographic}\uFE0F?)\s+\*\*(.+)\*\*$/u;
const BOLD_ONLY_RE = /^\*\*(.+)\*\*$/;
/** A bullet's own leading "Name: " label, when the model didn't already wrap it in `**` itself \u2014 `SYSTEM_PROMPT` asks for that, but doesn't always get followed. Capped at 80 chars so an ordinary sentence that happens to contain a colon further in ("Roll a d20: on a 15+...") doesn't get its whole first clause bolded. */
const LEADING_LABEL_RE = /^([^*\n:]{1,80}?):\s*([\s\S]*)$/;

function boldenLeadingLabel(item: string): string {
  if (item.startsWith("**")) return item;
  const match = item.match(LEADING_LABEL_RE);
  return match ? `**${match[1]}**: ${match[2]}` : item;
}

function parseBlocks(text: string): Block[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const blocks: Block[] = [];
  let bulletBuffer: string[] = [];

  function flushBullets() {
    if (bulletBuffer.length > 0) {
      blocks.push({ type: "bullets", items: bulletBuffer });
      bulletBuffer = [];
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flushBullets();
      blocks.push({ type: "heading", emoji: headingMatch[1], label: headingMatch[2] });
      continue;
    }
    const boldOnlyMatch = line.match(BOLD_ONLY_RE);
    if (boldOnlyMatch) {
      flushBullets();
      blocks.push({ type: "heading", emoji: "", label: boldOnlyMatch[1] });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      bulletBuffer.push(line.slice(2));
      continue;
    }
    flushBullets();
    blocks.push({ type: "paragraph", text: line });
  }
  flushBullets();
  return blocks;
}

/** A run of plain (non-bold) text — tokenized against the universal condition/ability glossary, since those terms show up in prose ("DC 19 Strength saving throw") rather than as bolded item names. */
function renderPlainSegment(text: string, keyPrefix: string) {
  return text
    .split(UNIVERSAL_TERMS_RE)
    .filter((part) => part !== "")
    .map((part, i) => {
      const hint = UNIVERSAL_GLOSSARY[part.toLowerCase()];
      return hint ? (
        <InfoTooltip key={`${keyPrefix}-${i}`} inline panel={<HintPanel title={part} description={<RichText text={hint} />} />}>
          {part}
        </InfoTooltip>
      ) : (
        <span key={`${keyPrefix}-${i}`}>{part}</span>
      );
    });
}

function renderInline(text: string, keyPrefix: string, glossary: AiGlossary) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== "")
    .flatMap((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const label = part.slice(2, -2);
        const hint = glossary[label.toLowerCase()] || UNIVERSAL_GLOSSARY[label.toLowerCase()];
        return hint ? (
          <InfoTooltip key={`${keyPrefix}-${i}`} inline panel={<HintPanel title={label} description={<RichText text={hint} />} />}>
            <strong>{label}</strong>
          </InfoTooltip>
        ) : (
          <strong key={`${keyPrefix}-${i}`}>{label}</strong>
        );
      }
      return renderPlainSegment(part, `${keyPrefix}-${i}`);
    });
}

export function AiResponseText({ text, glossary = {} }: { text: string; glossary?: AiGlossary }) {
  const blocks = parseBlocks(text);
  const firstHeadingIndex = blocks.findIndex((b) => b.type === "heading");
  const strategyIndex = blocks.findIndex(
    (b, i) => b.type === "paragraph" && (firstHeadingIndex === -1 || i < firstHeadingIndex)
  );

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h4 key={i} className="flex items-center gap-2 pt-1 text-sm font-semibold text-sky-300 first:pt-0">
              {block.emoji && <span>{block.emoji}</span>}
              {block.label}
            </h4>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={i} className="flex flex-col gap-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                  <span className="mt-0.5 shrink-0 text-slate-600">–</span>
                  <span>{renderInline(boldenLeadingLabel(item), `${i}-${j}`, glossary)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (i === strategyIndex) {
          return (
            <p key={i} className="rounded-lg border-l-2 border-sky-600 bg-sky-950/20 px-3 py-2 text-[15px] leading-relaxed text-slate-100">
              {renderInline(block.text, `${i}`, glossary)}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-300">
            {renderInline(block.text, `${i}`, glossary)}
          </p>
        );
      })}
    </div>
  );
}
