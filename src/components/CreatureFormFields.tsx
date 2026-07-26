"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  AbilityScores,
  Character,
  CREATURE_CATEGORY_LABELS,
  CREATURE_CATEGORY_ORDER,
  CreatureCategory,
  CreatureDamageRoll,
  CreatureEffect,
  CreatureEffectKind,
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
  /** One row per frequency/level bucket (e.g. label "At will", spells "Mage Hand, Minor Illusion") — `spells` is comma-separated free text here, split into `CreatureSpellGroup.spells` on save. */
  spellcastingGroups: Array<{ label: string; spells: string }>;
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
    spellcastingGroups: [],
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

const EFFECT_KIND_LABELS: Record<CreatureEffectKind, string> = {
  heal: "Heal",
  tempHp: "Temp HP",
  acBonus: "AC",
  other: "",
};

type OutcomeKind = "damage" | CreatureEffectKind;

interface OutcomeRow {
  /** `"damage-<i>"` or `"effect-<i>"` — which underlying array (and index within it) this row reads from, so an edit/kind-change/remove routes back to the right one. */
  key: string;
  kind: OutcomeKind;
  primary: string;
  secondary?: string;
}

/**
 * One combined "Damage & Effects" list for the trait editor — a trait's
 * `attack.damage` rolls and its `effects` are two separate arrays under the
 * hood (an attack's damage vs. a standalone heal/temp HP/AC bonus/other
 * effect are genuinely different data shapes), but a DM picking what an
 * action *does* doesn't think in those terms — this flattens both into one
 * list with a per-row kind dropdown, closer to how a stat block actually
 * reads and without two separately-headed sub-lists to scan.
 */
function outcomeRows(t: CreatureTrait): OutcomeRow[] {
  const damageRows = (t.attack?.damage ?? []).map((d, i) => ({
    key: `damage-${i}`,
    kind: "damage" as const,
    primary: d.dice,
    secondary: d.damageType,
  }));
  const effectRows = (t.effects ?? []).map((e, i) => ({
    key: `effect-${i}`,
    kind: e.kind,
    primary: e.amount,
    secondary: e.label,
  }));
  return [...damageRows, ...effectRows];
}

/** Short summary of a trait's structured fields, shown next to its row when collapsed so a DM can tell at a glance which ones already have them without expanding every row. */
function traitStructuredSummary(trait: CreatureTrait): string | undefined {
  const damageText = trait.attack?.damage.map((d) => (d.damageType ? `${d.dice} ${d.damageType}` : d.dice)).join(" + ");
  const parts = [
    trait.attack && `⚔️ ${trait.attack.attackBonus >= 0 ? "+" : ""}${trait.attack.attackBonus} · ${damageText}`,
    trait.save && `🛡 DC ${trait.save.dc} ${trait.save.ability.toUpperCase()}`,
    trait.recharge && `🔄 ${trait.recharge}`,
    ...(trait.effects ?? []).map((e) => `✨ ${e.kind === "other" ? e.label || "Effect" : EFFECT_KIND_LABELS[e.kind]} ${e.amount}`),
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join("  ·  ") : undefined;
}

/**
 * A single-line-by-default `<textarea>` that grows to fit its content
 * instead of scrolling or truncating — the trait name/description fields
 * often hold 2-5 sentences, which a fixed-height `<input>` hid past its
 * visible edge with no way to see or edit the rest without scrolling
 * sideways inside the box. Height is recalculated (via `scrollHeight`, the
 * standard auto-grow trick) on every value change, so it still sits flush
 * on one row when short and only grows the rows below it as needed —
 * `items-start` on the row keeps neighboring fields (the group select, the
 * remove button) anchored to the first line instead of stretching with it.
 */
function AutoGrowTextarea({
  className,
  value,
  onChange,
  placeholder,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`resize-none overflow-hidden leading-snug ${className ?? ""}`}
    />
  );
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

  // Pre-expanded for any trait that already has structured data set — a DM
  // opening the form to check/tweak an existing creature shouldn't have to
  // click open every row just to see what's already configured. Lazy
  // initializer, so this only looks at the traits present on first render;
  // a trait added afterward still starts collapsed like any blank one.
  const [expandedTraits, setExpandedTraits] = useState<Set<number>>(
    () =>
      new Set(
        value.traits
          .map((t, i) => (t.attack || t.save || t.recharge || (t.effects && t.effects.length > 0) ? i : -1))
          .filter((i) => i !== -1)
      )
  );
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
    updateTrait(index, { attack: { attackType: "melee", attackBonus: 0, damage: [], ...current, ...patch } });
  }

  function addTraitAttackDamage(index: number) {
    const current = value.traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, { damage: [...current.damage, { dice: "", damageType: undefined }] });
  }

  function updateTraitAttackDamage(index: number, damageIndex: number, patch: Partial<CreatureDamageRoll>) {
    const current = value.traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, {
      damage: current.damage.map((d, i) => (i === damageIndex ? { ...d, ...patch } : d)),
    });
  }

  function removeTraitAttackDamage(index: number, damageIndex: number) {
    const current = value.traits[index].attack;
    if (!current) return;
    updateTraitAttack(index, { damage: current.damage.filter((_, i) => i !== damageIndex) });
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

  function addTraitEffect(index: number) {
    const current = value.traits[index].effects ?? [];
    updateTrait(index, { effects: [...current, { kind: "heal", amount: "" }] });
  }

  function updateTraitEffect(index: number, effectIndex: number, patch: Partial<CreatureEffect>) {
    const current = value.traits[index].effects ?? [];
    updateTrait(index, { effects: current.map((e, i) => (i === effectIndex ? { ...e, ...patch } : e)) });
  }

  function removeTraitEffect(index: number, effectIndex: number) {
    const current = value.traits[index].effects ?? [];
    updateTrait(index, { effects: current.filter((_, i) => i !== effectIndex) });
  }

  /** New row defaults to whichever kind fits the trait as it stands — a "Damage" row if it already has an attack to attach to, otherwise a blank effect (the "Damage" option itself stays disabled in that row's own dropdown until an Attack Type is set above). */
  function addOutcomeRow(index: number) {
    if (value.traits[index].attack) addTraitAttackDamage(index);
    else addTraitEffect(index);
  }

  function updateOutcomePrimary(index: number, row: OutcomeRow, text: string) {
    const rowIndex = Number(row.key.split("-")[1]);
    if (row.kind === "damage") updateTraitAttackDamage(index, rowIndex, { dice: text });
    else updateTraitEffect(index, rowIndex, { amount: text });
  }

  function updateOutcomeSecondary(index: number, row: OutcomeRow, text: string) {
    const rowIndex = Number(row.key.split("-")[1]);
    if (row.kind === "damage") updateTraitAttackDamage(index, rowIndex, { damageType: text || undefined });
    else updateTraitEffect(index, rowIndex, { label: text || undefined });
  }

  function removeOutcomeRow(index: number, row: OutcomeRow) {
    const rowIndex = Number(row.key.split("-")[1]);
    if (row.kind === "damage") removeTraitAttackDamage(index, rowIndex);
    else removeTraitEffect(index, rowIndex);
  }

  /**
   * Moving a row between "Damage" and an effect kind means moving its value
   * between the trait's two separate arrays in one `updateTrait` call — two
   * sequential calls to the existing per-array helpers would each compute
   * from the same not-yet-re-rendered `value.traits[index]` and clobber each
   * other, since neither has seen the other's change yet. Preserves the
   * row's first value (`dice`/`amount` are the same "how much" slot); the
   * second field (`damageType`/`label`) means something different in each
   * kind, so it resets rather than carrying over nonsense.
   */
  function convertOutcomeKind(index: number, row: OutcomeRow, newKind: OutcomeKind) {
    if (row.kind === newKind) return;
    const t = value.traits[index];
    if (newKind === "damage" && !t.attack) return; // the "Damage" option is disabled in the UI unless an attack exists
    const rowIndex = Number(row.key.split("-")[1]);
    const preserved = row.primary;
    const damage = row.kind === "damage" ? (t.attack?.damage ?? []).filter((_, i) => i !== rowIndex) : t.attack?.damage ?? [];
    const effects = row.kind === "damage" ? (t.effects ?? []) : (t.effects ?? []).filter((_, i) => i !== rowIndex);
    if (newKind === "damage") {
      updateTrait(index, {
        attack: t.attack ? { ...t.attack, damage: [...damage, { dice: preserved, damageType: undefined }] } : t.attack,
        effects,
      });
    } else {
      updateTrait(index, {
        attack: t.attack ? { ...t.attack, damage } : t.attack,
        effects: [...effects, { kind: newKind, amount: preserved, label: undefined }],
      });
    }
  }

  function addSpellcastingGroup() {
    onChange({ spellcastingGroups: [...value.spellcastingGroups, { label: "", spells: "" }] });
  }

  function updateSpellcastingGroup(index: number, patch: Partial<{ label: string; spells: string }>) {
    onChange({
      spellcastingGroups: value.spellcastingGroups.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    });
  }

  function removeSpellcastingGroup(index: number) {
    onChange({ spellcastingGroups: value.spellcastingGroups.filter((_, i) => i !== index) });
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
                  <AutoGrowTextarea
                    className={`${inputCls} min-w-[120px] flex-1`}
                    placeholder="Name (e.g. Charge)"
                    value={t.name}
                    onChange={(v) => updateTrait(index, { name: v })}
                  />
                  <AutoGrowTextarea
                    className={`${inputCls} min-w-[200px] flex-[2]`}
                    placeholder="Short description"
                    value={t.description ?? ""}
                    onChange={(v) => updateTrait(index, { description: v })}
                  />
                  <button
                    type="button"
                    onClick={() => toggleTraitExpanded(index)}
                    className="mt-1.5 shrink-0 text-xs text-sky-400 hover:underline"
                  >
                    {expanded ? "▾" : "▸"} Attack/Save/Effects
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
                  <div className="mt-2 space-y-3 border-t border-slate-800 pt-2">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      <Field label="Recharge">
                        <input
                          className={inputCls}
                          placeholder='e.g. "3/Day" or "Recharge 5-6"'
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
                      <Field label="Range (ft)">
                        <input
                          className={inputCls}
                          placeholder="5 or 100/400"
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

                    {/* Damage & Effects — one combined list instead of two separately-headed ones: a row's
                        kind dropdown picks whether it's a damage roll or a heal/temp HP/AC bonus/other effect,
                        so a DM composing a multi-part action (e.g. damage + a knockback effect) adds both as
                        plain rows in the same place rather than hunting between two lists. */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Damage &amp; Effects</span>
                        <button type="button" onClick={() => addOutcomeRow(index)} className={addBtnCls}>
                          + Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {outcomeRows(t).map((row) => (
                          <div key={row.key} className="flex items-center gap-2">
                            <select
                              className={`${inputCls} w-32 shrink-0`}
                              value={row.kind}
                              onChange={(e) => convertOutcomeKind(index, row, e.target.value as OutcomeKind)}
                            >
                              <option value="damage" disabled={!t.attack}>
                                Damage
                              </option>
                              <option value="heal">Heal</option>
                              <option value="tempHp">Temp HP</option>
                              <option value="acBonus">AC Bonus (Shield)</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              className={`${inputCls} ${row.kind === "damage" ? "min-w-[90px] flex-1" : "w-24 shrink-0"}`}
                              placeholder={row.kind === "damage" ? 'Dice, e.g. "2d6 +4"' : 'e.g. "2d8 +4"'}
                              value={row.primary}
                              onChange={(e) => updateOutcomePrimary(index, row, e.target.value)}
                            />
                            <input
                              className={`${inputCls} min-w-[110px] flex-1`}
                              placeholder={
                                row.kind === "damage"
                                  ? "Damage type"
                                  : row.kind === "other"
                                    ? 'Name, e.g. "Push"'
                                    : "Note (optional)"
                              }
                              value={row.secondary ?? ""}
                              onChange={(e) => updateOutcomeSecondary(index, row, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeOutcomeRow(index, row)}
                              className="text-sm text-red-500/80 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {outcomeRows(t).length === 0 && (
                          <p className="text-[11px] text-slate-600">No damage or effects yet.</p>
                        )}
                      </div>
                    </div>
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
        {/* Spell groups — one row per frequency/level bucket (e.g. "At will", "3/day each", "1st level"),
            each with its own comma-separated spell list, same table-like shape as the Traits & Actions
            list above. Both fields auto-grow to fit their content, same reason as a trait's name/description. */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">Spell Groups</span>
            <button
              type="button"
              onClick={addSpellcastingGroup}
              disabled={!value.spellcastingAbility}
              className={`${addBtnCls} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              + Group
            </button>
          </div>
          <div className="space-y-2">
            {value.spellcastingGroups.map((group, index) => (
              <div key={index} className="flex items-start gap-2 rounded-md border border-slate-800 p-2">
                <AutoGrowTextarea
                  className={`${inputCls} min-w-[100px] flex-1`}
                  placeholder='Label, e.g. "At will"'
                  value={group.label}
                  onChange={(v) => updateSpellcastingGroup(index, { label: v })}
                />
                <AutoGrowTextarea
                  className={`${inputCls} min-w-[200px] flex-[2]`}
                  placeholder="Spells, comma-separated"
                  value={group.spells}
                  onChange={(v) => updateSpellcastingGroup(index, { spells: v })}
                />
                <button
                  type="button"
                  onClick={() => removeSpellcastingGroup(index)}
                  className="mt-1.5 text-sm text-red-500/80 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
            {value.spellcastingGroups.length === 0 && (
              <p className="text-[11px] text-slate-600">No spell groups yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500">Notes</h2>
        <NotesEditor value={ensureNotesHtml(value.notes)} onChange={(notes) => onChange({ notes })} placeholder="Add notes..." />
      </section>
    </div>
  );
}
