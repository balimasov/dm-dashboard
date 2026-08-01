import { Character, Creature, RECOVERY_LABELS } from "./types";

/**
 * Turns a character/creature's *current* state — not just what abilities
 * exist, but what's actually still available right now (remaining spell
 * slots, remaining charges, current HP/conditions) — into a compact,
 * human-readable text block for the AI assistant's prompt (see
 * `/api/assistant/suggest`). Plain text rather than JSON: the model reads it
 * as a real character sheet excerpt, which produces a more natural answer
 * than asking it to first mentally parse a data structure.
 *
 * Deliberately omits full spell/feature *descriptions* (only name + level +
 * recovery/charge state) — the assistant is meant to reason about "what's
 * usable right now" from the action economy and resource pool, not restate
 * rules text, and keeping the prompt short keeps the request fast and cheap.
 */
export function characterAssistantContext(character: Character): string {
  const c = character;
  const lines: string[] = [];

  lines.push(`${c.name} — Level ${c.level} ${c.race} ${c.className}${c.subclass ? ` (${c.subclass})` : ""}`);
  lines.push(
    `HP: ${c.combat.hp}/${c.combat.maxHp}${c.combat.tempHp ? ` (+${c.combat.tempHp} temp)` : ""} | AC: ${c.combat.ac} | Speed: ${c.combat.speed}ft`
  );
  if (c.combat.conditions.length > 0) lines.push(`Conditions: ${c.combat.conditions.join(", ")}`);
  if (c.combat.exhaustion > 0) lines.push(`Exhaustion: level ${c.combat.exhaustion}`);
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
      lines.push(`- ${r.name}: ${r.current}/${r.max} (recovers: ${RECOVERY_LABELS[r.recovery]})`);
    }
  }

  const usableFeatures = c.features.filter((f) => f.group !== "other");
  if (usableFeatures.length > 0) {
    lines.push("");
    lines.push("Features/traits usable via action economy:");
    for (const f of usableFeatures) {
      const charge = f.max != null ? ` [${f.current}/${f.max}, recovers: ${RECOVERY_LABELS[f.recovery!]}]` : "";
      lines.push(`- (${f.group}) ${f.name}${charge}`);
    }
  }

  if (c.knownSpells.length > 0) {
    lines.push("");
    lines.push("Known spells (level, own charges if any — otherwise costs a spell slot of that level):");
    for (const s of c.knownSpells) {
      const levelLabel = s.level === 0 ? "cantrip" : `level ${s.level}`;
      const charge = s.max != null ? `, own charges ${s.current}/${s.max} (recovers: ${RECOVERY_LABELS[s.recovery!]})` : "";
      const tags = [s.isReaction ? "reaction" : null, s.isAreaEffect ? "AOE" : null].filter(Boolean).join(", ");
      lines.push(`- ${s.name} (${levelLabel}${tags ? `, ${tags}` : ""}${charge})`);
    }
  }

  if (c.attacks.length > 0) {
    lines.push("");
    lines.push("Weapon attacks:");
    for (const a of c.attacks) {
      lines.push(
        `- ${a.name}: ${a.attackBonus >= 0 ? "+" : ""}${a.attackBonus} to hit, ${a.damage}${a.damageType ? ` ${a.damageType}` : ""}`
      );
    }
  }

  return lines.join("\n");
}

export function creatureAssistantContext(creature: Creature): string {
  const cr = creature;
  const lines: string[] = [];

  lines.push(`${cr.name}${cr.creatureType ? ` — ${cr.size ? `${cr.size} ` : ""}${cr.creatureType}` : ""}`);
  lines.push(
    `HP: ${cr.hp}/${cr.maxHp}${cr.tempHp ? ` (+${cr.tempHp} temp)` : ""} | AC: ${cr.ac} | Speed: ${cr.speed}ft`
  );
  if (cr.conditions.length > 0) lines.push(`Conditions: ${cr.conditions.join(", ")}`);
  if (cr.exhaustion > 0) lines.push(`Exhaustion: level ${cr.exhaustion}`);
  if (cr.deathSaves) {
    lines.push(`Death saves: ${cr.deathSaves.successes} successes, ${cr.deathSaves.failures} failures`);
  }

  if (cr.traits.length > 0) {
    lines.push("");
    lines.push("Traits/actions (recharge status is free text, e.g. \"3/Day\", \"Recharge 5-6\" — absent means always usable):");
    for (const t of cr.traits) {
      const parts: string[] = [`(${t.group ?? "trait"}) ${t.name}`];
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
      lines.push(`- ${parts.join(" ")}`);
    }
  }

  if (cr.spellcasting) {
    lines.push("");
    lines.push(
      `Spellcasting: attack +${cr.spellcasting.attackBonus}, save DC ${cr.spellcasting.saveDc}`
    );
    for (const group of cr.spellcasting.spellGroups) {
      lines.push(`- ${group.label}: ${group.spells.join(", ")}`);
    }
  }

  return lines.join("\n");
}
