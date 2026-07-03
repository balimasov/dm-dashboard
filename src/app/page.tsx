import { listCharacters } from "@/lib/db";
import { DashboardClient } from "@/components/DashboardClient";

// Character data changes at runtime (add/edit/reorder/sync) and lives in a
// local SQLite file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const characters = listCharacters();
  return <DashboardClient initialCharacters={characters} />;
}
