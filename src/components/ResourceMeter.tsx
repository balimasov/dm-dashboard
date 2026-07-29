import { RECOVERY_LABELS, Resource, SpellSlotLevel } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import { tierBgClass, tierTextClass } from "@/lib/tierColor";
import { InfoTooltip } from "./InfoTooltip";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { RecoveryBadge } from "./ui/RecoveryBadge";

/** Fixed-size CSS circles instead of "●"/"○" glyphs — those render at different visual weights per font. */
export function DotMeter({
  current,
  max,
  colorClass = "bg-blue-400",
  onSetCount,
}: {
  current: number;
  max: number;
  colorClass?: string;
  /** Makes dots clickable — clicking dot `i` sets the count to `i + 1`, or to `i` if that dot was already the last filled one (so re-clicking the same dot un-fills it). */
  onSetCount?: (count: number) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < current;
        const dotClassName = `h-2.5 w-2.5 rounded-full border ${filled ? `${colorClass} border-transparent` : "border-slate-600"}`;
        // A dot only sizes correctly (w-2.5/h-2.5 apply) as a *direct* flex child — nesting it one
        // level deeper inside a plain (non-flex) wrapper collapses it back to an inline box, where
        // width/height are ignored and it renders as a thin vertical sliver instead of a circle.
        if (!onSetCount) return <span key={i} className={dotClassName} />;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Set to ${i + 1}`}
            onClick={() => onSetCount(current === i + 1 ? i : i + 1)}
            className="flex h-4 w-4 -m-[3px] items-center justify-center rounded-full hover:bg-slate-700/60"
          >
            <span className={dotClassName} />
          </button>
        );
      })}
    </span>
  );
}

/** Mean of each resource's own `current/max` — same "every pool is one equal vote" averaging as the party-wide gauge, just scoped to one character's own resources. `null` when none of them carry a `max` to divide by (nothing to show a bar for). */
export function averageResourcePercent(resources: Resource[]): number | null {
  const percentages = resources.filter((r) => r.max > 0).map((r) => (r.current / r.max) * 100);
  if (percentages.length === 0) return null;
  return Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
}

/** Same averaging as `averageResourcePercent`, one vote per spell slot level — mirrors how the party-wide gauge treats spell slots. */
export function averageSpellSlotPercent(spellSlots: SpellSlotLevel[]): number | null {
  const percentages = spellSlots.filter((s) => s.max > 0).map((s) => (s.current / s.max) * 100);
  if (percentages.length === 0) return null;
  return Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
}

/** Mean of every individual pool's own `current/max` across *both* abilities and spell slots at once — one flat list of equally-weighted votes (a Rage charge and a 3rd-level slot don't compare on their own terms, but each still counts as "one pool, topped-up or not" the same as the party-wide gauge treats them). `null` when there's nothing with a `max` to divide by on either side. */
export function averageOverallPercent(resources: Resource[], spellSlots: SpellSlotLevel[]): number | null {
  const percentages = [
    ...resources.filter((r) => r.max > 0).map((r) => (r.current / r.max) * 100),
    ...spellSlots.filter((s) => s.max > 0).map((s) => (s.current / s.max) * 100),
  ];
  if (percentages.length === 0) return null;
  return Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
}

/**
 * The hover/tap hint for `ResourceTrackerBar` — the bar itself shows only the
 * one blended number, so this is the one place to see it split back out by
 * Limited Use vs. Spell Slots, followed by the full itemized list of both
 * (previously rendered permanently below the bar on `CharacterCard`, which is
 * exactly what made that card too tall to fit a screen without scrolling —
 * moving it in here keeps every bit of detail one hover/tap away instead of
 * always paying its full height up front). Plain `InfoTooltip` content, not a
 * hand-rolled popover — `InfoTooltip` already does hover-to-preview,
 * click-to-pin-open, and outside-click/Escape-to-close on its own, the same
 * as every other hint in this app; building a second, parallel "click to
 * open a floating panel" mechanism next to it would just be the same feature
 * twice.
 *
 * Two different color systems meet here, deliberately: Overall uses the same
 * danger-tier color as the bar (green/amber/red — "how worried should I be"),
 * while Limited Use/Spell Slots use each pool type's fixed identity color
 * (blue/violet, matching the dots on `DotMeter` everywhere else in the app —
 * not `sky`, which this app's theme reskins to a warm brass tone that would
 * blend right into the amber tier color it needs to stay distinct from)
 * regardless of how full they are — tinting Limited Use amber at low-tier
 * would collide with the identity color a low-percent dot already reads as
 * elsewhere, so the item-type color stays constant and only the *bar* carries
 * the tier signal.
 */
function ResourceTrackerHint({
  overallPercent,
  resourcesPercent,
  spellSlotsPercent,
  resources,
  spellSlots,
  pactSlots,
}: {
  overallPercent: number;
  resourcesPercent: number | null;
  spellSlotsPercent: number | null;
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  pactSlots?: boolean;
}) {
  return (
    <div className="w-56">
      <div className="space-y-1">
        <p className="text-slate-400">Average % remaining — abilities and spell slots weighted equally.</p>
        <p>
          <span className={tierTextClass(overallPercent)}>●</span> Overall: <span className="font-semibold text-white">{overallPercent}%</span>
        </p>
        {resourcesPercent !== null && (
          <p>
            <span className="text-blue-400">●</span> Limited Use: <span className="font-semibold text-white">{resourcesPercent}%</span>
          </p>
        )}
        {spellSlotsPercent !== null && (
          <p>
            <span className="text-violet-400">●</span> Spell Slots: <span className="font-semibold text-white">{spellSlotsPercent}%</span>
          </p>
        )}
      </div>

      {resources.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
          <h4 className="text-[11px] uppercase tracking-wide text-slate-600">Limited Use</h4>
          {resources
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => (
              <ResourceMeter key={r.id} resource={r} />
            ))}
        </div>
      )}

      {spellSlots.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <h4 className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-600">Spell Slots{pactSlots ? " (Pact)" : ""}</h4>
          <div className="space-y-1">
            {spellSlots
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((s) => (
                <div key={s.level} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{ordinalLevel(s.level)} Level</span>
                  {s.max > 0 && s.max <= 6 ? (
                    <DotMeter current={s.current} max={s.max} colorClass="bg-violet-400" />
                  ) : (
                    <span className="font-medium text-slate-100">
                      {s.current}/{s.max}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One bar, one number, for both the Limited Use and Spell Slots sub-sections
 * — a DM glancing at a card wants "how topped-up is this character" as one
 * combined impression, not two separate bars to compare in their head, and
 * not the full itemized breakdown up front either. Limited-use resources and
 * spell slots are pooled into a single average (see `averageOverallPercent`);
 * the bar's tier color (green/amber/red) reflects that one number. The
 * per-pool-type split and the full itemized list both live one hover/tap
 * away in `ResourceTrackerHint` instead. `null` (nothing to show a bar for
 * at all) only when neither has anything tracked.
 *
 * The bar and the percent are one single `InfoTooltip` trigger, not two —
 * an earlier version wrapped each separately, which meant hovering the bar
 * and hovering the number opened two independently-tracked hints instead of
 * reading as one control. `hoverOnly` here only turns off the dotted-underline
 * text styling (this is a progress bar, not a word), it doesn't restrict the
 * interaction — click-to-pin still works exactly like every other hint.
 *
 * The row also gets a faint `hover:bg-white/5` of its own, same affordance
 * the prototype used — the tooltip already signals "hover me" once it opens,
 * but that's a beat later; the background gives an instant on-touch cue that
 * this row is interactive at all, same idea as `res-bar-row:hover` in the
 * prototype this was built from.
 */
export function ResourceTrackerBar({
  resources,
  spellSlots,
  pactSlots,
}: {
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  /** Warlocks track spell slots as a single fast-recovering "Pact Magic" pool rather than the standard per-long-rest table — surfaced only in the hint's own Spell Slots heading, not on the bar itself. */
  pactSlots?: boolean;
}) {
  const overallPercent = averageOverallPercent(resources, spellSlots);
  if (overallPercent === null) return null;
  const resourcesPercent = averageResourcePercent(resources);
  const spellSlotsPercent = averageSpellSlotPercent(spellSlots);

  return (
    <InfoTooltip
      hoverOnly
      className="w-full"
      panel={
        <ResourceTrackerHint
          overallPercent={overallPercent}
          resourcesPercent={resourcesPercent}
          spellSlotsPercent={spellSlotsPercent}
          resources={resources}
          spellSlots={spellSlots}
          pactSlots={pactSlots}
        />
      }
    >
      {/* `leading-none` here (not just on the number span below) matters: InfoTooltip
          wraps its children in its own span that doesn't reset its inherited
          line-height, so its invisible "strut" space skews ascent-heavy and
          visually pushes the number down relative to the bar once flex centers the
          taller box. Resetting line-height at this level too keeps every nested
          span's strut as tight as the number's own, so centering lines up cleanly. */}
      <span className="-mx-1 -my-0.5 flex items-center gap-2 rounded-md px-1 py-0.5 leading-none transition-colors hover:bg-white/5">
        <span className="relative block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800">
          <span className={`block h-full rounded-full ${tierBgClass(overallPercent)}`} style={{ width: `${overallPercent}%` }} />
        </span>
        {/* `relative -top-px`: digit glyphs sit ~1px low in their own box (descender space this
            font reserves below the baseline, unused by digits) — relative positioning nudges it
            back up since `translate`/`transform` are no-ops on a plain inline element like this. */}
        <span className={`relative -top-px shrink-0 text-xs font-semibold leading-none tabular-nums ${tierTextClass(overallPercent)}`}>{overallPercent}%</span>
      </span>
    </InfoTooltip>
  );
}

export function ResourceMeter({ resource }: { resource: Resource }) {
  const showDots = resource.max > 0 && resource.max <= 6;
  const hasHint = Boolean(resource.source || resource.description);
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 flex-1 text-slate-300">
        {hasHint ? (
          <InfoTooltip
            panel={
              <AbilityHintPanel
                name={resource.name}
                metaLines={[resource.source]}
                status={<span className="text-sky-400">{RECOVERY_LABELS[resource.recovery]} recovery</span>}
                description={resource.description}
              />
            }
          >
            {resource.name}
          </InfoTooltip>
        ) : (
          resource.name
        )}
      </span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        {showDots ? (
          <DotMeter current={resource.current} max={resource.max} />
        ) : (
          <span className="text-slate-100 font-medium">
            {resource.current}/{resource.max}
          </span>
        )}
        <RecoveryBadge recovery={resource.recovery} />
      </span>
    </div>
  );
}
