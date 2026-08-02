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
