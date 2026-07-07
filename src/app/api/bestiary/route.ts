import { NextResponse } from "next/server";
import { searchBestiary } from "@/lib/db";
import { searchSrdMonsters } from "@/lib/bestiarySearch";

/**
 * Local (already-saved) matches always come first — a DM re-adding a
 * creature they've already entered should see their own saved version
 * before an SRD result with the same name. SRD results whose name already
 * matches a local one are dropped rather than shown twice.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const local = searchBestiary(q);
  const localNames = new Set(local.map((t) => t.name.toLowerCase()));
  const srd = await searchSrdMonsters(q);

  return NextResponse.json([...local, ...srd.filter((t) => !localNames.has(t.name.toLowerCase()))]);
}
