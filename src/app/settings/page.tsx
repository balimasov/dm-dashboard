import { listCharacters } from "@/lib/db";
import { SettingsClient } from "@/components/SettingsClient";

// Character data changes at runtime (add/edit/reorder/sync) and lives in a
// local SQLite file — this page must never be statically cached at build time.
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const characters = listCharacters();
  return <SettingsClient initialCharacters={characters} />;
}
