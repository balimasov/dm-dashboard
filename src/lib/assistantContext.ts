import { Character, Creature, RECOVERY_LABELS } from "./types";
import { getConditionInfo, getExhaustionEffect } from "./conditionInfo";
import { getMasteryInfo } from "./masteryInfo";
import { creatureSpellSourceId, creatureTraitSourceId } from "./aiSourceIds";

/**
 * Turns a character/creature's *current* state — not just what abilities
 * exist, but what's actually still available right now (remaining spell
 * slots, remaining charges, current HP/conditions) — into a compact,
 * human-readable text block for the AI assistant's prompt (see
 * `/api/assistant/suggest`). Plain text rather than JSON: the model reads it
 * as a real character sheet excerpt, which produces a more natural answer
 * than asking it to first mentally parse a data structure.
 *
 * Every option the model could recommend (resource, feature, spell, attack,
 * creature trait) is prefixed with a `[source_id]` tag — `Feature`/
 * `KnownSpell`/`Attack`/`Resource` already carry a stable-within-this-object
 * `.id`; a `CreatureTrait`/creature spellcasting spell name has none on the
 * data model, so `aiSourceIds.ts`'s array-position formula stands in
 * (computed fresh here and again in `aiGlossary.tsx`'s lookup table, always
 * over the same array in the same request, so the two never disagree). The
 * model is instructed to copy these ids verbatim into `options[].source_id`
 * and into `[[ability:<source_id>|<name>]]` tokens in its summary, so the
 * frontend can resolve an exact hover-hint instead of matching by name.
 *
 * Conditions and exhaustion are spelled out with their exact mechanical
 * effect (via `conditionInfo.ts`, the same source the card's own hover
 * hints use) rather than left for the model to recall from training data —
 * a model asked to reason about "Frightened" or "Exhaustion 3" from name
 * alone risks blending 2014/2024 rules text or just getting the penalty
 * number wrong, where computing it here is exact and free.
 *
 * Known spells/features/traits get a short structured summary (their own
 * short rules blurb where one exists, plus casting time/range/damage/DC for
 * spells) rather than the *full* rules text — enough for the model to reason
 * about what an option actually does without ballooning the prompt with
 * complete spell descriptions.
 */
export function characterAssistantContext(character: Character): string {
  const c = character;
  const lines: string[] = [];

  lines.push(`${c.name} — Level ${c.level} ${c.race} ${c.className}${c.subclass ? ` (${c.subclass})` : ""}`);
  lines.push(
    `HP: ${c.combat.hp}/${c.combat.maxHp}${c.combat.tempHp ? ` (+${c.combat.tempHp} temp)` : ""} | AC: ${c.combat.ac} | Speed: ${c.combat.speed}ft`
  );
  if (c.senses.length > 0) {
    lines.push(`Senses: ${c.senses.map((s) => `${s.name} ${s.range} ft`).join(", ")}`);
  }
  if (c.combat.conditions.length > 0) {
    lines.push("Conditions:");
    for (const condition of c.combat.conditions) {
      const effect = getConditionInfo(condition);
      lines.push(`- ${condition}${effect ? `: ${effect}` : ""}`);
    }
  }
  if (c.combat.exhaustion > 0) {
    const effect = getExhaustionEffect(c.combat.exhaustion);
    lines.push(
      `Exhaustion: level ${c.combat.exhaustion}${effect ? ` (−${effect.d20Penalty} to every d20 roll — ability checks, attacks, saves; speed −${effect.speedPenalty} ft)` : ""}`
    );
  }
  if (c.concentrating) lines.push("Concentrating on a spell right now — casting another concentration spell would end it.");
  if (c.combat.deathSaves) {
    lines.push(`Death saves: ${c.combat.deathSaves.successes} successes, ${c.combat.deathSaves.failures} failures`);
  }

  const availableSlots = c.spellSlots.filter((s) => s.max > 0);
  if (availableSlots.length > 0) {
    lines.push("");
    lines.push("Spell slots (current/max):");
    for (const slot of availableSlots) lines.push(`- Level ${slot.level}: ${slot.current}/${slot.max}`);
  }

  if (c.resources.length > 0) {
    lines.push("");
    lines.push("Resources (current/max):");
    for (const r of c.resources) {
      lines.push(`- [${r.id}] ${r.name}: ${r.current}/${r.max} (recovers: ${RECOVERY_LABELS[r.recovery]})`);
    }
  }

  const usableFeatures = c.features.filter((f) => f.group !== "other");
  if (usableFeatures.length > 0) {
    lines.push("");
    lines.push("Features/traits usable via action economy:");
    for (const f of usableFeatures) {
      const charge = f.max != null ? ` [${f.current}/${f.max}, recovers: ${RECOVERY_LABELS[f.recovery!]}]` : "";
      lines.push(`- [${f.id}] (${f.group}) ${f.name}${charge}`);
    }
  }

  // "other" isn't "unimportant" — it's everything not tied to its own Action/
  // Bonus Action/Reaction slot. That covers two genuinely different things:
  // passives that change what an existing action does (Extra Attack turning
  // the Attack action into two attacks), AND a player's specific *chosen*
  // sub-options (which Battle Master maneuvers, which Fighting Style, which
  // Metamagic) — D&D Beyond's own export groups every one of these under the
  // same generic bucket with no finer signal to split on. The wording below
  // deliberately doesn't say "passive" outright: a chosen maneuver is a real,
  // sheet-sourced, id-tagged option with its own trigger (usually "as part
  // of a weapon attack"), not inert flavor text, and framing it as purely
  // passive risked the model treating it as unusable and inventing a
  // differently-named substitute from general D&D knowledge instead.
  const passiveFeatures = c.features.filter((f) => f.group === "other");
  if (passiveFeatures.length > 0) {
    lines.push("");
    lines.push(
      "Other traits/features (not a standalone action of their own — either a passive that modifies another action, or a specific chosen option like a maneuver/fighting style/metamagic usable as part of one; check each description for its trigger):"
    );
    for (const f of passiveFeatures) {
      lines.push(`- [${f.id}] ${f.name}${f.description ? `: ${f.description}` : ""}`);
    }
  }

  if (c.knownSpells.length > 0) {
    lines.push("");
    lines.push("Known spells (level, own charges if any — otherwise costs a spell slot of that level):");
    for (const s of c.knownSpells) {
      const levelLabel = s.level === 0 ? "cantrip" : `level ${s.level}`;
      const charge = s.max != null ? `, own charges ${s.current}/${s.max} (recovers: ${RECOVERY_LABELS[s.recovery!]})` : "";
      // The prompt's LEGALITY AND RESOURCES section requires the model to use
      // this concentration metadata rather than infer it from the spell's
      // name or its own training knowledge — `isConcentration` is a real
      // sheet fact computed once in `ddbParser/spells.ts`, not a guess.
      const tags = [s.isConcentration ? "concentration" : null, s.isReaction ? "reaction" : null, s.isAreaEffect ? "AOE" : null]
        .filter(Boolean)
        .join(", ");
      const detail = [
        s.castingTime,
        s.range,
        s.effect ? `${s.effect}${s.effectType ? ` ${s.effectType}` : ""}` : null,
        s.hitOrDc,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(`- [${s.id}] ${s.name} (${levelLabel}${tags ? `, ${tags}` : ""}${charge})${detail ? ` — ${detail}` : ""}`);
    }
  }

  if (c.attacks.length > 0) {
    lines.push("");
    lines.push("Weapon attacks:");
    for (const a of c.attacks) {
      const masteryEffect = a.mastery ? getMasteryInfo(a.mastery) : undefined;
      const mastery = a.mastery ? ` — Mastery (${a.mastery}): ${masteryEffect ?? "effect not on file"}` : "";
      // Properties (Light, Thrown, Versatile, ...) aren't just flavor here —
      // Light in particular is what lets the model recognize a two-weapon
      // fighting bonus-action attack across two separate weapon lines (see
      // the TWO-WEAPON FIGHTING prompt section), which it has no other way
      // to detect from the flattened attack list.
      const properties = a.properties.length > 0 ? ` [${a.properties.join(", ")}]` : "";
      lines.push(
        `- [${a.id}] ${a.name}: ${a.attackBonus >= 0 ? "+" : ""}${a.attackBonus} to hit, ${a.damage}${a.damageType ? ` ${a.damageType}` : ""}${properties}${mastery}`
      );
    }
  }

  return lines.join("\n");
}

/**
 * A compact per-teammate summary of the rest of the party — HP, conditions,
 * exhaustion, concentration, remaining spell slots, and any spell with its
 * own limited-use charge pool. Deliberately not the full sheet (no full
 * feature/spell/attack lists): this exists so the assistant can factor in
 * "the cleric is already at 4 HP" or "nobody else has a spell slot left"
 * when recommending what *this* character/creature should do, not so it can
 * recommend actions on a teammate's behalf. `excludeId` drops the character
 * whose own turn this request is already about (a no-op when the request is
 * about a creature instead, since no creature id will ever match a
 * character's), so nobody appears twice between the main context and here.
 */
export function partyTeammatesContext(party: Character[], excludeId?: string): string {
  const teammates = party.filter((c) => c.id !== excludeId && !c.hidden);
  if (teammates.length === 0) return "";

  const lines: string[] = ["", "Other active party members (for tactical awareness, not this turn's own resources):"];
  for (const t of teammates) {
    const parts: string[] = [
      `${t.name} (${[t.race, t.className].filter(Boolean).join(" ")}, level ${t.level})`,
      `HP ${t.combat.hp}/${t.combat.maxHp}${t.combat.tempHp ? ` (+${t.combat.tempHp} temp)` : ""}`,
    ];
    if (t.combat.conditions.length > 0) parts.push(`conditions: ${t.combat.conditions.join(", ")}`);
    if (t.combat.exhaustion > 0) parts.push(`exhaustion ${t.combat.exhaustion}`);
    if (t.concentrating) parts.push("concentrating");

    const slots = t.spellSlots
      .filter((s) => s.max > 0)
      .map((s) => `L${s.level} ${s.current}/${s.max}`)
      .join(", ");
    if (slots) parts.push(`spell slots: ${slots}`);

    const limitedSpells = t.knownSpells
      .filter((s) => s.max != null)
      .map((s) => `${s.name} ${s.current}/${s.max}`)
      .join(", ");
    if (limitedSpells) parts.push(`limited-use spells: ${limitedSpells}`);

    lines.push(`- ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

/**
 * `ownerName` — the party member this creature is summoned/commanded by
 * (resolved from `Creature.ownerCharacterId` against the party roster by
 * the caller, since this function only ever sees the one `Creature`) —
 * matters for tactical reasoning the same way a familiar's or steed's
 * proximity to its owner does: worth protecting, worth coordinating with,
 * and its own turn can free up the owner's for something else. Omitted
 * entirely for a creature with no owner (most enemies/NPCs).
 */
export function creatureAssistantContext(creature: Creature, ownerName?: string): string {
  const cr = creature;
  const lines: string[] = [];

  lines.push(`${cr.name}${cr.creatureType ? ` — ${cr.size ? `${cr.size} ` : ""}${cr.creatureType}` : ""}`);
  if (ownerName) lines.push(`Owned/commanded by: ${ownerName} (a party member — see their own status below)`);
  lines.push(
    `HP: ${cr.hp}/${cr.maxHp}${cr.tempHp ? ` (+${cr.tempHp} temp)` : ""} | AC: ${cr.ac} | Speed: ${cr.speed}ft`
  );
  if (cr.senses) lines.push(`Senses: ${cr.senses}`);
  if (cr.conditions.length > 0) {
    lines.push("Conditions:");
    for (const condition of cr.conditions) {
      const effect = getConditionInfo(condition);
      lines.push(`- ${condition}${effect ? `: ${effect}` : ""}`);
    }
  }
  if (cr.exhaustion > 0) {
    const effect = getExhaustionEffect(cr.exhaustion);
    lines.push(
      `Exhaustion: level ${cr.exhaustion}${effect ? ` (−${effect.d20Penalty} to every d20 roll — ability checks, attacks, saves; speed −${effect.speedPenalty} ft)` : ""}`
    );
  }
  if (cr.concentrating) lines.push("Concentrating on a spell right now — casting another concentration spell would end it.");
  if (cr.deathSaves) {
    lines.push(`Death saves: ${cr.deathSaves.successes} successes, ${cr.deathSaves.failures} failures`);
  }

  if (cr.traits.length > 0) {
    lines.push("");
    lines.push("Traits/actions (recharge status is free text, e.g. \"3/Day\", \"Recharge 5-6\" — absent means always usable):");
    cr.traits.forEach((t, index) => {
      const parts: string[] = [`[${creatureTraitSourceId(index)}] (${t.group ?? "trait"}) ${t.name}`];
      if (t.recharge) parts.push(`[${t.recharge}]`);
      if (t.attack) {
        const dmg = t.attack.damage.map((d) => `${d.dice}${d.damageType ? ` ${d.damageType}` : ""}`).join(" + ");
        parts.push(`— ${t.attack.attackBonus != null ? `+${t.attack.attackBonus} to hit, ` : ""}${dmg}`);
      }
      if (t.save) parts.push(`— DC ${t.save.dc} ${t.save.ability.toUpperCase()} save`);
      if (t.effects && t.effects.length > 0) {
        parts.push(`— ${t.effects.map((e) => `${e.kind} ${e.amount}${e.label ? ` (${e.label})` : ""}`).join(", ")}`);
      }
      if (t.spell) parts.push(`— casts ${t.spell}`);
      if (t.aoe) parts.push(`— ${t.aoe.size}${t.aoe.width ? `x${t.aoe.width}` : ""} ft ${t.aoe.shape}`);
      lines.push(`- ${parts.join(" ")}`);
      // A structured `attack`/`save`/`effects` combo doesn't cover everything
      // a trait can do — e.g. Multiattack's whole point ("makes three attacks:
      // one Bite and two Claws") only exists as this free-text description,
      // and omitting it meant the assistant had no way to know a creature
      // could attack more than once per turn.
      if (t.description) lines.push(`  ${t.description}`);
    });
  }

  if (cr.spellcasting) {
    lines.push("");
    lines.push(
      `Spellcasting: attack +${cr.spellcasting.attackBonus}, save DC ${cr.spellcasting.saveDc}`
    );
    cr.spellcasting.spellGroups.forEach((group, groupIndex) => {
      lines.push(`- ${group.label}:`);
      group.spells.forEach((spellName, spellIndex) => {
        lines.push(`  - [${creatureSpellSourceId(groupIndex, spellIndex)}] ${spellName}`);
      });
    });
  }

  return lines.join("\n");
}
