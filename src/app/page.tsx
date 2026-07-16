import { cookies } from "next/headers";
import { listCampaigns } from "@/lib/db";
import { CampaignsClient } from "@/components/CampaignsClient";
import { AUTH_COOKIE_NAME, isValidSession } from "@/lib/auth";

// Campaign data changes at runtime (create/rename/remove) and lives in a
// local SQLite file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = listCampaigns();
  const cookieStore = await cookies();
  const { role } = isValidSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  return <CampaignsClient initialCampaigns={campaigns} role={role} />;
}
