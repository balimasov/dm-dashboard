import Link from "next/link";
import { getCampaign, getCreature, listCharacters } from "@/lib/db";
import { EditCreatureForm } from "@/components/EditCreatureForm";
import { getSessionRole } from "@/lib/auth";

const NOT_FOUND = (
  <div className="mx-auto max-w-3xl px-4 py-10 text-slate-500">
    Creature not found.{" "}
    <Link href="/" className="text-sky-400 hover:underline">
      Back to campaigns
    </Link>
  </div>
);

export default async function EditCreaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creature = getCreature(id);

  if (!creature) return NOT_FOUND;

  // Same "not found," not a 403 — a player hitting a guessed/old Enemy/NPC
  // edit URL directly shouldn't learn a creature with that ID exists at all,
  // matching how `campaigns/[id]/page.tsx` never sends this category's data
  // to a player's browser in the first place.
  const role = await getSessionRole();
  if (role !== "dm" && creature.category !== "companion") return NOT_FOUND;

  const campaign = getCampaign(creature.campaignId);
  const characters = listCharacters(creature.campaignId);

  return <EditCreatureForm creature={creature} campaignName={campaign?.name ?? "Campaign"} characters={characters} />;
}
