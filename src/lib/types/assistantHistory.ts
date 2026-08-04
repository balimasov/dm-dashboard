import type { AiReasoningEffort, AiReply, AiTacticalResponse } from "../schemas";

export type AssistantQueryEntityKind = "character" | "creature";

interface AssistantChatMessageBase {
  id: string;
  campaignId: string;
  entityId: string;
  entityKind: AssistantQueryEntityKind;
  /** The entity's display name at the time of the message — kept alongside it (not re-looked-up) so the conversation stays readable even if the character is later renamed or removed. */
  entityName: string;
  /** The DM's free-text question, empty for a plain "Підказати хід"/"Оновити план" ask with no extra details. */
  query: string;
  createdAt: string;
  /**
   * How long the upstream model call actually took, in milliseconds —
   * shown next to `createdAt` in `AiAssistantModal`'s "Suggested move"
   * header so the DM can compare latency across the assistant's
   * `reasoning_effort` levels. `undefined` on a cache hit (see
   * `route.ts`'s own comment) or for any message persisted before this
   * field existed.
   */
  durationMs?: number;
}

/**
 * One turn of the Turn Advisor's conversation — persisted so reopening the
 * panel for a character/creature shows the same ongoing chat instead of a
 * blank slate, and so a follow-up "ask" can reference the most recent turn
 * (see the assistant prompt's FOLLOW-UP REQUESTS section, and
 * `previousContext` in `route.ts`). Kept per character/creature (`entityId`),
 * not per campaign, since the Turn Advisor is always opened for one specific
 * entity and that's the only scope its conversation needs.
 *
 * Two kinds, matching the two request intents (`assistantSuggestSchema`'s
 * `intent`): `"plan"` is the full structured card (game plan + categorized
 * options) from a "Підказати хід"/"Оновити план" ask; `"reply"` is a short
 * conversational answer from "Запитати", with no option list to repeat.
 */
export type AssistantChatMessage =
  | (AssistantChatMessageBase & {
      kind: "plan";
      responseMode: "overview" | "focused";
      plan: AiTacticalResponse;
      /**
       * The `reasoning_effort` override actually used for this response, if
       * the DM picked one from `AiAssistantModal`'s experimental selector —
       * shown next to `durationMs` in the "Suggested move" header so the DM
       * can tell which effort tier produced which plan/timing when
       * scrolling back through history. `undefined` when the DM left it on
       * "Default" (the request never sent the field, so the model used its
       * own default) or for any message persisted before this field
       * existed.
       */
      reasoningEffort?: AiReasoningEffort;
    })
  | (AssistantChatMessageBase & { kind: "reply"; reply: AiReply["reply"] });
