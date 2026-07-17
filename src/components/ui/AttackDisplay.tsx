import { Attack } from "@/lib/types";
import { attackNotes } from "@/lib/attackFormat";
import { formatModifier } from "@/lib/format";
import { getMasteryInfo } from "@/lib/masteryInfo";
import { InfoTooltip } from "../InfoTooltip";
import { AbilityHintPanel } from "./AbilityHintPanel";

/**
 * Same hover-hint shape everywhere a weapon attack shows up — a character's
 * own Weapons tab, Party Toolkit's grouped list, a Reminders entry — one
 * definition so all three stay in sync instead of drifting apart.
 */
export function AttackHintPanel({ attack }: { attack: Attack }) {
  const notes = attackNotes(attack);
  return (
    <AbilityHintPanel
      name={attack.name}
      subtitle={attack.attackType === "ranged" ? "Ranged" : "Melee"}
      note={notes ? `Notes: ${notes}` : undefined}
      status={!attack.proficient && <span className="text-amber-400">Not proficient — bonus is ability modifier only.</span>}
    />
  );
}

/**
 * The mastery badge (with its own short rules hint) plus attack bonus and
 * damage — shown directly on the row everywhere an attack appears, not
 * hidden behind a hover, since those are exactly the numbers a DM needs
 * mid-combat without an extra click.
 */
export function AttackTrailing({ attack }: { attack: Attack }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs">
      {attack.mastery && (
        <InfoTooltip
          hoverOnly
          panel={
            <p className="text-white">
              <span className="font-semibold">{attack.mastery}</span>
              {getMasteryInfo(attack.mastery) ? `: ${getMasteryInfo(attack.mastery)}` : ""}
            </p>
          }
        >
          <span className="rounded border border-violet-700 bg-violet-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
            {attack.mastery}
          </span>
        </InfoTooltip>
      )}
      <span className="font-semibold text-slate-100">{formatModifier(attack.attackBonus)}</span>
      <span className="text-slate-400">
        {attack.damage}
        {attack.damageType ? ` ${attack.damageType}` : ""}
      </span>
    </span>
  );
}

/** Attack name (with the shared hover hint) plus its range on the line beneath — the "what am I looking at, how far can it reach" half of a row, paired with `AttackTrailing`'s numbers on the other side. */
export function AttackNameAndRange({ attack }: { attack: Attack }) {
  return (
    <>
      <InfoTooltip panel={<AttackHintPanel attack={attack} />}>
        <span className="block">{attack.name}</span>
      </InfoTooltip>
      {attack.range && <span className="block text-[11px] text-slate-500">{attack.range}</span>}
    </>
  );
}
