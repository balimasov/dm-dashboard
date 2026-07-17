import { Character } from "@/lib/types";
import { tierTextClass } from "@/lib/tierColor";
import { getConditionInfo } from "@/lib/conditionInfo";
import { PartyHpCharacterEntry, PartyHpSummary, computePartyHpSummary } from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { DotMeter } from "../ResourceMeter";
import { CharacterChip } from "../ui/CharacterChip";
import { ShieldIcon } from "../ui/icons";
import { CONDITION_HUES } from "../ui/StatusRail";
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
 * Small solid dot, used only for Concentration below — the one state of the
 * three that's binary (on/off, no level or name to show), so a plain color
 * dot loses nothing. Exhaustion and conditions used to share this same dot,
 * which read as one undifferentiated blob of color once a death-saves row
 * sat right above it; they now carry their own number/letters instead (see
 * `ExhaustionDot`/`ConditionDot` below), so a dot only ever means
 * "Concentrating" in this panel. `inline-block` is load-bearing, not
 * decorative: it sits inside `InfoTooltip`'s own wrapper span, and CSS only
 * honors `width`/`height` on a non-replaced element that's block,
 * inline-block, or flex — a bare inline `<span>` two levels deep silently
 * collapsed to 0×0 without it (confirmed; same rule `DotMeter`'s own doc
 * comment already flags for *its* dots, there solved by being a direct
 * flex child instead — not an option here since `InfoTooltip` sits
 * between this dot and the row's flex container).
 */
const STATUS_DOT_CLASS = "inline-block h-2.5 w-2.5 shrink-0 rounded-full";

/** Shared footprint for the exhaustion/condition mini-badges below — same size so they line up with each other, distinct in shape (filled vs outlined) and content (number vs letters) from each other and from the plain `STATUS_DOT_CLASS` dot. */
const STATUS_BADGE_CLASS = "flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none";

/**
 * A donut gauge — track + a `currentColor` arc rotated to start at 12
 * o'clock, filled clockwise by current HP, with temp HP continuing on as a
 * second amber arc right where the HP arc ends (`strokeDashoffset` shifted
 * back by the HP arc's own length — the standard multi-segment ring trick).
 * Deliberately a different shape from every other gauge in the Party
 * Toolkit (bars in Rest Recovery, columns in the Spell Slots histogram, a
 * grid in the Skill Heatmap) — the point of this panel is to read as
 * visually distinct at a glance, not one more bar to tell apart from the
 * others. `cornerBadge` overlaps the ring's bottom-right edge (same
 * convention `CreatureCard` uses for its category chip on the avatar) — a
 * corner badge instead of a separate text line keeps AC attached to *this*
 * character's ring without adding row height.
 *
 * Fill lengths use the same `barScale` math `HpBar`'s own linear bar uses:
 * temp HP first eats into whatever ring is still unfilled below max, and
 * only once `hp + tempHp` exceeds `maxHp` does the HP arc itself shrink to
 * make room — the ring's total fill never exceeds one full lap.
 */
function Ring({ hp, maxHp, tempHp, size, strokeWidth, radius, circumference, colorClass, cornerBadge, children }: {
  hp: number;
  maxHp: number;
  tempHp: number;
  size: number;
  strokeWidth: number;
  radius: number;
  circumference: number;
  colorClass: string;
  cornerBadge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const barScale = Math.max(maxHp, hp + tempHp, 1);
  const hpDash = (hp / barScale) * circumference;
  const tempDash = (tempHp / barScale) * circumference;
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
          strokeDasharray={`${hpDash} ${circumference - hpDash}`}
        />
        {tempDash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke="currentColor"
            className="text-amber-400"
            strokeDasharray={`${tempDash} ${circumference - tempDash}`}
            strokeDashoffset={-hpDash}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      {cornerBadge}
    </div>
  );
}

function AcBadge({ ac }: { ac: number }) {
  return (
    <InfoTooltip hoverOnly panel={<p className="text-white">Armor Class {ac}</p>}>
      <span className="absolute -bottom-1 -right-1 flex h-6 min-w-[26px] items-center justify-center gap-0.5 rounded-full border border-slate-700 bg-slate-950 px-1.5 text-[10px] font-bold text-slate-300">
        <ShieldIcon className="h-3 w-3 shrink-0 text-slate-500" />
        {ac}
      </span>
    </InfoTooltip>
  );
}

/** Same successes/failures dot pair `HpBar` shows once a character is down — read-only here (no `onSetCount`), since this panel is a glance-only overview, not another place to edit combat state. `deathSaves` is only ever set once HP first hits 0, so a character that just dropped this instant reads as 0/0 until the first save is rolled. */
function DeathSavesRow({ deathSaves }: { deathSaves?: { successes: number; failures: number } }) {
  const successes = deathSaves?.successes ?? 0;
  const failures = deathSaves?.failures ?? 0;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-emerald-400">✅</span>
      <DotMeter current={successes} max={3} colorClass="bg-emerald-500" />
      <span className="text-[9px] text-red-400">❌</span>
      <DotMeter current={failures} max={3} colorClass="bg-red-500" />
    </div>
  );
}

/** Same hue-by-position convention `StatusRail`'s own condition badges use (`CONDITION_HUES`), and the same 2-letter abbreviation those badges show — a DM who's learned that language on the character cards doesn't have to learn a second one here. Outlined (not filled) so it reads as a distinct shape from `ExhaustionDot`'s solid number badge even at a glance, not just a different color. */
function ConditionDot({ condition, index }: { condition: string; index: number }) {
  const hue = CONDITION_HUES[index % CONDITION_HUES.length];
  const info = getConditionInfo(condition);
  return (
    <InfoTooltip
      hoverOnly
      panel={
        <p className="text-white">
          <span className="font-semibold capitalize">{condition}</span>
          {info ? `: ${info}` : ""}
        </p>
      }
    >
      <span
        className={`${STATUS_BADGE_CLASS} border uppercase`}
        style={{ borderColor: `hsl(${hue}, 75%, 55%)`, color: `hsl(${hue}, 85%, 78%)` }}
      >
        {condition.trim().slice(0, 2)}
      </span>
    </InfoTooltip>
  );
}

/** The exhaustion level itself, not just a color standing in for "some level or other" — a DM reads the severity straight off the badge instead of having to hover every time to find out whether it's a 1 or a 5. Filled solid (not outlined, unlike `ConditionDot`) so the two read as different shapes, not just different colors. */
function ExhaustionDot({ level }: { level: number }) {
  return (
    <InfoTooltip hoverOnly panel={<p className="text-white">Exhaustion level {level}</p>}>
      <span className={`${STATUS_BADGE_CLASS} bg-red-600 text-white`}>{level}</span>
    </InfoTooltip>
  );
}

/**
 * Concentration + exhaustion + every active condition — the same three
 * states `StatusRail` badges on each character's own card, condensed to fit
 * a mini gauge row instead of full-size 36px badges. `null` when nothing's
 * active, so a clean character's cell doesn't reserve empty row height.
 * Deliberately three different shapes (plain dot / filled number / outlined
 * letters), not the same dot recolored three ways — recoloring alone read as
 * one undifferentiated blob once this row sat directly under a death-saves
 * row of *also*-colored dots. `separated` draws a thin top divider for
 * exactly that case, so the two rows read as two categories stacked, not one
 * continuous smear of circles.
 */
function StatusDots({ entry, separated }: { entry: PartyHpCharacterEntry; separated?: boolean }) {
  if (!entry.concentrating && entry.exhaustion === 0 && entry.conditions.length === 0) return null;
  return (
    <div
      className={`flex max-w-[96px] flex-wrap items-center justify-center gap-1 ${
        separated ? "mt-0.5 border-t border-slate-800 pt-1.5" : ""
      }`}
    >
      {entry.concentrating && (
        <InfoTooltip hoverOnly panel={<p className="text-white">Concentrating</p>}>
          <span className={`${STATUS_DOT_CLASS} bg-violet-400`} />
        </InfoTooltip>
      )}
      {entry.exhaustion > 0 && <ExhaustionDot level={entry.exhaustion} />}
      {entry.conditions.map((condition, index) => (
        <ConditionDot key={condition} condition={condition} index={index} />
      ))}
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
    <div className="flex flex-col items-center gap-1">
      <InfoTooltip hoverOnly panel={<HpRingHint entry={entry} />}>
        <Ring
          hp={entry.hp}
          maxHp={entry.maxHp}
          tempHp={entry.tempHp}
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          radius={RING_RADIUS}
          circumference={RING_CIRCUMFERENCE}
          colorClass={tierTextClass(entry.percent)}
          cornerBadge={<AcBadge ac={entry.ac} />}
        >
          <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} size="md" showTitle={false} />
        </Ring>
      </InfoTooltip>
      <span className={`text-[11px] font-semibold tabular-nums ${tierTextClass(entry.percent)}`}>
        {entry.hp}/{entry.maxHp}
        {entry.tempHp > 0 && <span className="text-amber-400"> +{entry.tempHp}</span>}
      </span>
      {entry.isDown && <DeathSavesRow deathSaves={entry.deathSaves} />}
      <StatusDots entry={entry} separated={entry.isDown} />
    </div>
  );
}

function TotalRing({ summary }: { summary: PartyHpSummary }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <InfoTooltip
        hoverOnly
        panel={
          <p className="text-white">
            Party Total:{" "}
            <span className={`font-semibold ${tierTextClass(summary.totalPercent)}`}>
              {summary.totalHp}/{summary.totalMaxHp}
            </span>
            {summary.totalTempHp > 0 && <span className="text-amber-400"> (+{summary.totalTempHp} THP)</span>} (
            {summary.totalPercent}%)
          </p>
        }
      >
        <Ring
          hp={summary.totalHp}
          maxHp={summary.totalMaxHp}
          tempHp={summary.totalTempHp}
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
      </InfoTooltip>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</span>
      {summary.totalTempHp > 0 && <span className="text-[10px] font-semibold text-amber-400">+{summary.totalTempHp} THP</span>}
    </div>
  );
}

/**
 * Party vitals at a glance — HP ring, AC, and active states (conditions,
 * exhaustion, concentration) per character, plus one bigger "Total" ring
 * for the party's combined HP pool. Same character order as the Party card
 * row below it (whatever `characters` arrives in) rather than sorted by HP
 * — a DM who already spotted someone in the card row shouldn't have to
 * re-locate them in a different order up here. Reads live off
 * `Character.combat` every render, same as `HpBar`/`StatusRail`
 * on each character's own card — no separate "refresh" step, an edit
 * anywhere else on the dashboard shows up here immediately. Started as an
 * HP-only gauge (hence `computePartyHpSummary`'s own name); the panel
 * grew to cover the rest of a character's momentary battle state, so the
 * visible title says "Vitals" rather than "HP" even though the aggregator
 * underneath kept its original name.
 */
export function VitalsPanel({ characters }: { characters: Character[] }) {
  const summary = computePartyHpSummary(characters);
  if (summary.characters.length === 0) return null;

  return (
    <ToolkitCard title="Party Vitals">
      {/* `justify-center` — this card spans the dashboard's full width (not
          boxed into a 2-column grid like Skills/Actions & Resources), so a
          handful of rings left-aligned under a wide title bar left a lopsided
          slab of empty space on the right; centering reads as a deliberately
          compact instrument instead of a left-clumped, unfinished row. */}
      <div className="flex flex-wrap items-start justify-center gap-4 px-3">
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
