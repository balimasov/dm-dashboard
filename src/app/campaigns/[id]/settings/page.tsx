import { notFound } from "next/navigation";
import { getCampaign, listCharacters } from "@/lib/db";
import { SettingsClient } from "@/components/SettingsClient";

// Campaign/character data changes at runtime and lives in a local SQLite
// file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function CampaignSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) notFound();

  const characters = listCharacters(id);
  return <SettingsClient campaignId={campaign.id} campaignName={campaign.name} initialCharacters={characters} />;
}
