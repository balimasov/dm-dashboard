"use client";

import { useState } from "react";
import { Character, SKILL_LABELS, ordinalLevel } from "@/lib/types";
import {
  HeroicInspirationSummary,
  PARTY_TOOLKIT_COMPACT_SKILLS,
  PartyPassiveSummary,
  PartyResourceEntry,
  ResourceStatus,
  SkillCoverageStatus,
  SkillOverviewEntry,
  computeHeroicInspirationSummary,
  computePartyPassiveSummary,
  computePartyResourceSummary,
  computePartySkillOverview,
  computePartySpellSlotSummary,
  formatSkillScore,
} from "@/lib/partyToolkit";
import { DotMeter } from "./ResourceMeter";

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

/** Party-wide totals per spell slot level — never a per-character breakdown, that already lives on each character's own card. */
function SpellSlotsPanel({ characters }: { characters: Character[] }) {
  const summary = computePartySpellSlotSummary(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Spell Slots</h3>
      {!summary ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <>
          <div className="space-y-1">
            {summary.levels.map((l) => (
              <div key={l.level} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
                {l.max <= 6 ? (
                  <DotMeter current={l.current} max={l.max} colorClass="bg-violet-400" />
                ) : (
                  <span className="font-medium text-slate-100">
                    {l.current}/{l.max}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-slate-800 pt-2 text-sm text-slate-400">
            Spell Power:{" "}
            <span className="font-medium text-slate-100">
              {summary.totalCurrent} / {summary.totalMax}
            </span>{" "}
            slots available
            {summary.highestAvailableLevel && ` · Highest: ${ordinalLevel(summary.highestAvailableLevel)}`}
          </p>
        </>
      )}
    </div>
  );
}

const RESOURCE_STATUS_CLASS: Record<ResourceStatus, string> = {
  empty: "text-red-400",
  low: "text-amber-400",
  normal: "text-slate-100",
};

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 text-sm">
      <span className="text-slate-300">Heroic Inspiration</span>
      <span className="font-medium text-slate-100">
        {summary.withInspiration} / {summary.partySize}
      </span>
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="min-w-0 flex-1 truncate text-slate-300">{entry.resourceName}</span>
      <span className={`shrink-0 whitespace-nowrap font-medium ${RESOURCE_STATUS_CLASS[entry.status]}`}>
        {entry.current}/{entry.max}
      </span>
      <span title={entry.characterName} className="w-24 shrink-0 truncate text-right text-xs text-slate-500">
        {entry.characterName}
      </span>
    </div>
  );
}

/** Heroic Inspiration is tracked separately from `resources` — always shown, even at 0 — since it's a boolean on the character rather than a class/feat resource. */
function ResourcesPanel({ characters }: { characters: Character[] }) {
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Resources</h3>
      <HeroicInspirationRow summary={inspiration} />
      {resources.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No limited-use resources tracked.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {resources.map((entry) => (
            <ResourceRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Party Toolkit — Iterations 1-2: Skills, Passives, Spell Slots, Resources.
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SkillOverviewPanel characters={characters} />
        <PassivesPanel summary={passives} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpellSlotsPanel characters={characters} />
        <ResourcesPanel characters={characters} />
      </div>
    </div>
  );
}
