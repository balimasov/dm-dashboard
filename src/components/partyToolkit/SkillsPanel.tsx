import { ReactNode } from "react";
import { Character, SKILL_ABILITY, SKILL_DESCRIPTIONS, SKILL_LABELS, SkillName } from "@/lib/types";
import { formatModifier } from "@/lib/format";
import { tierTextClass } from "@/lib/tierColor";
import {
  AbilitySkillCoverage,
  PartyPassiveSummary,
  PassiveCharacterScore,
  PassiveStatSummary,
  SkillCharacterScore,
  SkillOverviewEntry,
  computeAbilitySkillCoverage,
  computePartySkillOverview,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip } from "../ui/CharacterChip";
import { HintPanel } from "../ui/HintPanel";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CHART_AREA_MIN_HEIGHT_CLASS } from "./shared";

/** Shared row shape for the two "name + colored modifier" hint panels below (skills and passives), and reused verbatim in the heatmap cells' own hover hints so both surfaces read as one color language: green when proficient/expertise, otherwise inherits the row's own white. */
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

interface HeatmapLevel {
  bg: string;
  text: string;
}

/**
 * 7 steps, dark → bright. The original design-provided stops packed all
 * the contrast into lightness alone, and spent it unevenly: steps 0-1 were
 * both near-black blue-violet (barely distinguishable from each other),
 * while steps 2-6 were all some shade of brown/amber/gold — five steps
 * sharing one hue family. Since most real skill spreads land in the
 * middle of the range, that's exactly where the old ramp was hardest to
 * read. This ramp sweeps hue smoothly across the whole range instead —
 * deep violet → magenta → wine-red → rust → amber → gold — so every
 * adjacent pair differs in hue *and* lightness, not lightness alone; two
 * cues instead of one make each step easier to place at a glance,
 * especially in the busy middle of the scale. Text flips from light to
 * dark only at the single step bright enough that white drops below
 * WCAG's 4.5:1 body-text contrast (a bold 12px number still counts as
 * body text, not the "large text" WCAG exempts down to 3:1) — every
 * darker step keeps white.
 */
const HEATMAP_LEVELS: HeatmapLevel[] = [
  { bg: "#241130", text: "text-slate-100" },
  { bg: "#3D1440", text: "text-slate-100" },
  { bg: "#591A3C", text: "text-slate-100" },
  { bg: "#7A2430", text: "text-slate-100" },
  { bg: "#9C3B22", text: "text-slate-100" },
  { bg: "#B05818", text: "text-slate-100" },
  { bg: "#F2B93E", text: "text-slate-900" },
];
/** Every value in the group ties — same "nothing to distinguish" middle step `heatmapBucket`-style code elsewhere in this file uses for a flat row, here for a flat group. */
const HEATMAP_MID_LEVEL = HEATMAP_LEVELS[3];
/** A value with no group to compare against (or a non-finite one) reads as plainly "no data", never as the coldest real score. */
const HEATMAP_NEUTRAL_LEVEL: HeatmapLevel = { bg: "#334155", text: "text-slate-400" };
/** A real spread narrower than this gets padded to it (centered on the group's own midpoint) so a handful of points a couple of numbers apart don't get stretched across the full dark-to-bright range and read as more dramatic than they are. */
const HEATMAP_MIN_SPAN = 6;

/** A group's min/max — `null` when the group has no finite values to compare (nothing to be relative to). */
type HeatmapGroupRange = { min: number; max: number } | null;

/**
 * Active Skills and Passives are normalized separately (`SkillHeatmap`
 * computes one `HeatmapGroupRange` per family and threads it down) — they
 * live on different numeric scales (a raw modifier vs. 10 + modifier), so
 * sharing one min/max would let one family's spread swamp the other's.
 * Non-finite inputs (nothing in this app's data model currently produces
 * one, but the aggregation stays defensive) are dropped before min/max,
 * matching "missing values don't count toward the range" — see
 * `heatmapLevelFor` for how a missing value itself renders.
 */
function computeHeatmapGroupRange(values: number[]): HeatmapGroupRange {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

/**
 * Normalizes `value` against its group's own `range` — `(value - min) /
 * (max - min)`, bucketed into the 7 `HEATMAP_LEVELS` steps — so color
 * shows *relative* standing within the current party/group, not the
 * absolute bonus (a lone +7 reads as the brightest step in one party, the
 * dimmest in another where everyone's pushing +12+). Recomputed fresh
 * every render straight from `characters`/`entries`/`passives`, so a sync
 * or a roster change (new/removed character) reshapes the whole scale
 * automatically — there's no cached range to go stale.
 */
function heatmapLevelFor(value: number, range: HeatmapGroupRange): HeatmapLevel {
  if (range === null || !Number.isFinite(value)) return HEATMAP_NEUTRAL_LEVEL;
  const { min, max } = range;
  if (min === max) return HEATMAP_MID_LEVEL;

  let effectiveMin = min;
  let effectiveMax = max;
  if (max - min < HEATMAP_MIN_SPAN) {
    const mid = (min + max) / 2;
    effectiveMin = mid - HEATMAP_MIN_SPAN / 2;
    effectiveMax = mid + HEATMAP_MIN_SPAN / 2;
  }

  const t = Math.min(1, Math.max(0, (value - effectiveMin) / (effectiveMax - effectiveMin)));
  return HEATMAP_LEVELS[Math.min(HEATMAP_LEVELS.length - 1, Math.floor(t * HEATMAP_LEVELS.length))];
}

/**
 * Both corner markers below share this exact box (same `top-1`, same
 * `h-3 w-3` growing to `h-3.5 w-3.5` on `sm:`) — only `left-1`/`right-1`
 * differs. Earlier attempts positioned the ▲/▼/★ *glyphs* directly with a
 * `top-*` offset each and still drifted, because a Unicode triangle, star,
 * and a plain `div` dot each carry a different ink-to-em-box offset per
 * font — matching `top` values on the text spans themselves doesn't mean
 * matching visual centers. Drawing every marker as a plain geometric shape
 * (CSS border-triangle, an SVG star, a `div` dot — no font glyphs at all)
 * inside this one identical flex-centered box sidesteps the problem
 * entirely: the box's position is pixel-identical across all three, and
 * flex centering places each shape's actual geometry, not a font's
 * opinion of where a character "sits", at that box's center.
 */
const MARKER_BOX = "absolute top-1 flex h-3 w-3 items-center justify-center sm:h-3.5 sm:w-3.5";

/**
 * One data cell — fill is the pre-resolved `level` (the caller normalizes
 * against its own group's range; see `heatmapLevelFor`). Advantage/
 * disadvantage (top-left, green up/red down triangle) and proficiency
 * (top-right: an emerald dot for proficient, an emerald star for
 * expertise) are independent corner markers, not folded into the fill
 * color, so a DM can read "how good relative to the rest of the party",
 * "is it trained", and "is the roll itself helped or hurt" as three
 * separate glances instead of guessing which fact a blended color is
 * showing. `tooltip` is built by the caller so skill and passive rows can
 * each match their own existing hint's wording (a passive score is never
 * "rolled", so it has no advantage/disadvantage line).
 */
function HeatmapCell({
  displayValue,
  level,
  proficient,
  expertise,
  advantage,
  tooltip,
}: {
  displayValue: string;
  level: HeatmapLevel;
  proficient: boolean;
  expertise?: boolean;
  advantage?: "advantage" | "disadvantage";
  tooltip: ReactNode;
}) {
  return (
    <InfoTooltip hoverOnly panel={tooltip}>
      <span
        className={`relative flex h-9 w-full items-center justify-center rounded-md text-xs font-semibold tabular-nums ${level.text}`}
        style={{ backgroundColor: level.bg }}
      >
        {displayValue}
        {advantage === "advantage" && (
          <span className={`${MARKER_BOX} left-1`}>
            <span className="h-0 w-0 border-x-[4px] border-b-[6px] border-x-transparent border-b-emerald-400 sm:border-x-[5px] sm:border-b-[7px]" />
          </span>
        )}
        {advantage === "disadvantage" && (
          <span className={`${MARKER_BOX} left-1`}>
            <span className="h-0 w-0 border-x-[4px] border-t-[6px] border-x-transparent border-t-red-400 sm:border-x-[5px] sm:border-t-[7px]" />
          </span>
        )}
        {proficient &&
          (expertise ? (
            <span className={`${MARKER_BOX} right-1`}>
              <svg viewBox="0 0 20 20" className="h-2.5 w-2.5 fill-emerald-300 sm:h-3 sm:w-3">
                <polygon points="10,1 12.6,7.6 19.5,7.9 14,12.3 15.8,19 10,15.1 4.2,19 6,12.3 0.5,7.9 7.4,7.6" />
              </svg>
            </span>
          ) : (
            <span className={`${MARKER_BOX} right-1`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
            </span>
          ))}
      </span>
    </InfoTooltip>
  );
}

/** The heatmap cell tooltip's content, matching `SkillAllScoresPanel`'s own row styling exactly (same `scoreRowClass` + ▲/▼ colors) so hovering a cell and hovering the row label read as the same color language. */
function skillCellTooltip(score: SkillCharacterScore): ReactNode {
  return (
    <p className="text-white">
      {score.characterName}:{" "}
      <span className={scoreRowClass(score.proficient)}>
        {formatModifier(score.modifier)}
        {score.expertise ? " · expertise" : score.proficient ? " · proficient" : ""}
        {score.advantage === "advantage" && <span className="ml-1 text-emerald-400">▲</span>}
        {score.advantage === "disadvantage" && <span className="ml-1 text-red-400">▼</span>}
      </span>
    </p>
  );
}

/**
 * One skill's row of cells, in `characters`' own (stable) order — not
 * `entry.all`'s order, which is sorted best-first and would shuffle every
 * row differently. Every character always has a score here: `entry.all` is
 * built by mapping over this same `characters` array in
 * `computeSkillOverviewEntry`, so the lookup can't miss. `range` is the
 * whole Active Skills group's own min/max (every skill × every character),
 * computed once by `SkillHeatmap` and threaded down — not recomputed per
 * row, which would make each row relative to itself instead of the group.
 */
function HeatmapRow({ entry, characters, range }: { entry: SkillOverviewEntry; characters: Character[]; range: HeatmapGroupRange }) {
  const scoreByCharacter = new Map(entry.all.map((s) => [s.characterId, s]));
  return (
    <div className="contents">
      <InfoTooltip panel={<SkillAllScoresPanel skill={entry.skill} all={entry.all} />}>
        <span className="block truncate pr-2 text-sm text-slate-300">{SKILL_LABELS[entry.skill]}</span>
      </InfoTooltip>
      {characters.map((c) => {
        const score = scoreByCharacter.get(c.id)!;
        return (
          <HeatmapCell
            key={c.id}
            displayValue={formatModifier(score.modifier)}
            level={heatmapLevelFor(score.modifier, range)}
            proficient={score.proficient}
            expertise={score.expertise}
            advantage={score.advantage}
            tooltip={skillCellTooltip(score)}
          />
        );
      })}
    </div>
  );
}

/**
 * Passive row, same shape as `HeatmapRow` — normalized against the
 * Passives group's own range (`range`, every passive stat × every
 * character), a separate scale from Active Skills since a raw passive
 * score (10 + modifier) and a plain modifier don't live in the same
 * numeric space. No advantage/disadvantage marker: a passive is never
 * rolled, so the concept doesn't apply.
 */
function HeatmapPassiveRow({
  label,
  skill,
  summary,
  characters,
  range,
}: {
  label: string;
  skill: SkillName;
  summary: PassiveStatSummary;
  characters: Character[];
  range: HeatmapGroupRange;
}) {
  const scoreByCharacter = new Map(summary.all.map((s) => [s.characterId, s]));
  return (
    <div className="contents">
      <InfoTooltip panel={<PassiveAllScoresPanel label={label} skill={skill} all={summary.all} />}>
        <span className="block truncate pr-2 text-sm text-slate-300">{label}</span>
      </InfoTooltip>
      {characters.map((c) => {
        const score = scoreByCharacter.get(c.id)!;
        return (
          <HeatmapCell
            key={c.id}
            displayValue={String(score.value)}
            level={heatmapLevelFor(score.value, range)}
            proficient={score.proficient}
            tooltip={
              <p className="text-white">
                {score.characterName}:{" "}
                <span className={scoreRowClass(score.proficient)}>
                  {score.value}
                  {score.proficient ? " · proficient" : ""}
                </span>
              </p>
            }
          />
        );
      })}
    </div>
  );
}

/**
 * Every character's passive and active skill score in one scannable grid —
 * answers "who's my best pick for this specific check" and "how deep is
 * our bench" in one glance, instead of hovering rows one at a time.
 * Passives lead (a DM checks them far more often mid-session — "does
 * anyone notice this" beats "who should roll Arcana" in raw frequency),
 * skills follow, each family under its own subheader within the same
 * grid so the two still read as one instrument rather than two stacked
 * tables. The character column order is fixed (not re-sorted per row) so
 * a DM's eye can track one character down a single column across the
 * whole grid. Character columns are `minmax(2.25rem, 1fr)` — they grow to
 * fill however wide the card actually is (a 2-column desktop layout
 * stretches this card to match its taller neighbor, so a fixed intrinsic
 * width just left a small island of cells with empty space beside it) and
 * only fall back to their floor once there are enough characters to need
 * it. The label column is `minmax(6.5rem, 8rem)` with the label text
 * truncated (full name still one hover away, same as the row's own
 * tooltip) rather than `auto`-sized to the longest skill name — at `8rem`
 * a name like "Passive Investigation" would by itself eat most of a
 * narrow phone's available width, squeezing a real party size below every
 * character column's own floor; `6.5rem` is the floor it shrinks to under
 * that pressure. Once even the character-column floors don't fit
 * (`8rem` + `characters.length × 2.25rem` + gaps wider than the card),
 * the grid isn't allowed to compress further — `overflow-x-auto` on the
 * wrapper below lets the excess scroll horizontally instead of squeezing
 * cells unreadably thin or overflowing the card. That wrapper only sets
 * `overflow-x`, not `overflow-y`; per the CSS Overflow Module the browser
 * still computes the wrapper's own `overflow-y` as `auto` too (see
 * `InfoTooltip`'s own doc comment for the same rule breaking *that*
 * component pre-portal), but this wrapper's height is plain `auto` block
 * flow — nothing here forces it to a shorter definite height the way the
 * grid-stretched *card* is, so the vertical axis never actually has
 * anything to clip.
 *
 * Color: Active Skills and Passives are each normalized against their own
 * group's min/max (every skill × every character is one pool; every
 * passive × every character is the other) — see `heatmapLevelFor`. Both
 * ranges are recomputed straight from this render's `entries`/`passives`,
 * so a D&D Beyond sync or a roster change reshapes both scales on the
 * very next render, nothing cached to invalidate.
 */
function SkillHeatmap({
  characters,
  entries,
  passives,
}: {
  characters: Character[];
  entries: SkillOverviewEntry[];
  passives: PartyPassiveSummary;
}) {
  const passiveSummaries = [passives.perception, passives.insight, passives.investigation];
  const passiveRange = computeHeatmapGroupRange(passiveSummaries.flatMap((p) => p.all.map((s) => s.value)));
  const skillRange = computeHeatmapGroupRange(entries.flatMap((entry) => entry.all.map((s) => s.modifier)));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid items-center gap-1.5"
        style={{ gridTemplateColumns: `minmax(6.5rem, 8rem) repeat(${characters.length}, minmax(2.25rem, 1fr))` }}
      >
        <span />
        {characters.map((c) => (
          <span key={c.id} className="flex justify-center">
            <CharacterChip name={c.name} avatarUrl={c.avatarUrl} size="md" />
          </span>
        ))}

        <SectionLabel className="col-span-full">Passives</SectionLabel>
        <HeatmapPassiveRow label="Passive Perception" skill="perception" summary={passives.perception} characters={characters} range={passiveRange} />
        <HeatmapPassiveRow label="Passive Insight" skill="insight" summary={passives.insight} characters={characters} range={passiveRange} />
        <HeatmapPassiveRow label="Passive Investigation" skill="investigation" summary={passives.investigation} characters={characters} range={passiveRange} />

        <SectionLabel className="col-span-full mt-2">Skills</SectionLabel>
        {entries.map((entry) => (
          <HeatmapRow key={entry.skill} entry={entry} characters={characters} range={skillRange} />
        ))}
      </div>
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
 * Skills — the ability radar, then the Skill Heatmap (passives first, all
 * 18 skills after, see `SkillHeatmap`'s own doc comment). No compact/"show
 * all" split on the skill rows — a DM mid-session doesn't know in advance
 * which skill they'll need, so hiding most of them just adds an extra
 * click. Every row label still carries the same full-breakdown hover hint
 * the old list rows had; the heatmap grid replaces the rows themselves,
 * not the interaction.
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

      <div className={abilityCoverage.length >= 3 ? "mt-4" : ""}>
        <SkillHeatmap characters={characters} entries={skillEntries} passives={passives} />
      </div>
    </ToolkitCard>
  );
}
