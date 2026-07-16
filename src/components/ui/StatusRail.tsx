"use client";

import { useEffect, useRef, useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { DotMeter } from "@/components/ResourceMeter";
import { CONDITION_INFO, getConditionInfo, getExhaustionEffect, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";

function ExhaustionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2" y="7" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10.5v3" strokeLinecap="round" />
      <path d="M6 12h4" strokeLinecap="round" />
    </svg>
  );
}

/** Placeholder icon for the Concentration status badge — a bullseye, standing in until custom art is added. */
function ConcentrationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ExhaustionPanel({ level }: { level: number }) {
  const effect = getExhaustionEffect(level);
  return (
    <div className="space-y-2">
      <p>{EXHAUSTION_RULES_TEXT}</p>
      {effect && (
        <p className="border-t border-slate-700 pt-2 font-semibold text-amber-300">
          Right now (level {level}): −{effect.d20Penalty} to d20 rolls, speed −{effect.speedPenalty} ft.
        </p>
      )}
    </div>
  );
}

function ConditionsPanel({ conditions }: { conditions: string[] }) {
  return (
    <div className="space-y-1.5">
      {conditions.map((condition) => {
        const info = getConditionInfo(condition);
        return (
          <div key={condition}>
            <p className="font-semibold text-slate-100">{condition}</p>
            {info && <p>{info}</p>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Floating status badges pinned to the card's right edge, near the header —
 * a static "Exhaustion: 2" text line lower in the card is easy to miss at a
 * glance across a full party row, so anything currently active also gets a
 * pulsing badge up top. Half-overlaps the card's border (rather than sitting
 * fully inset) so it reads as a floating marker without eating into the
 * 16px content padding where the header/text actually starts.
 */
const STATUS_BADGE_SIZE = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950";

/**
 * Condition badges cycle through a curated, well-spaced set of hues by
 * position (not a name hash) — guarantees no two *simultaneously active*
 * conditions share a color as long as there are 8 or fewer of them, which a
 * hash could easily collide on. Deliberately excludes violet/red, since
 * those are already reserved for Concentration/Exhaustion.
 */
export const CONDITION_HUES = [16, 48, 80, 112, 144, 176, 208, 320];

function ConditionBadge({ condition, index }: { condition: string; index: number }) {
  const hue = CONDITION_HUES[index % CONDITION_HUES.length];
  return (
    <span
      className={`${STATUS_BADGE_SIZE} status-ring-dynamic text-[10px] font-bold`}
      style={
        {
          borderColor: `hsl(${hue}, 75%, 55%)`,
          color: `hsl(${hue}, 85%, 78%)`,
          "--glow-1": `hsla(${hue}, 75%, 55%, 0.55)`,
          "--glow-2": `hsla(${hue}, 75%, 50%, 0.3)`,
          "--glow-3": `hsla(${hue}, 75%, 55%, 0.95)`,
          "--glow-4": `hsla(${hue}, 75%, 50%, 0.6)`,
        } as React.CSSProperties
      }
    >
      <InfoTooltip panel={<ConditionsPanel conditions={[condition]} />}>
        {condition.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

function ExhaustionBadge({ level }: { level: number }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-red border-red-500 relative`}>
      <InfoTooltip panel={<ExhaustionPanel level={level} />}>
        <ExhaustionIcon className="h-[18px] w-[18px] text-red-300" />
      </InfoTooltip>
      <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white">
        {level}
      </span>
    </span>
  );
}

function ConcentrationBadge({ active, onToggle }: { active: boolean; onToggle?: () => void }) {
  const sizeCls = active ? "h-9 w-9" : "h-6 w-6";
  return (
    <button
      type="button"
      disabled={!onToggle}
      onClick={onToggle}
      aria-pressed={active}
      aria-label="Toggle Concentration"
      className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full border-2 bg-slate-950 transition-all ${
        active
          ? "concentrating-ring border-violet-500 text-violet-300"
          : "border-slate-700 text-slate-600 hover:border-violet-700 hover:text-violet-400"
      }`}
    >
      <InfoTooltip hoverOnly disableTap panel={<p>Toggle Concentration — currently {active ? "on" : "off"}.</p>}>
        <ConcentrationIcon className={active ? "h-[21px] w-[21px]" : "h-[15px] w-[15px]"} />
      </InfoTooltip>
    </button>
  );
}

/** Placeholder icon for the overflow badge — a plain ellipsis, standing in for whatever custom art replaces it later. */
function OverflowBadge({ conditions }: { conditions: string[] }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-gray border-slate-400 text-slate-200`}>
      <InfoTooltip panel={<ConditionsPanel conditions={conditions} />}>•••</InfoTooltip>
    </span>
  );
}

/**
 * The only entry point for adding a condition or raising/lowering
 * exhaustion — neither has any other inline editing surface anywhere in the
 * app (only a free-text "Conditions" field and a 0-6 number input on the
 * full edit page). Deliberately generic (plain string/number props and
 * callbacks, no `Character`/`Creature` import) so wiring it into
 * `CharacterCard` later is just passing the same two callbacks `CreatureCard`
 * already does.
 */
function AddStatusBadge({
  conditions,
  exhaustion,
  onConditionsChange,
  onExhaustionChange,
}: {
  conditions: string[];
  exhaustion: number;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggleCondition(name: string) {
    if (!onConditionsChange) return;
    const next = conditions.includes(name) ? conditions.filter((c) => c !== name) : [...conditions, name];
    onConditionsChange(next);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add condition or set exhaustion"
        aria-expanded={open}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-600 bg-slate-950 text-slate-500 hover:border-slate-400 hover:text-slate-300"
      >
        +
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left shadow-lg shadow-black/40">
          {onExhaustionChange && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">Exhaustion</p>
              <DotMeter current={exhaustion} max={6} colorClass="bg-red-500" onSetCount={onExhaustionChange} />
            </div>
          )}
          {onConditionsChange && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">Conditions</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(CONDITION_INFO).map((name) => {
                  const active = conditions.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleCondition(name)}
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                        active
                          ? "border-amber-500 bg-amber-500/10 text-amber-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Total badge slots (concentration + exhaustion + conditions + the overflow/add badges) a card has room for before it gets crowded. */
const MAX_BADGES = 6;

function StatusBadges({
  conditions,
  exhaustion,
  concentrating,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating?: boolean;
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
}) {
  const showAdd = Boolean(onConditionsChange || onExhaustionChange);
  const fixedCount = (concentrating !== undefined ? 1 : 0) + (exhaustion > 0 ? 1 : 0) + (showAdd ? 1 : 0);
  const availableForConditions = MAX_BADGES - fixedCount;
  const overflowing = conditions.length > availableForConditions;
  const visibleConditions = overflowing ? conditions.slice(0, Math.max(0, availableForConditions - 1)) : conditions;
  const overflowConditions = overflowing ? conditions.slice(visibleConditions.length) : [];

  return (
    <>
      {concentrating !== undefined && <ConcentrationBadge active={concentrating} onToggle={onToggleConcentration} />}
      {exhaustion > 0 && <ExhaustionBadge level={exhaustion} />}
      {visibleConditions.map((condition, index) => (
        <ConditionBadge key={condition} condition={condition} index={index} />
      ))}
      {overflowConditions.length > 0 && <OverflowBadge conditions={overflowConditions} />}
      {showAdd && (
        <AddStatusBadge
          conditions={conditions}
          exhaustion={exhaustion}
          onConditionsChange={onConditionsChange}
          onExhaustionChange={onExhaustionChange}
        />
      )}
    </>
  );
}

export function StatusRail({
  conditions,
  exhaustion,
  concentrating,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
}: {
  conditions: string[];
  exhaustion: number;
  /** Omit entirely to hide the Concentration badge — pass it (characters and creatures both can) whenever the caller tracks concentration at all. */
  concentrating?: boolean;
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
}) {
  return (
    // Straddles the *top* border (row, centered, shifted up by half its own
    // height) instead of the right edge — a vertical rail there kept
    // colliding with something: the header/HP/AC text it ran alongside, the
    // next character's card in the row, or (in the details modal) just
    // reused the same crowded right-edge column. The top border has no
    // competing content on either side, so this is clear by construction
    // rather than by tuning offsets, and works the same in both the card and
    // the modal. Deliberately no `flex-wrap`: with enough simultaneous
    // badges to not fit one line, wrapping doubles this row's own height,
    // and since it's centered via a -50% transform (relative to its *own*
    // height) it then bled up far more than the party row's reserved top
    // padding — clipped (confirmed). `MAX_BADGES` above keeps a single line
    // from growing unbounded in the first place. `z-[5]`: below the page's
    // own `sticky top-0 z-10` header, so once the party row scrolls enough
    // that this rail's screen position reaches the header, it renders
    // behind it rather than on top (confirmed at z-10 it won that tie) —
    // but above `z-0`/`auto`, since every card is itself `position:
    // relative` with no explicit z-index and shares that stacking bucket.
    <div className="absolute inset-x-0 top-0 z-[5] flex -translate-y-1/2 items-center justify-center gap-3 px-6">
      <StatusBadges
        conditions={conditions}
        exhaustion={exhaustion}
        concentrating={concentrating}
        onToggleConcentration={onToggleConcentration}
        onConditionsChange={onConditionsChange}
        onExhaustionChange={onExhaustionChange}
      />
    </div>
  );
}
