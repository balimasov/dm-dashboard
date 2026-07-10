import { Creature } from "./types";
import { apiFetch, parseJsonOrThrow } from "./apiClient";

export async function patchCreature(id: string, updates: Partial<Creature>): Promise<Creature> {
  const res = await apiFetch(`/api/creatures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return parseJsonOrThrow<Creature>(res, "Failed to save creature.");
}
