import { NextResponse } from "next/server";
import { searchSrdCreatures } from "@/lib/bestiarySearch";

/** Always Open5e SRD content — there's no local/shared bestiary to check first any more. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }

  return NextResponse.json(await searchSrdCreatures(q));
}
