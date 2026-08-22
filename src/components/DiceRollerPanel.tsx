"use client";

import { ReactNode, useState } from "react";
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
import { EMPTY_STATE_CLS, MICRO_ITEM_LABEL_CLS } from "./ui/typography";

/** A distinct hue per die size (drawn from the app's existing `ChipTone` palette, not new colors) so the tray reads at a glance instead of by label text alone. `violet` stays reserved for Spell Slots/Concentration (see `chipTones.ts`), so it's skipped here like everywhere else. */
const DIE_TONE: Record<DieSides, ChipTone> = { 4: "lime", 6: "gold", 8: "fuchsia", 10: "cyan", 12: "orange", 20: "rose", 100: "pink" };

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

function DieButton({
  sides,
  count,
  adv,
  onAdd,
  onCycleAdv,
}: {
  sides: DieSides;
  count: number;
  /** Only d20 gets an advantage/disadvantage toggle — `undefined` for every other size. */
  adv?: AdvantageMode;
  onAdd: () => void;
  onCycleAdv?: () => void;
}) {
  return (
    <span className="relative">
      <button
        type="button"
        onClick={onAdd}
        className={`flex h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-bold transition hover:brightness-125 ${CHIP_TONE_CLASSES[DIE_TONE[sides]]}`}
      >
        d{sides}
      </button>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
          {count}
        </span>
      )}
      {onCycleAdv && count > 0 && (
        // Same up/down-triangle + emerald/red convention `CharacterStatBlock.tsx`'s
        // own skill pills already use for advantage/disadvantage, reused here
        // as a tap target instead of a new "ADV"/"DIS" text badge.
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCycleAdv();
          }}
          aria-label="Advantage/Disadvantage"
          title="Advantage/Disadvantage"
          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] leading-none ${
            adv === "advantage" ? "text-emerald-400" : adv === "disadvantage" ? "text-red-400" : "text-slate-600 hover:text-slate-400"
          }`}
        >
          {adv === "advantage" ? "▲" : adv === "disadvantage" ? "▼" : "●"}
        </button>
      )}
    </span>
  );
}

function PoolChip({ sides, count, onRemove }: { sides: DieSides; count: number; onRemove: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${CHIP_TONE_CLASSES[DIE_TONE[sides]]}`}>
      {count}d{sides}
      <button type="button" onClick={onRemove} aria-label={`Прибрати ${count}d${sides}`} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </span>
  );
}

function ValueChip({ value, sides, discarded }: { value: number; sides: number; discarded?: boolean }) {
  const nat20 = sides === 20 && value === 20;
  const nat1 = sides === 20 && value === 1;
  return (
    <span
      className={`rounded border px-1.5 text-[11px] font-semibold tabular-nums ${
        discarded
          ? "border-dashed border-slate-700 text-slate-600 line-through"
          : nat20
            ? "border-emerald-600 text-emerald-400"
            : nat1
              ? "border-red-600 text-red-400"
              : "border-slate-700 text-slate-300"
      }`}
    >
      {value}
    </span>
  );
}

/** Every rolled die's own value(s) — a d20 rolled with advantage/disadvantage shows both, the discarded one struck through — plus the modifier, so the DM can see the whole sum instead of just its final total. */
function DiceEquation({ entry }: { entry: DiceRoll }) {
  const parts: ReactNode[] = [];
  entry.dice.forEach((d: RolledDie, i: number) => {
    if (i > 0) parts.push(<span key={`op-${i}`} className="text-[11px] text-slate-600"> + </span>);
    parts.push(
      d.rolls.length === 2 ? (
        <span key={`d-${i}`} className="inline-flex gap-0.5">
          {d.rolls.map((v, j) => (
            <ValueChip key={j} value={v} sides={d.sides} discarded={j === d.discardedIndex} />
          ))}
        </span>
      ) : (
        <ValueChip key={`d-${i}`} value={d.kept} sides={d.sides} />
      )
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
  return <span className="flex flex-wrap items-baseline gap-0.5">{parts}</span>;
}

function HistoryEntryRow({ entry }: { entry: DiceRoll }) {
  const totalClass = entry.isCrit ? "text-emerald-400" : entry.isFumble ? "text-red-400" : "text-slate-100";
  return (
    <div className={`${ROW_CARD_CLS} p-2`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">{entry.notation}</span>
        <span className="text-[11px] text-slate-500">{formatSyncTimestamp(entry.createdAt)}</span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <DiceEquation entry={entry} />
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

  function addDie(sides: DieSides) {
    setPool((p) => ({ ...p, [sides]: (p[sides] ?? 0) + 1 }));
  }
  function removeDie(sides: DieSides) {
    setPool((p) => ({ ...p, [sides]: Math.max(0, (p[sides] ?? 0) - 1) }));
  }
  function clearPool() {
    setPool({});
    setModifier(0);
    setAdv("normal");
  }
  function cycleAdvantage() {
    setAdv((a) => (a === "normal" ? "advantage" : a === "advantage" ? "disadvantage" : "normal"));
  }
  function roll() {
    const result = rollDicePool(pool, modifier, adv);
    if (!result) return;
    setHistory((prev) => {
      const next = [result, ...prev].slice(0, MAX_DICE_HISTORY);
      saveHistory(campaignId, next);
      return next;
    });
  }

  return (
    <FloatingPanel
      onClose={onClose}
      storageKey="dice-roller"
      zIndexClassName={zIndexClassName}
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden="true">🎲</span>
          Кидки кубів
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6 text-center">
            <p className={EMPTY_STATE_CLS}>Історія порожня — зберіть пул кубів нижче й натисніть Roll.</p>
          </div>
        ) : (
          history.map((entry) => <HistoryEntryRow key={entry.id} entry={entry} />)
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-800 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {DIE_SIDES.map((sides) => (
            <DieButton
              key={sides}
              sides={sides}
              count={pool[sides] ?? 0}
              adv={sides === 20 ? adv : undefined}
              onAdd={() => addDie(sides)}
              onCycleAdv={sides === 20 ? cycleAdvantage : undefined}
            />
          ))}
        </div>

        {totalDice > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {DIE_SIDES.filter((sides) => (pool[sides] ?? 0) > 0).map((sides) => (
              <PoolChip key={sides} sides={sides} count={pool[sides]!} onRemove={() => removeDie(sides)} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <span className={MICRO_ITEM_LABEL_CLS}>Модифікатор</span>
          <span className="flex shrink-0 items-center overflow-hidden rounded border border-slate-700">
            <button
              type="button"
              aria-label="Менший модифікатор"
              onClick={() => setModifier((m) => Math.max(-20, m - 1))}
              className="flex h-5 w-5 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
            >
              −
            </button>
            <span className="w-7 text-center text-xs font-semibold text-slate-200 tabular-nums">{formatModifier(modifier)}</span>
            <button
              type="button"
              aria-label="Більший модифікатор"
              onClick={() => setModifier((m) => Math.min(20, m + 1))}
              className="flex h-5 w-5 items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100"
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
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-700 text-sm font-medium text-slate-200 hover:border-sky-600 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:border-slate-700"
          >
            Очистити
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
