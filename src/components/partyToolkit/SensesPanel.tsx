import { Character } from "@/lib/types";
import {
  SenseCoverageEntry,
  SenseHolder,
  UtilitySpellAvailability,
  computeSensesCoverage,
  computeUtilitySpellAvailability,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip, CharacterChipRow } from "../ui/CharacterChip";
import { HintPanel } from "../ui/HintPanel";
import { ToolkitCard } from "../ui/ToolkitCard";

/** Short rules reminder for what the sense actually lets a character do — the row itself only says "X of Y", not what that's useful for. */
const SENSE_BLURBS: Record<string, string> = {
  Darkvision: "See in dim light within range as if it were bright light, and in darkness as if it were dim light (shades of gray only).",
  Blindsight: "Perceive its surroundings without relying on sight, within range.",
  Tremorsense: "Detect and pinpoint anything in contact with the ground within range, without seeing it.",
  Truesight: "See in normal and magical darkness, see invisible creatures/objects, see through illusions, and see a shapechanger's true form within range.",
};

/** Same idea as `SkillAllScoresPanel` — every character who has this sense, with their own range, ranked implicitly by the row's own "Best" chip already answering the top one. */
function SenseHolderPanel({ label, holders }: { label: string; holders: SenseHolder[] }) {
  return (
    <HintPanel
      title={label}
      description={SENSE_BLURBS[label]}
      rows={holders}
      rowKey={(h) => h.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(h) => (
        <>
          <span className="min-w-0 truncate">{h.characterName}</span>
          <span className="shrink-0">{h.range} ft</span>
        </>
      )}
      emptyText="No one currently has it."
    />
  );
}

function SenseRow({ entry }: { entry: SenseCoverageEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<SenseHolderPanel label={entry.name} holders={entry.holders} />}>
        <span className="text-slate-300">{entry.name}</span>
      </InfoTooltip>
      <span className="flex items-center gap-2">
        <span className={entry.count === 0 ? "text-slate-600" : "font-medium text-slate-100"}>
          {entry.count}/{entry.partySize}
        </span>
        {entry.best && (
          <InfoTooltip
            key={entry.best.characterId}
            hoverOnly
            panel={<p className="text-white">Best: {entry.best.characterName} — {entry.best.range} ft</p>}
          >
            <span className="flex items-center gap-1">
              <CharacterChip name={entry.best.characterName} avatarUrl={entry.best.avatarUrl} showTitle={false} />
              <span className="text-xs text-slate-500">{entry.best.range} ft</span>
            </span>
          </InfoTooltip>
        )}
      </span>
    </div>
  );
}

/** Short rules reminder for what the spell actually reveals — the row itself only says "available", not what that's useful for. */
const UTILITY_SPELL_BLURBS: Record<string, string> = {
  "Detect Magic": "Sense the presence of magic within 30 ft, and learn its school of magic if you study the source for a moment.",
  "See Invisibility": "See invisible creatures and objects as if they were visible, and see into the Ethereal Plane, for the spell's duration.",
};

function UtilitySpellHintPanel({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <HintPanel
      title={entry.name}
      description={UTILITY_SPELL_BLURBS[entry.name]}
      rows={entry.characters}
      rowKey={(c) => c.characterId}
      renderRow={(c) => c.characterName}
    />
  );
}

/** Same "gray at zero, plain white otherwise" convention as `CoverageCountRow` — no green highlight, so availability reads the same way across every coverage row in this panel instead of standing out inconsistently. */
function UtilitySpellRow({ entry }: { entry: UtilitySpellAvailability }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip panel={<UtilitySpellHintPanel entry={entry} />}>
        <span className="text-slate-300">{entry.name} available</span>
      </InfoTooltip>
      {entry.available ? (
        <CharacterChipRow holders={entry.characters} />
      ) : (
        <span className="text-slate-600">No</span>
      )}
    </div>
  );
}

export function SensesPanel({ characters }: { characters: Character[] }) {
  const senses = computeSensesCoverage(characters);
  const utility = computeUtilitySpellAvailability(characters);

  return (
    <ToolkitCard title="Senses">
      <div className="space-y-1.5">
        {senses.map((entry) => (
          <SenseRow key={entry.name} entry={entry} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {utility.map((entry) => (
          <UtilitySpellRow key={entry.name} entry={entry} />
        ))}
      </div>
    </ToolkitCard>
  );
}
