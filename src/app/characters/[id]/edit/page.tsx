import Link from "next/link";
import { getCharacter } from "@/lib/db";
import { EditCharacterForm } from "@/components/EditCharacterForm";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = getCharacter(id);

  if (!character) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-500">
        Character not found.{" "}
        <Link href="/" className="text-sky-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <EditCharacterForm character={character} />;
}
