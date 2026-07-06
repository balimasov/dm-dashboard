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

  const addCampaign = useCallback(async (name: string): Promise<Campaign> => {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const campaign = (await parseJsonOrThrow(res, "Failed to create campaign.")) as Campaign;
    setCampaigns((prev) => [...prev, { ...campaign, characterCount: 0 }]);
    return campaign;
  }, []);

  const renameCampaign = useCallback(async (id: string, name: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await parseJsonOrThrow(res, "Failed to rename campaign.");
  }, []);

  const removeCampaign = useCallback(async (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
  }, []);

  return { campaigns, addCampaign, renameCampaign, removeCampaign };
}
