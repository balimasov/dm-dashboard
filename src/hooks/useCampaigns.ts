"use client";

import { useCallback, useState } from "react";
import { Campaign, CampaignSummary } from "@/lib/types";

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<unknown> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data;
}

export function useCampaigns(initialCampaigns: CampaignSummary[]) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(initialCampaigns);

  const addCampaign = useCallback(
    async (input: { name: string; notes?: string; logoUrl?: string }): Promise<Campaign> => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const campaign = (await parseJsonOrThrow(res, "Failed to create campaign.")) as Campaign;
      setCampaigns((prev) => [...prev, { ...campaign, characterCount: 0 }]);
      return campaign;
    },
    []
  );

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await parseJsonOrThrow(res, "Failed to update campaign.");
  }, []);

  const removeCampaign = useCallback(async (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
  }, []);

  const setCampaignSummary = useCallback((updated: CampaignSummary) => {
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return { campaigns, addCampaign, updateCampaign, removeCampaign, setCampaignSummary };
}
