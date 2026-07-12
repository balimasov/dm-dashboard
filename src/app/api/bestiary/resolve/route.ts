import { NextResponse } from "next/server";
import { fetchSrdCreatureDetail } from "@/lib/bestiarySearch";

/** Full stat block for one search hit's `id`, fetched fresh from Open5e. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const srd = await fetchSrdCreatureDetail(id);
  if (!srd) return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  return NextResponse.json(srd);
}
