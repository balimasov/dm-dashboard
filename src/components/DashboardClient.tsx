"use client";

import { useState } from "react";
import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import { CharacterCard } from "@/components/CharacterCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { InventoryOverview } from "@/components/InventoryOverview";
import { Toast } from "@/components/Toast";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { Character } from "@/lib/types";

export function DashboardClient({ initialCharacters }: { initialCharacters: Character[] }) {
  const { characters, removeCharacter, updateCharacter } = useCharacters(initialCharacters);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  const linkedCharacters = characters.filter((c) => c.dndBeyondUrl);

  async function handleSyncAll() {
    if (linkedCharacters.length === 0) return;

    setSyncingAll(true);
    setSyncSummary(null);

    const results = await Promise.allSettled(
      linkedCharacters.map(async (character) => {
        const synced = await fetchAndParseDdbCharacter(character);
        await updateCharacter(character.id, synced);
      })
    );

    const failed = results
      .map((r, i) => (r.status === "rejected" ? { name: linkedCharacters[i].name, reason: r.reason } : null))
      .filter((x): x is { name: string; reason: unknown } => x !== null);
    const succeededCount = results.length - failed.length;

    setSyncSummary(
      failed.length === 0
        ? `Синхронізовано ${succeededCount} з ${linkedCharacters.length}.`
        : `Синхронізовано ${succeededCount} з ${linkedCharacters.length}. Не вдалося: ${failed
            .map((f) => `${f.name} (${f.reason instanceof Error ? f.reason.message : "помилка"})`)
            .join(", ")}`
    );
    setSyncingAll(false);
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8">
      <CollapsibleSection title="Інвентар" storageKey="dm-dashboard-inventory-open">
        <InventoryOverview characters={characters} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Персонажі"
        storageKey="dm-dashboard-characters-open"
        actions={
          linkedCharacters.length > 0 ? (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {syncingAll ? "Синхронізація..." : "Синхронізувати всіх"}
            </button>
          ) : undefined
        }
      >
        <p className="mb-4 text-sm text-slate-500">
          Бойовий стан, ресурси та нотатки по кожному персонажу.
        </p>

        {syncSummary && <Toast message={syncSummary} onDismiss={() => setSyncSummary(null)} />}

        {characters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-800 p-16 text-center text-slate-500">
            <p>Персонажів ще немає.</p>
            <Link
              href="/settings"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              + Додати персонажа
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {characters.map((character) => (
              <div key={character.id} className="w-[300px] shrink-0">
                <CharacterCard character={character} onRemove={removeCharacter} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
