"use client";

import { useCallback, useState } from "react";
import { AbilityScores, Creature, CreatureCategory, CreatureTrait } from "@/lib/types";
import { clearCreatureHpHistory, patchCreature } from "@/lib/creatureApi";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

export interface AddCreatureInput {
  templateName: string;
  name?: string;
  category: CreatureCategory;
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

  /**
   * Clones a creature's stat block into a brand-new card — for the common
   * "one more of these" case (a second Orc, a third Bandit) without
   * retyping HP/AC/stats/traits by hand. Deliberately resets everything
   * about *this specific instance* rather than copying it verbatim: full
   * HP (not whatever the source had taken), no conditions/exhaustion, no
   * notes/quick notes/flagged reminders, not hidden — a fresh copy of the
   * template, not a snapshot of an in-progress fight. `" (Copy)"` on the
   * name makes the two cards tell apart at a glance until the DM renames it
   * via the existing Edit form — this action intentionally does NOT open
   * that form itself, so duplicating several at once doesn't interrupt with
   * a modal each time.
   */
  const duplicateCreature = useCallback(
    async (source: Creature): Promise<Creature> => {
      return addCreature({
        templateId: source.templateId,
        templateName: source.templateName,
        name: `${source.name} (Copy)`,
        category: source.category,
        avatarUrl: source.avatarUrl,
        creatureType: source.creatureType,
        size: source.size,
        alignment: source.alignment,
        ac: source.ac,
        armorDesc: source.armorDesc,
        hp: source.maxHp,
        maxHp: source.maxHp,
        hitDice: source.hitDice,
        speed: source.speed,
        speedDetail: source.speedDetail,
        initiativeBonus: source.initiativeBonus,
        stats: source.stats,
        savingThrows: source.savingThrows,
        senses: source.senses,
        languages: source.languages,
        challengeRating: source.challengeRating,
        experiencePoints: source.experiencePoints,
        skills: source.skills,
        damageVulnerabilities: source.damageVulnerabilities,
        damageResistances: source.damageResistances,
        damageImmunities: source.damageImmunities,
        conditionImmunities: source.conditionImmunities,
        traits: source.traits,
        ownerCharacterId: source.ownerCharacterId,
        source: source.source,
      });
    },
    [addCreature]
  );

  const updateCreature = useCallback(async (id: string, updates: Partial<Creature>) => {
    setCreatures((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const updated = await patchCreature(id, updates);
    setCreatures((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const clearHpHistory = useCallback(async (id: string) => {
    const updated = await clearCreatureHpHistory(id);
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

  return { creatures, addCreature, duplicateCreature, updateCreature, clearHpHistory, removeCreature, reorderCreatures };
}
