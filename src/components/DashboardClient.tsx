"use client";

import { useState } from "react";
import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import { CharacterCard } from "@/components/CharacterCard";
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Партія</h1>
          <p className="text-sm text-slate-500">
            Бойовий стан, ресурси та нотатки по кожному персонажу.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {linkedCharacters.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {syncingAll ? "Синхронізація..." : "Синхронізувати всіх"}
            </button>
          )}
          <Link
            href="/settings"
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            + Додати персонажа
          </Link>
        </div>
      </div>

      {syncSummary && <p className="text-sm text-amber-400 mb-4">{syncSummary}</p>}

      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
          Персонажів ще немає.{" "}
          <Link href="/settings" className="text-sky-400 hover:underline">
            Додайте перший лінк на D&D Beyond
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} onRemove={removeCharacter} />
          ))}
        </div>
      )}
    </div>
  );
}
