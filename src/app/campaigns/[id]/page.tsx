import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCampaign, listCharacters, listCreatures } from "@/lib/db";
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
  const creatures = listCreatures(id);

  // Read the collapsible sections' open/closed preference from cookies
  // (rather than the `localStorage` this used before) so the very first
  // server-rendered HTML already matches it — otherwise the server has to
  // guess a default and the client visibly snaps to the real value right
  // after hydration, every single page load.
  const cookieStore = await cookies();
  const isOpen = (key: string) => cookieStore.get(key)?.value !== "0";
  const initialOpen = {
    reminders: isOpen("dm-dashboard-reminders-open"),
    campaign: isOpen("dm-dashboard-campaign-open"),
    characters: isOpen("dm-dashboard-characters-open"),
    companions: isOpen("dm-dashboard-companions-open"),
    enemies: isOpen("dm-dashboard-enemies-open"),
    npcs: isOpen("dm-dashboard-npcs-open"),
    inventory: isOpen("dm-dashboard-inventory-open"),
  };

  return (
    <DashboardClient
      campaign={campaign}
      initialCharacters={characters}
      initialCreatures={creatures}
      initialOpen={initialOpen}
    />
  );
}
