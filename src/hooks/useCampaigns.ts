"use client";

import { useCallback, useState } from "react";
import { Campaign, CampaignSummary } from "@/lib/types";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";

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
      setCampaigns((prev) => [...prev, { ...campaign, characterCount: 0 }]);
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

  const setCampaignSummary = useCallback((updated: CampaignSummary) => {
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return { campaigns, addCampaign, updateCampaign, removeCampaign, setCampaignSummary };
}
