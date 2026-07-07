import { Creature } from "./types";

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<unknown> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data;
}

export async function patchCreature(id: string, updates: Partial<Creature>): Promise<Creature> {
  const res = await fetch(`/api/creatures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return (await parseJsonOrThrow(res, "Failed to save creature.")) as Creature;
}
