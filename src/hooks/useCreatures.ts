"use client";

import { useCallback, useState } from "react";
import { AbilityScores, Creature, CreatureTrait } from "@/lib/types";
import { patchCreature } from "@/lib/creatureApi";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

export interface AddCreatureInput {
  templateName: string;
  name?: string;
  avatarUrl?: string;
  creatureType?: string;
  size?: string;
  alignment?: string;
  ac: number;
  armorDesc?: string;
  hp: number;
  maxHp: number;
  hitDice?: string;
  speed: number;
  speedDetail?: string;
  initiativeBonus?: number;
  stats: AbilityScores;
  savingThrows?: Partial<AbilityScores>;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  experiencePoints?: number;
  skills?: string;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  traits: CreatureTrait[];
  ownerCharacterId?: string;
  source?: string;
  templateId?: string;
}

export function useCreatures(campaignId: string, initialCreatures: Creature[]) {
  const [creatures, setCreatures] = useState<Creature[]>(initialCreatures);

  const addCreature = useCallback(
    async (input: AddCreatureInput): Promise<Creature> => {
      const res = await apiFetch("/api/creatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...input }),
      });
      const creature = await parseJsonOrThrow<Creature>(res, "Failed to add creature.");
      setCreatures((prev) => [...prev, creature]);
      return creature;
    },
    [campaignId]
  );

  const updateCreature = useCallback(async (id: string, updates: Partial<Creature>) => {
    setCreatures((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const updated = await patchCreature(id, updates);
    setCreatures((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const removeCreature = useCallback(async (id: string) => {
    setCreatures((prev) => prev.filter((c) => c.id !== id));
    await apiFetch(`/api/creatures/${id}`, { method: "DELETE" });
  }, []);

  const reorderCreatures = useCallback(async (orderedIds: string[]) => {
    setCreatures((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => byId.get(id)).filter((c): c is Creature => Boolean(c));
    });
    await apiFetch("/api/creatures/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }, []);

  return { creatures, addCreature, updateCreature, removeCreature, reorderCreatures };
}
