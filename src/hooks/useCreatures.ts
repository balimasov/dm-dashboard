"use client";

import { useCallback, useState } from "react";
import { AbilityScores, Creature, CreatureTrait } from "@/lib/types";

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<unknown> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data;
}

export interface AddCreatureInput {
  templateName: string;
  name?: string;
  creatureType?: string;
  size?: string;
  alignment?: string;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  stats: AbilityScores;
  savingThrows?: Partial<AbilityScores>;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  traits: CreatureTrait[];
  ownerCharacterId?: string;
  source?: string;
  templateId?: string;
}

export function useCreatures(campaignId: string, initialCreatures: Creature[]) {
  const [creatures, setCreatures] = useState<Creature[]>(initialCreatures);

  const addCreature = useCallback(
    async (input: AddCreatureInput): Promise<Creature> => {
      const res = await fetch("/api/creatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...input }),
      });
      const creature = (await parseJsonOrThrow(res, "Failed to add creature.")) as Creature;
      setCreatures((prev) => [...prev, creature]);
      return creature;
    },
    [campaignId]
  );

  const updateCreature = useCallback(async (id: string, updates: Partial<Creature>) => {
    setCreatures((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const res = await fetch(`/api/creatures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await parseJsonOrThrow(res, "Failed to update creature.");
    setCreatures((prev) => prev.map((c) => (c.id === id ? (updated as Creature) : c)));
  }, []);

  const removeCreature = useCallback(async (id: string) => {
    setCreatures((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/creatures/${id}`, { method: "DELETE" });
  }, []);

  return { creatures, addCreature, updateCreature, removeCreature };
}
