"use client";

import { Creature, HpHistoryEntry } from "@/lib/types";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";

const FIELD_LABEL: Record<HpHistoryEntry["field"], string> = {
  hp: "HP",
  tempHp: "Temp HP",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A DM-facing debugging trail, not a gameplay feature — reached from a
 * creature's kebab menu, deliberately not surfaced anywhere on the dashboard
 * itself. Every row is a real `hp`/`tempHp` write `updateCreature` (`db.ts`)
 * actually made, newest first, so a DM who suspects they fat-fingered a
 * number mid-session can check exactly when and by how much a pool changed
 * without having to reconstruct it from memory.
 */
export function CreatureHpHistoryModal({ creature, onClose }: { creature: Creature; onClose: () => void }) {
  useScrollLock();
  useEscapeToClose(onClose);

  const entries = [...(creature.hpHistory ?? [])].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-bold text-slate-50">HP History — {creature.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-1 text-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No HP changes recorded yet.</p>
        ) : (
          <div className="scrollbar-themed flex-1 overflow-y-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Pool</th>
                  <th className="px-3 py-2 text-right font-medium">Was</th>
                  <th className="px-3 py-2 text-right font-medium">Now</th>
                  <th className="px-3 py-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-900/60">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatTimestamp(entry.timestamp)}</td>
                    <td className="px-3 py-2 text-slate-300">{FIELD_LABEL[entry.field]}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{entry.previous}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-100">{entry.next}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        entry.delta > 0 ? "text-emerald-400" : entry.delta < 0 ? "text-red-400" : "text-slate-500"
                      }`}
                    >
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
