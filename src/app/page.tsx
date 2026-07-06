import { listCampaigns } from "@/lib/db";
import { CampaignsClient } from "@/components/CampaignsClient";

// Campaign data changes at runtime (create/rename/remove) and lives in a
// local SQLite file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  const campaigns = listCampaigns();
  return <CampaignsClient initialCampaigns={campaigns} />;
}
