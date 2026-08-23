"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useDesktopViewport } from "@/hooks/useDesktopViewport";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import {
  AdvantageMode,
  DIE_SIDES,
  DicePool,
  DieSides,
  DiceRoll,
  MAX_DICE_HISTORY,
  RolledDie,
  poolTotalDice,
  rollDicePool,
} from "@/lib/diceRoller";
import { playDiceRollSound } from "@/lib/diceRollSound";
import { formatModifier, formatSyncTimestamp } from "@/lib/format";
import { ChipTone, CHIP_TONE_CLASSES } from "./ui/chipTones";
import { ROW_CARD_CLS } from "./ui/containerStyles";
import { FloatingPanel } from "./ui/FloatingPanel";
import { IconButton } from "./ui/IconButton";
import { TrashOutlineIcon } from "./ui/icons";
import { EMPTY_STATE_CLS } from "./ui/typography";

/** A distinct hue per die size (drawn from the app's existing `ChipTone` palette, not new colors) so the tray reads at a glance instead of by label text alone — matched to a real physical dice set's own colors (green d4, orange d6, blue d8, black d10, yellow d12, red d20, white d100). `violet` stays reserved for Spell Slots/Concentration (see `chipTones.ts`), so it's skipped here like everywhere else. */
const DIE_TONE: Record<DieSides, ChipTone> = { 4: "emerald", 6: "orange", 8: "cyan", 10: "neutral", 12: "yellow", 20: "rose", 100: "steel" };

/** Text-only half of each `DIE_TONE` entry, for the history equation's per-group "3d4" label — `CHIP_TONE_CLASSES` bundles border+bg+text into one string, but a label needs just the text color. `neutral`/`steel` are the app's own hand-picked hex (see `chipTones.ts`), not a stock Tailwind hue, hence the arbitrary-value classes. */
const DIE_LABEL_TEXT_CLASS: Record<DieSides, string> = {
  4: "text-emerald-300",
  6: "text-orange-300",
  8: "text-cyan-300",
  10: "text-[#d6cebe]",
  12: "text-yellow-300",
  20: "text-rose-300",
  100: "text-[#d6e3ec]",
};

/** Solid per-die fill for the pool-count badge — a middle ground between an earlier fully-hollow outline (border only) and the flat universal amber this replaces. Dark text reads fine against every one of these mid-tone hues. */
const DIE_BADGE_CLASS: Record<DieSides, string> = {
  4: "bg-emerald-600 text-slate-950",
  6: "bg-orange-600 text-slate-950",
  8: "bg-cyan-600 text-slate-950",
  10: "bg-[#736550] text-slate-950",
  12: "bg-yellow-600 text-slate-950",
  20: "bg-rose-600 text-slate-950",
  100: "bg-[#93aabb] text-slate-950",
};

const ADV_OPTIONS: { value: AdvantageMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Advantage" },
  { value: "disadvantage", label: "Disadvantage" },
];

const HISTORY_STORAGE_PREFIX = "dice-roller-history:";

/** Same try/catch-per-call, silently-fall-back-to-default convention `FloatingPanel.tsx`'s own `loadSavedRect`/`saveRect` already use for its saved geometry — see that file's doc comment. */
function loadHistory(campaignId: string): DiceRoll[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_PREFIX + campaignId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(campaignId: string, history: DiceRoll[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_PREFIX + campaignId, JSON.stringify(history));
  } catch {
    // Storage quota/private-mode — losing the roll log next time isn't worth surfacing an error for.
  }
}

/**
 * `adv`/`advWidget` are only ever passed for the d20 button — every other
 * size stays a plain add-to-pool button. `advWidget` is pre-built by the
 * caller (either the desktop twin-arrow spinner or the mobile trigger+menu
 * below) so this component stays agnostic to which mechanism is active.
 * Sized responsively (mobile default, `sm:` restores the compact desktop
 * size already shipped) since a 34px die button is too small a touch
 * target on a phone but fits fine on a mouse-driven, resizable desktop
 * window.
 */
function DieButton({
  sides,
  count,
  onAdd,
  adv,
  advWidget,
}: {
  sides: DieSides;
  count: number;
  onAdd: () => void;
  adv?: AdvantageMode;
  advWidget?: ReactNode;
}) {
  return (
    <span className="flex items-center">
      <span className="relative">
        <button
          type="button"
          onClick={onAdd}
          className={`flex h-11 items-center justify-center rounded-lg border px-3 text-sm font-bold transition hover:brightness-125 sm:h-9 sm:px-1.5 sm:text-xs ${CHIP_TONE_CLASSES[DIE_TONE[sides]]} ${
            adv === "advantage" ? "ring-2 ring-inset ring-emerald-400" : adv === "disadvantage" ? "ring-2 ring-inset ring-red-400" : ""
          }`}
        >
          d{sides}
        </button>
        {count > 0 && (
          <span
            className={`absolute -right-2 -top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-bold sm:-right-1.5 sm:-top-1.5 sm:h-4 sm:min-w-[1rem] sm:text-[10px] ${DIE_BADGE_CLASS[sides]}`}
          >
            {count}
          </span>
        )}
      </span>
      {advWidget}
    </span>
  );
}

/** Desktop's existing twin-arrow spinner, glued to the d20 button — unchanged from what's already shipped. Only rendered on desktop; mobile gets `AdvTriggerMenu` instead (see that component's own doc comment for why). */
function AdvSpinnerDesktop({ adv, onToggle }: { adv: AdvantageMode; onToggle: (direction: "advantage" | "disadvantage") => void }) {
  return (
    <span className="ml-0.5 flex h-9 w-4 flex-col overflow-hidden rounded border border-slate-700">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle("advantage");
        }}
        aria-label="Advantage"
        title="Advantage"
        className={`flex flex-1 items-center justify-center text-[8px] leading-none transition ${
          adv === "advantage" ? "bg-emerald-500/25 text-emerald-400" : "text-slate-500 hover:bg-slate-700 hover:text-slate-200"
        }`}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle("disadvantage");
        }}
        aria-label="Disadvantage"
        title="Disadvantage"
        className={`flex flex-1 items-center justify-center border-t border-slate-700 text-[8px] leading-none transition ${
          adv === "disadvantage" ? "bg-red-500/25 text-red-400" : "text-slate-500 hover:bg-slate-700 hover:text-slate-200"
        }`}
      >
        ▼
      </button>
    </span>
  );
}

/**
 * Mobile's Advantage/Disadvantage control — a single 44px trigger next to
 * d20 that opens a menu of 3 full-size rows above it. Replaces the desktop
 * spinner on mobile because two stacked arrows, even inside an already
 * enlarged 44px die button, still only get ~22px of height each — too
 * small a target to hit reliably with a thumb. Self-contained (own open
 * state, outside-click/Escape close) — same click-outside pattern
 * `MoreMenu` already uses, just not portaled, since this popover isn't
 * inside anything that clips overflow.
 */
function AdvTriggerMenu({ adv, onSelect }: { adv: AdvantageMode; onSelect: (mode: AdvantageMode) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEscapeToClose(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const icon = adv === "advantage" ? "▲" : adv === "disadvantage" ? "▼" : "±";

  return (
    <span ref={containerRef} className="relative ml-1 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Advantage/Disadvantage options"
        title="Advantage/Disadvantage"
        className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg transition ${
          adv === "advantage"
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
            : adv === "disadvantage"
              ? "border-red-500 bg-red-500/15 text-red-400"
              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
        }`}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-20 mb-2 flex w-48 -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg shadow-black/40">
          {ADV_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`flex h-11 items-center justify-between rounded-md px-3 text-sm font-semibold ${
                adv !== opt.value
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  : opt.value === "advantage"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : opt.value === "disadvantage"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/10 text-amber-300"
              }`}
            >
              {opt.label}
              <span className={`h-1.5 w-1.5 rounded-full bg-current ${adv === opt.value ? "opacity-100" : "opacity-0"}`} />
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/** Desktop's existing compact horizontal pill — unchanged. */
function ModifierStepperDesktop({ modifier, onChange }: { modifier: number; onChange: (updater: (m: number) => number) => void }) {
  return (
    <span className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-slate-700">
      <button
        type="button"
        aria-label="Decrease modifier"
        onClick={() => onChange((m) => Math.max(-20, m - 1))}
        className="flex h-full w-6 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
      >
        −
      </button>
      <span className="w-7 text-center text-xs font-semibold text-slate-200 tabular-nums">{formatModifier(modifier)}</span>
      <button
        type="button"
        aria-label="Increase modifier"
        onClick={() => onChange((m) => Math.min(20, m + 1))}
        className="flex h-full w-6 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
      >
        +
      </button>
    </span>
  );
}

/**
 * Mobile's modifier — a genuine second column next to the die tray (not
 * "one more tile" inside it, which read as randomly placed once the tray
 * wrapped to 2+ rows on a narrow screen). `self-stretch` matches its height
 * to however tall the die tray ends up (1 row or several), so it reads as
 * a real right-hand column rather than floating at a fixed size next to a
 * taller, unrelated block — hence the vertical +/value/− layout instead of
 * the desktop's horizontal one.
 */
function ModifierStepperMobile({ modifier, onChange }: { modifier: number; onChange: (updater: (m: number) => number) => void }) {
  return (
    <span className="flex w-12 shrink-0 flex-col self-stretch overflow-hidden rounded-lg border border-slate-700">
      <button
        type="button"
        aria-label="Increase modifier"
        onClick={() => onChange((m) => Math.min(20, m + 1))}
        className="flex flex-1 items-center justify-center text-base text-slate-400 hover:bg-slate-700 hover:text-slate-100"
      >
        +
      </button>
      <span className="shrink-0 border-y border-slate-800 py-1.5 text-center text-sm font-semibold text-slate-200 tabular-nums">
        {formatModifier(modifier)}
      </span>
      <button
        type="button"
        aria-label="Decrease modifier"
        onClick={() => onChange((m) => Math.max(-20, m - 1))}
        className="flex flex-1 items-center justify-center text-base text-slate-400 hover:bg-slate-700 hover:text-slate-100"
      >
        −
      </button>
    </span>
  );
}

function PoolChip({ sides, count, onRemove }: { sides: DieSides; count: number; onRemove: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${CHIP_TONE_CLASSES[DIE_TONE[sides]]}`}>
      {count}d{sides}
      <button type="button" onClick={onRemove} aria-label={`Remove ${count}d${sides}`} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </span>
  );
}

/**
 * `discarded` dims a value that wasn't kept; `crossed` additionally strikes
 * it through, used only for an Advantage discard (the lower of the pair —
 * "didn't need it"). A Disadvantage discard (the *higher* value, thrown
 * away because you were stuck with the lower one) stays dashed/dimmed but
 * un-struck — a strikethrough through a big number read as "this reduced
 * your result," which is backwards for what actually happened. Natural 1s
 * and 20s (only when actually kept, not when discarded — a discarded nat20
 * doesn't crit) get a distinct border/fill plus a small ✨/💀 so they're
 * readable at a glance even inside a multi-die roll whose total isn't
 * itself a crit/fumble — same text size as every other chip, just a
 * different color/border treatment, not a bigger font.
 */
function ValueChip({ value, sides, discarded, crossed }: { value: number; sides: DieSides; discarded?: boolean; crossed?: boolean }) {
  const nat20 = !discarded && sides === 20 && value === 20;
  const nat1 = !discarded && sides === 20 && value === 1;
  const toneClass = discarded
    ? `border-dashed border-slate-700 text-slate-600 ${crossed ? "line-through" : ""}`
    : nat20
      ? "border-2 border-emerald-500 bg-emerald-950/50 text-emerald-300"
      : nat1
        ? "border-2 border-red-500 bg-red-950/50 text-red-300"
        : CHIP_TONE_CLASSES[DIE_TONE[sides]];
  return (
    <span className={`rounded border px-1.5 text-xs font-semibold tabular-nums ${toneClass}`}>
      {value}
      {nat20 ? " ✨" : nat1 ? " 💀" : ""}
    </span>
  );
}

function groupDiceBySides(dice: RolledDie[]): { sides: DieSides; entries: RolledDie[] }[] {
  const bySides = new Map<DieSides, RolledDie[]>();
  dice.forEach((d) => {
    const group = bySides.get(d.sides) ?? [];
    group.push(d);
    bySides.set(d.sides, group);
  });
  return DIE_SIDES.filter((sides) => bySides.has(sides)).map((sides) => ({ sides, entries: bySides.get(sides)! }));
}

/** Groups each rolled die by size — "3d4" immediately followed by its own 3 values, colored to match that die's tray color — so which values belong to which die type is a glance, not a count-along. A d20 rolled with advantage/disadvantage shows both values; the discarded one is dimmed, and struck through only for Advantage (see `ValueChip`'s own doc comment). The modifier (if any) trails as its own dashed chip. */
function DiceEquation({ entry }: { entry: DiceRoll }) {
  const groups = groupDiceBySides(entry.dice);
  const parts: ReactNode[] = [];
  groups.forEach((group, i) => {
    if (i > 0) parts.push(<span key={`op-${i}`} className="text-xs text-slate-600"> + </span>);
    parts.push(
      <span key={`g-${group.sides}`} className="inline-flex items-baseline gap-1">
        <span className={`text-xs font-bold ${DIE_LABEL_TEXT_CLASS[group.sides]}`}>
          {group.entries.length}d{group.sides}
        </span>
        {/* `flex flex-wrap`, not `inline-flex` — a single roll with many
            same-size dice (e.g. 15d6) used to overflow the history card's
            width instead of wrapping onto more lines. */}
        <span className="flex flex-wrap gap-0.5">
          {group.entries.map((d, j) =>
            d.rolls.length === 2 ? (
              <span key={j} className="inline-flex items-center gap-0.5">
                {d.rolls.map((v, k) => {
                  const isDiscardedSlot = k === d.discardedIndex;
                  const partner = d.rolls[1 - k];
                  return <ValueChip key={k} value={v} sides={d.sides} discarded={isDiscardedSlot} crossed={isDiscardedSlot && v < partner} />;
                })}
              </span>
            ) : (
              <ValueChip key={j} value={d.kept} sides={d.sides} />
            )
          )}
        </span>
      </span>
    );
  });
  if (entry.modifier !== 0) {
    parts.push(
      <span key="mod-op" className="text-xs text-slate-600">
        {" "}
        {entry.modifier > 0 ? "+" : "−"}{" "}
      </span>
    );
    parts.push(
      <span key="mod-val" className="rounded border border-dashed border-slate-700 px-1.5 text-xs font-semibold text-slate-300">
        {Math.abs(entry.modifier)}
      </span>
    );
  }
  return <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">{parts}</span>;
}

function HistoryEntryRow({ entry }: { entry: DiceRoll }) {
  const totalClass = entry.isCrit ? "text-emerald-400" : entry.isFumble ? "text-red-400" : "text-slate-100";
  return (
    <div className={`${ROW_CARD_CLS} p-2`}>
      <div className="flex items-start justify-between gap-2">
        <DiceEquation entry={entry} />
        <span className="shrink-0 pt-0.5 text-[10px] text-slate-500">{formatSyncTimestamp(entry.createdAt)}</span>
      </div>
      <div className="mt-0.5 flex justify-end">
        <span className={`text-lg font-extrabold tabular-nums ${totalClass}`}>
          {entry.total}
          {entry.isCrit ? " ✨" : entry.isFumble ? " 💀" : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * Floating dice-roll utility opened from `DiceRollerFab` — same non-modal
 * `FloatingPanel` shell `AiAssistantModal` already uses (draggable/resizable,
 * nothing behind it blocked), so it can sit open next to the roster while a
 * DM (or a player, on their own view) keeps rolling mid-session. History
 * persists to `localStorage` per campaign (see `loadHistory`/`saveHistory`),
 * capped at `MAX_DICE_HISTORY` — no server round-trip needed for a session
 * scratchpad like this, unlike the AI assistant's own per-character
 * conversation history.
 */
export function DiceRollerPanel({
  campaignId,
  onClose,
  zIndexClassName,
}: {
  campaignId: string;
  onClose: () => void;
  zIndexClassName?: string;
}) {
  useEscapeToClose(onClose);
  const isDesktop = useDesktopViewport();
  const [pool, setPool] = useState<DicePool>({});
  const [modifier, setModifier] = useState(0);
  const [adv, setAdv] = useState<AdvantageMode>("normal");
  const [history, setHistory] = useState<DiceRoll[]>(() => loadHistory(campaignId));

  const totalDice = poolTotalDice(pool);
  const canClear = totalDice > 0 || modifier !== 0 || adv !== "normal";

  const historyEndRef = useRef<HTMLDivElement>(null);
  // History renders oldest-first, newest-last (chat-log order, matching
  // `AiAssistantModal`'s own feed) — reverse-chronological read top-to-bottom
  // as "most recent first" but felt backwards while actively rolling, since
  // each new entry appeared above what you'd just rolled instead of below it.
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: "end" });
  }, [history.length]);

  function addDie(sides: DieSides) {
    setPool((p) => ({ ...p, [sides]: (p[sides] ?? 0) + 1 }));
  }
  function removeDie(sides: DieSides) {
    setPool((p) => ({ ...p, [sides]: Math.max(0, (p[sides] ?? 0) - 1) }));
  }
  function setAdvDirection(direction: "advantage" | "disadvantage") {
    setAdv((current) => (current === direction ? "normal" : direction));
  }
  function clearPool() {
    setPool({});
    setModifier(0);
    setAdv("normal");
  }
  function roll() {
    const result = rollDicePool(pool, modifier, adv);
    if (!result) return;
    playDiceRollSound();
    setHistory((prev) => {
      const next = [...prev, result].slice(-MAX_DICE_HISTORY);
      saveHistory(campaignId, next);
      return next;
    });
    setPool({});
    setModifier(0);
    setAdv("normal");
  }

  function clearHistory() {
    if (history.length === 0) return;
    if (!window.confirm("Clear roll history? This can't be undone.")) return;
    setHistory([]);
    saveHistory(campaignId, []);
  }

  return (
    <FloatingPanel
      onClose={onClose}
      storageKey="dice-roller"
      zIndexClassName={zIndexClassName}
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden="true">🎲</span>
          Dice Roller
        </span>
      }
      headerActions={
        <IconButton tone="danger" onClick={clearHistory} disabled={history.length === 0} aria-label="Clear history" title="Clear history">
          <TrashOutlineIcon className="h-4 w-4" />
        </IconButton>
      }
    >
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6 text-center">
            <p className={EMPTY_STATE_CLS}>No rolls yet — build a dice pool below and hit Roll.</p>
          </div>
        ) : (
          <>
            {history.map((entry) => <HistoryEntryRow key={entry.id} entry={entry} />)}
            <div ref={historyEndRef} />
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-800 pt-3">
        {totalDice > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {DIE_SIDES.filter((sides) => (pool[sides] ?? 0) > 0).map((sides) => (
              <PoolChip key={sides} sides={sides} count={pool[sides]!} onRemove={() => removeDie(sides)} />
            ))}
          </div>
        )}

        {/* Two real columns: the die tray wraps on its own on the left,
            the modifier is a separate column on the right — `items-stretch`
            matches the modifier's height to however tall the tray ends up.
            On desktop the tray never wraps (still fits one line at
            `FloatingPanel`'s 440px MIN_WIDTH) and the modifier has its own
            fixed height, so stretch is a no-op there — this is purely a
            mobile-wrap concern. */}
        <div className="flex items-stretch gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {DIE_SIDES.map((sides) => (
              <DieButton
                key={sides}
                sides={sides}
                count={pool[sides] ?? 0}
                onAdd={() => addDie(sides)}
                adv={sides === 20 ? adv : undefined}
                advWidget={
                  sides === 20 ? (
                    // Space for this widget is reserved even before any d20 is
                    // queued (just invisible, not unmounted) so tapping d20 for
                    // the first time doesn't grow the row and shove d20 itself
                    // onto the next line.
                    <span className={(pool[20] ?? 0) > 0 ? "" : "invisible"}>
                      {isDesktop ? (
                        <AdvSpinnerDesktop adv={adv} onToggle={setAdvDirection} />
                      ) : (
                        <AdvTriggerMenu adv={adv} onSelect={setAdv} />
                      )}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
          {isDesktop ? (
            <ModifierStepperDesktop modifier={modifier} onChange={setModifier} />
          ) : (
            <ModifierStepperMobile modifier={modifier} onChange={setModifier} />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearPool}
            disabled={!canClear}
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-sky-600 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:border-slate-700 sm:h-9"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={roll}
            disabled={totalDice === 0}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-sky-600 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 sm:h-9"
          >
            <span aria-hidden="true">🎲</span> Roll
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
