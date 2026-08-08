"use client";

import { useCallback, useState } from "react";
import { Campaign, CampaignSummary, Character, Creature } from "@/lib/types";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

/** Shape both `duplicateCampaign` and `importCampaign` get back from their respective routes — the new campaign plus everything copied/restored into it, of which only the array lengths are actually needed here (for the fresh row's `characterCount`/`creatureCount`). */
type CampaignBundle = { campaign: Campaign; characters: Character[]; creatures: Creature[] };

export function useCampaigns(initialCampaigns: CampaignSummary[]) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(initialCampaigns);

  const addCampaign = useCallback(
    async (input: { name: string; notes?: string; logoUrl?: string }): Promise<Campaign> => {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const campaign = await parseJsonOrThrow<Campaign>(res, "Failed to create campaign.");
      setCampaigns((prev) => [...prev, { ...campaign, characterCount: 0, creatureCount: 0 }]);
      return campaign;
    },
    []
  );

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const res = await apiFetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await parseJsonOrThrow(res, "Failed to update campaign.");
  }, []);

  const removeCampaign = useCallback(async (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" });
  }, []);

  /** Full server-side deep copy (see `duplicateCampaign` in `db.ts`) — the request itself does all the work, this just appends the result once it comes back rather than optimistically guessing at a roster it hasn't fetched. */
  const duplicateCampaign = useCallback(async (id: string): Promise<Campaign> => {
    const res = await apiFetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
    const { campaign, characters, creatures } = await parseJsonOrThrow<CampaignBundle>(res, "Failed to duplicate campaign.");
    setCampaigns((prev) => [...prev, { ...campaign, characterCount: characters.length, creatureCount: creatures.length }]);
    return campaign;
  }, []);

  /** `payload` is the exact envelope `GET /api/campaigns/[id]/export` produces — see `docs/campaign-export-format.md`. */
  const importCampaign = useCallback(async (payload: unknown): Promise<Campaign> => {
    const res = await apiFetch("/api/campaigns/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { campaign, characters, creatures } = await parseJsonOrThrow<CampaignBundle>(res, "Failed to import campaign.");
    setCampaigns((prev) => [...prev, { ...campaign, characterCount: characters.length, creatureCount: creatures.length }]);
    return campaign;
  }, []);

  const setCampaignSummary = useCallback((updated: CampaignSummary) => {
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return { campaigns, addCampaign, updateCampaign, removeCampaign, duplicateCampaign, importCampaign, setCampaignSummary };
}
