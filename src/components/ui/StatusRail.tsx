"use client";

import { useEffect, useRef, useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { DotMeter } from "@/components/ResourceMeter";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { CustomCondition } from "@/lib/types";
import { CONDITION_INFO, getExhaustionEffect, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";
import { ConditionHintPanel, ConditionsListHintPanel, CustomConditionHintPanel } from "./conditionHints";
import { inputCls } from "./Field";
import { POPOVER_SHELL_CLS } from "./containerStyles";
import { ExhaustionIcon, ConcentrationIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon } from "./icons";
import { MICRO_LABEL_CLS } from "./typography";

function ExhaustionPanel({ level }: { level: number }) {
  const effect = getExhaustionEffect(level);
  return (
    <div className="space-y-2">
      {/* Same "bold name: description" shape `ConditionHintPanel` uses for every standard condition — the level lives inside the bold part since it's what the name refers to, not extra detail tacked on after the colon (that's what the "Right now" line below is for). */}
      <p>
        <span className="font-semibold text-slate-100">Exhaustion (level {level})</span>: {EXHAUSTION_RULES_TEXT}
      </p>
      {effect && (
        <p className="border-t border-slate-700 pt-2 font-semibold text-amber-300">
          Right now (level {level}): −{effect.d20Penalty} to d20 rolls, speed −{effect.speedPenalty} ft.
        </p>
      )}
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
const STATUS_BADGE_SIZE = "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950";

/**
 * Every badge's `InfoTooltip` trigger gets this instead of relying on its
 * default inline-block-hugging-the-text sizing — without it, only the 1-2
 * glyphs inside the circle were actually hoverable/tappable, not the circle
 * itself (confirmed: the badge visually reads as one round unit, but most of
 * its area did nothing on hover). `absolute inset-0` fills the badge's own
 * `relative` box, but that box then has to center its own children itself
 * (it's no longer a small inline-block the badge's own `flex items-center
 * justify-center` can center as a unit) — `flex!` is Tailwind v4's trailing-
 * `!important` syntax, required because `InfoTooltip`'s outer span hardcodes
 * `inline-block`; both classes set `display`, Tailwind's cascade order (not
 * className string order) silently picked `inline-block` without it,
 * collapsing the icon/text to the box's top-left corner (confirmed broken in
 * production).
 */
const BADGE_HINT_TRIGGER_CLS = "absolute inset-0 flex! items-center justify-center";

/**
 * Condition badges cycle through a curated, well-spaced set of hues by
 * position (not a name hash) — guarantees no two *simultaneously active*
 * conditions share a color as long as there are 8 or fewer of them, which a
 * hash could easily collide on. Deliberately excludes violet/red, since
 * those are already reserved for Concentration/Exhaustion.
 */
export const CONDITION_HUES = [16, 48, 80, 112, 144, 176, 208, 320];

/**
 * One fixed hue for every custom/homebrew condition badge — deliberately NOT
 * cycled like `CONDITION_HUES`, since there's no risk of two *different*
 * custom conditions needing to be told apart from each other the same way
 * simultaneous standard conditions do (the dashed border plus the hover name
 * already does that). Chosen clear of every other badge color already in
 * use: every value in `CONDITION_HUES`, violet (concentration's card ring),
 * and red (exhaustion).
 */
const CUSTOM_CONDITION_HUE = 190;

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
      <InfoTooltip panel={<ConditionHintPanel condition={condition} />} className={BADGE_HINT_TRIGGER_CLS}>
        {condition.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

/** Same pulsing-glow badge shape as `ConditionBadge`, plus a dashed border — the second, always-on signal (color alone isn't enough at a glance) that this is a homebrew state, not one of the 14 standard D&D conditions. */
function CustomConditionBadge({ condition }: { condition: CustomCondition }) {
  return (
    <span
      className={`${STATUS_BADGE_SIZE} status-ring-dynamic border-dashed text-[10px] font-bold`}
      style={
        {
          borderColor: `hsl(${CUSTOM_CONDITION_HUE}, 70%, 55%)`,
          color: `hsl(${CUSTOM_CONDITION_HUE}, 80%, 78%)`,
          "--glow-1": `hsla(${CUSTOM_CONDITION_HUE}, 70%, 55%, 0.55)`,
          "--glow-2": `hsla(${CUSTOM_CONDITION_HUE}, 70%, 50%, 0.3)`,
          "--glow-3": `hsla(${CUSTOM_CONDITION_HUE}, 70%, 55%, 0.95)`,
          "--glow-4": `hsla(${CUSTOM_CONDITION_HUE}, 70%, 50%, 0.6)`,
        } as React.CSSProperties
      }
    >
      <InfoTooltip
        panel={<CustomConditionHintPanel name={condition.name} description={condition.description} />}
        className={BADGE_HINT_TRIGGER_CLS}
      >
        {condition.name.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

function ExhaustionBadge({ level }: { level: number }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-red border-red-500`}>
      <InfoTooltip panel={<ExhaustionPanel level={level} />} className={BADGE_HINT_TRIGGER_CLS}>
        <ExhaustionIcon className="h-[18px] w-[18px] text-red-300" />
      </InfoTooltip>
      <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white">
        {level}
      </span>
    </span>
  );
}

/**
 * Rules blurb shared with `VitalsPanel.tsx`'s own read-only Concentration
 * dot (`CONDITION_HUES` above is the same cross-file-constant convention) —
 * bolded term + what it actually does, not just a restatement of the UI's
 * own on/off state, which is all either hint used to say. Also reused as
 * the hover hint on the Concentration toggle inside the states popover (see
 * `ConcentrationToggleRow`) now that concentration is no longer its own
 * standalone badge.
 */
export const CONCENTRATION_HINT_TEXT = (
  <p>
    <span className="font-semibold text-violet-300">Concentration</span> — required to keep certain spells active;
    taking damage forces a Constitution save or the spell ends.
  </p>
);

/** Placeholder icon for the overflow badge — a plain ellipsis, standing in for whatever custom art replaces it later. */
function OverflowBadge({ conditions, customConditions = [] }: { conditions: string[]; customConditions?: CustomCondition[] }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-gray border-slate-400 text-slate-200`}>
      <InfoTooltip
        panel={<ConditionsListHintPanel conditions={conditions} customConditions={customConditions} />}
        className={BADGE_HINT_TRIGGER_CLS}
      >
        •••
      </InfoTooltip>
    </span>
  );
}

/**
 * Concentration's on/off switch, now living inside the states popover
 * instead of its own always-visible badge — the card's passive
 * `concentrating-ring` border tint (set directly from `concentrating` at
 * `CharacterCard`/`CreatureCard`'s root, entirely independent of this rail)
 * still tells every viewer at a glance whether it's active, so moving the
 * *toggle* control off the rail doesn't lose that passive signal. Wraps the
 * label in the same `CONCENTRATION_HINT_TEXT` hover hint the old badge used
 * — `disableTap` since the label sits inside this row's own click target
 * (the whole row toggles, not just the switch), same reasoning as every
 * other `InfoTooltip` nested inside its own clickable parent.
 */
function ConcentrationToggleRow({ active, onToggle }: { active: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onToggle}
      onClick={onToggle}
      aria-pressed={active}
      aria-label="Toggle Concentration"
      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-violet-500 bg-violet-500/10 text-violet-300"
          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      <InfoTooltip hoverOnly disableTap panel={CONCENTRATION_HINT_TEXT}>
        <span className="flex items-center gap-1.5">
          <ConcentrationIcon className="h-3.5 w-3.5 shrink-0" />
          Concentration
        </span>
      </InfoTooltip>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${active ? "bg-violet-500" : "bg-slate-700"}`}>
        {/* `left-0.5` is an explicit base position, not left implicit/auto —
            an absolutely positioned element with no `left` set falls back to
            its "static position", which measured out 2px further right than
            intended here, leaving the "on" knob flush against the track's
            own right edge with zero margin (clipped into the rounded curve)
            instead of the same 2px inset the "off" state has on the left.
            Pinning an explicit base removes that ambiguity; `translate-x-3`
            (12px) now covers exactly the track's remaining travel distance
            (28px track − 2px left inset − 2px right inset − 12px knob). */}
        <span
          className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${active ? "translate-x-3" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

/**
 * Renaming/re-describing an existing custom condition reuses this same row
 * rather than a separate dialog — pencil icon flips it into the exact same
 * name+description fields `AddCustomConditionForm` uses, seeded from the
 * current values fresh on every entry into edit mode (not just on mount),
 * so a cancelled edit never leaks into the next attempt.
 */
function CustomConditionRow({
  condition,
  onSave,
  onToggleDisabled,
  onRemove,
}: {
  condition: CustomCondition;
  onSave?: (next: CustomCondition) => void;
  /** Flips `disabled` without touching name/description — the reversible alternative to `onRemove` for "not right now, but I'll want this again." */
  onToggleDisabled?: () => void;
  onRemove?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(condition.name);
  const [description, setDescription] = useState(condition.description ?? "");

  function startEditing() {
    setName(condition.name);
    setDescription(condition.description ?? "");
    setEditing(true);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave?.({ ...condition, name: trimmed, description: description.trim() || undefined });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1.5 rounded-md border border-dashed border-sky-700 bg-slate-950 p-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="State name"
          maxLength={60}
          className={`${inputCls} w-full`}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What it does mechanically"
          rows={5}
          maxLength={2000}
          className={`${inputCls} w-full resize-y`}
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const disabled = Boolean(condition.disabled);

  return (
    <div
      className={`flex items-start gap-1.5 rounded-md border border-dashed border-slate-700 bg-slate-950 p-2 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-200">
          {condition.name}
          {disabled && <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-slate-500">Off</span>}
        </p>
        {condition.description && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{condition.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onToggleDisabled && (
          <button
            type="button"
            onClick={onToggleDisabled}
            aria-label={disabled ? `Enable ${condition.name}` : `Disable ${condition.name}`}
            title={disabled ? "Enable" : "Disable"}
            className="text-slate-600 hover:text-sky-400"
          >
            {disabled ? <EyeIcon className="h-3 w-3" /> : <EyeOffIcon className="h-3 w-3" />}
          </button>
        )}
        {onSave && (
          <button type="button" onClick={startEditing} aria-label={`Edit ${condition.name}`} className="text-slate-600 hover:text-sky-400">
            <PencilIcon className="h-3 w-3" />
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${condition.name}`} className="text-slate-600 hover:text-red-400">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

let customConditionUid = 0;
/** Same throwaway-unique-enough convention as `EditCharacterModal.tsx`'s own `nextId` — never persisted anywhere as a display value, only as a React key and the id a later remove-click matches against. */
function nextCustomConditionId(): string {
  customConditionUid += 1;
  return `custom-${Date.now()}-${customConditionUid}`;
}

function AddCustomConditionForm({ onAdd }: { onAdd: (condition: CustomCondition) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-sky-400 hover:underline">
        + Add custom state
      </button>
    );
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ id: nextCustomConditionId(), name: trimmed, description: description.trim() || undefined });
    setName("");
    setDescription("");
    setOpen(false);
  }

  return (
    <div className="space-y-1.5 border-t border-dashed border-slate-700 pt-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="State name"
        maxLength={60}
        className={`${inputCls} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What it does mechanically"
        rows={5}
        maxLength={2000}
        className={`${inputCls} w-full resize-y`}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        Add
      </button>
    </div>
  );
}

/**
 * The single entry point for everything on this rail that isn't purely
 * read-only: concentration, exhaustion, standard D&D conditions, and custom
 * states — one popover shared by `CharacterCard` and `CreatureCard` rather
 * than each having its own editing surface. Concentration and custom states
 * show up for both callers (whichever pass `onToggleConcentration`/
 * `onCustomConditionsChange`); the standard-conditions pill grid only
 * appears for a caller that also passes `onConditionsChange` — today that's
 * `CreatureCard`/`CreatureDetailsModal` only, since a Character's standard
 * conditions come from D&D Beyond sync (or the free-text field on its full
 * edit page) rather than manual pill-toggling here.
 */
function StatusPopover({
  conditions,
  exhaustion,
  concentrating,
  customConditions,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionsChange,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating?: boolean;
  customConditions: CustomCondition[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionsChange?: (customConditions: CustomCondition[]) => void;
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

  useEscapeToClose(() => setOpen(false), open);

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
        aria-label="Manage states and concentration"
        aria-expanded={open}
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-600 bg-slate-950 text-slate-500 hover:border-slate-400 hover:text-slate-300"
      >
        {/* `disableTap` — this button already has its own onClick (toggling
            the popover); without it, a tap on a touch screen would fight
            between opening this hint and opening the popover instead. Hover/
            focus still show it on desktop, same as `ConcentrationToggleRow`'s
            own label hint. */}
        <InfoTooltip
          hoverOnly
          disableTap
          panel={<p>Concentration, exhaustion, and conditions — standard and custom.</p>}
          className={BADGE_HINT_TRIGGER_CLS}
        >
          {/* SVG, not a plain "+" glyph — a text character's optical center
              depends on the font actually rendering it, which drifted
              visibly off `justify-center`'s true center on desktop (fine on
              mobile, different font stack) since nothing here pins its
              glyph metrics. */}
          <PlusIcon className="h-3 w-3" />
        </InfoTooltip>
      </button>
      {open && (
        <div className={`absolute left-1/2 top-full z-10 mt-2 w-80 -translate-x-1/2 space-y-3 p-3 text-left ${POPOVER_SHELL_CLS}`}>
          {onToggleConcentration && <ConcentrationToggleRow active={Boolean(concentrating)} onToggle={onToggleConcentration} />}
          {onExhaustionChange && (
            <div>
              <p className={`mb-1.5 ${MICRO_LABEL_CLS}`}>Exhaustion</p>
              <DotMeter current={exhaustion} max={6} colorClass="bg-red-500" onSetCount={onExhaustionChange} />
            </div>
          )}
          {onConditionsChange && (
            <div>
              <p className={`mb-1.5 ${MICRO_LABEL_CLS}`}>Conditions</p>
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
          {onCustomConditionsChange && (
            <div className="space-y-1.5">
              <p className={MICRO_LABEL_CLS}>Custom states</p>
              {customConditions.map((c) => (
                <CustomConditionRow
                  key={c.id}
                  condition={c}
                  onSave={(next) => onCustomConditionsChange(customConditions.map((x) => (x.id === next.id ? next : x)))}
                  onToggleDisabled={() =>
                    onCustomConditionsChange(customConditions.map((x) => (x.id === c.id ? { ...x, disabled: !x.disabled } : x)))
                  }
                  onRemove={() => onCustomConditionsChange(customConditions.filter((x) => x.id !== c.id))}
                />
              ))}
              <AddCustomConditionForm onAdd={(c) => onCustomConditionsChange([...customConditions, c])} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Total badge slots (exhaustion + conditions/custom-states + the overflow/popover-trigger badges) a card has room for before it gets crowded. Concentration no longer counts here — see `ConcentrationToggleRow`'s own doc comment. */
const MAX_BADGES = 6;

function StatusBadges({
  conditions,
  exhaustion,
  concentrating,
  customConditions,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionsChange,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating?: boolean;
  customConditions: CustomCondition[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionsChange?: (customConditions: CustomCondition[]) => void;
}) {
  const showTrigger = Boolean(onConditionsChange || onExhaustionChange || onCustomConditionsChange || onToggleConcentration);
  const fixedCount = (exhaustion > 0 ? 1 : 0) + (showTrigger ? 1 : 0);
  const availableForConditions = MAX_BADGES - fixedCount;

  // A disabled custom condition stays in `customConditions` (so the popover
  // can still list/re-enable it) but shouldn't get a floating badge — that's
  // the whole point of "disable" over "remove". `StatusPopover` below still
  // gets the *full*, unfiltered array so its own editable list keeps showing
  // every condition regardless of on/off state.
  const activeCustomConditions = customConditions.filter((c) => !c.disabled);

  // Custom states go first when slots run short — a standard condition
  // (Poisoned, Prone...) is common knowledge even reduced to "•••" in the
  // overflow badge, where a homebrew one losing its only visible badge loses
  // the one on-card cue that it's active at all.
  const totalCount = activeCustomConditions.length + conditions.length;
  const overflowing = totalCount > availableForConditions;
  const visibleSlots = overflowing ? Math.max(0, availableForConditions - 1) : availableForConditions;
  const visibleCustom = activeCustomConditions.slice(0, visibleSlots);
  const visibleStandard = conditions.slice(0, Math.max(0, visibleSlots - visibleCustom.length));
  const overflowCustom = activeCustomConditions.slice(visibleCustom.length);
  const overflowStandard = conditions.slice(visibleStandard.length);

  return (
    <>
      {/* Trigger renders first (leftmost) always — a fixed anchor point for
          where to click, rather than drifting right as more badges appear
          next to it. */}
      {showTrigger && (
        <StatusPopover
          conditions={conditions}
          exhaustion={exhaustion}
          concentrating={concentrating}
          customConditions={customConditions}
          onToggleConcentration={onToggleConcentration}
          onConditionsChange={onConditionsChange}
          onExhaustionChange={onExhaustionChange}
          onCustomConditionsChange={onCustomConditionsChange}
        />
      )}
      {exhaustion > 0 && <ExhaustionBadge level={exhaustion} />}
      {visibleCustom.map((c) => (
        <CustomConditionBadge key={c.id} condition={c} />
      ))}
      {visibleStandard.map((condition, index) => (
        <ConditionBadge key={condition} condition={condition} index={index} />
      ))}
      {(overflowCustom.length > 0 || overflowStandard.length > 0) && (
        <OverflowBadge conditions={overflowStandard} customConditions={overflowCustom} />
      )}
    </>
  );
}

export function StatusRail({
  conditions,
  exhaustion,
  concentrating,
  customConditions,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionsChange,
}: {
  conditions: string[];
  exhaustion: number;
  /** Only affects the card's passive `concentrating-ring` border tint now — omit entirely when the caller doesn't track concentration at all. Pass `onToggleConcentration` (whether or not this is set) to also show the toggle in the popover. */
  concentrating?: boolean;
  customConditions: CustomCondition[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionsChange?: (customConditions: CustomCondition[]) => void;
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
        customConditions={customConditions}
        onToggleConcentration={onToggleConcentration}
        onConditionsChange={onConditionsChange}
        onExhaustionChange={onExhaustionChange}
        onCustomConditionsChange={onCustomConditionsChange}
      />
    </div>
  );
}
