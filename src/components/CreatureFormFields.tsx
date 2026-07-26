"use client";

import { useState } from "react";
import {
  AbilityScores,
  Character,
  CREATURE_CATEGORY_LABELS,
  CREATURE_CATEGORY_ORDER,
  CreatureCategory,
  CreatureTrait,
  STAT_ORDER,
} from "@/lib/types";
import { abilityModifier } from "@/lib/characterMath";
import { ensureNotesHtml } from "@/lib/journal";
import { inferStructuredTraitFields } from "@/lib/creatureStructuredInfer";
import { NumberInput } from "@/components/NumberInput";
import { AvatarPicker } from "@/components/AvatarPicker";
import { NotesEditor } from "@/components/NotesEditor";

export interface CreatureFormValue {
  templateName: string;
  name: string;
  category: CreatureCategory;
  avatarUrl: string;
  creatureType: string;
  size: string;
  alignment: string;
  ac: number;
  armorDesc: string;
  proficiencyBonus: string;
  hp: number;
  maxHp: number;
  hitDice: string;
  speed: number;
  speedDetail: string;
  initiativeBonus: string;
  stats: AbilityScores;
  savingThrows: Partial<AbilityScores>;
  senses: string;
  languages: string;
  challengeRating: string;
  experiencePoints: string;
  skills: string;
  damageVulnerabilities: string;
  damageResistances: string;
  damageImmunities: string;
  conditionImmunities: string;
  traits: CreatureTrait[];
  /** Empty string = no spellcasting at all — the rest of the `spellcasting*` fields are only meaningful once this is set. */
  spellcastingAbility: "" | keyof AbilityScores;
  spellcastingSaveDc: string;
  spellcastingAttackBonus: string;
  /** One frequency-group line per row (e.g. "At will: mage hand, minor illusion"), same convention as the YAML template's `spellcasting.spells` list — split into `CreatureSpellcasting.spells` on save. */
  spellcastingSpells: string;
  ownerCharacterId: string;
  source: string;
  notes: string;
}

export function emptyCreatureFormValue(): CreatureFormValue {
  return {
    templateName: "",
    name: "",
    category: "companion",
    avatarUrl: "",
    creatureType: "",
    size: "",
    alignment: "",
    ac: 10,
    armorDesc: "",
    proficiencyBonus: "",
    hp: 1,
    maxHp: 1,
    hitDice: "",
    speed: 30,
    speedDetail: "",
    initiativeBonus: "",
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: {},
    senses: "",
    languages: "",
    challengeRating: "",
    experiencePoints: "",
    skills: "",
    damageVulnerabilities: "",
    damageResistances: "",
    damageImmunities: "",
    conditionImmunities: "",
    traits: [],
    spellcastingAbility: "",
    spellcastingSaveDc: "",
    spellcastingAttackBonus: "",
    spellcastingSpells: "",
    ownerCharacterId: "",
    source: "",
    notes: "",
  };
}

const inputCls =
  "rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600";
const addBtnCls = "text-xs text-sky-400 hover:underline";

const TRAIT_GROUPS: Array<{ value: NonNullable<CreatureTrait["group"]>; label: string }> = [
  { value: "trait", label: "Trait" },
  { value: "action", label: "Action" },
  { value: "bonusAction", label: "Bonus Action" },
  { value: "reaction", label: "Reaction" },
  { value: "legendary", label: "Legendary Action" },
];

/** Short summary of a trait's structured fields, shown next to its row when collapsed so a DM can tell at a glance which ones already have them without expanding every row. */
function traitStructuredSummary(trait: CreatureTrait): string | undefined {
  const parts = [
    trait.attack && `⚔️ ${trait.attack.attackBonus >= 0 ? "+" : ""}${trait.attack.attackBonus} · ${trait.attack.damage}`,
    trait.save && `🛡 DC ${trait.save.dc} ${trait.save.ability.toUpperCase()}`,
    trait.recharge && `🔄 ${trait.recharge}`,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join("  ·  ") : undefined;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {children}
      {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
    </label>
  );
}

/** The full editable field set for a creature — shared between the "Add Creature" flow and editing an existing one, so the two never drift apart. */
export function CreatureFormFields({
  value,
  onChange,
  characters,
}: {
  value: CreatureFormValue;
  onChange: (updates: Partial<CreatureFormValue>) => void;
  characters: Character[];
}) {
  function setStat(key: keyof AbilityScores, statValue: number) {
    onChange({ stats: { ...value.stats, [key]: statValue } });
  }

  function setSave(key: keyof AbilityScores, saveValue: string) {
    const next = { ...value.savingThrows };
    if (saveValue.trim() === "") {
      delete next[key];
    } else {
      next[key] = Number(saveValue);
    }
    onChange({ savingThrows: next });
  }

  const [expandedTraits, setExpandedTraits] = useState<Set<number>>(new Set());
  const [autoDetectMessage, setAutoDetectMessage] = useState<string | null>(null);

  function updateTrait(index: number, updates: Partial<CreatureTrait>) {
    onChange({ traits: value.traits.map((t, i) => (i === index ? { ...t, ...updates } : t)) });
  }

  /** `null` clears the attack entirely (the "— None —" option); any other patch merges onto the existing attack, creating one with sensible defaults the first time a field on it is touched. */
  function updateTraitAttack(index: number, patch: Partial<CreatureTrait["attack"]> | null) {
    if (patch === null) {
      updateTrait(index, { attack: undefined });
      return;
    }
    const current = value.traits[index].attack;
    updateTrait(index, { attack: { attackType: "melee", attackBonus: 0, damage: "", ...current, ...patch } });
  }

  /** Same "null clears, otherwise merge with defaults" convention as `updateTraitAttack`. */
  function updateTraitSave(index: number, patch: Partial<CreatureTrait["save"]> | null) {
    if (patch === null) {
      updateTrait(index, { save: undefined });
      return;
    }
    const current = value.traits[index].save;
    updateTrait(index, { save: { ability: "dex", dc: 10, ...current, ...patch } });
  }

  function toggleTraitExpanded(index: number) {
    setExpandedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addTrait() {
    onChange({ traits: [...value.traits, { name: "", group: "trait" }] });
  }

  function removeTrait(index: number) {
    onChange({ traits: value.traits.filter((_, i) => i !== index) });
  }

  /**
   * The "convert an old creature" mini-tool: best-effort regex extraction of
   * attack/save/recharge out of each trait's existing name/description (see
   * `inferStructuredTraitFields`'s own doc comment for exactly what it
   * matches). Never overwrites a field a trait already has, and everything
   * it fills in stays fully editable below before Save — this is a
   * starting point, not a silent one-shot conversion.
   */
  function autoDetectStructuredFields() {
    let matched = 0;
    const nextTraits = value.traits.map((t) => {
      const inferred = inferStructuredTraitFields(t);
      if (Object.keys(inferred).length === 0) return t;
      matched += 1;
      return { ...t, ...inferred };
    });
    onChange({ traits: nextTraits });
    setAutoDetectMessage(
      matched > 0
        ? `Знайдено структуровані дані для ${matched} із ${value.traits.length} — перевір і збережи.`
        : "Нічого не знайдено — заповни атаку/рятівний кидок/recharge вручну нижче."
    );
  }

  return (
    <div className="space-y-6">
      {/* Portrait — leads the whole form, same as a person glancing at a
          creature's card sees the avatar before anything else. */}
      <div>
        <label className="mb-1 block text-xs text-slate-400">Portrait</label>
        <AvatarPicker
          imageUrl={value.avatarUrl || undefined}
          label={value.name.trim() || value.templateName.trim() || "?"}
          onChange={(dataUrl) => onChange({ avatarUrl: dataUrl })}
        />
      </div>

      {/* Basic Info — what the creature *is*, right after the portrait. */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Basic Info</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Creature (e.g. Unicorn)" hint="Used to look up and save the stat block for reuse.">
            <input
              className={inputCls}
              value={value.templateName}
              onChange={(e) => onChange({ templateName: e.target.value })}
            />
          </Field>
          <Field label="Nickname" hint="Optional — defaults to the creature name.">
            <input className={inputCls} value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Type">
            <input
              className={inputCls}
              placeholder="Celestial"
              value={value.creatureType}
              onChange={(e) => onChange({ creatureType: e.target.value })}
            />
          </Field>
          <Field label="Size">
            <input
              className={inputCls}
              placeholder="Large"
              value={value.size}
              onChange={(e) => onChange({ size: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Alignment">
            <input
              className={inputCls}
              placeholder="Neutral"
              value={value.alignment}
              onChange={(e) => onChange({ alignment: e.target.value })}
            />
          </Field>
          <Field label="Challenge Rating">
            <input
              className={inputCls}
              placeholder="1/4"
              value={value.challengeRating}
              onChange={(e) => onChange({ challengeRating: e.target.value })}
            />
          </Field>
          <Field label="Experience Points">
            <input
              className={inputCls}
              placeholder="18000"
              value={value.experiencePoints}
              onChange={(e) => onChange({ experiencePoints: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Category & Ownership — these change often mid-campaign (a
          companion changing hands, an NPC turning hostile), so they still
          sit near the top rather than down with the rest of the stat block. */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Category &amp; Ownership</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Category" hint="Which dashboard section it lives in.">
            <select
              className={inputCls}
              value={value.category}
              onChange={(e) => onChange({ category: e.target.value as CreatureCategory })}
            >
              {CREATURE_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CREATURE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Owner" hint="Which character summons/commands it — optional.">
            <select
              className={inputCls}
              value={value.ownerCharacterId}
              onChange={(e) => onChange({ ownerCharacterId: e.target.value })}
            >
              <option value="">— None —</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source" hint='e.g. "Find Steed", "Wild Shape"'>
            <input className={inputCls} value={value.source} onChange={(e) => onChange({ source: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* Combat */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Combat</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="AC">
            <NumberInput className={inputCls} value={value.ac} onChange={(n) => onChange({ ac: n })} />
          </Field>
          <Field label="Armor Detail" hint='e.g. "natural armor"'>
            <input
              className={inputCls}
              value={value.armorDesc}
              onChange={(e) => onChange({ armorDesc: e.target.value })}
            />
          </Field>
          <Field label="HP">
            <NumberInput className={inputCls} value={value.hp} onChange={(n) => onChange({ hp: n })} />
          </Field>
          <Field label="Max HP">
            <NumberInput className={inputCls} value={value.maxHp} onChange={(n) => onChange({ maxHp: n })} />
          </Field>
          <Field label="Hit Dice" hint='e.g. "19d12 + 133"'>
            <input className={inputCls} value={value.hitDice} onChange={(e) => onChange({ hitDice: e.target.value })} />
          </Field>
          <Field label="Speed (ft)">
            <NumberInput className={inputCls} value={value.speed} onChange={(n) => onChange({ speed: n })} />
          </Field>
          <Field label="Speed Detail" hint='e.g. "40 ft., fly 80 ft."'>
            <input
              className={inputCls}
              value={value.speedDetail}
              onChange={(e) => onChange({ speedDetail: e.target.value })}
            />
          </Field>
          <Field label="Initiative Bonus">
            <input
              className={inputCls}
              value={value.initiativeBonus}
              onChange={(e) => onChange({ initiativeBonus: e.target.value })}
            />
          </Field>
          <Field label="Proficiency Bonus" hint="Optional — added to attacks/saves where applicable.">
            <input
              className={inputCls}
              value={value.proficiencyBonus}
              onChange={(e) => onChange({ proficiencyBonus: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Stats */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Stats</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(value.stats) as Array<keyof AbilityScores>).map((key) => (
            <Field key={key} label={key.toUpperCase()}>
              <NumberInput className={inputCls} value={value.stats[key]} onChange={(n) => setStat(key, n)} />
            </Field>
          ))}
        </div>
      </section>

      {/* Saving throws */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Saving Throws</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(value.stats) as Array<keyof AbilityScores>).map((key) => (
            <Field key={key} label={key.toUpperCase()} hint="Blank = plain modifier.">
              <input
                type="number"
                className={inputCls}
                placeholder={String(abilityModifier(value.stats[key]))}
                value={value.savingThrows[key] ?? ""}
                onChange={(e) => setSave(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </section>

      {/* Senses & Languages */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Senses &amp; Languages</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Senses" hint='e.g. "Darkvision 60 ft., passive Perception 11"'>
            <input className={inputCls} value={value.senses} onChange={(e) => onChange({ senses: e.target.value })} />
          </Field>
          <Field label="Languages">
            <input
              className={inputCls}
              value={value.languages}
              onChange={(e) => onChange({ languages: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Skills */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Skills</h2>
        <Field label="Skills" hint='e.g. "Perception +13, Stealth +6"'>
          <input className={`${inputCls} w-full`} value={value.skills} onChange={(e) => onChange({ skills: e.target.value })} />
        </Field>
      </section>

      {/* Damage types */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Damage Types</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Damage Vulnerabilities">
            <input
              className={inputCls}
              value={value.damageVulnerabilities}
              onChange={(e) => onChange({ damageVulnerabilities: e.target.value })}
            />
          </Field>
          <Field label="Damage Resistances">
            <input
              className={inputCls}
              value={value.damageResistances}
              onChange={(e) => onChange({ damageResistances: e.target.value })}
            />
          </Field>
          <Field label="Damage Immunities">
            <input
              className={inputCls}
              value={value.damageImmunities}
              onChange={(e) => onChange({ damageImmunities: e.target.value })}
            />
          </Field>
          <Field label="Condition Immunities">
            <input
              className={inputCls}
              value={value.conditionImmunities}
              onChange={(e) => onChange({ conditionImmunities: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Traits & Actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Traits &amp; Actions</h2>
          <div className="flex items-center gap-3">
            {value.traits.length > 0 && (
              <button
                type="button"
                onClick={autoDetectStructuredFields}
                className={addBtnCls}
                title="Best-effort: extracts attack/save/recharge out of each trait's existing name/description — for creatures added before these fields existed. Never overwrites a field a trait already has."
              >
                🪄 Auto-detect attack/save/recharge
              </button>
            )}
            <button type="button" onClick={addTrait} className={addBtnCls}>
              + Trait
            </button>
          </div>
        </div>
        {autoDetectMessage && <p className="text-[11px] text-slate-500">{autoDetectMessage}</p>}
        <div className="space-y-2">
          {value.traits.map((t, index) => {
            const expanded = expandedTraits.has(index);
            const summary = traitStructuredSummary(t);
            return (
              <div key={index} className="rounded-md border border-slate-800 p-2">
                <div className="flex flex-wrap items-start gap-2">
                  <select
                    className={`${inputCls} shrink-0`}
                    value={t.group ?? "trait"}
                    onChange={(e) => updateTrait(index, { group: e.target.value as CreatureTrait["group"] })}
                  >
                    {TRAIT_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${inputCls} min-w-[120px] flex-1`}
                    placeholder="Name (e.g. Charge)"
                    value={t.name}
                    onChange={(e) => updateTrait(index, { name: e.target.value })}
                  />
                  <input
                    className={`${inputCls} min-w-[200px] flex-[2]`}
                    placeholder="Short description"
                    value={t.description ?? ""}
                    onChange={(e) => updateTrait(index, { description: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => toggleTraitExpanded(index)}
                    className="mt-1.5 shrink-0 text-xs text-sky-400 hover:underline"
                  >
                    {expanded ? "▾" : "▸"} Attack/Save
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrait(index)}
                    className="mt-1.5 text-sm text-red-500/80 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
                {!expanded && summary && <p className="mt-1 pl-1 text-[11px] text-slate-500">{summary}</p>}
                {expanded && (
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-800 pt-2 sm:grid-cols-4">
                    <Field label="Recharge" hint='e.g. "3/Day", "Recharge 5-6"'>
                      <input
                        className={inputCls}
                        value={t.recharge ?? ""}
                        onChange={(e) => updateTrait(index, { recharge: e.target.value || undefined })}
                      />
                    </Field>
                    <Field label="Attack Type">
                      <select
                        className={inputCls}
                        value={t.attack?.attackType ?? ""}
                        onChange={(e) =>
                          updateTraitAttack(index, e.target.value ? { attackType: e.target.value as "melee" | "ranged" } : null)
                        }
                      >
                        <option value="">— None —</option>
                        <option value="melee">Melee</option>
                        <option value="ranged">Ranged</option>
                      </select>
                    </Field>
                    <Field label="Attack Bonus">
                      <input
                        className={inputCls}
                        type="number"
                        disabled={!t.attack}
                        value={t.attack?.attackBonus ?? ""}
                        onChange={(e) => updateTraitAttack(index, { attackBonus: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Damage" hint='e.g. "2d6 +4"'>
                      <input
                        className={inputCls}
                        disabled={!t.attack}
                        value={t.attack?.damage ?? ""}
                        onChange={(e) => updateTraitAttack(index, { damage: e.target.value })}
                      />
                    </Field>
                    <Field label="Damage Type">
                      <input
                        className={inputCls}
                        disabled={!t.attack}
                        value={t.attack?.damageType ?? ""}
                        onChange={(e) => updateTraitAttack(index, { damageType: e.target.value || undefined })}
                      />
                    </Field>
                    <Field label="Range" hint='e.g. "5 ft."'>
                      <input
                        className={inputCls}
                        disabled={!t.attack}
                        value={t.attack?.range ?? ""}
                        onChange={(e) => updateTraitAttack(index, { range: e.target.value || undefined })}
                      />
                    </Field>
                    <Field label="Save Ability">
                      <select
                        className={inputCls}
                        value={t.save?.ability ?? ""}
                        onChange={(e) =>
                          updateTraitSave(index, e.target.value ? { ability: e.target.value as keyof AbilityScores } : null)
                        }
                      >
                        <option value="">— None —</option>
                        {STAT_ORDER.map((key) => (
                          <option key={key} value={key}>
                            {key.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Save DC">
                      <input
                        className={inputCls}
                        type="number"
                        disabled={!t.save}
                        value={t.save?.dc ?? ""}
                        onChange={(e) => updateTraitSave(index, { dc: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Spellcasting */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Spellcasting</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Ability" hint="Blank = no spellcasting.">
            <select
              className={inputCls}
              value={value.spellcastingAbility}
              onChange={(e) => onChange({ spellcastingAbility: e.target.value as CreatureFormValue["spellcastingAbility"] })}
            >
              <option value="">— None —</option>
              {STAT_ORDER.map((key) => (
                <option key={key} value={key}>
                  {key.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Save DC">
            <input
              className={inputCls}
              disabled={!value.spellcastingAbility}
              value={value.spellcastingSaveDc}
              onChange={(e) => onChange({ spellcastingSaveDc: e.target.value })}
            />
          </Field>
          <Field label="Attack Bonus">
            <input
              className={inputCls}
              disabled={!value.spellcastingAbility}
              value={value.spellcastingAttackBonus}
              onChange={(e) => onChange({ spellcastingAttackBonus: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Spells" hint='One frequency group per line, e.g. "At will: mage hand, minor illusion".'>
          <textarea
            className={`${inputCls} min-h-[80px] w-full`}
            disabled={!value.spellcastingAbility}
            value={value.spellcastingSpells}
            onChange={(e) => onChange({ spellcastingSpells: e.target.value })}
          />
        </Field>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Notes</h2>
        <NotesEditor value={ensureNotesHtml(value.notes)} onChange={(notes) => onChange({ notes })} placeholder="Add notes..." />
      </section>
    </div>
  );
}
