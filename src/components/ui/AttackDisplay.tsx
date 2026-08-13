import { Attack, RARITY_COLOR } from "@/lib/types";
import { attackNotes } from "@/lib/attackFormat";
import { formatModifier } from "@/lib/format";
import { getMasteryInfo } from "@/lib/masteryInfo";
import { InfoTooltip } from "../InfoTooltip";
import { RichText } from "../RichText";
import { HINT_FACT_ROW_CLS, HINT_PANEL_DIVIDER_CLS } from "./containerStyles";
import { HintFact } from "./HintFact";
import { HintPanel } from "./HintPanel";
import { MetaBadge } from "./MetaBadge";
import { MICRO_LABEL_STRONG_CLS } from "./typography";

/**
 * Same hover-hint everywhere a weapon attack shows up — a character's own
 * Weapons tab, Party Toolkit's grouped list, and Reminders — one definition
 * so all three stay in sync instead of drifting apart. Spells out range/
 * to-hit/damage even on rows that already show `AttackTrailing`'s numbers
 * inline, so the hint reads the same complete way regardless of which row
 * it's opened from. Its own title is colored by rarity the same way the
 * row's name is — `Attack` has no `source` field the way a `Feature`/
 * `KnownSpell` does, so there's no separate identity line under the title
 * here, just the title itself.
 *
 * Everything else is one group, divided from the description (a non-Common
 * weapon's full rules text) by `HINT_PANEL_DIVIDER_CLS`: weapon type/attack
 * type/range, then the to-hit/damage numbers, then whatever changes them
 * (proficiency, mastery), then any remaining properties.
 */
export function AttackHintPanel({ attack }: { attack: Attack }) {
  const notes = attackNotes(attack);
  const masteryInfo = attack.mastery ? getMasteryInfo(attack.mastery) : undefined;
  // Gated on rarity, not description-presence — D&D Beyond attaches *some*
  // description to every weapon, even a mundane one (a generic "how
  // proficiency/mastery works" blurb that says nothing item-specific), so a
  // plain Common weapon would otherwise show this block too.
  const isSpecialWeapon = Boolean(attack.rarity && attack.rarity !== "Common" && attack.rarity !== "Unknown" && attack.description);
  // A plain "Longbow"/"Shortsword" has a `weaponType` that's just its own
  // name again — showing it in the meta line would repeat the title one
  // line down for no reason. A named magic weapon ("Ferol's Staff of Acid")
  // has a genuinely different `weaponType` ("Quarterstaff"), which is
  // exactly the case this line exists to surface. Same self-reference guard
  // `formatSource` uses for a Feature/Spell's `source` vs. its own name.
  const showWeaponType = attack.weaponType && attack.weaponType.trim().toLowerCase() !== attack.name.trim().toLowerCase();

  return (
    <HintPanel
      title={<span className={RARITY_COLOR[attack.rarity ?? "Common"]}>{attack.name}</span>}
      description={
        <span className="block space-y-1.5">
          <span className="block space-y-1.5">
            <span className={`block ${MICRO_LABEL_STRONG_CLS}`}>
              {[showWeaponType ? attack.weaponType : undefined, attack.attackType === "ranged" ? "Ranged" : "Melee", attack.range]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className={HINT_FACT_ROW_CLS}>
              <HintFact label="To Hit" value={formatModifier(attack.attackBonus)} />
              <HintFact label="Damage" value={attack.damage} trailing={attack.damageType && ` ${attack.damageType}`} />
            </span>
            {!attack.proficient && (
              <span className="block">
                <span className="font-semibold text-slate-100">Not proficient</span>: Bonus is ability modifier only.
              </span>
            )}
            {attack.mastery && (
              <span className="block">
                <span className="font-semibold text-slate-100">{attack.mastery}</span>
                {masteryInfo ? `: ${masteryInfo}` : ""}
              </span>
            )}
            {notes && (
              <span className="block">
                <span className="text-slate-500">Notes:</span> {notes}
              </span>
            )}
          </span>
          {isSpecialWeapon && (
            <span className={`block ${HINT_PANEL_DIVIDER_CLS}`}>
              <RichText text={attack.description!} />
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
        <MetaBadge
          label={attack.mastery}
          uppercase={false}
          colorClassName="border-violet-700 bg-violet-950/30 text-violet-300"
          panel={
            <p>
              <span className="font-semibold text-violet-300">{attack.mastery}</span>
              {getMasteryInfo(attack.mastery) ? `: ${getMasteryInfo(attack.mastery)}` : ""}
            </p>
          }
        />
      )}
      {/* Tighter `gap-1` than the row's own `gap-2` — the separator reads as
          a seam *between* the bonus and damage specifically, not another
          item spaced the same as the mastery badge is from everything else. */}
      <span className="flex items-center gap-1">
        <span className="font-semibold text-slate-100">{formatModifier(attack.attackBonus)}</span>
        {/* Same middle-dot `HpBar`'s death-save pair and every "kind · source"
            meta line elsewhere already use — the attack bonus and damage roll
            are both bold/bright now (see the damage-type comment below), which
            reads as one continuous run of digits without some seam between
            them. Bumped up from `text-slate-600` at the row's own small text
            size — too faint to register as a seam there; bigger and lighter
            reads as a deliberate divider instead of a stray period. */}
        <span className="text-base font-bold leading-none text-slate-500">·</span>
        {/* Damage roll gets the same weight as the attack bonus above — it's
            the other number a DM actually reads mid-combat. The damage *type*
            demotes to a small tag instead of running on in the same
            color/weight as the roll, which used to read as one undifferentiated
            gray blob ("1d4 +2 Piercing") with no visual seam between the two.
            Not uppercased — all-caps at this size drew more attention than a
            secondary label should, competing with the roll instead of quietly
            sitting under it. */}
        <span className="flex items-baseline gap-1">
          <span className="font-semibold text-slate-100">{attack.damage}</span>
          {attack.damageType && <span className="text-[10px] text-slate-500">{attack.damageType}</span>}
        </span>
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
