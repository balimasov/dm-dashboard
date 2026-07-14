"use client";

import { createContext, ReactNode, useContext } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";

interface CampaignData {
  charactersState: ReturnType<typeof useCharacters>;
  creaturesState: ReturnType<typeof useCreatures>;
}

/**
 * Undefined outside a provider (not a dummy default) — `CampaignFormModal`
 * uses that to tell "no page-level state to share" (e.g. the campaigns list
 * page, which has no live roster of its own) apart from "provider forgot to
 * pass a value", and falls back to its own `useCharacters`/`useCreatures`
 * instance only in the former case.
 */
const CampaignDataContext = createContext<CampaignData | undefined>(undefined);

/** Wraps `DashboardClient`'s own live `charactersState`/`creaturesState` so `CampaignFormModal`'s Settings roster editor edits the same state the dashboard cards already show, without threading it through as explicit props. */
export function CampaignDataProvider({ value, children }: { value: CampaignData; children: ReactNode }) {
  return <CampaignDataContext.Provider value={value}>{children}</CampaignDataContext.Provider>;
}

export function useCampaignData(): CampaignData | undefined {
  return useContext(CampaignDataContext);
}
