import { Resource, SpellSlotLevel } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import { tierBadgeClass, tierBgClass } from "@/lib/tierColor";
import { InfoTooltip } from "./InfoTooltip";
import { RecoveryBadge, ResourceHintPanel } from "./ui/RecoveryBadge";

/** Small fixed-size CSS circle for a colored bullet — same reasoning as `DotMeter`'s own doc comment: a "●" glyph renders at a different visual weight per font, a real circle doesn't. */
export function ColorDot({ className }: { className: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className}`} />;
}

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
 * one blended number, so this is the one place to see the full itemized list
 * of both Limited Use and Spell Slots (previously rendered permanently below
 * the bar on `CharacterCard`, which is exactly what made that card too tall
 * to fit a screen without scrolling — moving it in here keeps every bit of
 * detail one hover/tap away instead of always paying its full height up
 * front). Plain `InfoTooltip` content, not a hand-rolled popover —
 * `InfoTooltip` already does hover-to-preview, click-to-pin-open, and
 * outside-click/Escape-to-close on its own, the same as every other hint in
 * this app; building a second, parallel "click to open a floating panel"
 * mechanism next to it would just be the same feature twice.
 *
 * The "Resources" heading up top uses the exact same `h4` recipe as the
 * "Limited Use"/"Spell Slots" headings below it (`LimitedUseList`/
 * `SpellSlotsList`'s own `text-[11px] uppercase tracking-wide text-slate-500`)
 * — all three now read as one consistent row of section headings instead of
 * a differently-styled percent breakdown sitting on top of them. Only the
 * trailing badge differs by design: "Resources" carries the blended
 * danger-tier color (`tierBadgeClass`/`tierBgClass` — green/amber/red, "how
 * worried should I be", matching the bar and the badge on the card itself),
 * while "Limited Use"/"Spell Slots" keep their fixed blue/violet identity
 * color regardless of how full they are and show an X/Y count instead of a
 * percent — the same split the card's own quick-glance row and this hint
 * already agreed on for those two.
 */
function ResourceTrackerHint({
  overallPercent,
  resources,
  spellSlots,
  pactSlots,
  resourcesTotal,
  spellSlotsTotal,
}: {
  overallPercent: number;
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  pactSlots?: boolean;
  /** Same X/Y tally `ResourceTrackerBar`'s `expanded` mode passes its own itemized lists — kept identical here so the same pill reads the same in both places, not a second, differently-styled figure. */
  resourcesTotal?: { current: number; max: number };
  spellSlotsTotal?: { current: number; max: number };
}) {
  return (
    // `w-64` (256px) — was `w-[272px]` (matching `CharacterCard`'s own
    // resource block width exactly), narrowed by the 16px this hint's own
    // `InfoTooltip` wrapper needs as margin for its vertical scrollbar's
    // reserved gutter once a tall list (many resources, many spell levels)
    // triggers `overflow-y: auto` — that gutter eats into the same
    // content-box width this div renders in, and at the old exact-fit
    // 272px there was zero margin left for it, so a vertical scroll forced
    // a horizontal one too (confirmed on a live screenshot). See
    // `InfoTooltip.tsx`'s own comment on its wrapper's `max-w` for the
    // full margin math. Before `w-56` (224px), which read as noticeably
    // narrower than the block this hint explains — 256px keeps almost all
    // of that width back.
    <div className="w-64">
      <p className="mb-1.5 text-slate-400">Average % remaining — abilities and spell slots weighted equally.</p>
      <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <ColorDot className={tierBgClass(overallPercent)} />
        Resources
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] normal-case leading-none tracking-normal tabular-nums font-bold ${tierBadgeClass(overallPercent)}`}
        >
          {overallPercent}%
        </span>
      </h4>

      {resources.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <LimitedUseList resources={resources} total={resourcesTotal} />
        </div>
      )}

      {spellSlots.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <SpellSlotsList spellSlots={spellSlots} pactSlots={pactSlots} total={spellSlotsTotal} />
        </div>
      )}
    </div>
  );
}

/** The itemized Limited Use group (heading + one `ResourceMeter` row per resource, alphabetical) — shared by `ResourceTrackerHint`'s hover breakdown (compact card) and `ResourceTrackerBar`'s own `expanded` mode (details modal, always visible instead of behind a hover). `null` when there's nothing to list, same as every other resource block here. */
export function LimitedUseList({
  resources,
  total,
}: {
  resources: Resource[];
  /** `ResourceTrackerBar`'s `expanded` mode passes the same `limitedUseTally` total its own quick-glance "Limited Use X/Y" row already computes — a concrete count of what's left, scoped to this one category, instead of the blended-total bar's own "% remaining" framing repeated at a smaller scale. Rendered as a small pill rather than plain text so it reads as a value, not a second heading — the hover breakdown leaves it off entirely, same as before, since that panel already opens from a badge showing the blended overall percent. */
  total?: { current: number; max: number };
}) {
  if (resources.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <ColorDot className="bg-blue-400" />
        Limited Use
        {total && (
          <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[11px] normal-case leading-none tracking-normal tabular-nums font-bold text-slate-100">
            {total.current}/{total.max}
          </span>
        )}
      </h4>
      <div className="space-y-1.5">
        {resources
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((r) => (
            <ResourceMeter key={r.id} resource={r} />
          ))}
      </div>
    </div>
  );
}

/** Same idea as `LimitedUseList`, one level per row instead of one resource per row — shared by `ResourceTrackerHint`'s hover breakdown and `ResourceTrackerBar`'s `expanded` mode (needs every tracked level, not just the ones with a known spell prepared — a slot with nothing assigned to it yet is otherwise invisible). */
export function SpellSlotsList({
  spellSlots,
  pactSlots,
  total,
}: {
  spellSlots: SpellSlotLevel[];
  pactSlots?: boolean;
  /** See `LimitedUseList`'s own doc comment — same X/Y pill, summed across every tracked slot level. */
  total?: { current: number; max: number };
}) {
  if (spellSlots.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <ColorDot className="bg-violet-400" />
        Spell Slots{pactSlots ? " (Pact)" : ""}
        {total && (
          <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[11px] normal-case leading-none tracking-normal tabular-nums font-bold text-slate-100">
            {total.current}/{total.max}
          </span>
        )}
      </h4>
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
  );
}

/**
 * "Resources" section header, bar, and both category totals in one block —
 * a DM glancing at a card used to get only one blended number, which reads
 * fine until abilities are topped up but spell slots are nearly gone (or
 * vice versa): the single percent hides exactly the split that matters most.
 * Now the bar still carries the one blended tier-colored impression (green/
 * amber/red, see `averageOverallPercent`), echoed in the badge next to the
 * "Resources" label itself (`tierBadgeClass`, the only place color reacts to
 * *state* rather than *category*), while a row underneath always shows both
 * categories' own `current/max` totals up front — no hover needed to see
 * whether it's the abilities or the slots that are running low. Those two
 * counts use the same fixed blue/violet identity colors as the dot bullets
 * in `ResourceTrackerHint` below (not tier colors — a category's own hue
 * stays constant regardless of how full it is, only the badge and bar react
 * to state), so the quick-glance row and the hover breakdown read as the
 * same visual language. `null` (nothing to show at all) only when neither
 * side has anything tracked.
 *
 * This whole block — label, badge, bar, and both counts — is one single
 * `InfoTooltip` trigger, not several: an earlier version had the bar and the
 * percent as two independently-tracked hints, which read as two controls
 * instead of one. `hoverOnly` here only turns off the dotted-underline text
 * styling (this is a bar/label cluster, not a word), it doesn't restrict the
 * interaction — click-to-pin still works exactly like every other hint. The
 * block also gets a faint `hover:bg-white/5` of its own — the tooltip
 * already signals "hover me" once it opens, but that's a beat later; the
 * background gives an instant on-touch cue that the whole area is
 * interactive, same idea as `res-bar-row:hover` in the prototype this was
 * built from.
 *
 * All of the above describes the default (non-`expanded`) mode. See the
 * `expanded` prop's own doc comment for what changes in the details modal.
 */
/**
 * The "Limited Use X/Y" quick-glance total below the bar — unlike
 * `averageOverallPercent`'s ratio-based voting (already fair regardless of
 * pool size), a raw sum of `current`/`max` across resources lets one big
 * variable-cost pool's absolute size swamp everything else: Lay on Hands'
 * ~5-per-level HP pool next to a 2-charge Rage would show as e.g. "16/27",
 * a number that's really just "how much healing is left," not "how many
 * uses do you have." A resource with more than 6 max — the same threshold
 * `ResourceMeter`'s own `showDots` uses to decide "too big to render as
 * discrete charges" — is that kind of pool rather than a handful of
 * discrete uses, so it's counted as a single "1" (available) until it's
 * fully spent to 0, same as any other resource once its last discrete
 * charge is gone.
 */
function limitedUseTally(resources: Resource[]): { current: number; max: number } {
  return resources.reduce(
    (acc, r) =>
      r.max > 6
        ? { current: acc.current + (r.current > 0 ? 1 : 0), max: acc.max + 1 }
        : { current: acc.current + r.current, max: acc.max + r.max },
    { current: 0, max: 0 }
  );
}

export function ResourceTrackerBar({
  resources,
  spellSlots,
  pactSlots,
  expanded = false,
}: {
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  /** Warlocks track spell slots as a single fast-recovering "Pact Magic" pool rather than the standard per-long-rest table — surfaced only in the hint's own Spell Slots heading, not on the bar itself. */
  pactSlots?: boolean;
  /**
   * `CharacterDetailsModal` passes `true` (via `CharacterStatBlock`'s own
   * `expandedResources`) — the itemized `LimitedUseList`/`SpellSlotsList`
   * breakdown, normally reachable only by hovering/tapping this whole block
   * (`ResourceTrackerHint`), instead renders directly underneath it,
   * permanently visible. The bar/label/badge stay identical either way; only
   * the quick-glance "Limited Use X/Y, Spell Slots X/Y" totals row
   * disappears in this mode — it would just repeat what the itemized lists
   * (each now carrying its own "% remaining" heading) already show right
   * below — and the whole thing stops being an `InfoTooltip` trigger, since
   * there's no more hidden detail left to reveal on hover.
   */
  expanded?: boolean;
}) {
  const overallPercent = averageOverallPercent(resources, spellSlots);
  if (overallPercent === null) return null;

  const { current: resourcesCurrent, max: resourcesMax } = limitedUseTally(resources);
  const spellSlotsCurrent = spellSlots.reduce((sum, s) => sum + s.current, 0);
  const spellSlotsMax = spellSlots.reduce((sum, s) => sum + s.max, 0);

  const barBlock = (
    <span className="flex flex-col gap-1.5 leading-none">
      <span className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-500">Resources</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tierBadgeClass(overallPercent)}`}>{overallPercent}%</span>
      </span>
      <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <span className={`block h-full rounded-full ${tierBgClass(overallPercent)}`} style={{ width: `${overallPercent}%` }} />
      </span>
      {!expanded && (resourcesMax > 0 || spellSlotsMax > 0) && (
        <span className="flex items-center justify-between text-xs text-slate-500">
          {resourcesMax > 0 && (
            <span className="flex items-center gap-1.5">
              <ColorDot className="bg-blue-400" />
              Limited Use <span className="font-semibold text-slate-200 tabular-nums">{resourcesCurrent}/{resourcesMax}</span>
            </span>
          )}
          {spellSlotsMax > 0 && (
            <span className="flex items-center gap-1.5">
              <ColorDot className="bg-violet-400" />
              Spell Slots <span className="font-semibold text-slate-200 tabular-nums">{spellSlotsCurrent}/{spellSlotsMax}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (expanded) {
    return (
      <div>
        {barBlock}
        {resources.length > 0 && (
          <div className="mt-3">
            <LimitedUseList resources={resources} total={resourcesMax > 0 ? { current: resourcesCurrent, max: resourcesMax } : undefined} />
          </div>
        )}
        {spellSlots.length > 0 && (
          <div className="mt-3">
            <SpellSlotsList
              spellSlots={spellSlots}
              pactSlots={pactSlots}
              total={spellSlotsMax > 0 ? { current: spellSlotsCurrent, max: spellSlotsMax } : undefined}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <InfoTooltip
      hoverOnly
      className="w-full"
      panel={
        <ResourceTrackerHint
          overallPercent={overallPercent}
          resources={resources}
          spellSlots={spellSlots}
          pactSlots={pactSlots}
          resourcesTotal={resourcesMax > 0 ? { current: resourcesCurrent, max: resourcesMax } : undefined}
          spellSlotsTotal={spellSlotsMax > 0 ? { current: spellSlotsCurrent, max: spellSlotsMax } : undefined}
        />
      }
    >
      <span className="-mx-1 -my-0.5 block rounded-md px-1 py-0.5 transition-colors hover:bg-white/5">{barBlock}</span>
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
          <InfoTooltip panel={<ResourceHintPanel resource={resource} />}>{resource.name}</InfoTooltip>
        ) : (
          resource.name
        )}
      </span>
      {/* Dots/count before the SR/LR/M badge — reversed from `ChargeBadge`'s
          own recipe (recovery badge first there) on purpose, only here and
          in this row's own hover hint: this list is scanned top-to-bottom
          for "how much is left," so the count leads; the recovery type is
          the secondary, "oh and it's a short rest" detail after it. */}
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
