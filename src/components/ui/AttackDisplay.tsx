import { Attack, RARITY_COLOR } from "@/lib/types";
import { attackNotes } from "@/lib/attackFormat";
import { formatModifier } from "@/lib/format";
import { getMasteryInfo } from "@/lib/masteryInfo";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { HintPanel } from "./HintPanel";

/**
 * Same hover-hint shape everywhere a weapon attack shows up — a character's
 * own Weapons tab, Party Toolkit's grouped list, a Reminders entry — one
 * definition so all three stay in sync instead of drifting apart. Unlike
 * every other row in the app, the row itself shows nothing but the weapon's
 * name (see `AttackName`): range, to-hit, damage, mastery, and notes all
 * live here instead, since a DM opens the hint anyway to identify *which*
 * weapon this is and wants every number in the same place once they have.
 */
export function AttackHintPanel({ attack }: { attack: Attack }) {
  const notes = attackNotes(attack);
  const masteryInfo = attack.mastery ? getMasteryInfo(attack.mastery) : undefined;
  // Gated on rarity, not description-presence — D&D Beyond attaches *some*
  // description to every weapon, even a mundane one (a generic "how
  // proficiency/mastery works" blurb that says nothing item-specific), so a
  // plain Common Scimitar would otherwise show this block too.
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

/** A weapon attack's row content, everywhere one appears — just the name (rarity-colored the same way an inventory item's name is), with the shared hint above carrying everything else. */
export function AttackName({ attack }: { attack: Attack }) {
  return (
    <InfoTooltip panel={<AttackHintPanel attack={attack} />}>
      <span className={`block ${RARITY_COLOR[attack.rarity ?? "Common"]}`}>{attack.name}</span>
    </InfoTooltip>
  );
}
