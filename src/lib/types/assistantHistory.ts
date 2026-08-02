import type { AiReply, AiTacticalResponse } from "../schemas";

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
  | (AssistantChatMessageBase & { kind: "plan"; responseMode: "overview" | "focused"; plan: AiTacticalResponse })
  | (AssistantChatMessageBase & { kind: "reply"; reply: AiReply["reply"] });
