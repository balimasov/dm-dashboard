import { NextResponse } from "next/server";
import { getSessionRole, UserRole } from "@/lib/auth";
import { getJournalEntry, removeJournalEntry, updateJournalEntryText } from "@/lib/db";
import { journalEntryUpdateSchema } from "@/lib/schemas";
import { JournalEntry } from "@/lib/types";

/**
 * Finest-grained rule achievable without per-player identity (a shared
 * password means one player can't be told apart from another): a DM can
 * touch anything; a player can only touch a `"party"`-audience entry
 * authored by *some* player, never a DM-authored one (whether it's their
 * own `"dm"`-tab entry or a DM-authored entry sitting in the shared tab).
 */
export function canMutateEntry(role: UserRole, entry: JournalEntry): boolean {
  return role === "dm" || (entry.audience === "party" && entry.authorRole === "player");
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/journal/entries/[id]">) {
  const role = await getSessionRole();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const result = journalEntryUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = getJournalEntry(id);
  if (!existing) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  if (!canMutateEntry(role, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = updateJournalEntryText(id, result.data.text, role);
  if (!updated) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/journal/entries/[id]">) {
  const role = await getSessionRole();

  const { id } = await ctx.params;
  const existing = getJournalEntry(id);
  if (!existing) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  if (!canMutateEntry(role, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  removeJournalEntry(id);
  return NextResponse.json({ ok: true });
}
