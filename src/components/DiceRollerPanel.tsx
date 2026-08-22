"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
 * `adv`/`onToggleAdv` are only ever passed for the d20 button — every other
 * size stays a plain add-to-pool button. Clicking the active direction again
 * toggles back to "normal" (see `setAdvDirection` below); the currently
 * selected direction also rings the die button itself so it reads at a
 * glance without needing the spinner to be visible/hovered. Replaces an
 * earlier design (a single tiny triangle badge that cycled through all 3
 * states on tap, then a separate segmented row below the tray) — both were
 * either too subtle to notice or shifted the composer's layout whenever a
 * d20 was added/removed from the pool; this spinner lives glued to the d20
 * button itself, inside the tray's own wrapping flow, so nothing below it
 * ever moves.
 */
function DieButton({
  sides,
  count,
  onAdd,
  adv,
  onToggleAdv,
}: {
  sides: DieSides;
  count: number;
  onAdd: () => void;
  adv?: AdvantageMode;
  onToggleAdv?: (direction: "advantage" | "disadvantage") => void;
}) {
  return (
    <span className="flex items-center">
      <span className="relative">
        <button
          type="button"
          onClick={onAdd}
          className={`flex h-9 items-center justify-center rounded-lg border px-2 text-[11px] font-bold transition hover:brightness-125 ${CHIP_TONE_CLASSES[DIE_TONE[sides]]} ${
            adv === "advantage" ? "ring-2 ring-inset ring-emerald-400" : adv === "disadvantage" ? "ring-2 ring-inset ring-red-400" : ""
          }`}
        >
          d{sides}
        </button>
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
            {count}
          </span>
        )}
      </span>
      {onToggleAdv && count > 0 && (
        <span className="ml-0.5 flex h-9 w-4 flex-col overflow-hidden rounded border border-slate-700">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAdv("advantage");
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
              onToggleAdv("disadvantage");
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
      )}
    </span>
  );
}

function PoolChip({ sides, count, onRemove }: { sides: DieSides; count: number; onRemove: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${CHIP_TONE_CLASSES[DIE_TONE[sides]]}`}>
      {count}d{sides}
      <button type="button" onClick={onRemove} aria-label={`Remove ${count}d${sides}`} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </span>
  );
}

function ValueChip({ value, sides, discarded }: { value: number; sides: DieSides; discarded?: boolean }) {
  const nat20 = sides === 20 && value === 20;
  const nat1 = sides === 20 && value === 1;
  const toneClass = discarded
    ? "border-dashed border-slate-700 text-slate-600 line-through"
    : nat20
      ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
      : nat1
        ? "border-red-600 bg-red-950/40 text-red-400"
        : CHIP_TONE_CLASSES[DIE_TONE[sides]];
  return <span className={`rounded border px-1.5 text-[11px] font-semibold tabular-nums ${toneClass}`}>{value}</span>;
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

/** Groups each rolled die by size — "3d4" immediately followed by its own 3 values, colored to match that die's tray color — so which values belong to which die type is a glance, not a count-along. A d20 rolled with advantage/disadvantage shows both values, the discarded one struck through; the modifier (if any) trails as its own dashed chip. */
function DiceEquation({ entry }: { entry: DiceRoll }) {
  const groups = groupDiceBySides(entry.dice);
  const parts: ReactNode[] = [];
  groups.forEach((group, i) => {
    if (i > 0) parts.push(<span key={`op-${i}`} className="text-[11px] text-slate-600"> + </span>);
    parts.push(
      <span key={`g-${group.sides}`} className="inline-flex items-baseline gap-1">
        <span className={`text-[11px] font-bold ${DIE_LABEL_TEXT_CLASS[group.sides]}`}>
          {group.entries.length}d{group.sides}
        </span>
        {/* `flex flex-wrap`, not `inline-flex` — a single roll with many
            same-size dice (e.g. 15d6) used to overflow the history card's
            width instead of wrapping onto more lines. */}
        <span className="flex flex-wrap gap-0.5">
          {group.entries.map((d, j) =>
            d.rolls.length === 2 ? (
              <span key={j} className="inline-flex gap-0.5">
                {d.rolls.map((v, k) => (
                  <ValueChip key={k} value={v} sides={d.sides} discarded={k === d.discardedIndex} />
                ))}
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
      <span key="mod-op" className="text-[11px] text-slate-600">
        {" "}
        {entry.modifier > 0 ? "+" : "−"}{" "}
      </span>
    );
    parts.push(
      <span key="mod-val" className="rounded border border-dashed border-slate-700 px-1.5 text-[11px] font-semibold text-slate-300">
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

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {DIE_SIDES.map((sides) => (
              <DieButton
                key={sides}
                sides={sides}
                count={pool[sides] ?? 0}
                onAdd={() => addDie(sides)}
                adv={sides === 20 ? adv : undefined}
                onToggleAdv={sides === 20 ? setAdvDirection : undefined}
              />
            ))}
          </div>
          {/* Tightened vs. the die tray's own natural sizing (narrower stepper
              buttons/value) so the whole tray-row still fits on one line even
              at `FloatingPanel`'s absolute MIN_WIDTH (440px), not just at its
              default 480px. */}
          <span className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-slate-700">
            <button
              type="button"
              aria-label="Decrease modifier"
              onClick={() => setModifier((m) => Math.max(-20, m - 1))}
              className="flex h-full w-6 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
            >
              −
            </button>
            <span className="w-7 text-center text-xs font-semibold text-slate-200 tabular-nums">{formatModifier(modifier)}</span>
            <button
              type="button"
              aria-label="Increase modifier"
              onClick={() => setModifier((m) => Math.min(20, m + 1))}
              className="flex h-full w-6 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
            >
              +
            </button>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearPool}
            disabled={!canClear}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-sky-600 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:border-slate-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={roll}
            disabled={totalDice === 0}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-sky-600 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            <span aria-hidden="true">🎲</span> Roll
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
