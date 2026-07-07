import { NextResponse } from "next/server";
import { getBestiaryTemplateById } from "@/lib/db";
import { fetchSrdCreatureDetail } from "@/lib/bestiarySearch";

/** Full stat block for one search hit's `id` — a local save is just a DB lookup, an SRD hit fetches its detail page fresh. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const local = getBestiaryTemplateById(id);
  if (local) return NextResponse.json(local);

  const srd = await fetchSrdCreatureDetail(id);
  if (!srd) return NextResponse.json({ error: "Creature not found." }, { status: 404 });
  return NextResponse.json(srd);
}
