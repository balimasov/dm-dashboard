"use client";

import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import { CharacterCard } from "@/components/CharacterCard";

export default function DashboardPage() {
  const { characters, removeCharacter } = useCharacters();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Партія</h1>
          <p className="text-sm text-slate-500">
            Бойовий стан, ресурси та нотатки по кожному персонажу.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          + Додати персонажа
        </Link>
      </div>

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
            <CharacterCard
              key={character.id}
              character={character}
              onRemove={removeCharacter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
