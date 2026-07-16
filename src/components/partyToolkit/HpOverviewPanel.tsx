import { Character } from "@/lib/types";
import { tierTextClass } from "@/lib/tierColor";
import { PartyHpCharacterEntry, PartyHpSummary, computePartyHpSummary } from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip } from "../ui/CharacterChip";
import { ToolkitCard } from "../ui/ToolkitCard";

const RING_SIZE = 60;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const TOTAL_RING_SIZE = 76;
const TOTAL_RING_STROKE = 6;
const TOTAL_RING_RADIUS = (TOTAL_RING_SIZE - TOTAL_RING_STROKE) / 2;
const TOTAL_RING_CIRCUMFERENCE = 2 * Math.PI * TOTAL_RING_RADIUS;

/**
 * A donut gauge — track + a `currentColor` arc rotated to start at 12
 * o'clock, filled clockwise by `percent`. Deliberately a different shape
 * from every other gauge in the Party Toolkit (bars in Rest Recovery,
 * columns in the Spell Slots histogram, a grid in the Skill Heatmap) — the
 * point of this panel is to read as visually distinct at a glance, not one
 * more bar to tell apart from the others.
 */
function Ring({ percent, size, strokeWidth, radius, circumference, colorClass, children }: {
  percent: number;
  size: number;
  strokeWidth: number;
  radius: number;
  circumference: number;
  colorClass: string;
  children?: React.ReactNode;
}) {
  const dash = (percent / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} stroke="currentColor" className="text-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          className={colorClass}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function HpRingHint({ entry }: { entry: PartyHpCharacterEntry }) {
  return (
    <p className="text-white">
      {entry.characterName}:{" "}
      <span className={`font-semibold ${tierTextClass(entry.percent)}`}>
        {entry.hp}/{entry.maxHp}
      </span>
      {entry.tempHp > 0 && <span className="text-amber-400"> (+{entry.tempHp} THP)</span>}
      {entry.isDown && <span className="text-red-400"> · down</span>}
    </p>
  );
}

function CharacterRing({ entry }: { entry: PartyHpCharacterEntry }) {
  return (
    <InfoTooltip hoverOnly panel={<HpRingHint entry={entry} />}>
      <div className="flex flex-col items-center gap-1">
        <Ring
          percent={entry.percent}
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          radius={RING_RADIUS}
          circumference={RING_CIRCUMFERENCE}
          colorClass={tierTextClass(entry.percent)}
        >
          <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} size="md" showTitle={false} />
        </Ring>
        <span className={`text-[11px] font-semibold tabular-nums ${tierTextClass(entry.percent)}`}>
          {entry.hp}/{entry.maxHp}
        </span>
      </div>
    </InfoTooltip>
  );
}

function TotalRing({ summary }: { summary: PartyHpSummary }) {
  return (
    <InfoTooltip
      hoverOnly
      panel={
        <p className="text-white">
          Party Total:{" "}
          <span className={`font-semibold ${tierTextClass(summary.totalPercent)}`}>
            {summary.totalHp}/{summary.totalMaxHp}
          </span>{" "}
          ({summary.totalPercent}%)
        </p>
      }
    >
      <div className="flex flex-col items-center gap-1">
        <Ring
          percent={summary.totalPercent}
          size={TOTAL_RING_SIZE}
          strokeWidth={TOTAL_RING_STROKE}
          radius={TOTAL_RING_RADIUS}
          circumference={TOTAL_RING_CIRCUMFERENCE}
          colorClass={tierTextClass(summary.totalPercent)}
        >
          <span className={`text-lg font-bold tabular-nums ${tierTextClass(summary.totalPercent)}`}>
            {summary.totalPercent}%
          </span>
        </Ring>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</span>
      </div>
    </InfoTooltip>
  );
}

/**
 * Party HP at a glance — a ring per character (worst-off first, so the one
 * a DM most needs to see doesn't get buried alphabetically), plus one
 * bigger "Total" ring for the whole party's combined pool. Reads live off
 * `Character.combat` every render, same as `HpBar` on each character's own
 * card — no separate "refresh" step, a heal/damage edit anywhere else on
 * the dashboard shows up here immediately.
 */
export function HpOverviewPanel({ characters }: { characters: Character[] }) {
  const summary = computePartyHpSummary(characters);
  if (summary.characters.length === 0) return null;

  return (
    <ToolkitCard title="Party HP">
      <div className="flex flex-wrap items-start gap-4 px-3">
        <TotalRing summary={summary} />
        <div className="my-1 w-px self-stretch bg-slate-800" />
        <div className="flex flex-wrap items-start gap-3">
          {summary.characters.map((entry) => (
            <CharacterRing key={entry.characterId} entry={entry} />
          ))}
        </div>
      </div>
    </ToolkitCard>
  );
}
