import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseJsonBody } from "@/lib/apiRoute";
import { getJournalSession, removeJournalSession, updateJournalSession } from "@/lib/db";
import { journalSessionUpdateSchema } from "@/lib/schemas";

/** Rename/archive/unarchive — DM-only; session management stays a DM-only capability even though the journal itself is now shared with players. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/journal/sessions/[id]">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, journalSessionUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const updated = updateJournalSession(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Journal session not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

/** Cascade delete — DM-only, same reasoning as PATCH above. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/journal/sessions/[id]">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = getJournalSession(id);
  if (!existing) {
    return NextResponse.json({ error: "Journal session not found." }, { status: 404 });
  }
  removeJournalSession(id);
  return NextResponse.json({ ok: true });
}
