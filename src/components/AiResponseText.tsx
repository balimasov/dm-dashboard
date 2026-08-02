import { ReactNode, useMemo } from "react";
import { AiAvailability } from "@/lib/aiAvailability";
import { AiGlossary, resolveAiHint } from "@/lib/aiGlossary";
import { CONDITION_INFO, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";
import { parseSummaryTokens } from "@/lib/aiSummaryTokens";
import { MASTERY_INFO } from "@/lib/masteryInfo";
import { AiOption, AiTacticalResponse } from "@/lib/schemas";
import { SENSE_INFO } from "@/lib/senseInfo";
import { getUniversalActionInfo, UNIVERSAL_ACTION_INFO } from "@/lib/universalActionInfo";
import { InfoTooltip } from "./InfoTooltip";
import { ConditionHintPanel } from "./ui/conditionHints";
import { FAINT_TINT_CLS } from "./ui/containerStyles";
import { HintPanel } from "./ui/HintPanel";

/**
 * Renders `/api/assistant/suggest`'s structured `AiTacticalResponse` — the
 * model no longer returns markdown to parse; it returns `game_plan.summary`
 * plus a flat `options[]` array (see `schemas.ts`), and *this* component is
 * the one place that owns turning `category` into a heading+emoji, grouping
 * options under it, and skipping empty categories — the model is
 * instructed not to send any of that presentation itself.
 *
 * Every option's name is wrapped in the app's own `InfoTooltip`, but the
 * panel content is never invented here: for a `kind: "sheet"` option,
 * `option.source_id` is looked up in `glossary` (from `buildAiGlossary` —
 * keyed by the entity's own `Feature`/`KnownSpell`/`Attack`/`Resource`/
 * `InventoryItem` `.id`, or a creature trait/spellcasting-spell's
 * `aiSourceIds.ts` id) to show the
 * *exact* hint component the character/creature card itself renders for
 * that thing — falling back to `glossaryByName` (the same hints, keyed by
 * name instead) whenever the id doesn't match anything, since the model is
 * far more consistent about copying a sheet name verbatim than an opaque
 * id. `availability`/`availabilityByName` follow the same id-then-name
 * pattern for the current-charges/slots suffix (`buildAiAvailability`).
 * `universal`/`improvised` options have a `null` source_id and get no
 * sheet-based tooltip at all — there's nothing on the sheet to link to.
 *
 * `game_plan.summary` (and an option's own `description`/`conditions`) is
 * free prose from the model — every plain-text segment of it is scanned
 * against this specific entity's own sheet term names (`glossaryByName`'s
 * keys — every resource/feature/spell/attack/inventory item it has), the
 * same way it's scanned for universal terms (conditions, ability scores,
 * senses, exhaustion), Weapon Mastery property names, and universal action
 * names, so a hint shows up next to any of these mentioned by their plain
 * sheet-accurate name, with nothing extra for the model to produce.
 *
 * The prompt used to also teach a `[[ability:<source_id>|<name>]]` bracket
 * token for this (see `aiSummaryTokens.ts`'s own doc comment) — dropped
 * after repeatedly chasing new ways the model would malform or invent a
 * variant of that syntax (a stray shorthand bracket, an invented pseudo-
 * namespace prefix, ...), each one a fresh way to leak raw unparsed text
 * into a reply. The plain-text scan below already covered every mention the
 * model didn't bother tagging (about half of them, in practice) just as
 * reliably, so removing the token dropped a recurring bug source without
 * losing real coverage. `renderTokenizedText`/`parseSummaryTokens` stay in
 * place purely to keep rendering any already-persisted conversation history
 * that still contains an old-style token correctly — nothing new is
 * expected to produce one going forward.
 */

const ABILITY_GLOSSARY: Record<string, string> = {
  strength: "Physical power — melee attacks and damage, Athletics, forcing objects.",
  dexterity: "Agility and reflexes — Armor Class, Initiative, ranged attacks, Stealth.",
  constitution: "Stamina and health — hit points, Concentration checks.",
  intelligence: "Reasoning and memory — Arcana, History, Investigation, Nature, Religion.",
  wisdom: "Awareness and intuition — Perception, Insight, Medicine, Survival.",
  charisma: "Force of personality — Deception, Intimidation, Performance, Persuasion.",
};

/**
 * `InfoTooltip`'s trigger always carries `align-top` (see its own doc
 * comment — right for a card's compact single-line rows, where it avoids
 * reserving extra descender space). Inside flowing prose, that same
 * `align-top` makes a hinted word sit visibly higher/lower than the plain
 * baseline-aligned text around it (a bold ability name mid-sentence, a
 * condition name mid-description) — this override forces it back to
 * `baseline` so a hinted word sits exactly where the same plain text would.
 * `!` (Tailwind's important-modifier) is required, not optional: two
 * utility classes of equal specificity are decided by their order in the
 * compiled stylesheet, not by which one is written later in `className`,
 * so a plain `align-baseline` here would not reliably beat `align-top`.
 */
const INLINE_HINT_ALIGN_CLS = "!align-baseline";

/** `senseInfo.ts`'s keys (darkvision, blindsight, ...) plus a literal "exhaustion" — `EXHAUSTION_RULES_TEXT` isn't keyed by name since it's the one entry that isn't a lookup table (a level-scaled rule, not a per-term dictionary). */
const EXHAUSTION_TERM = "exhaustion";

const UNIVERSAL_TERMS = [...Object.keys(CONDITION_INFO), ...Object.keys(ABILITY_GLOSSARY), ...Object.keys(SENSE_INFO), EXHAUSTION_TERM];

const UNIVERSAL_TERMS_RE = new RegExp(`\\b(${UNIVERSAL_TERMS.sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");

/**
 * Weapon Mastery property names (Vex, Sap, Cleave, ...) — matched
 * case-sensitively, unlike conditions/ability scores above. `masteryInfo.ts`'s
 * keys are exactly the capitalized property names, and the prompt's WEAPON
 * MASTERY section has the model name the property verbatim in a description
 * (e.g. "Vex: hit grants advantage..."); two of the eight (Push, Slow) are
 * also ordinary English words, so staying case-sensitive avoids turning
 * every lowercase "push"/"slow" in unrelated prose into a false-positive hint.
 */
const MASTERY_TERMS_RE = new RegExp(`\\b(${Object.keys(MASTERY_INFO).join("|")})\\b`, "g");

/**
 * Universal action names (Dash, Disengage, Dodge, ...) — matched
 * case-sensitively, same reasoning as `MASTERY_TERMS_RE`: several of these
 * (Help, Hide, Ready, Search, Study) are also ordinary English words, so
 * requiring the capitalized form the model actually writes when naming the
 * action avoids turning every lowercase "help"/"search" in unrelated prose
 * into a false-positive hint.
 */
const UNIVERSAL_ACTION_TERMS_RE = new RegExp(
  `\\b(${Object.keys(UNIVERSAL_ACTION_INFO)
    .map((key) => key.charAt(0).toUpperCase() + key.slice(1))
    .join("|")})\\b`,
  "g",
);

/** A condition uses the app's own `ConditionHintPanel`; everything else here (ability score, sense, exhaustion) has no equivalent standalone hint elsewhere (the closest for a score, `AbilityScoreHintPanel`, needs a real score/modifier this context doesn't have), so it keeps a plain title+blurb `HintPanel`. */
function universalHint(term: string) {
  const lower = term.toLowerCase();
  if (CONDITION_INFO[lower]) return <ConditionHintPanel condition={term} />;
  if (ABILITY_GLOSSARY[lower]) return <HintPanel title={term} description={ABILITY_GLOSSARY[lower]} />;
  if (SENSE_INFO[lower]) return <HintPanel title={term} description={SENSE_INFO[lower]} />;
  if (lower === EXHAUSTION_TERM) return <HintPanel title="Exhaustion" description={EXHAUSTION_RULES_TEXT} />;
  return undefined;
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A per-response regex matching any of *this* entity's own sheet term names
 * (`glossaryByName`'s keys), longest-first so e.g. "Heavy Weapon Mastery"
 * wins over a shorter unrelated substring. `null` when there's nothing to
 * match (no glossary supplied, or an empty one) — an empty alternation
 * would otherwise make the `RegExp` constructor throw. Single/double-letter
 * keys are excluded: too short to safely match by name alone (and nothing
 * on a real sheet is named that tersely anyway).
 */
function buildSheetTermsRegex(glossaryByName: AiGlossary): RegExp | null {
  const terms = Object.keys(glossaryByName).filter((term) => term.length > 2);
  if (terms.length === 0) return null;
  const pattern = terms
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join("|");
  return new RegExp(`\\b(${pattern})\\b`, "gi");
}

/** A run of text that didn't match a universal condition/ability term, a sheet term, or a Weapon Mastery property name — checked once more against the universal-action vocabulary (Dash, Disengage, Dodge, ...), since the model's chat replies frequently name one of these in plain prose without it ever appearing as a `kind: "universal"` option. */
function renderUniversalActionSegment(text: string, keyPrefix: string) {
  return text
    .split(UNIVERSAL_ACTION_TERMS_RE)
    .filter((part) => part !== "")
    .map((part, i) => {
      const description = UNIVERSAL_ACTION_INFO[part.toLowerCase()];
      return description ? (
        <InfoTooltip key={`${keyPrefix}-ua-${i}`} inline className={INLINE_HINT_ALIGN_CLS} panel={<HintPanel title={part} description={description} />}>
          {part}
        </InfoTooltip>
      ) : (
        <span key={`${keyPrefix}-ua-${i}`}>{part}</span>
      );
    });
}

/** A run of text that didn't match a universal condition/ability term — checked once more against the Weapon Mastery vocabulary, since a mastery property name can show up in an option's description or the summary the same way a condition can. Falls through to `renderUniversalActionSegment` for whatever's still unmatched. */
function renderMasterySegment(text: string, keyPrefix: string) {
  return text
    .split(MASTERY_TERMS_RE)
    .filter((part) => part !== "")
    .flatMap((part, i) => {
      const effect = MASTERY_INFO[part];
      return effect ? (
        <InfoTooltip key={`${keyPrefix}-${i}`} inline className={INLINE_HINT_ALIGN_CLS} panel={<HintPanel title={part} description={effect} />}>
          {part}
        </InfoTooltip>
      ) : (
        renderUniversalActionSegment(part, `${keyPrefix}-${i}`)
      );
    });
}

/** A run of text that didn't match a universal term — checked once more against this entity's own sheet term names, since the model frequently mentions a real ability/spell/attack/item by name without ever wrapping it in an `[[ability:...]]` token (see this file's own doc comment). Falls through to the Weapon Mastery vocabulary for whatever's still unmatched. */
function renderSheetSegment(text: string, keyPrefix: string, glossaryByName: AiGlossary, sheetTermsRe: RegExp | null) {
  if (!sheetTermsRe) return renderMasterySegment(text, keyPrefix);
  return text
    .split(sheetTermsRe)
    .filter((part) => part !== "")
    .flatMap((part, i) => {
      const hint = glossaryByName[part.trim().toLowerCase()];
      if (hint) {
        return [
          <InfoTooltip key={`${keyPrefix}-sh-${i}`} inline className={INLINE_HINT_ALIGN_CLS} panel={hint}>
            {part}
          </InfoTooltip>,
        ];
      }
      return renderMasterySegment(part, `${keyPrefix}-sh-${i}`);
    });
}

/** A run of plain text (a summary paragraph, or an option's description) — tokenized first against the universal condition/ability/sense/exhaustion vocabulary, since those terms show up in prose ("DC 19 Strength saving throw") rather than as `[[ability:...]]` tokens, then against this entity's own sheet term names, then against Weapon Mastery property names, then against universal action names (Dash, Disengage, ...) for whatever's left over. */
function renderPlainSegment(text: string, keyPrefix: string, glossaryByName: AiGlossary = {}, sheetTermsRe: RegExp | null = null) {
  return text
    .split(UNIVERSAL_TERMS_RE)
    .filter((part) => part !== "")
    .flatMap((part, i) => {
      const hint = universalHint(part);
      if (hint) {
        return [
          <InfoTooltip key={`${keyPrefix}-${i}`} inline className={INLINE_HINT_ALIGN_CLS} panel={hint}>
            {part}
          </InfoTooltip>,
        ];
      }
      return renderSheetSegment(part, `${keyPrefix}-${i}`, glossaryByName, sheetTermsRe);
    });
}

/**
 * Splits `text` on `[[ability:<source_id>|<display_name>]]` tokens (see the
 * prompt's GAME PLAN SUMMARY section) before tokenizing the rest as plain
 * text — used for `game_plan.summary`, but also for an option's own
 * `description` and each of its `conditions` strings: the prompt only
 * teaches the token syntax for the summary, but the model has been observed
 * reusing it verbatim in a description/condition too, and leaving those two
 * on the plain `renderPlainSegment` path left a raw, unparsed
 * `[[ability:...]]` string visible to the user instead of a hint-wrapped
 * name. Renders every field through the same tolerant path rather than
 * trying to keep tightening the prompt to prevent it.
 */
function renderTokenizedText(text: string, keyPrefix: string, glossary: AiGlossary, glossaryByName: AiGlossary, sheetTermsRe: RegExp | null) {
  return parseSummaryTokens(text).flatMap((token, i) => {
    if (token.type === "text") return renderPlainSegment(token.text, `${keyPrefix}-${i}`, glossaryByName, sheetTermsRe);
    // The token's own `source_id` occasionally doesn't match anything —
    // the model sometimes garbles or re-derives an id when writing
    // free-form prose. `glossaryByName` (built straight from the entity's
    // own resources/features/spells/attacks or creature traits, the same
    // as `glossary` but keyed by name) catches it as long as the token's
    // `displayName` is the real sheet name, which has proven far more
    // reliable than an opaque id round-tripped through free generation.
    // `resolveAiHint` additionally flips that priority for a creature's
    // positional trait/spell id, since a *persisted* message re-rendered
    // later can have that id now pointing at a different trait entirely
    // (see its own doc comment).
    const hint = resolveAiHint(token.sourceId, token.displayName.trim().toLowerCase(), glossary, glossaryByName);
    return [
      hint ? (
        <InfoTooltip key={`${keyPrefix}-${i}`} inline className={INLINE_HINT_ALIGN_CLS} panel={hint}>
          <strong>{token.displayName}</strong>
        </InfoTooltip>
      ) : (
        <strong key={`${keyPrefix}-${i}`}>{token.displayName}</strong>
      ),
    ];
  });
}

/** `game_plan.summary` is now allowed to use multiple paragraphs (see the prompt's GAME PLAN SUMMARY section) — split on blank lines so each becomes its own `<p>` instead of running together as one dense block. */
function splitParagraphs(summary: string): string[] {
  return summary
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** A line written as one list item (see `ASK_SYSTEM_PROMPT`'s LIST FORMAT section — a literal `"- "` prefix), as opposed to a group heading or an ordinary line of prose. */
const LIST_ITEM_RE = /^-\s+/;

/**
 * Renders one blank-line-separated block from `splitParagraphs` — either an
 * ordinary paragraph, or (see `LIST_ITEM_RE`) a run of one or more list
 * items, optionally preceded by a heading line. Splits the block on single
 * newlines *within itself* rather than assuming one item per block: a model
 * asked for a list very reliably writes a group heading followed by several
 * "- item" lines back-to-back with no blank line between them (ordinary
 * Markdown-list muscle memory), not one blank-line-separated block per
 * item — requiring the latter and only ever checking a whole block's first
 * line left every item after the first one glued onto the same bullet as
 * plain trailing text instead of getting its own.
 */
function renderReplyBlock(block: string, keyPrefix: string, glossary: AiGlossary, glossaryByName: AiGlossary, sheetTermsRe: RegExp | null) {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (!lines.some((l) => LIST_ITEM_RE.test(l))) {
    return (
      <p key={keyPrefix}>{renderTokenizedText(block, keyPrefix, glossary, glossaryByName, sheetTermsRe)}</p>
    );
  }
  return (
    <div key={keyPrefix} className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const isListItem = LIST_ITEM_RE.test(line);
        const content = line.replace(LIST_ITEM_RE, "");
        const lineKey = `${keyPrefix}-${i}`;
        return isListItem ? (
          <div key={lineKey} className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-slate-600">•</span>
            <p className="flex-1">{renderTokenizedText(content, lineKey, glossary, glossaryByName, sheetTermsRe)}</p>
          </div>
        ) : (
          <p key={lineKey}>{renderTokenizedText(content, lineKey, glossary, glossaryByName, sheetTermsRe)}</p>
        );
      })}
    </div>
  );
}

/**
 * Renders a "Запитати" chat reply (`AssistantChatMessage`'s `reply` field)
 * through the exact same tokenization pipeline a plan's `game_plan.summary`
 * already gets — ability-hint tokens, universal terms (conditions/ability
 * scores/senses/exhaustion), this entity's own sheet-term names, and Weapon
 * Mastery property names all resolve the same way here, since the prompt
 * tells the model to reference sheet abilities the same way in both places
 * (see `ASK_SYSTEM_PROMPT`'s ABILITY REFERENCES section). Deliberately its
 * own small component rather than exposing the lower-level render helpers
 * directly — `AiAssistantModal` only ever needs "turn this reply string into
 * hinted paragraphs," not the tokenization internals.
 *
 * A line written as a list item (see `LIST_ITEM_RE`) renders as an actual
 * bulleted row instead of a plain paragraph — same bullet-dot treatment
 * `OptionRow`'s own conditions list already uses below, so a multi-item
 * answer (e.g. "group my spells by level") reads as a real list rather than
 * a run of visually identical paragraphs with no marker at all. A group
 * heading line (e.g. "Cantrips:") has no such prefix, so it stays a plain
 * line of text — see `renderReplyBlock` for how the two mix within one
 * blank-line-delimited block.
 */
export function AiChatReply({
  text,
  glossary = {},
  glossaryByName = {},
}: {
  text: string;
  glossary?: AiGlossary;
  glossaryByName?: AiGlossary;
}) {
  const sheetTermsRe = useMemo(() => buildSheetTermsRegex(glossaryByName), [glossaryByName]);
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-slate-300">
      {splitParagraphs(text).map((block, i) => renderReplyBlock(block, `reply-${i}`, glossary, glossaryByName, sheetTermsRe))}
    </div>
  );
}

const CATEGORY_META: Record<AiOption["category"], { label: string; emoji: string }> = {
  action: { label: "Action", emoji: "⚔️" },
  bonus_action: { label: "Bonus Action", emoji: "⚡" },
  movement: { label: "Movement", emoji: "🏃" },
  reaction: { label: "Reaction", emoji: "🛡️" },
  legendary_action: { label: "Legendary Action", emoji: "👑" },
  lair_action: { label: "Lair Action", emoji: "🏰" },
  no_action_needed: { label: "No Action Needed", emoji: "🆓" },
};

const CATEGORY_ORDER: AiOption["category"][] = [
  "action",
  "bonus_action",
  "movement",
  "reaction",
  "legendary_action",
  "lair_action",
  "no_action_needed",
];

/**
 * These four make up the core of every turn's action economy, so they're
 * always rendered — even with nothing in them, they still tell the user
 * "you have no bonus action option right now" rather than silently
 * vanishing, which reads as "the model forgot to check." Legendary Action/
 * Lair Action/No Action Needed stay conditional: most sheets (anything
 * that isn't a legendary monster) genuinely have zero of those, and an
 * empty section for something that structurally doesn't exist on this
 * entity would just be noise.
 */
const ALWAYS_SHOWN_CATEGORIES = new Set<AiOption["category"]>(["action", "bonus_action", "movement", "reaction"]);

const PRIORITY_ORDER: Record<AiOption["priority"], number> = { best: 0, alternative: 1, available: 2 };

/** Groups options by category (skipping categories with none) and sorts each group best-first — a defensive re-sort rather than trusting the model's own array order. */
function groupOptionsByCategory(options: AiOption[]): Map<AiOption["category"], AiOption[]> {
  const grouped = new Map<AiOption["category"], AiOption[]>();
  for (const option of options) {
    const list = grouped.get(option.category) ?? [];
    list.push(option);
    grouped.set(option.category, list);
  }
  for (const list of grouped.values()) list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return grouped;
}

/** "Best" (amber — the one to actually pick) and "DM ruling" (sky — a caveat, not a rank) are deliberately different hues, not just different labels: they answer two unrelated questions ("which is strongest" vs. "this one isn't RAW"), and sharing a color made them easy to mix up at a glance. */
function OptionBadge({ tone, children }: { tone: "best" | "improvised"; children: ReactNode }) {
  const cls = tone === "best" ? "bg-amber-950/60 text-amber-400" : "bg-sky-950/60 text-sky-400";
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function OptionRow({
  option,
  isBest,
  glossary,
  glossaryByName,
  sheetTermsRe,
  availability,
  availabilityByName,
}: {
  option: AiOption;
  isBest: boolean;
  glossary: AiGlossary;
  glossaryByName: AiGlossary;
  sheetTermsRe: RegExp | null;
  availability: AiAvailability;
  availabilityByName: AiAvailability;
}) {
  const nameKey = option.name.trim().toLowerCase();
  // Same id-then-name fallback as `renderTokenizedText` (see `resolveAiHint`'s
  // own doc comment for why a creature's positional trait/spell id flips
  // that priority) — `option.source_id` is supposed to be an exact copy of
  // the sheet entity's id, but a model that gets it wrong still reliably
  // gets `name` right, so a lookup by name against the entity's own data
  // (not just this response's other options) catches it either way.
  const sheetHint = option.kind === "sheet" ? resolveAiHint(option.source_id, nameKey, glossary, glossaryByName) : undefined;
  const universalInfo = option.kind === "universal" ? getUniversalActionInfo(option.name) : undefined;
  const hint = sheetHint ?? (universalInfo ? <HintPanel title={universalInfo.title} description={universalInfo.description} /> : undefined);
  const name = hint ? (
    <InfoTooltip inline className={INLINE_HINT_ALIGN_CLS} panel={hint}>
      <strong>{option.name}</strong>
    </InfoTooltip>
  ) : (
    <strong>{option.name}</strong>
  );
  const availabilityText =
    option.kind === "sheet" ? resolveAiHint(option.source_id, nameKey, availability, availabilityByName) : undefined;
  const descriptionKey = option.source_id ?? option.name;

  return (
    <li className="flex gap-2 text-sm leading-relaxed text-slate-300">
      <span className="mt-0.5 shrink-0 text-slate-600">•</span>
      <div className="flex-1">
        <p>
          <span className="inline-flex flex-wrap items-baseline gap-1.5">
            {name}
            {availabilityText && <span className="text-xs font-normal text-slate-500">({availabilityText})</span>}
            {isBest && <OptionBadge tone="best">Best</OptionBadge>}
            {option.kind === "improvised" && <OptionBadge tone="improvised">DM ruling</OptionBadge>}
          </span>
          : {renderTokenizedText(option.description, `desc-${descriptionKey}`, glossary, glossaryByName, sheetTermsRe)}
        </p>
        {option.status === "conditional" && option.conditions.length > 0 && (
          <div className={`mt-1.5 flex flex-col gap-1 rounded-r-md border-l-2 border-slate-700 px-2.5 py-1.5 ${FAINT_TINT_CLS}`}>
            <ul className="flex flex-col gap-0.5 text-xs text-slate-400">
              {option.conditions.map((condition, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="mt-0.5 shrink-0 text-slate-600">•</span>
                  <span>{renderTokenizedText(condition, `cond-${descriptionKey}-${i}`, glossary, glossaryByName, sheetTermsRe)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

export function AiResponseText({
  response,
  glossary = {},
  glossaryByName = {},
  availability = {},
  availabilityByName = {},
}: {
  response: AiTacticalResponse;
  glossary?: AiGlossary;
  glossaryByName?: AiGlossary;
  availability?: AiAvailability;
  availabilityByName?: AiAvailability;
}) {
  const grouped = groupOptionsByCategory(response.options);
  const sheetTermsRe = useMemo(() => buildSheetTermsRegex(glossaryByName), [glossaryByName]);

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex flex-col gap-2 rounded-lg px-3 py-2 text-sm leading-relaxed text-slate-300 ${FAINT_TINT_CLS}`}>
        {splitParagraphs(response.game_plan.summary).map((paragraph, i) => (
          <p key={i}>{renderTokenizedText(paragraph, `sum-${i}`, glossary, glossaryByName, sheetTermsRe)}</p>
        ))}
      </div>
      {CATEGORY_ORDER.map((category) => {
        const options = grouped.get(category);
        const alwaysShown = ALWAYS_SHOWN_CATEGORIES.has(category);
        if ((!options || options.length === 0) && !alwaysShown) return null;
        const meta = CATEGORY_META[category];
        return (
          <div key={category}>
            <h4 className="flex items-center gap-2 pt-1 text-sm font-semibold text-sky-300 first:pt-0">
              <span>{meta.emoji}</span>
              {meta.label}
            </h4>
            {options && options.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {options.map((option, i) => (
                  <OptionRow
                    key={`${category}-${i}`}
                    option={option}
                    isBest={i === 0 && options.length > 1}
                    glossary={glossary}
                    glossaryByName={glossaryByName}
                    sheetTermsRe={sheetTermsRe}
                    availability={availability}
                    availabilityByName={availabilityByName}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-500">No relevant {meta.label.toLowerCase()} option right now.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
