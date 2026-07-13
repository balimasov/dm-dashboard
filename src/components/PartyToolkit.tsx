"use client";

import { useState } from "react";
import { Character, SKILL_LABELS } from "@/lib/types";
import {
  PARTY_TOOLKIT_COMPACT_SKILLS,
  PartyPassiveSummary,
  SkillCoverageStatus,
  SkillOverviewEntry,
  computePartyPassiveSummary,
  computePartySkillOverview,
  formatSkillScore,
} from "@/lib/partyToolkit";

const STATUS_CLASS: Record<SkillCoverageStatus, string> = {
  Strong: "border-emerald-700 bg-emerald-950/30 text-emerald-300",
  Medium: "border-amber-700 bg-amber-950/30 text-amber-300",
  Weak: "border-slate-700 bg-slate-800/40 text-slate-400",
};

function StatusPill({ status }: { status: SkillCoverageStatus }) {
  return (
    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-center text-xs font-medium ${STATUS_CLASS[status]}`}>
      {status}
    </span>
  );
}

function SkillRow({ entry }: { entry: SkillOverviewEntry }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{SKILL_LABELS[entry.skill]}</p>
        <p className="truncate text-xs text-slate-500">
          {entry.best ? `Best: ${formatSkillScore(entry.best)}` : "No one in the party"}
          {entry.weakest && ` · Weakest: ${formatSkillScore(entry.weakest)}`}
        </p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{entry.proficientCount} proficient</span>
      <StatusPill status={entry.status} />
    </div>
  );
}

/** Union of the always-shown compact skills and the "show all" full 18 — Skills is the left/wide half of the Party Toolkit content grid. */
function SkillOverviewPanel({ characters }: { characters: Character[] }) {
  const [showAll, setShowAll] = useState(false);
  const all = computePartySkillOverview(characters);
  const entries = showAll ? all : all.filter((e) => PARTY_TOOLKIT_COMPACT_SKILLS.includes(e.skill));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</h3>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
        >
          {showAll ? "Show fewer" : `Show all ${all.length} skills`}
        </button>
      </div>
      <div className="divide-y divide-slate-800/60">
        {entries.map((entry) => (
          <SkillRow key={entry.skill} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function PassiveRow({ label, best, average, lowest }: { label: string; best: string; average?: string; lowest?: string }) {
  return (
    <p className="text-sm">
      <span className="text-slate-200">{label}: </span>
      <span className="text-slate-400">
        Best {best}
        {average && ` · Avg ${average}`}
        {lowest && ` · Lowest ${lowest}`}
      </span>
    </p>
  );
}

function PassivesPanel({ summary }: { summary: PartyPassiveSummary }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Passives</h3>
      <div className="space-y-1.5">
        <PassiveRow
          label="Passive Perception"
          best={`${summary.perception.best.value} — ${summary.perception.best.characterName}`}
          average={String(summary.perception.average)}
          lowest={String(summary.perception.lowest.value)}
        />
        <PassiveRow label="Passive Insight" best={`${summary.insight.value} — ${summary.insight.characterName}`} />
        <PassiveRow
          label="Passive Investigation"
          best={`${summary.investigation.value} — ${summary.investigation.characterName}`}
        />
      </div>
    </div>
  );
}

/**
 * Party Toolkit Iteration 1 — Party Skill Overview + Passive Scores Summary.
 * Reference-only: no dice roller, no roll buttons, no success/fail
 * resolution. `characters` is expected to already be filtered to the
 * visible roster (same set shown in the Party row above it).
 */
export function PartyToolkit({ characters }: { characters: Character[] }) {
  const passives = computePartyPassiveSummary(characters);

  if (characters.length === 0 || !passives) {
    return <p className="text-sm text-slate-600">No characters yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <SkillOverviewPanel characters={characters} />
      <PassivesPanel summary={passives} />
    </div>
  );
}
