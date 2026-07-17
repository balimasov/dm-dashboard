import { Attack, RARITY_COLOR } from "@/lib/types";
import { attackNotes } from "@/lib/attackFormat";
import { formatModifier } from "@/lib/format";
import { getMasteryInfo } from "@/lib/masteryInfo";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { AbilityHintPanel } from "./AbilityHintPanel";
import { HintPanel } from "./HintPanel";

/**
 * Same hover-hint shape everywhere a weapon attack shows up on its own row
 * — a character's own Weapons tab, Party Toolkit's grouped list — one
 * definition so both stay in sync instead of drifting apart. Reminders uses
 * a different, richer hint (`AttackRichHintPanel` below) since its row shows
 * only the weapon's name and needs everything else in the hint instead.
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

/** Attack name (with the shared hover hint) plus its range on the line beneath — the "what am I looking at, how far can it reach" half of a row, paired with `AttackTrailing`'s numbers on the other side. Used on a character's own Weapons tab and Party Toolkit's grouped list; Reminders uses `AttackName` instead. */
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

/**
 * Reminders-only hint: everything `AttackHintPanel` shows plus range/to-hit/
 * damage spelled out (since a Reminders row carries no `AttackTrailing`
 * badge to show them inline) and, for a non-Common weapon, its base type and
 * full rules text — the "what is this magic weapon" a DM flagged it to
 * remember in the first place. Mastery gets its own labeled line here
 * (with its rules blurb) instead of being buried in the Notes list.
 */
function AttackRichHintPanel({ attack }: { attack: Attack }) {
  const notes = [attack.extraDamage, attack.category, ...attack.properties].filter(Boolean).join(", ") || undefined;
  const masteryInfo = attack.mastery ? getMasteryInfo(attack.mastery) : undefined;
  const isSpecialWeapon = Boolean(attack.rarity && attack.rarity !== "Common" && attack.rarity !== "Unknown" && attack.description);

  return (
    <HintPanel
      title={<span className={RARITY_COLOR[attack.rarity ?? "Common"]}>{attack.name}</span>}
      description={
        <span className="block space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {attack.attackType === "ranged" ? "Ranged" : "Melee"}
            {attack.range ? ` · ${attack.range}` : ""}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>
              <span className="text-slate-500">To Hit</span>{" "}
              <span className="font-semibold text-slate-100">{formatModifier(attack.attackBonus)}</span>
            </span>
            <span>
              <span className="text-slate-500">Damage</span> <span className="font-semibold text-slate-100">{attack.damage}</span>
              {attack.damageType && <span className="text-slate-400"> {attack.damageType}</span>}
            </span>
          </span>
          {!attack.proficient && (
            <span className="block text-xs font-medium text-amber-400">Not proficient — bonus is ability modifier only.</span>
          )}
          {attack.mastery && (
            <span className="block text-violet-300">
              <span className="font-semibold">{attack.mastery}</span>
              {masteryInfo ? `: ${masteryInfo}` : ""}
            </span>
          )}
          {notes && <span className="block text-slate-500">Notes: {notes}</span>}
          {isSpecialWeapon && (
            <span className="block space-y-1 border-t border-slate-800 pt-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {[attack.rarity, attack.weaponType].filter(Boolean).join(" ")}
              </span>
              <span className="block">
                <RichText text={attack.description!} />
              </span>
            </span>
          )}
        </span>
      }
    />
  );
}

/** A weapon attack's row content in Reminders — just the name (rarity-colored the same way an inventory item's name is), with `AttackRichHintPanel` carrying everything else since the row itself shows nothing more. */
export function AttackName({ attack }: { attack: Attack }) {
  return (
    <InfoTooltip panel={<AttackRichHintPanel attack={attack} />}>
      <span className={`block ${RARITY_COLOR[attack.rarity ?? "Common"]}`}>{attack.name}</span>
    </InfoTooltip>
  );
}
