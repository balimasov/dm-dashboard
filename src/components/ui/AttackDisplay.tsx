import { Attack, RARITY_COLOR } from "@/lib/types";
import { attackNotes } from "@/lib/attackFormat";
import { formatModifier } from "@/lib/format";
import { getMasteryInfo } from "@/lib/masteryInfo";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { HintPanel } from "./HintPanel";

/**
 * Same hover-hint everywhere a weapon attack shows up — a character's own
 * Weapons tab, Party Toolkit's grouped list, and Reminders — one definition
 * so all three stay in sync instead of drifting apart. Spells out range/
 * to-hit/damage even on rows that already show `AttackTrailing`'s numbers
 * inline, so the hint reads the same complete way regardless of which row
 * it's opened from. For a non-Common weapon it also adds its base type and
 * full rules text — the "what is this magic weapon" a DM wants to remember
 * — and its own title is colored by rarity the same way the row's name is.
 */
export function AttackHintPanel({ attack }: { attack: Attack }) {
  const notes = attackNotes(attack);
  const masteryInfo = attack.mastery ? getMasteryInfo(attack.mastery) : undefined;
  // Gated on rarity, not description-presence — D&D Beyond attaches *some*
  // description to every weapon, even a mundane one (a generic "how
  // proficiency/mastery works" blurb that says nothing item-specific), so a
  // plain Common weapon would otherwise show this block too.
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

/**
 * The mastery badge (with its own short rules hint) plus attack bonus and
 * damage — shown directly on the row everywhere an attack appears, not
 * hidden behind a hover, since those are exactly the numbers a DM needs
 * mid-combat without an extra click.
 */
export function AttackTrailing({ attack }: { attack: Attack }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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
      {/* Damage roll gets the same weight as the attack bonus above — it's
          the other number a DM actually reads mid-combat. The damage *type*
          demotes to a small uppercase tag instead of running on in the same
          color/weight as the roll, which used to read as one undifferentiated
          gray blob ("1d4 +2 Piercing") with no visual seam between the two. */}
      <span className="flex items-baseline gap-1">
        <span className="font-semibold text-slate-100">{attack.damage}</span>
        {attack.damageType && (
          <span className="text-[10px] uppercase tracking-wide text-slate-500">{attack.damageType}</span>
        )}
      </span>
    </span>
  );
}

/** A weapon attack's name (rarity-colored, with the shared hover hint carrying range/to-hit/damage/mastery) — used everywhere an attack row shows up, since `AttackHintPanel` already spells out the range there's no need to repeat it on the row itself. */
export function AttackName({ attack }: { attack: Attack }) {
  return (
    <InfoTooltip panel={<AttackHintPanel attack={attack} />}>
      <span className={`block ${RARITY_COLOR[attack.rarity ?? "Common"]}`}>{attack.name}</span>
    </InfoTooltip>
  );
}
