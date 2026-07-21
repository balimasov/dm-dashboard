import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getCampaign, listAllJournalEntries, listAllJournalSessions, listCharacters, listCreatures } from "@/lib/db";
import packageJson from "../../../../../../package.json";

/**
 * Bumped only when the *envelope* below (the top-level keys) changes shape —
 * not when a field is added to `Campaign`/`Character`/`Creature` in
 * `@/lib/types`, since those are serialized as-is straight from the DB and
 * this export is meant to stay maintenance-free as the data model grows.
 * Full format docs: `docs/campaign-export-format.md`.
 *
 * v2: added `journalSessions`/`journalEntries` — the export previously
 * omitted the Campaign Journal feature entirely (it lives in its own DB
 * tables, unlike inventory/currency, which are just fields on `Character`
 * and were already covered for free).
 */
const EXPORT_FORMAT_VERSION = 2;

function filenameSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campaign"
  );
}

/** Export is DM-only — the "Export" link only ever renders inside `isDm && <MoreMenu>` (see `DashboardClient.tsx`), and it dumps every character/creature in the campaign (including DM-only enemy/NPC stat blocks a player is never shown). */
export async function GET(_req: Request, ctx: RouteContext<"/api/campaigns/[id]/export">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const campaign = getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const body = {
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: packageJson.version,
    campaign,
    characters: listCharacters(id),
    creatures: listCreatures(id),
    // Unfiltered (`listAllJournal*`, not the role-scoped/archived-hiding
    // `listJournalSessions`/`listJournalEntries` the UI uses) — a DM backup
    // needs the whole journal, archived sessions and DM-private entries
    // included.
    journalSessions: listAllJournalSessions(id),
    journalEntries: listAllJournalEntries(id),
  };

  const filename = `${filenameSlug(campaign.name)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
