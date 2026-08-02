import type { AiTacticalResponse } from "../schemas";

export type AssistantQueryEntityKind = "character" | "creature";

/**
 * One past "ask" against the Turn Advisor, persisted so the panel's History
 * tab can show it again later and a follow-up question can build on it (see
 * the assistant prompt's FOLLOW-UP REQUESTS section, and `previous_summary`
 * on `assistantSuggestSchema`). Kept per character/creature (`entityId`),
 * not per campaign, since the Turn Advisor is always opened for one specific
 * entity and that's the only scope its History tab needs.
 */
export interface AssistantQueryHistoryEntry {
  id: string;
  campaignId: string;
  entityId: string;
  entityKind: AssistantQueryEntityKind;
  /** The entity's display name at the time of the ask — kept alongside the entry (not re-looked-up) so history stays readable even if the character is later renamed or removed. */
  entityName: string;
  /** The DM's free-text situation, empty for a plain "Best move" ask. */
  query: string;
  responseMode: "overview" | "focused";
  response: AiTacticalResponse;
  createdAt: string;
}
