import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { updateJournalSession } from "@/lib/db";
import { journalSessionUpdateSchema } from "@/lib/schemas";

/** Rename/archive/unarchive — DM-only; session management stays a DM-only capability even though the journal itself is now shared with players. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/journal/sessions/[id]">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = journalSessionUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateJournalSession(id, result.data);
  if (!updated) {
    return NextResponse.json({ error: "Journal session not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
