"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoTooltip } from "@/components/InfoTooltip";
import { DotMeter } from "@/components/ResourceMeter";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { CustomConditionTemplate, resolveCustomConditions } from "@/lib/types";
import { CONDITION_INFO, getExhaustionEffect, EXHAUSTION_RULES_TEXT } from "@/lib/conditionInfo";
import { ConditionHintPanel, ConditionsListHintPanel, CustomConditionHintPanel } from "./conditionHints";
import { inputCls } from "./Field";
import { IconButton } from "./IconButton";
import { POPOVER_SHELL_CLS } from "./containerStyles";
import { ConcentrationIcon, ExhaustionIcon, PencilIcon, PlusIcon, StarIcon, TrashOutlineIcon } from "./icons";
import { MICRO_LABEL_CLS } from "./typography";

/** Screen-edge buffer for `StatusPopover`'s clamped position — same value/purpose as `InfoTooltip`'s own `EDGE_MARGIN`, kept local rather than imported since that constant isn't exported and the two components' positioning logic isn't shared. */
const EDGE_MARGIN = 8;

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
 * 16px content padding where the header/text actually starts. `34px` (not
 * the even `h-9`/36px Tailwind step) — shrunk 2px per feedback, since the
 * rail dips down over the name/header row below it and a couple fewer
 * pixels there measurably reduces how much it crowds a long name.
 */
const STATUS_BADGE_SIZE =
  "relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 bg-slate-950";

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
      <InfoTooltip hoverOnly panel={<ConditionHintPanel condition={condition} />} className={BADGE_HINT_TRIGGER_CLS}>
        {condition.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

/** Same pulsing-glow badge shape as `ConditionBadge`, plus a dashed border — the second, always-on signal (color alone isn't enough at a glance) that this is a homebrew state, not one of the 14 standard D&D conditions. */
function CustomConditionBadge({ condition }: { condition: CustomConditionTemplate }) {
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
        hoverOnly
        panel={<CustomConditionHintPanel name={condition.name} description={condition.description} />}
        className={BADGE_HINT_TRIGGER_CLS}
      >
        {condition.name.trim().slice(0, 2).toUpperCase()}
      </InfoTooltip>
    </span>
  );
}

/**
 * Heroic Inspiration — now a rail badge like every other state instead of a
 * bare glyph sitting inline in `CharacterHeader` (see that file's own
 * history: it used to compete with the name for horizontal room and read as
 * "stuck on the side"). Always first among the state badges (rendered before
 * `ExhaustionBadge` in `StatusBadges` below) when the caller shows it at
 * all — the caller only renders this component when inspiration is active,
 * so there's no "off" state to draw here, unlike `ConcentrationToggleRow`'s
 * on/off switch.
 */
function InspirationBadge() {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-amber border-amber-400`}>
      <InfoTooltip
        hoverOnly
        panel={
          <p>
            <span className="font-semibold text-amber-300">Heroic Inspiration</span>: lets you reroll one d20 roll,
            keeping the better result.
          </p>
        }
        className={BADGE_HINT_TRIGGER_CLS}
      >
        <StarIcon className="h-[18px] w-[18px] text-amber-300" />
      </InfoTooltip>
    </span>
  );
}

function ExhaustionBadge({ level }: { level: number }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-red border-red-500`}>
      <InfoTooltip hoverOnly panel={<ExhaustionPanel level={level} />} className={BADGE_HINT_TRIGGER_CLS}>
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
function OverflowBadge({ conditions, customConditions = [] }: { conditions: string[]; customConditions?: CustomConditionTemplate[] }) {
  return (
    <span className={`${STATUS_BADGE_SIZE} status-ring-gray border-slate-400 text-slate-200`}>
      <InfoTooltip
        hoverOnly
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

let customConditionTemplateUid = 0;
/** Same throwaway-unique-enough convention as `EditCharacterModal.tsx`'s own `nextId` — never persisted anywhere as a display value, only as a React key and the id every attach/detach toggle matches against. */
function nextCustomConditionTemplateId(): string {
  customConditionTemplateUid += 1;
  return `custom-${Date.now()}-${customConditionTemplateUid}`;
}

/**
 * A name+description editor for one library entry — used both inline (a
 * library row's pencil flips it into this) and for "+ Add Custom Condition"
 * (same fields, starting blank). Seeded fresh from the current values on
 * every entry into edit mode (not just on mount), so a cancelled edit never
 * leaks into the next attempt.
 */
function CustomConditionTemplateForm({
  initialName = "",
  initialDescription = "",
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initialName?: string;
  initialDescription?: string;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-sky-700 bg-slate-950 p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Condition name"
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
        <button type="button" onClick={onCancel} className="text-xs font-semibold text-slate-400 hover:text-slate-200">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onSubmit(trimmed, description.trim());
          }}
          disabled={!name.trim()}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * One library entry inside the "Manage Custom Conditions" view — read-only
 * name+description (same recipe the old per-entity row used) with edit/
 * delete actions using the app's own canonical row-action icons (`IconButton`
 * `muted`/`danger` — see that component's own doc comment for why those are
 * the designated tones for "edit" and "remove/delete a row"). Editing here
 * changes the shared definition, so every character/creature that has this
 * condition attached picks up the new name/description immediately, without
 * re-attaching anything.
 */
function CustomConditionLibraryRow({
  template,
  onSave,
  onRemove,
}: {
  template: CustomConditionTemplate;
  onSave: (next: CustomConditionTemplate) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CustomConditionTemplateForm
        initialName={template.name}
        initialDescription={template.description ?? ""}
        submitLabel="Save"
        onCancel={() => setEditing(false)}
        onSubmit={(name, description) => {
          onSave({ ...template, name, description: description || undefined });
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-1.5 rounded-md border border-dashed border-slate-700 bg-slate-950 p-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-200">{template.name}</p>
        {template.description && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{template.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton tone="muted" onClick={() => setEditing(true)} aria-label={`Edit ${template.name}`} title="Edit">
          <PencilIcon className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton tone="danger" onClick={onRemove} aria-label={`Delete ${template.name} from the library`} title="Delete from library">
          <TrashOutlineIcon className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

/** Toggle pill for one library entry — same on/off click interaction and active-state colors (`amber-500`) the standard-conditions pill grid above it uses, plus a dashed border (this app's established "homebrew" signal, also used by `CustomConditionBadge`) so the two grids read as clearly related but distinct. Unlike the standard grid's pills, this one also carries a hover hint (`disableTap` since the pill already has its own click handler) — a custom condition's name alone often isn't self-explanatory the way "Poisoned" is, so its description needs to be reachable before deciding whether to toggle it on. */
function CustomConditionPill({ template, active, onToggle }: { template: CustomConditionTemplate; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border border-dashed px-2 py-0.5 text-xs ${
        active ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      <InfoTooltip hoverOnly disableTap panel={<CustomConditionHintPanel name={template.name} description={template.description} />}>
        {template.name}
      </InfoTooltip>
    </button>
  );
}

/**
 * "Custom Conditions" — deliberately mirrors the standard-conditions pill
 * grid right above it in `StatusPopover`: every library entry gets its own
 * always-shown pill, a click toggles it on/off for *this* character/creature
 * directly (no separate "attach" step, no "already attached vs. library"
 * split list) — the same one-click interaction a standard condition already
 * has. Defining, renaming, or deleting a condition is a deliberately
 * separate concern (`⚙ Manage Custom Conditions`, its own local `managing`
 * toggle below) so this grid itself never carries a text input.
 *
 * Deleting a library entry here only removes it from `customConditionLibrary`
 * — it does *not* reach into every other character's/creature's own
 * `customConditionIds` to strip the now-dangling id (this component only
 * has write access to the *current* entity's ids, not the whole roster).
 * `resolveCustomConditions` already treats an id with no matching library
 * entry as simply absent, so a stale reference on another card just quietly
 * stops rendering a badge there instead of erroring — the same end state a
 * real cross-entity cleanup would produce, without needing this popover to
 * touch data it doesn't own.
 */
function CustomConditionsSection({
  ids,
  library,
  onIdsChange,
  onLibraryChange,
}: {
  ids: string[];
  library: CustomConditionTemplate[];
  onIdsChange: (ids: string[]) => void;
  onLibraryChange: (library: CustomConditionTemplate[]) => void;
}) {
  const [managing, setManaging] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  function toggle(id: string) {
    onIdsChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  if (managing) {
    return (
      <div className="space-y-1.5">
        <button type="button" onClick={() => setManaging(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200">
          ← Back
        </button>
        <p className={MICRO_LABEL_CLS}>Custom Conditions Library</p>
        {library.length === 0 && <p className="text-xs italic text-slate-500">No custom conditions yet.</p>}
        <div className="space-y-1.5">
          {library.map((t) => (
            <CustomConditionLibraryRow
              key={t.id}
              template={t}
              onSave={(next) => onLibraryChange(library.map((x) => (x.id === next.id ? next : x)))}
              onRemove={() => onLibraryChange(library.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
        {addingNew ? (
          <CustomConditionTemplateForm
            submitLabel="Add"
            onCancel={() => setAddingNew(false)}
            onSubmit={(name, description) => {
              onLibraryChange([...library, { id: nextCustomConditionTemplateId(), name, description: description || undefined }]);
              setAddingNew(false);
            }}
          />
        ) : (
          <button type="button" onClick={() => setAddingNew(true)} className="text-xs font-semibold text-sky-400 hover:underline">
            + Add Custom Condition
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className={MICRO_LABEL_CLS}>Custom Conditions</p>
      {library.length === 0 ? (
        <p className="text-xs italic text-slate-500">No custom conditions in this campaign yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {library.map((t) => (
            <CustomConditionPill key={t.id} template={t} active={ids.includes(t.id)} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      )}
      <button type="button" onClick={() => setManaging(true)} className="text-xs font-semibold text-sky-400 hover:underline">
        ⚙ Manage Custom Conditions
      </button>
    </div>
  );
}

/**
 * The single entry point for everything on this rail that isn't purely
 * read-only: concentration, exhaustion, standard D&D conditions, and custom
 * conditions — one popover shared by `CharacterCard` and `CreatureCard`
 * rather than each having its own editing surface. Concentration and custom
 * conditions show up for both callers (whichever pass
 * `onToggleConcentration`/`onCustomConditionIdsChange`); the
 * standard-conditions pill grid only appears for a caller that also passes
 * `onConditionsChange` — today that's `CreatureCard`/`CreatureDetailsModal`
 * only, since a Character's standard conditions come from D&D Beyond sync
 * (or the free-text field on its full edit page) rather than manual
 * pill-toggling here.
 */
function StatusPopover({
  conditions,
  exhaustion,
  concentrating,
  customConditionIds,
  customConditionLibrary,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionIdsChange,
  onCustomConditionLibraryChange,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating?: boolean;
  customConditionIds: string[];
  customConditionLibrary: CustomConditionTemplate[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionIdsChange?: (ids: string[]) => void;
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEscapeToClose(() => setOpen(false), open);

  // Portaled to `document.body` and positioned from measured rects, the same
  // technique `InfoTooltip` uses (see its own doc comment) — the previous
  // pure-CSS `left-1/2 -translate-x-1/2` centered the panel under the
  // trigger with no regard for the viewport edge, clipping it for the
  // leftmost card in a row (confirmed). Horizontal-only clamp: this panel
  // always opens below the trigger (`top: trigger bottom + 8px`), and every
  // real trigger position on the rail has room below it, unlike `InfoTooltip`
  // which also has to flip above short/tall panels near the bottom edge.
  useLayoutEffect(() => {
    if (!open) return;
    function computePosition() {
      const trigger = triggerRef.current;
      const panelEl = panelRef.current;
      if (!trigger || !panelEl) return;
      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panelEl.getBoundingClientRect();
      const idealLeft = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
      const maxLeft = window.innerWidth - panelRect.width - EDGE_MARGIN;
      const left = Math.max(Math.min(idealLeft, maxLeft), EDGE_MARGIN);
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${triggerRect.bottom + 8}px`;
      panelEl.style.visibility = "visible";
    }
    computePosition();
    window.addEventListener("scroll", computePosition, { capture: true, passive: true });
    window.addEventListener("resize", computePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", computePosition, { capture: true });
      window.removeEventListener("resize", computePosition);
    };
  }, [open]);

  function toggleCondition(name: string) {
    if (!onConditionsChange) return;
    const next = conditions.includes(name) ? conditions.filter((c) => c !== name) : [...conditions, name];
    onConditionsChange(next);
  }

  return (
    <>
      <button
        ref={triggerRef}
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
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          // `left: -9999px`/`visibility: hidden` is the pre-measurement
          // default for the one frame between mounting and the layout
          // effect's synchronous `computePosition()` overwriting it — same
          // convention as `InfoTooltip`'s own portaled panel.
          <div
            ref={panelRef}
            style={{ position: "fixed", left: "-9999px", visibility: "hidden" }}
            className={`z-[60] w-80 space-y-3 p-3 text-left ${POPOVER_SHELL_CLS}`}
          >
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
            {onCustomConditionIdsChange && onCustomConditionLibraryChange && (
              <CustomConditionsSection
                ids={customConditionIds}
                library={customConditionLibrary}
                onIdsChange={onCustomConditionIdsChange}
                onLibraryChange={onCustomConditionLibraryChange}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/** Total badge slots (exhaustion + conditions/custom-states + the overflow/popover-trigger badges) a card has room for before it gets crowded. Concentration no longer counts here — see `ConcentrationToggleRow`'s own doc comment. */
const MAX_BADGES = 6;

function StatusBadges({
  conditions,
  exhaustion,
  concentrating,
  heroicInspiration,
  customConditionIds,
  customConditionLibrary,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionIdsChange,
  onCustomConditionLibraryChange,
}: {
  conditions: string[];
  exhaustion: number;
  concentrating?: boolean;
  heroicInspiration?: boolean;
  customConditionIds: string[];
  customConditionLibrary: CustomConditionTemplate[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionIdsChange?: (ids: string[]) => void;
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const showTrigger = Boolean(onConditionsChange || onExhaustionChange || onCustomConditionIdsChange || onToggleConcentration);
  const fixedCount = (exhaustion > 0 ? 1 : 0) + (showTrigger ? 1 : 0);
  const availableForConditions = MAX_BADGES - fixedCount;

  // Every id in `customConditionIds` is attached, full stop — there's no
  // "attached but off" state in this model (see `CustomConditionsSection`'s
  // own doc comment), so unlike the old `disabled`-filtered array, nothing
  // here needs excluding before it counts as an active badge.
  const activeCustomConditions = resolveCustomConditions(customConditionIds, customConditionLibrary);

  // Custom conditions go first when slots run short — a standard condition
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
          customConditionIds={customConditionIds}
          customConditionLibrary={customConditionLibrary}
          onToggleConcentration={onToggleConcentration}
          onConditionsChange={onConditionsChange}
          onExhaustionChange={onExhaustionChange}
          onCustomConditionIdsChange={onCustomConditionIdsChange}
          onCustomConditionLibraryChange={onCustomConditionLibraryChange}
        />
      )}
      {heroicInspiration && <InspirationBadge />}
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
  heroicInspiration,
  customConditionIds,
  customConditionLibrary,
  onToggleConcentration,
  onConditionsChange,
  onExhaustionChange,
  onCustomConditionIdsChange,
  onCustomConditionLibraryChange,
}: {
  conditions: string[];
  exhaustion: number;
  /** Only affects the card's passive `concentrating-ring` border tint now — omit entirely when the caller doesn't track concentration at all. Pass `onToggleConcentration` (whether or not this is set) to also show the toggle in the popover. */
  concentrating?: boolean;
  /** Character-only — omit entirely for a creature. Shows `InspirationBadge` (always first among the state badges) when true; renders nothing at all when false/omitted, no dimmed placeholder. */
  heroicInspiration?: boolean;
  customConditionIds: string[];
  /** The campaign's shared library every `customConditionIds` entry references — see `CustomConditionTemplate`'s own doc comment. */
  customConditionLibrary: CustomConditionTemplate[];
  onToggleConcentration?: () => void;
  onConditionsChange?: (conditions: string[]) => void;
  onExhaustionChange?: (level: number) => void;
  onCustomConditionIdsChange?: (ids: string[]) => void;
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
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
        heroicInspiration={heroicInspiration}
        customConditionIds={customConditionIds}
        customConditionLibrary={customConditionLibrary}
        onToggleConcentration={onToggleConcentration}
        onConditionsChange={onConditionsChange}
        onExhaustionChange={onExhaustionChange}
        onCustomConditionIdsChange={onCustomConditionIdsChange}
        onCustomConditionLibraryChange={onCustomConditionLibraryChange}
      />
    </div>
  );
}
