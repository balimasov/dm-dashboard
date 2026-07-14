import { Character, SKILL_ABILITY, SKILL_DESCRIPTIONS, SKILL_LABELS, SkillName } from "@/lib/types";
import { formatModifier } from "@/lib/format";
import { tierTextClass } from "@/lib/tierColor";
import {
  AbilitySkillCoverage,
  PartyPassiveSummary,
  PassiveCharacterScore,
  PassiveStatSummary,
  SkillCharacterScore,
  SkillCoverageStatus,
  SkillOverviewEntry,
  computeAbilitySkillCoverage,
  computePartySkillOverview,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip } from "../ui/CharacterChip";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CHART_AREA_MIN_HEIGHT_CLASS, HintPanel } from "./shared";

/** Same green/amber/red family as `HpBar`'s danger-tier colors — one shared "how worried should I be" palette across the whole app instead of coverage inventing its own. */
const STATUS_BADGE_CLASS: Record<SkillCoverageStatus, string> = {
  Strong: "border-emerald-700 bg-emerald-950/30 text-emerald-400",
  Medium: "border-amber-700 bg-amber-950/30 text-amber-400",
  Weak: "border-red-800 bg-red-950/30 text-red-400",
};

const STATUS_LABEL: Record<SkillCoverageStatus, string> = {
  Strong: "Strong coverage",
  Medium: "Medium coverage",
  Weak: "Weak coverage",
};

/**
 * Replaces the old Strong/Medium/Weak text chip (too wide) and the dot that
 * replaced it (too small to read anything from at a glance) — the actual
 * `proficientCount / partySize` ratio, colored by the same tier, is exactly
 * as compact as the dot but tells the DM the real numbers instead of making
 * them hover for it.
 */
function CoverageBadge({ proficientCount, partySize, status }: { proficientCount: number; partySize: number; status: SkillCoverageStatus }) {
  return (
    <InfoTooltip hoverOnly panel={<p className="text-white">{STATUS_LABEL[status]} — {proficientCount} of {partySize} proficient</p>}>
      <span
        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${STATUS_BADGE_CLASS[status]}`}
      >
        {proficientCount}/{partySize}
      </span>
    </InfoTooltip>
  );
}

/** Shared row shape for the two "name + colored modifier" hint panels below (skills and passives): green when proficient/expertise, otherwise inherits the row's own white. */
function scoreRowClass(proficient: boolean): string {
  return `shrink-0 whitespace-nowrap ${proficient ? "text-emerald-400" : ""}`;
}

/** The hover hint's content for a skill row — same short description shown on the character's own card (`SKILL_DESCRIPTIONS`, see `SkillPanel`), then every character's modifier, ranked, with proficiency called out the same way the row's own coverage count does. */
function SkillAllScoresPanel({ skill, all }: { skill: SkillName; all: SkillCharacterScore[] }) {
  return (
    <HintPanel
      title={
        <>
          {SKILL_LABELS[skill]} <span className="text-slate-500">({SKILL_ABILITY[skill].toUpperCase()})</span>
        </>
      }
      description={SKILL_DESCRIPTIONS[skill]}
      rows={all}
      rowKey={(s) => s.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(s) => (
        <>
          <span className="min-w-0 truncate">{s.characterName}</span>
          <span className={scoreRowClass(s.proficient)}>
            {formatModifier(s.modifier)}
            {s.expertise ? " · expertise" : s.proficient ? " · proficient" : ""}
            {s.advantage === "advantage" && <span className="ml-1 text-emerald-400">▲</span>}
            {s.advantage === "disadvantage" && <span className="ml-1 text-red-400">▼</span>}
          </span>
        </>
      )}
    />
  );
}

/** Appended to a best/weakest chip's hover hint — `modifier` alone doesn't say whether the roll behind it is actually helped or hurt by advantage/disadvantage, so a numerically-"best" pick (e.g. highest Stealth modifier) can still be a bad real pick if it's rolled at disadvantage. */
const ADVANTAGE_HINT_SUFFIX: Record<string, string> = {
  advantage: " (advantage)",
  disadvantage: " (disadvantage)",
};

/**
 * Best/weakest character for a skill or passive stat, shown as their chip +
 * an up/down arrow — `hint` carries the full "Best: Name +N" detail as our
 * own styled hover panel (not a native `title`, which is slow to appear and
 * only responds to a precise hover over the tiny glyph). Wrapped in a
 * bordered pill (not just a bare chip+glyph) so the whole thing reads as
 * one unit and gives the tooltip a real hit target to hover.
 */
function StrengthChip({
  characterName,
  avatarUrl,
  hint,
  direction,
  advantage,
}: {
  characterName: string;
  avatarUrl?: string;
  hint: string;
  direction: "up" | "down";
  /** Same conditional advantage/disadvantage shown on the character's own Skills pill — surfaced here too since this chip is often the only place a DM looks before picking who rolls. */
  advantage?: "advantage" | "disadvantage";
}) {
  const isUp = direction === "up";
  return (
    <InfoTooltip hoverOnly panel={<p className="text-white">{hint}</p>}>
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1.5 ${
          isUp ? "border-emerald-800 bg-emerald-950/30" : "border-red-800 bg-red-950/30"
        }`}
      >
        <CharacterChip name={characterName} avatarUrl={avatarUrl} showTitle={false} />
        {advantage === "advantage" && <span className="text-sm font-bold leading-none text-emerald-400">▲</span>}
        {advantage === "disadvantage" && <span className="text-sm font-bold leading-none text-red-400">▼</span>}
        <span className={`text-sm font-bold leading-none ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? "↑" : "↓"}
        </span>
      </span>
    </InfoTooltip>
  );
}

function SkillRow({ entry }: { entry: SkillOverviewEntry }) {
  const label = SKILL_LABELS[entry.skill];
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<SkillAllScoresPanel skill={entry.skill} all={entry.all} />}>
          <span className="text-slate-300">{label}</span>
        </InfoTooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {entry.best && (
          <StrengthChip
            key={`best-${entry.best.characterId}`}
            characterName={entry.best.characterName}
            avatarUrl={entry.best.avatarUrl}
            hint={`Best: ${entry.best.characterName} ${formatModifier(entry.best.modifier)}${ADVANTAGE_HINT_SUFFIX[entry.best.advantage ?? ""] ?? ""}`}
            direction="up"
            advantage={entry.best.advantage}
          />
        )}
        {entry.weakest && (
          <StrengthChip
            key={`weakest-${entry.weakest.characterId}`}
            characterName={entry.weakest.characterName}
            avatarUrl={entry.weakest.avatarUrl}
            hint={`Weakest: ${entry.weakest.characterName} ${formatModifier(entry.weakest.modifier)}${ADVANTAGE_HINT_SUFFIX[entry.weakest.advantage ?? ""] ?? ""}`}
            direction="down"
            advantage={entry.weakest.advantage}
          />
        )}
      </div>
      <CoverageBadge proficientCount={entry.proficientCount} partySize={entry.all.length} status={entry.status} />
    </div>
  );
}

/** Same hover-hint idea as `SkillAllScoresPanel`, for a passive stat — leads with the underlying skill's own description (proficiency here means proficient in that skill, not in the passive stat itself, which isn't a real game concept), plus a one-line reminder of how a passive score is derived. */
function PassiveAllScoresPanel({ label, skill, all }: { label: string; skill: SkillName; all: PassiveCharacterScore[] }) {
  return (
    <HintPanel
      title={label}
      description={`${SKILL_DESCRIPTIONS[skill]} Equal to 10 + the modifier, with no roll.`}
      rows={all}
      rowKey={(s) => s.characterName}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(s) => (
        <>
          <span className="min-w-0 truncate">{s.characterName}</span>
          <span className={scoreRowClass(s.proficient)}>
            {s.value}
            {s.proficient ? " · proficient" : ""}
          </span>
        </>
      )}
    />
  );
}

/** Same shape as `SkillRow` (name with a hover hint, best/weakest chips, status dot) — Passives is a subsection of the same Skills card, so the two need to read as one family of rows. Average/lowest are one hover away in the tooltip rather than crammed into a subtitle. */
function PassiveRow({ label, skill, summary }: { label: string; skill: SkillName; summary: PassiveStatSummary }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<PassiveAllScoresPanel label={label} skill={skill} all={summary.all} />}>
          <span className="text-slate-300">{label}</span>
        </InfoTooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StrengthChip
          key={`best-${summary.best.characterId}`}
          characterName={summary.best.characterName}
          avatarUrl={summary.best.avatarUrl}
          hint={`Best: ${summary.best.characterName} ${summary.best.value}`}
          direction="up"
        />
        {summary.weakest && (
          <StrengthChip
            key={`weakest-${summary.weakest.characterId}`}
            characterName={summary.weakest.characterName}
            avatarUrl={summary.weakest.avatarUrl}
            hint={`Weakest: ${summary.weakest.characterName} ${summary.weakest.value}`}
            direction="down"
          />
        )}
      </div>
      <CoverageBadge proficientCount={summary.proficientCount} partySize={summary.all.length} status={summary.status} />
    </div>
  );
}

const ABILITY_LABELS: Record<AbilitySkillCoverage["ability"], string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** Same coordinate math every axis/grid-ring/data-point on the radar shares — polar (radius, degrees-from-top, clockwise) to the SVG's cartesian plane. */
function polarPoint(cx: number, cy: number, radius: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

/**
 * Spider/radar chart of the party's skill coverage by ability — Constitution
 * is never an axis (no skills use it in 5e) instead of a permanent, useless
 * zero, so this only ever draws with the 5 abilities that do. Answers a
 * different question than the row-by-row skill list below it: not "who's
 * bad at Stealth" but "is the party's *Intelligence* thin across the
 * board" — the shape a DM actually wants before deciding how hard to lean
 * on a given kind of check tonight. Grid rings are drawn as the same
 * N-sided polygon as the data shape (not circles) so the 25/50/75/100%
 * rings visually line up with where the axis lines cross them.
 */
function AbilitySkillRadar({ coverage }: { coverage: AbilitySkillCoverage[] }) {
  if (coverage.length < 3) return null;

  const cx = 110;
  const cy = 118;
  const maxRadius = 62;
  const angleStep = 360 / coverage.length;
  const axisAngle = (i: number) => -90 + i * angleStep;

  const dataPoints = coverage.map((c, i) => polarPoint(cx, cy, (c.percent / 100) * maxRadius, axisAngle(i)));

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 230" className="w-64">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={coverage.map((_, i) => polarPoint(cx, cy, maxRadius * level, axisAngle(i)).join(",")).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-slate-800"
          />
        ))}
        {coverage.map((_, i) => {
          const [x, y] = polarPoint(cx, cy, maxRadius, axisAngle(i));
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeWidth="1" className="text-slate-800" />;
        })}
        <polygon
          points={dataPoints.map((p) => p.join(",")).join(" ")}
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-400"
        />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="currentColor" className="text-amber-400" />
        ))}
        {coverage.map((c, i) => {
          const [lx, ly] = polarPoint(cx, cy, maxRadius + 26, axisAngle(i));
          const tierClass = tierTextClass(c.percent);
          return (
            <g key={c.ability}>
              <text x={lx} y={ly - 6} textAnchor="middle" className="text-xs font-semibold fill-slate-400">
                {c.ability.toUpperCase()}
              </text>
              <text x={lx} y={ly + 9} textAnchor="middle" className={`text-xs font-bold tabular-nums ${tierClass}`} fill="currentColor">
                {c.percent}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AbilitySkillRadarHint({ coverage }: { coverage: AbilitySkillCoverage[] }) {
  return (
    <HintPanel
      title="Skill Coverage by Ability"
      description="Average proficient-character share across every skill under each ability — how thin the party's whole skill set is for that kind of check, not any one skill."
      rows={coverage}
      rowKey={(c) => c.ability}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(c) => (
        <>
          <span className="min-w-0 truncate">
            {ABILITY_LABELS[c.ability]} ({c.skillCount} skills)
          </span>
          <span className="shrink-0 whitespace-nowrap">{c.percent}%</span>
        </>
      )}
    />
  );
}

/**
 * Skills — merges Passives and the Party Skill Overview into one card:
 * Passives first (same row shape as the skills below it), then all 18
 * skills (no compact/"show all" split — a DM mid-session doesn't know in
 * advance which skill they'll need, so hiding most of them just adds an
 * extra click). Every row name carries a hover hint listing each
 * character's own score, so the list stays scannable at a glance while
 * still answering "what does everyone else have" on demand.
 */
export function SkillsPanel({ characters, passives }: { characters: Character[]; passives: PartyPassiveSummary }) {
  const skillEntries = computePartySkillOverview(characters);
  const abilityCoverage = computeAbilitySkillCoverage(characters);

  return (
    <ToolkitCard title="Skills">
      {abilityCoverage.length >= 3 && (
        <div className={CHART_AREA_MIN_HEIGHT_CLASS}>
          <SectionLabel className="text-center">
            <InfoTooltip inline panel={<AbilitySkillRadarHint coverage={abilityCoverage} />}>
              Coverage by Ability
            </InfoTooltip>
          </SectionLabel>
          <AbilitySkillRadar coverage={abilityCoverage} />
        </div>
      )}

      <SectionLabel className={abilityCoverage.length >= 3 ? "mt-4" : ""}>Passives</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        <PassiveRow label="Passive Perception" skill="perception" summary={passives.perception} />
        <PassiveRow label="Passive Insight" skill="insight" summary={passives.insight} />
        <PassiveRow label="Passive Investigation" skill="investigation" summary={passives.investigation} />
      </div>

      <SectionLabel className="mt-4">Skills</SectionLabel>
      <div className="divide-y divide-slate-800/60">
        {skillEntries.map((entry) => (
          <SkillRow key={entry.skill} entry={entry} />
        ))}
      </div>
    </ToolkitCard>
  );
}
