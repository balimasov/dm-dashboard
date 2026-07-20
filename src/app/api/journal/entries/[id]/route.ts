import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getJournalEntry, removeJournalEntry, updateJournalEntryText } from "@/lib/db";
import { journalEntryUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: RouteContext<"/api/journal/entries/[id]">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = journalEntryUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updated = updateJournalEntryText(id, result.data.text);
  if (!updated) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/journal/entries/[id]">) {
  const denied = await requireRole("dm");
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = getJournalEntry(id);
  if (!existing) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  removeJournalEntry(id);
  return NextResponse.json({ ok: true });
}
