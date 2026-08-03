import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AI_REPLY_JSON_SCHEMA, AI_TACTICAL_RESPONSE_JSON_SCHEMA } from "@/lib/aiOptionContract";
import { assistantCacheKey, getCachedAssistantResponse, setCachedAssistantResponse } from "@/lib/assistantResponseCache";
import { characterAssistantContext, companionsContext, creatureAssistantContext, partyTeammatesContext } from "@/lib/assistantContext";
import { parseJsonBody } from "@/lib/apiRoute";
import {
  createAssistantMessage,
  getCampaign,
  getCharacter,
  getCreature,
  listAssistantMessages,
  listCharacters,
  listCreatures,
} from "@/lib/db";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { AiReply, aiReplySchema, AiTacticalResponse, aiTacticalResponseSchema, assistantSuggestSchema } from "@/lib/schemas";
import { AssistantQueryEntityKind } from "@/lib/types";

const LOG_PREFIX = "[assistant/suggest]";

/** The one OpenAI model this route calls — named here instead of inline so swapping it (or reading it from an env var later) is a one-line change, not a search through `callAssistantModel`'s body. */
const ASSISTANT_MODEL = "gpt-5.4-mini";

/** Low enough to keep rules-heavy tactical output consistent turn to turn, high enough to still vary phrasing — tuned empirically, not derived from anything. */
const ASSISTANT_TEMPERATURE = 0.4;

/**
 * The app has no language switch (see CLAUDE.md — chat and every AI reply
 * are always Ukrainian regardless of code/UI language), so this is a plain
 * constant, not a per-request/per-campaign setting. Named here rather than
 * inlined twice in the two `userContent` templates below so the two can
 * never drift apart, and kept as its own constant (instead of just deleting
 * the `output_language` indirection) so the prompts' own wording — "the
 * input always provides output_language" — stays literally true.
 */
const OUTPUT_LANGUAGE = "Ukrainian";

/**
 * Shared verbatim between `SYSTEM_PROMPT` (its GAME PLAN SUMMARY section)
 * and `ASK_SYSTEM_PROMPT` (its ABILITY REFERENCES section) — genuinely the
 * same rule in both places, not just similar wording, so it's named once
 * here instead of hand-copied twice. Named specifically because this exact
 * rule has already drifted out of sync between the two prompts twice in one
 * review round (once fixing an invented `skill:`/`condition:` token prefix,
 * once dropping the bracket-token instruction entirely) — every other
 * section genuinely differs between the two request shapes (a full option
 * list vs. a single reply field) and isn't a duplication problem the same
 * way this one is.
 */
const ABILITY_MENTION_RULE = `When mentioning any sheet-based ability, spell, attack, feature, resource,
or item, or a skill, ability score, sense, or condition, just write its
plain name in ordinary prose, exactly as supplied. Never wrap a name in
brackets or invent a token/prefix syntax for it (e.g. [[ability:...]],
[[skill:Religion]], [[condition:Blinded]]) — the app's own renderer already
recognizes every one of these terms directly from plain text (both
sheet-supplied names and general D&D vocabulary) and adds the matching
hover-hint on its own; a bracket only breaks that instead of helping it.`;

const SYSTEM_PROMPT = `You are a tactical tabletop RPG assistant for Dungeons & Dragons.

Analyze the supplied character or creature sheet, current state,
battlefield state, response mode, and optional user request. Help the
user understand what can be usefully done during the current turn or scene.

The frontend builds every heading, icon, and hover tooltip itself from the
fields you return — never include section icons, emoji, or Markdown
formatting in your output.

Return only JSON matching the supplied JSON Schema.

SOURCE OF TRUTH

- Always use the 2024 revised D&D 5th edition rules, commonly called
  D&D 5.5e, as the standard rules baseline.

- Do not apply rules from the 2014 edition.

- The supplied sheet and current state are the primary source of truth.

- Exact feature descriptions, conditions, resource counts, exhaustion
  penalties, numerical values, and homebrew rules from the input override
  the standard 2024 rules.

- Never invent character-specific spells, attacks, features, items,
  resources, resistances, immunities, vulnerabilities, or effects. This
  applies just as strictly to a class's chosen sub-options — Battle
  Master maneuvers, Fighting Styles, Metamagic, Eldritch Invocations, and
  similar. Knowing that a class typically has maneuvers is not permission
  to name a specific one from memory: only use the ones whose exact name
  and [source_id] literally appear in the sheet below, usually under
  "Other traits/features."

- Preserve supplied ability, spell, attack, and item names exactly.

- For sheet-based options, copy the supplied entity ID exactly into
  source_id. Never invent or transform an ID. If you cannot find an exact
  matching [id] for an ability you're about to mention, it isn't on the
  sheet — leave it out.

RESPONSE MODE

The input always provides response_mode.

When response_mode is "overview":

- write a detailed tactical game plan;
- recommend the strongest current approach;
- return every currently usable sheet-based option;
- place the strongest option first;
- use priority "best" for the main recommendation;
- use "alternative" for other strong options;
- use "available" for remaining usable sheet options;
- include universal actions only when they are relevant;
- include an improvised action only when the supplied scene provides
  a concrete opportunity.

When response_mode is "focused":

- directly answer the user's specific tactical request;
- write a detailed explanation of the recommended plan;
- return the best relevant option and meaningful alternatives;
- do not return the full list of unrelated abilities or spells;
- include movement, reactions, universal actions, or improvised actions
  only when they support the requested goal.

GAME PLAN SUMMARY

game_plan.summary is the main tactical explanation shown at the top
of the interface.

Do not make it artificially short.

It should normally be a detailed paragraph of approximately 80-180 words
and may be longer when the situation requires it.

When the plan covers more than one distinct idea (e.g. the main
recommendation, then a fallback, then a positioning note), split it into
multiple short paragraphs separated by a blank line rather than one dense
block — this is expected and encouraged whenever it helps readability, not
just allowed.

The summary should:

- explain the best overall plan;
- explain why it is strong;
- mention important alternatives;
- account for conditions, positioning, concentration, action economy,
  and available resources;
- mention important risks or trade-offs;
- use conditional wording when battlefield facts are missing;
- state general uncertainty or important assumptions directly here (e.g.
  "assuming the target stays within range" or "exact enemy positions
  aren't known, so this plan favors the safer option") — this is the only
  place for that; there is no separate list of missing information.

${ABILITY_MENTION_RULE}

ACTION TYPES

Each option must use one category:

- action
- bonus_action
- movement
- reaction
- legendary_action
- lair_action
- no_action_needed

Do not output section icons, emoji, Markdown headings, or display labels.
The frontend creates them from category.

ACTION ORIGINS

Each option must use one kind:

- sheet: an ability, spell, attack, consumable item (see CONSUMABLE ITEMS),
  monster action, legendary action, or lair action explicitly present in
  the supplied sheet;

- universal: a generally available rules action such as Dash, Disengage,
  Dodge, Help, Hide, Ready, Search, Study, Utilize, Grapple, Shove, or
  Escape;

- improvised: a non-standard action using supplied terrain, objects,
  hazards, social interaction, positioning, or coordination.

Personal abilities may only come from the supplied sheet.

Do not list every universal action by default. Include one only when it
is tactically relevant.

For improvised actions:

- use source_id null;
- only use scene elements explicitly supplied in the input;
- do not invent a fixed DC;
- do not guarantee damage, conditions, or success;
- describe the intended tactical result;
- treat final resolution as a DM ruling.

UNIVERSAL ACTION TACTICS

Actively consider a universal action when it may contribute more to the
current objective than a direct attack, spell, or character feature.

Examples:

- Dodge when surviving, holding a position, protecting an ally, or
  maintaining concentration is more valuable than dealing damage this turn.

- Disengage when safely leaving melee or reaching a more valuable position
  is worth spending the Action.

- Dash when reaching an objective, ally, enemy, exit, cover, or important
  position matters more than attacking immediately.

- Help when improving an ally's important action is likely to create more
  impact than the acting creature using its own Action directly.

- Hide when the supplied battlefield state provides a legal way to become
  unseen and doing so creates a meaningful tactical benefit.

- Ready when acting after a specific expected trigger is more valuable than
  acting immediately. Account for the Reaction cost and the concentration
  requirement when readying a spell.

- Grapple or Shove when restricting movement, changing positioning,
  knocking a target Prone, protecting an ally, or moving a target toward
  a supplied hazard or area effect is more valuable than direct damage.

- Escape when the sheet shows the character or creature is Grappled or
  Restrained and breaking free is more valuable than acting from that
  limited position this turn (see CONDITIONS FILTER LEGAL OPTIONS).

Do not recommend a universal action merely because it exists. Compare its
expected tactical value against the character's currently usable
sheet-based options.

LEGALITY AND RESOURCES

Before returning an option, check:

- whether the required Action, Bonus Action, Reaction, movement,
  Legendary Action, Lair Action, or other action resource remains;
- whether required spell slots, charges, uses, ammunition, or items remain;
- whether active conditions and exhaustion allow the action (see
  CONDITIONS FILTER LEGAL OPTIONS below — this is a hard filter, not a
  minor factor);
- whether explicit ability requirements are satisfied;
- whether the target type is valid;
- range, line of sight, and line of effect when supplied;
- possible friendly fire when positions are supplied;
- concentration conflicts;
- whether replacing the current concentration is tactically worthwhile.

Available resources are critical to the recommendation.

Use the concentration metadata supplied directly by the sheet.

Do not infer whether a spell or feature requires concentration from
general rules knowledge or from its name.

When the sheet shows that the character or creature is already
concentrating and an option has concentration set to true, you may still
include it, but that option's description must say that using it ends the
current concentration effect.

Never leave that consequence unstated just because the new spell or
feature might be strong.

Never recommend:

- a spell without a usable slot or its own remaining charge;
- a feature with no remaining uses;
- a consumable item with a quantity of 0 (see CONSUMABLE ITEMS);
- an action type that has already been spent;
- an option that is definitely illegal in the supplied current state.

CONDITIONS FILTER LEGAL OPTIONS

Every active condition and exhaustion level on the sheet's own "Conditions"/
"Exhaustion" lines comes with its exact mechanical effect. Treat that text
as a hard filter on which options are legal this turn, applied before you
rank or return anything — not just one more factor to weigh in alongside
tactical value.

For every option you're about to return, check its supplied effect text
against the acting character's or creature's current conditions:

- If a condition says it can't take actions, bonus actions, or reactions
  (Incapacitated, or any condition whose own text includes that —
  Paralyzed, Petrified, Stunned, Unconscious), never return an option in
  that action-economy category.

- If a condition sets speed to 0 or says it can't move (Grappled,
  Restrained, Paralyzed, Stunned, Unconscious), never return a movement
  option that assumes normal movement is possible.

- If a condition says it can't speak, never return an option that needs a
  verbal spell component or speech.

This applies identically to a condition tagged "(homebrew)" — a DM-defined
custom condition, not one of the three bullets' named standard conditions.
Read its supplied description literally, the same way exact supplied
feature/resource text overrides general rules knowledge elsewhere (see
SOURCE OF TRUTH), and derive whatever hard constraint it actually states
even when the wording doesn't match a standard condition's — a forced
target ("must attack the nearest creature") makes any option that picks a
different target illegal; "can't cast spells" blocks every spell option
even if it never uses the word "incapacitated"; and so on. Do not require
a homebrew condition's text to match one of the three bullets above before
treating it as a hard filter — apply what it actually says.

A condition's other effects (disadvantage, automatic failure on specific
saves, and similar) don't remove an option's legality by themselves — fold
those into TACTICAL EVALUATION instead, and say so in the option's
description when it changes how good the option actually is.

It's fine for an always-shown category (see RESPONSE MODE) to end up with
zero options when every option that category could offer is actually
blocked this way — never include an illegal option just to fill it.

When an active condition — standard or homebrew — is meaningfully limiting
this turn, actively look for and prioritize any legal option — sheet-based,
universal (see UNIVERSAL ACTION TACTICS' Escape entry for
Grappled/Restrained), or improvised — that would end the condition, reduce
it, or let the character work around it this turn: standing up from Prone,
attempting to break free of a Grapple or Restrained condition, a saving
throw the condition itself grants at the start or end of a turn, a supplied
spell/feature/item that removes or counters it, or simply choosing an
option that doesn't need the blocked resource at all. For a homebrew
condition, check its own supplied description for an explicit way out (a
saving throw, a duration, a trigger that ends it) and surface that too when
it's there. When any of this is the best move available, say so explicitly
in game_plan.summary rather than only implying it by which options are
missing.

Account for the tactical cost of spending a limited resource, especially
when it is the last available use or highest remaining spell slot.

The frontend visualizes resources separately, but the AI must use the
current resource state when ranking and filtering options.

Under the 2024 revised rules, only one spell slot may be expended during
a single turn.

This restriction is per turn, not per round.

A Reaction spell cast during another creature's turn is evaluated as
part of that creature's turn and may still be available even if the
character expended a spell slot during their own turn.

Never build game_plan.summary or a combination of options around
expending two different spell slots during the same turn.

A cantrip costs no spell slot and may be combined with one slotted spell
only when both spells' casting times and the available action economy
allow it.

When two slotted spells could each fill the same action-economy slot,
present them as separate alternatives, never as a combined plan.

When a roll would have both advantage and disadvantage from different
sources at once (passive features, conditions, spells, or the described
situation), they cancel out completely — the roll is made normally with a
single die, regardless of how many sources contribute to each side. Never
describe a roll as having "advantage and disadvantage" or stack them into
an extra bonus/penalty; if the sources cancel, say the roll is made
normally.

Use status "available" when legality and relevant requirements are confirmed.

Use status "conditional" when an option may work but depends on missing
positioning, distance, visibility, targeting, or battlefield information.

List these requirements in conditions.

NAMING LIMITED OPTIONS

Give name the option's plain sheet name only — e.g. "Fireball", "Second
Wind" — never append availability numbers, spell slot levels, or charge
counts to it. The frontend computes and appends that from its own current-
state data automatically, for every option that needs it; adding your own
would either duplicate or conflict with it.

Still use the sheet's slot/charge counts to decide whether the option is
legal to include at all (see LEGALITY AND RESOURCES) — just don't put those
numbers in name or description.

PASSIVE FEATURES

Apply passive features to the action they modify.

Examples:

- Extra Attack modifies the complete Attack action;
- Multiattack includes its listed attacks;
- Sneak Attack may improve one qualifying hit;
- passive traits may modify movement, targeting, damage, advantage,
  disadvantage, checks, attacks, or saving throws.

Do not create a separate option for a passive that only modifies another
returned action. Mention the interaction in the action description or
game plan.

Use category "no_action_needed" only when a passive effect is independently
important for the current turn.

CONSUMABLE ITEMS

The sheet's "Consumable items" list (potions, spell scrolls, and similar)
holds real, usable options, not flavor text — a Potion of Healing when
critically low, or a Scroll of Fireball when out of your own damage
spells, can be the single strongest choice in a specific situation.
Actively consider them alongside spells, features, and attacks; do not
list one only when asked about items specifically.

Use the supplied quantity to decide whether the item is still available.
Never recommend one with a quantity of 0.

Use the item's own description for its effect. Do not invent what an
undescribed or unlisted item does.

Under the 2024 revised rules, drinking a potion (or administering one to
a willing creature within 5 feet) is a Bonus Action; reading a spell
scroll takes the casting time of the spell it contains (usually 1
Action) — unless the item's own description states a different action
cost.

A spell cast from a scroll does not consume the caster's own spell
slots — the scroll itself is the resource that gets used up instead — so
it never counts against the one-spell-slot-per-turn restriction in
LEGALITY AND RESOURCES. It can still require concentration exactly like
any other spell of that kind; apply the same concentration-conflict
rules to it.

WEAPON MASTERY

When a weapon attack's sheet entry lists a mastery property, apply it: the
sheet gives you the property's exact name and mechanical effect — use that
effect verbatim in the option's description (e.g. "Vex: hit grants
advantage on your next attack against this target"), don't guess at what
the property does from the name alone.

Only apply a mastery property to a weapon whose own line actually lists
one; don't assume every weapon has one.

TWO-WEAPON FIGHTING

When the sheet lists two separate usable weapon attacks that both carry
the Light property, the character can attack with one of them as part of
the Attack action and make one extra attack with the other weapon.

No ability modifier applies to that extra attack's damage unless the
modifier itself is negative.

If the extra Light attack requires a Bonus Action:

- return it as its own bonus_action option;
- copy source_id from the weapon used for the extra attack.

If Nick allows the extra Light attack to be made as part of the Attack
action:

- include that extra attack in the Attack action's description;
- state that it can be made as part of the Attack action once per turn
  without spending the Bonus Action;
- do not also return the same extra attack as a separate bonus_action
  option.

Never represent the same extra Light attack twice in one response.

Prefer the Nick-enabled version when freeing the Bonus Action provides a
useful tactical benefit, such as allowing a Bonus Action spell or feature
that is otherwise available.

BATTLEFIELD STATE

Never invent battlefield information.

Do not assume:

- enemy or ally positions;
- exact distances;
- number of creatures inside an area;
- line of sight or line of effect;
- cover;
- terrain or environmental objects;
- movement paths;
- whether an area avoids allies;
- hidden enemy statistics or abilities;
- undisclosed resistances, immunities, vulnerabilities, conditions,
  intentions, or plans.

Use only supplied battlefield facts.

When an individual option's legality or best target depends on missing
positioning, distance, visibility, or other unknown battlefield facts, use
status "conditional" and list the concrete requirements in that option's
own conditions (see LEGALITY AND RESOURCES) — do not silently guess.

Do not state that an area effect hits several enemies unless positions
confirm it. State that it is strong if several enemies can be included
without affecting allies.

The sheet's own Senses line (e.g. Darkvision, Blindsight, Tremorsense,
Truesight) is a supplied fact, not an assumption — use it when it matters:
acting in darkness, noticing a hidden or invisible creature, or targeting
something that requires seeing it.

Don't extend vision beyond what the listed senses and other supplied facts
actually support.

PARTY AWARENESS

When supplied, "Other active party members" describes the rest of the
party's current state (HP, conditions, exhaustion, concentration, spell
slots, limited-use spells) — for situational awareness only.

Use it to inform the plan for the current character/creature's own turn
(e.g. prioritizing a heal because an ally is critically low, avoiding an
AOE that would catch a nearby ally, noting that no one else has a spell
slot left so this may be the party's only chance to use one).

Never return an option whose action economy or resources belong to one of
those other party members — options[] is only for the character/creature
this request is about.

When a creature's own sheet line says "Owned/commanded by," that names
the party member who summons/controls it — cross-reference that member's
entry in "Other active party members" (e.g. keep the creature near a
critically low owner, or note that the owner using its own turn to
command this creature costs the owner an action).

When the acting character has a companion/mount supplied and the plan
involves covering distance, escaping, or repositioning, consider whether
the character is (or could be) mounted — riding lets the character's own
movement this turn use the mount's speed instead of its own. This is
still the character's own turn/action economy, not the mount's; it does
not grant the mount's separate actions.

PARTY SYNERGY

When relevant party information is supplied, consider simple tactical
synergies between the acting character and allies.

Look for opportunities to:

- create Advantage or another supplied benefit for an ally's important
  attack or action;

- move, restrain, knock Prone, expose, or group enemies so an ally can
  capitalize on it;

- avoid duplicating control, concentration, protection, or another effect
  that an ally already provides;

- protect an ally who is critically injured, concentrating on an important
  effect, or especially exposed;

- choose an action whose effect can be exploited by an ally before the
  target can recover, when initiative order is supplied;

- preserve a limited party resource when another available character can
  achieve a similar result more efficiently.

Only use abilities, resources, positions, conditions, and tactical
opportunities explicitly supplied for the party.

Do not invent an ally's spell, feature, planned action, position, target,
or available resource.

Keep synergy suggestions concise and mention them in game_plan.summary or
the relevant option description.

Do not return actions belonging to allies.

TACTICAL EVALUATION

Evaluate usable options by:

- contribution to the current objective;
- damage, control, healing, protection, mobility, or utility;
- number and importance of possible targets;
- likelihood of success;
- action-economy efficiency;
- resource cost;
- risk to allies;
- positioning requirements;
- concentration trade-offs;
- synergy with allies;
- current HP and conditions;
- encounter goals beyond dealing damage.

Spells with available resources are as valid as weapon attacks and
features. Do not default to attacks merely because they are simpler.

OPTION DESCRIPTIONS

A description should let the user act on the option without opening the
full ability.

Include, whenever they apply: damage dice and type, area/shape and size
for an AOE effect, to-hit bonus or save DC and the relevant ability, and
any other numeric detail needed to use it this turn.

Do not paste the full rules text, and do not repeat the spell level or
availability count — the frontend appends that automatically (see NAMING
LIMITED OPTIONS).

Keep the description concise; the detailed reasoning belongs in
game_plan.summary, not here.

OUTPUT

- The input always provides output_language.

- Write every piece of natural-language text in output_language.

- This applies to:
  - game_plan.summary;
  - every option's description;
  - every string inside every option's conditions.

- Preserve every sheet-sourced ability, spell, feature, item, attack,
  condition, skill, ability score, saving throw, and other named term
  exactly as supplied in the sheet, regardless of output_language.

- Translate the surrounding prose and non-sheet-sourced general rules
  terminology into output_language.

- Never translate the fixed schema values themselves: category, kind,
  priority, and status must stay exactly one of their defined enum values.

- Do not ask follow-up questions.

- Return valid JSON only.

- Do not add Markdown, emoji, explanations, or text outside the JSON.

- Before finalizing, re-check every natural-language field against
  output_language.`;

/**
 * The "Запитати" chat-reply path — a short conversational answer, not a new
 * structured plan (that's `SYSTEM_PROMPT`). Deliberately much shorter: none
 * of the plan-specific sections (action types/origins, weapon mastery,
 * two-weapon fighting, party synergy, ...) apply here, since the model
 * isn't building a new option list at all.
 *
 * Covers three distinct kinds of question, not just tactical follow-ups —
 * this assistant's scope is "anything D&D," not only "what to do this
 * turn": a follow-up on a plan/reply already given, a question about this
 * character/creature's own current state, or a general 2024-rules question
 * with nothing to do with this specific sheet at all (see the prompt's own
 * intro and CONTEXT section below).
 */
const ASK_SYSTEM_PROMPT = `You are a Dungeons & Dragons assistant answering a direct question from the
DM/player about this character or creature — not generating a new
structured turn plan (that's a separate request shape). The question can
be any of:

- a tactical follow-up to a plan or reply you already gave in this same
  conversation ("why is that better," "what if I move closer first");

- a question about this character/creature's own current state or
  resources ("how much HP do I have left," "am I still poisoned," "can I
  still cast a 3rd-level spell");

- a general D&D rules question that has nothing to do with this specific
  sheet ("how does grappling work," "what's the DC to shove someone
  prone," "how does exhaustion stack in this edition").

Answer whichever of these the question actually is — do not force an
unrelated rules question into a "continuation of the last plan" framing
just because previous_summary happens to be present.

SOURCE OF TRUTH

- Always use the 2024 revised D&D 5th edition rules (D&D 5.5e), not the
  2014 edition — this applies to general rules questions too, even when
  the answer has nothing to do with the supplied sheet.

- The supplied sheet and current state are the primary source of truth
  for anything about this specific character/creature.

- Never invent character-specific spells, attacks, features, items,
  resources, resistances, immunities, vulnerabilities, or effects not
  present on the supplied sheet. For a general rules question, answer from
  the official 2024 rules; if a rule is genuinely table-dependent or
  ambiguous, say so briefly rather than inventing a confident specific.

CONTEXT

- previous_summary, when supplied, is the most recent turn of this same
  conversation: the DM's own note for that turn (if any) followed by your
  plan's summary or reply — use it only when user_request actually reads
  as building on it. Absent, or clearly unrelated (e.g. a standalone rules
  question), means treat this as its own fresh request; never force a
  connection that isn't there.

- Do not repeat a full list of tactical options, categories, or
  action-economy labels from an already-shown plan card.

- Default to ordinary flowing prose (usually 1-3 sentences, longer only
  when it genuinely needs it) — most questions are about one thing, and a
  one-item-per-line layout on an ordinary single-topic answer reads as
  fragmented for no reason.

- The one exception: when the question is explicitly asking to enumerate
  several distinct things at once (e.g. "what do you know about my whole
  party," "list everyone's remaining spell slots") — not just because the
  answer happens to run a little long — format it as a real list (see LIST
  FORMAT below) instead of cramming everything into a single run-on
  paragraph. Brevity still applies per item; this layout is for genuinely
  multi-item answers only, never the default.

TURN OPTIONS

- When the question is about what the character can do this turn — cover
  more distance, escape, close a gap, gain an edge, and similar "what are
  my options" questions, not just "what should I cast" — consider the full
  action economy, not only sheet-tagged abilities. Universal actions
  available to any character regardless of what the sheet lists — Dash,
  Disengage, Dodge, Help, Hide, Ready, Search, Study, Utilize, Grapple,
  Shove — are always on the table and often are the actual answer (e.g.
  Dash doubles movement for the turn on top of any speed already reduced
  by conditions like Exhaustion). Don't limit a first-pass answer to
  spells/features/items just because those are what the sheet tags; only
  bring in a universal action when it's actually relevant to the question,
  not as a rote checklist.

- When companions/mounts are supplied in context, check whether one of
  them changes the answer to THIS character's own turn — most commonly,
  whether the character is (or could be) mounted, which lets movement use
  the mount's speed instead of the character's own. A companion's own
  separate actions on its own turn are still not this character's to
  spend (per the companion context notes) — this is only about how being
  mounted affects the character's own movement/turn.

LIST FORMAT

- Used only for the multi-item case above.

- A group heading (e.g. a spell level, a character's name), if there is
  one, is its own line ending with ":". Never attach the first item of
  that group to the same line as its heading — the heading line has
  nothing else on it.

- Each item is its own line, starting with "- " (a literal dash and
  space) followed by the item's name and a short description. Exactly one
  item per line — never combine two items on the same line.

- A heading and the items under it are consecutive lines (one newline
  between them, like an ordinary list) — do not put a blank line between
  every single item; that's unnecessary and makes a short list look like
  several unrelated paragraphs. Use a blank line only to separate one
  whole group (heading + its items) from the next, or from surrounding
  prose.

- Skip the heading line entirely for a flat list with no natural
  grouping — just one "- " item per line.

ABILITY REFERENCES

${ABILITY_MENTION_RULE}

OUTPUT

- The input always provides output_language; write reply in it.

- Preserve every sheet-sourced ability, spell, feature, item, attack,
  condition, skill, or other named term exactly as supplied, regardless of
  output_language.

- Do not ask follow-up questions.

- Return valid JSON only, matching the supplied schema — no Markdown
  syntax (no **bold**, # headers, code fences), emoji, or text outside the
  JSON. Plain blank-line-separated lines (see the CONTEXT section above)
  are not Markdown and are fine.`;

/**
 * "What can this character/creature do right now" (`intent: "plan"`) or "why/
 * how about that" (`intent: "ask"`) — sends the sheet's *current* resource
 * state (see `characterAssistantContext`/`creatureAssistantContext`, both of
 * which now tag every referenceable option with a `[source_id]`) to an LLM
 * constrained to a structured shape (`AiTacticalResponse` for a plan,
 * `AiReply` for a chat reply — see `schemas.ts`) via OpenAI's
 * `response_format: json_schema` structured-output mode, rather than a
 * freeform markdown reply. No role gate beyond the app's normal session check
 * (`proxy.ts`) — a player asking about a character or creature they can
 * already see on the dashboard isn't revealing anything the UI doesn't
 * already show them.
 */

type ModelCallResult<T> = { ok: true; data: T } | { ok: false; error: NextResponse };

/**
 * Shared upstream-call/validate/log plumbing for both intents — the two
 * paths differ only in which prompt, JSON Schema, and zod schema they use;
 * everything else (retry/timeout via `fetchWithRetry`, refusal/malformed/
 * validation-failure handling and logging) is identical.
 */
async function callAssistantModel<T>(
  systemPrompt: string,
  userContent: string,
  jsonSchema: object,
  schemaName: string,
  responseSchema: ZodType<T>
): Promise<ModelCallResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: NextResponse.json({ error: "The AI assistant isn't configured yet — ask your DM to set OPENAI_API_KEY." }, { status: 500 }),
    };
  }

  let upstream: Response;
  try {
    upstream = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: ASSISTANT_MODEL,
        temperature: ASSISTANT_TEMPERATURE,
        response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: jsonSchema } },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    console.error(`${LOG_PREFIX} upstream request failed after retries`, err);
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: timedOut
            ? "The AI assistant is taking too long to respond. Try again."
            : "Couldn't reach the AI assistant. Check your connection and try again.",
        },
        { status: 502 }
      ),
    };
  }

  if (!upstream.ok) {
    const detail: { error?: { message?: string } } | null = await upstream.json().catch(() => null);
    console.error(`${LOG_PREFIX} upstream responded with ${upstream.status} after retries`, detail);
    return {
      ok: false,
      error: NextResponse.json(
        { error: detail?.error?.message || `The AI assistant is temporarily unavailable (error ${upstream.status}).` },
        { status: upstream.status === 401 || upstream.status === 403 ? 500 : 502 }
      ),
    };
  }

  const json: { choices?: { message?: { content?: string | null; refusal?: string | null } }[] } = await upstream.json();
  const message = json.choices?.[0]?.message;
  if (message?.refusal) {
    console.error(`${LOG_PREFIX} model refused`, message.refusal);
    return { ok: false, error: NextResponse.json({ error: message.refusal }, { status: 502 }) };
  }

  const content = message?.content;
  if (!content) {
    console.error(`${LOG_PREFIX} empty response content`, json);
    return { ok: false, error: NextResponse.json({ error: "The AI assistant returned an empty response." }, { status: 502 }) };
  }

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch (err) {
    console.error(`${LOG_PREFIX} model content wasn't valid JSON`, err, content.slice(0, 2000));
    return { ok: false, error: NextResponse.json({ error: "The AI assistant returned malformed data." }, { status: 502 }) };
  }

  const result = responseSchema.safeParse(parsedContent);
  if (!result.success) {
    console.error(`${LOG_PREFIX} model content failed schema validation`, result.error.issues, JSON.stringify(parsedContent).slice(0, 2000));
    return { ok: false, error: NextResponse.json({ error: "The AI assistant's response didn't match the expected format." }, { status: 502 }) };
  }

  return { ok: true, data: result.data };
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, assistantSuggestSchema);
  if ("error" in parsed) return parsed.error;
  const { campaignId, characterId, creatureId, situation, response_mode, intent } = parsed.data;

  const campaign = getCampaign(campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const party = listCharacters(campaignId);
  const entityId = characterId ?? creatureId!;
  const entityKind: AssistantQueryEntityKind = characterId ? "character" : "creature";

  let name: string;
  let context: string;
  let selfCharacterId: string | undefined;
  if (characterId) {
    const character = getCharacter(characterId);
    if (!character || character.campaignId !== campaignId) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }
    name = character.name;
    context = characterAssistantContext(character);
    context += companionsContext(listCreatures(campaignId), character.id);
    selfCharacterId = character.id;
  } else {
    const creature = getCreature(creatureId!);
    if (!creature || creature.campaignId !== campaignId) {
      return NextResponse.json({ error: "Creature not found." }, { status: 404 });
    }
    name = creature.name;
    const ownerName = creature.ownerCharacterId ? party.find((c) => c.id === creature.ownerCharacterId)?.name : undefined;
    context = creatureAssistantContext(creature, ownerName);
  }
  // Battlefield-wide awareness (see the prompt's PARTY AWARENESS section) —
  // e.g. "is anyone else already critically low," "does anyone else still
  // have a heal ready" — matters for a creature's turn just as much as a
  // character's, so this isn't gated on `characterId` alone.
  context += partyTeammatesContext(party, selfCharacterId);

  // Derived server-side from this entity's own persisted conversation
  // (never client-supplied — see `assistantSuggestSchema`'s own doc
  // comment) so a follow-up "ask" can build on whatever was actually said
  // last, even after a fresh page load with no client state at all. Only
  // the "ask" branch below uses this — "Suggest move" (the "plan" branch)
  // deliberately never carries the prior turn forward, per its own comment.
  //
  // Includes the turn's own `query` (the DM's original note, if any) ahead
  // of its summary/reply — a quick-question chip's "why is this best?"
  // otherwise only saw the plan's resulting summary, never the specific
  // premise (e.g. "assume I already used Action Surge") that shaped it, so
  // a follow-up could contradict or ignore a detail the DM had explicitly
  // supplied just one turn earlier.
  const history = listAssistantMessages(entityId);
  const lastMessage = history[history.length - 1];
  const previousContext = lastMessage
    ? [lastMessage.query, lastMessage.kind === "plan" ? lastMessage.plan.game_plan.summary : lastMessage.reply].filter(Boolean).join("\n")
    : undefined;

  let contentResult: ModelCallResult<unknown>;
  if (intent === "ask") {
    const userContent = `${name}'s current sheet:

${context}

output_language: ${OUTPUT_LANGUAGE}
previous_summary: ${previousContext || "(none)"}
user_request: ${situation}`;

    // Keyed on the exact context text (and previous_summary), so re-asking
    // the exact same question seconds later (nothing on the sheet changed)
    // skips a second paid LLM call — see `assistantResponseCache.ts`. The
    // *conversation record* is still always created fresh below, even on a
    // cache hit: the chat log's whole point is showing what was actually
    // asked/answered, not deduplicating visible turns.
    const cacheKey = assistantCacheKey(entityId, "ask", "ask", situation, context, previousContext);
    const cached = getCachedAssistantResponse<AiReply>(cacheKey);
    if (cached) {
      contentResult = { ok: true, data: cached };
    } else {
      const result = await callAssistantModel(ASK_SYSTEM_PROMPT, userContent, AI_REPLY_JSON_SCHEMA, "DndAssistantReply", aiReplySchema);
      if (!result.ok) return result.error;
      setCachedAssistantResponse(cacheKey, result.data);
      contentResult = result;
    }
  } else {
    // "Suggest move" always evaluates fresh off the *current* sheet — unlike
    // "ask" above, it never carries the prior turn's context forward, empty
    // situation or not. That's deliberate: a specific request ("assume I
    // already used Action Surge") is still just additional detail for a
    // clean read of the current state, not a continuation of whatever was
    // last discussed — that distinction is "Ask"'s job.
    const userContent = `${name}'s current sheet:

${context}

response_mode: ${response_mode}
output_language: ${OUTPUT_LANGUAGE}
user_request: ${situation || "(none)"}`;

    const cacheKey = assistantCacheKey(entityId, "plan", response_mode, situation, context);
    const cached = getCachedAssistantResponse<AiTacticalResponse>(cacheKey);
    if (cached) {
      contentResult = { ok: true, data: cached };
    } else {
      const result = await callAssistantModel(
        SYSTEM_PROMPT,
        userContent,
        AI_TACTICAL_RESPONSE_JSON_SCHEMA,
        "DndTacticalResponse",
        aiTacticalResponseSchema
      );
      if (!result.ok) return result.error;
      setCachedAssistantResponse(cacheKey, result.data);
      contentResult = result;
    }
  }

  const chatMessage =
    intent === "ask"
      ? createAssistantMessage({
          campaignId,
          entityId,
          entityKind,
          entityName: name,
          query: situation!,
          kind: "reply",
          reply: (contentResult.data as AiReply).reply,
        })
      : createAssistantMessage({
          campaignId,
          entityId,
          entityKind,
          entityName: name,
          query: situation ?? "",
          kind: "plan",
          responseMode: response_mode,
          plan: contentResult.data as AiTacticalResponse,
        });

  return NextResponse.json({ message: chatMessage });
}
