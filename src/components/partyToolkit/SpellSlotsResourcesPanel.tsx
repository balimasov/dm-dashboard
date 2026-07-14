import { Character, RECOVERY_LABELS } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import { tierTextClass } from "@/lib/tierColor";
import {
  HeroicInspirationSummary,
  PartyResourceEntry,
  PartyResourceGauge,
  PartyRestRecoveryGauge,
  PartySpellSlotHolder,
  computeHeroicInspirationSummary,
  computePartyResourceGauge,
  computePartyResourceSummary,
  computePartyRestRecoveryGauge,
  computePartySpellSlotSummary,
} from "@/lib/partyToolkit";
import { InfoTooltip } from "../InfoTooltip";
import { CharacterChip } from "../ui/CharacterChip";
import { RecoveryBadge } from "../ui/RecoveryBadge";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CHART_AREA_MIN_HEIGHT_CLASS, HEROIC_INSPIRATION_DESCRIPTION, HintPanel, HolderListPanel, usageColorClass } from "./shared";

function HeroicInspirationRow({ summary }: { summary: HeroicInspirationSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <InfoTooltip
        panel={<HolderListPanel label="Heroic Inspiration" description={HEROIC_INSPIRATION_DESCRIPTION} holders={summary.holders} />}
      >
        <span className="text-slate-300">Heroic Inspiration</span>
      </InfoTooltip>
      <span className={`font-medium ${usageColorClass(summary.withInspiration, summary.partySize)}`}>
        {summary.withInspiration}/{summary.partySize}
      </span>
    </div>
  );
}

/** Same hover-hint content as `ResourceMeter` on the character card (name/source/description) — resources aren't duplicated data here, just a different view of the same fields. */
function ResourceHintPanel({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-white">{entry.resourceName}</p>
      {entry.source && <p className="text-xs uppercase tracking-wide text-slate-500">{entry.source}</p>}
      <p>{RECOVERY_LABELS[entry.recovery]} recovery</p>
      {entry.description && <p>{entry.description}</p>}
    </div>
  );
}

function ResourceRow({ entry }: { entry: PartyResourceEntry }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <InfoTooltip panel={<ResourceHintPanel entry={entry} />}>
          <span className="text-slate-300">{entry.resourceName}</span>
        </InfoTooltip>
      </div>
      <RecoveryBadge recovery={entry.recovery} />
      <span className={`shrink-0 whitespace-nowrap font-medium ${usageColorClass(entry.current, entry.max)}`}>
        {entry.current}/{entry.max}
      </span>
      <CharacterChip name={entry.characterName} avatarUrl={entry.avatarUrl} />
    </div>
  );
}

/** Per-character breakdown for a spell slot level — the row's hover hint, same idea as a skill row's per-character panel. */
function SpellSlotLevelPanel({ level, holders }: { level: number; holders: PartySpellSlotHolder[] }) {
  return (
    <HintPanel
      title={`${ordinalLevel(level)} Level`}
      rows={holders}
      rowKey={(h) => h.characterId}
      rowClassName="flex items-center justify-between gap-4"
      renderRow={(h) => (
        <>
          <span className="min-w-0 truncate">{h.characterName}</span>
          <span className={`shrink-0 whitespace-nowrap ${usageColorClass(h.current, h.max)}`}>
            {h.current}/{h.max}
          </span>
        </>
      )}
    />
  );
}

/**
 * Semicircular "fuel gauge" arc — shared by the single party-wide dial and
 * the smaller Short Rest/Long Rest pair below it, so both read as the same
 * visual language at different sizes. `pathLength={100}` makes the fill a
 * plain 0-100 `strokeDasharray` regardless of the arc's actual pixel length
 * — no trig needed to convert a percentage into an angle — and every other
 * dimension (stroke width, font size) is expressed in the same SVG user
 * units, so shrinking just the container's CSS width (`widthClassName`)
 * scales the whole dial proportionally instead of needing a second set of
 * hand-tuned sizes. Colored with the same emerald/amber/red danger tiers
 * `HpBar` uses, so "how worried should I be" reads the same everywhere.
 *
 * The gap value in `strokeDasharray` is deliberately way bigger than
 * `100 - percent` needs to be, not the exact remainder — a dash+gap that
 * sums to exactly `pathLength` wraps back to position 0 right at the
 * path's own endpoint, and with `strokeLinecap="round"` that seam paints
 * a stray round dot at the arc's tip (confirmed: visible at the 100% end
 * regardless of `percent`). An oversized gap means the pattern never
 * completes a second cycle, so there's nothing at the seam to draw.
 */
function ResourceGaugeArc({ percent, subtitle, widthClassName = "w-52" }: { percent: number; subtitle: string; widthClassName?: string }) {
  const tierClass = tierTextClass(percent);
  const arcPath = "M 16 100 A 84 84 0 0 1 184 100";

  return (
    <svg viewBox="0 0 200 118" className={widthClassName}>
      <path d={arcPath} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-slate-800" />
      <path
        d={arcPath}
        fill="none"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${percent} 1000`}
        stroke="currentColor"
        className={tierClass}
      />
      <text x="100" y="88" textAnchor="middle" className={`text-3xl font-bold tabular-nums ${tierClass}`} fill="currentColor">
        {percent}%
      </text>
      <text x="100" y="110" textAnchor="middle" className="text-[11px] fill-slate-500">
        {subtitle}
      </text>
    </svg>
  );
}

/** Same idea as `AbilitySkillRadarHint` — the gauge's own hover hint, since "74%" means nothing without knowing it's an average of equally-weighted pools, not a sum. */
function PartyResourcesHint({ resourceCount }: { resourceCount: number }) {
  return (
    <HintPanel
      title="Party Resources"
      description={
        <>
          Average of every individually-tracked pool&apos;s own remaining % — each spell slot level, Heroic
          Inspiration, and every character resource ({resourceCount} total) counts as one equal vote, regardless of
          its size. A small fully-drained resource (e.g. Rage at 0/2) pulls this down just as much as a big one like
          spell slots, instead of getting lost next to it.
        </>
      }
    />
  );
}

function PartyResourceGaugeDisplay({ gauge }: { gauge: PartyResourceGauge }) {
  return (
    <div className="flex flex-col items-center">
      <ResourceGaugeArc percent={gauge.percent} subtitle={`${gauge.resourceCount} resources tracked`} />
    </div>
  );
}

/**
 * The same average-per-resource gauge, split into a Short Rest and a Long
 * Rest dial — answers "if we rest right now, how much of what's running
 * low actually comes back" more directly than one blended number, since
 * that's the DM's actual mid-encounter decision. Either side is omitted
 * (not just empty) when the party has no resources of that kind at all, so
 * a party with zero short-rest resources doesn't get an empty 0% dial that
 * reads as "you have nothing," which would be misleading.
 */
function PartyRestRecoveryDisplay({ recovery }: { recovery: PartyRestRecoveryGauge }) {
  if (!recovery.shortRest && !recovery.longRest) return null;
  return (
    <div className="mt-2 flex items-start justify-center gap-10">
      {recovery.shortRest && (
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Short Rest</p>
          <ResourceGaugeArc percent={recovery.shortRest.percent} subtitle={`${recovery.shortRest.resourceCount} resources`} widthClassName="w-32" />
        </div>
      )}
      {recovery.longRest && (
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Long Rest</p>
          <ResourceGaugeArc percent={recovery.longRest.percent} subtitle={`${recovery.longRest.resourceCount} resources`} widthClassName="w-32" />
        </div>
      )}
    </div>
  );
}

/**
 * Spell Slots & Resources — slots first (party-wide totals per level, always
 * shown as plain numbers here rather than the dot meter used on a
 * character's own card, since a party total can run well past a
 * single-character's usual single-digit max), then every limited-use
 * resource in the party.
 */
export function SpellSlotsResourcesPanel({ characters }: { characters: Character[] }) {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);
  const gauge = computePartyResourceGauge(characters);
  const restRecovery = computePartyRestRecoveryGauge(characters);

  return (
    <ToolkitCard title="Spell Slots & Resources">
      {gauge && (
        <div className={CHART_AREA_MIN_HEIGHT_CLASS}>
          <SectionLabel className="text-center">
            <InfoTooltip inline panel={<PartyResourcesHint resourceCount={gauge.resourceCount} />}>
              Party Resources
            </InfoTooltip>
          </SectionLabel>
          <PartyResourceGaugeDisplay gauge={gauge} />
          <PartyRestRecoveryDisplay recovery={restRecovery} />
        </div>
      )}

      <SectionLabel className={gauge ? "mt-4" : ""}>Spell Slots</SectionLabel>
      {!spellSlots ? (
        <p className="text-sm text-slate-600">No spell slots in the party.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {spellSlots.levels.map((l) => (
            <div key={l.level} className="flex items-center justify-between gap-3 py-1 text-sm">
              <InfoTooltip panel={<SpellSlotLevelPanel level={l.level} holders={l.holders} />}>
                <span className="text-slate-300">{ordinalLevel(l.level)} Level</span>
              </InfoTooltip>
              <span className={`font-medium ${usageColorClass(l.current, l.max)}`}>
                {l.current}/{l.max}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-1 text-sm">
            <span className="text-slate-300">Total</span>
            <span className={`font-medium ${usageColorClass(spellSlots.totalCurrent, spellSlots.totalMax)}`}>
              {spellSlots.totalCurrent}/{spellSlots.totalMax}
            </span>
          </div>
        </div>
      )}

      <SectionLabel className="mt-4">Heroic Inspiration</SectionLabel>
      <HeroicInspirationRow summary={inspiration} />

      <SectionLabel className="mt-4">Resources</SectionLabel>
      {resources.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No limited-use resources tracked.</p>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {resources.map((entry) => (
            <ResourceRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </ToolkitCard>
  );
}
