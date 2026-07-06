import { notFound } from "next/navigation";
import { getCampaign, listCharacters } from "@/lib/db";
import { DashboardClient } from "@/components/DashboardClient";

// Campaign/character data changes at runtime and lives in a local SQLite
// file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function CampaignDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) notFound();

  const characters = listCharacters(id);
  return <DashboardClient campaign={campaign} initialCharacters={characters} />;
}
