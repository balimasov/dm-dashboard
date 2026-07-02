"use client";

import { useState } from "react";
import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import { extractDndBeyondCharacterId } from "@/lib/types";
import { fetchAndParseDdbCharacter } from "@/lib/sync";

export default function SettingsPage() {
  const { characters, addFromUrl, removeCharacter, updateCharacter } = useCharacters();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    const id = extractDndBeyondCharacterId(trimmed);
    if (!id) {
      setError(
        "Не вдалося розпізнати лінк. Очікується формат: https://www.dndbeyond.com/characters/1234567"
      );
      return;
    }
    if (characters.some((c) => c.dndBeyondUrl && extractDndBeyondCharacterId(c.dndBeyondUrl) === id)) {
      setError("Цей персонаж вже додано.");
      return;
    }

    setError(null);
    setSyncError(null);
    const character = addFromUrl(trimmed);
    setUrl("");

    setSyncingId(character.id);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      updateCharacter(character.id, synced);
    } catch (err) {
      const message = err instanceof Error ? err.message : "невідома помилка";
      setSyncError(
        `Не вдалося синхронізувати "${character.name}": ${message} Дані можна заповнити вручну на сторінці редагування.`
      );
    } finally {
      setSyncingId(null);
    }
  }

  async function handleResync(id: string) {
    const character = characters.find((c) => c.id === id);
    if (!character) return;
    setSyncError(null);
    setSyncingId(id);
    try {
      const synced = await fetchAndParseDdbCharacter(character);
      updateCharacter(id, synced);
    } catch (err) {
      setSyncError(
        `Не вдалося синхронізувати "${character.name}": ${
          err instanceof Error ? err.message : "невідома помилка"
        }.`
      );
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-50 mb-1">Налаштування</h1>
      <p className="text-sm text-slate-500 mb-6">
        Додайте лінки на персонажів D&D Beyond, щоб вони з&apos;явились на дашборді.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.dndbeyond.com/characters/27964361"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Додати
        </button>
      </form>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {syncError && <p className="text-sm text-amber-400 mb-4">{syncError}</p>}

      <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-300 mb-8">
        При додаванні лінка застосунок автоматично намагається підтягнути дані з
        D&D Beyond (стати, HP, AC, ресурси, spell slots). Це неофіційний API,
        тому персонаж має бути публічним, а деякі поля (роль, нотатки, AC для
        нестандартних білдів) варто перевірити й підправити вручну.
      </div>

      <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3">
        Додані персонажі ({characters.length})
      </h2>

      {characters.length === 0 && (
        <p className="text-sm text-slate-600">Список порожній.</p>
      )}

      <ul className="space-y-2">
        {characters.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-100">{c.name}</p>
              {c.dndBeyondUrl && (
                <a
                  href={c.dndBeyondUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:underline"
                >
                  {c.dndBeyondUrl}
                </a>
              )}
              {syncingId === c.id && (
                <p className="text-xs text-sky-400">Синхронізація...</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {c.dndBeyondUrl && (
                <button
                  onClick={() => handleResync(c.id)}
                  disabled={syncingId === c.id}
                  className="text-sky-400 hover:text-sky-300 disabled:opacity-50"
                >
                  Синхронізувати
                </button>
              )}
              <Link
                href={`/characters/${c.id}/edit`}
                className="text-slate-400 hover:text-slate-200"
              >
                Редагувати
              </Link>
              <button
                onClick={() => removeCharacter(c.id)}
                className="text-red-500/80 hover:text-red-400"
              >
                Видалити
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
