import { NextResponse } from "next/server";
import { searchBestiary } from "@/lib/db";
import { searchSrdCreatures } from "@/lib/bestiarySearch";
import { CreatureSearchHit, CreatureTemplate } from "@/lib/types";

function toHit(t: CreatureTemplate): CreatureSearchHit {
  return { id: t.id, name: t.name, creatureType: t.creatureType, size: t.size, challengeRating: t.challengeRating, origin: t.origin };
}

/**
 * Local (already-saved) matches always come first — a DM re-adding a
 * creature they've already entered should see their own saved version
 * before an SRD result with the same name. SRD results whose name already
 * matches a local one are dropped rather than shown twice. Both are
 * lightweight previews, not full stat blocks — `/api/bestiary/resolve`
 * fetches the full one for whichever hit is actually picked.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const local = searchBestiary(q).map(toHit);
  const localNames = new Set(local.map((t) => t.name.toLowerCase()));
  const srd = await searchSrdCreatures(q);

  return NextResponse.json([...local, ...srd.filter((t) => !localNames.has(t.name.toLowerCase()))]);
}
