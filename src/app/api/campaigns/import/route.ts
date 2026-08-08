import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { importCampaign } from "@/lib/db";
import { campaignImportSchema } from "@/lib/schemas";
import { Character, Creature, JournalEntry, JournalSession } from "@/lib/types";

/** Same DM-only gating as every other campaign-roster action — see `duplicate/route.ts`. Accepts the exact envelope `GET /api/campaigns/[id]/export` produces (`docs/campaign-export-format.md`). */
export async function POST(req: Request) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const parsed = await parseJsonBody(req, campaignImportSchema, "That doesn't look like a campaign export file.");
  if ("error" in parsed) return parsed.error;

  // `campaignImportSchema` deliberately only validates the envelope (see its
  // own doc comment) — everything past that is trusted the same way a
  // hand-typed character/creature already is once saved through the normal
  // edit forms, so the cast here is the trust boundary, not a type error.
  const result = importCampaign(
    parsed.data as {
      campaign: { name: string; notes?: string; logoUrl?: string; createdAt?: string };
      characters?: Character[];
      creatures?: Creature[];
      journalSessions?: JournalSession[];
      journalEntries?: JournalEntry[];
    }
  );
  return NextResponse.json(result, { status: 201 });
}
