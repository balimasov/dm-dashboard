/**
 * Single source of truth for the AI assistant's structured-output shape.
 * `/api/assistant/suggest/route.ts` sends `AI_TACTICAL_RESPONSE_JSON_SCHEMA`
 * to OpenAI's `response_format: json_schema` (strict mode); `schemas.ts`'s
 * `aiOptionSchema`/`aiTacticalResponseSchema` re-validate the model's actual
 * response against the same enums/limits. Both used to hand-duplicate this
 * shape as two independent literals — this module exists so a future field/
 * enum-value change only has one place to make it, instead of relying on
 * remembering to edit both (see `aiOptionContract.test.ts` for the
 * regression check that they still agree).
 */
export const AI_OPTION_CATEGORIES = [
  "action",
  "bonus_action",
  "movement",
  "reaction",
  "legendary_action",
  "lair_action",
  "no_action_needed",
] as const;

export const AI_OPTION_KINDS = ["sheet", "universal", "improvised"] as const;

export const AI_OPTION_PRIORITIES = ["best", "alternative", "available"] as const;

export const AI_OPTION_STATUSES = ["available", "conditional"] as const;

export const AI_OPTION_LIMITS = {
  nameMaxLength: 160,
  descriptionMaxLength: 600,
  conditionMaxLength: 300,
  conditionMaxItems: 5,
  summaryMaxLength: 3000,
  optionsMaxItems: 100,
} as const;

export const AI_OPTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "source_id", "name", "kind", "priority", "status", "description", "conditions"],
  properties: {
    category: { type: "string", enum: [...AI_OPTION_CATEGORIES] },
    source_id: { type: ["string", "null"] },
    name: { type: "string", minLength: 1, maxLength: AI_OPTION_LIMITS.nameMaxLength },
    kind: { type: "string", enum: [...AI_OPTION_KINDS] },
    priority: { type: "string", enum: [...AI_OPTION_PRIORITIES] },
    status: { type: "string", enum: [...AI_OPTION_STATUSES] },
    description: { type: "string", minLength: 1, maxLength: AI_OPTION_LIMITS.descriptionMaxLength },
    conditions: {
      type: "array",
      maxItems: AI_OPTION_LIMITS.conditionMaxItems,
      items: { type: "string", minLength: 1, maxLength: AI_OPTION_LIMITS.conditionMaxLength },
    },
  },
} as const;

export const AI_TACTICAL_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["game_plan", "options"],
  properties: {
    game_plan: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: { summary: { type: "string", minLength: 1, maxLength: AI_OPTION_LIMITS.summaryMaxLength } },
    },
    options: { type: "array", maxItems: AI_OPTION_LIMITS.optionsMaxItems, items: { $ref: "#/$defs/option" } },
  },
  $defs: { option: AI_OPTION_JSON_SCHEMA },
} as const;

/**
 * The "Запитати" chat-reply shape — a conversational answer instead of a
 * full structured plan, used when the DM is asking a follow-up question
 * rather than requesting a new turn plan. Deliberately just one field:
 * there's no option list to validate, since the whole point of this path
 * is not repeating one.
 *
 * `replyMaxLength` bumped from an original 1200 — since this path also
 * covers general D&D consultation now (not just short tactical follow-ups),
 * a legitimate answer can be much longer (e.g. "group my known spells by
 * level with a short description each"). With OpenAI's structured-output
 * `strict: true` mode, this schema's `maxLength` is enforced by the
 * constrained decoder itself, not just validated after the fact — hitting
 * it mid-generation silently truncates the JSON string wherever the cap
 * falls, including mid-word or mid `[[ability:...]]` token, rather than
 * ending the answer early at a sentence boundary. 1200 was being hit
 * routinely by exactly this kind of longer, legitimate answer.
 */
export const AI_REPLY_LIMITS = {
  replyMaxLength: 4000,
} as const;

export const AI_REPLY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply"],
  properties: {
    reply: { type: "string", minLength: 1, maxLength: AI_REPLY_LIMITS.replyMaxLength },
  },
} as const;
