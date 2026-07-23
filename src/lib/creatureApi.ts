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

export async function clearCreatureHpHistory(id: string): Promise<Creature> {
  const res = await apiFetch(`/api/creatures/${id}/hp-history`, { method: "DELETE" });
  return parseJsonOrThrow<Creature>(res, "Failed to clear HP history.");
}
