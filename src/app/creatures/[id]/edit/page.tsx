import Link from "next/link";
import { getCampaign, getCreature, listCharacters } from "@/lib/db";
import { EditCreatureForm } from "@/components/EditCreatureForm";

export default async function EditCreaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creature = getCreature(id);

  if (!creature) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-500">
        Creature not found.{" "}
        <Link href="/" className="text-sky-400 hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const campaign = getCampaign(creature.campaignId);
  const characters = listCharacters(creature.campaignId);

  return <EditCreatureForm creature={creature} campaignName={campaign?.name ?? "Campaign"} characters={characters} />;
}
