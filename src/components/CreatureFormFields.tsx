"use client";

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
import { NumberInput } from "@/components/NumberInput";
import { AvatarPicker } from "@/components/AvatarPicker";
import { NotesEditor } from "@/components/NotesEditor";
import { TraitMechanicsEditor } from "@/components/creatureForm/TraitMechanicsEditor";
import { addBtnCls, AutoGrowTextarea, Field, inputCls } from "@/components/creatureForm/shared";
import { IconButton } from "@/components/ui/IconButton";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { FORM_SECTION_HEADING_CLS, HINT_TEXT_CLS } from "@/components/ui/typography";

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
        <h2 className={FORM_SECTION_HEADING_CLS}>Basic Info</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Creature (e.g. Unicorn)" hint="Used to look up and save the stat block for reuse.">
            <input
              className={`${inputCls} w-full`}
              value={value.templateName}
              onChange={(e) => onChange({ templateName: e.target.value })}
            />
          </Field>
          <Field label="Nickname" hint="Optional — defaults to the creature name.">
            <input className={`${inputCls} w-full`} value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Type">
            <input
              className={`${inputCls} w-full`}
              placeholder="Celestial"
              value={value.creatureType}
              onChange={(e) => onChange({ creatureType: e.target.value })}
            />
          </Field>
          <Field label="Size">
            <input
              className={`${inputCls} w-full`}
              placeholder="Large"
              value={value.size}
              onChange={(e) => onChange({ size: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Alignment">
            <input
              className={`${inputCls} w-full`}
              placeholder="Neutral"
              value={value.alignment}
              onChange={(e) => onChange({ alignment: e.target.value })}
            />
          </Field>
          <Field label="Challenge Rating">
            <input
              className={`${inputCls} w-full`}
              placeholder="1/4"
              value={value.challengeRating}
              onChange={(e) => onChange({ challengeRating: e.target.value })}
            />
          </Field>
          <Field label="Experience Points">
            <input
              className={`${inputCls} w-full`}
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
        <h2 className={FORM_SECTION_HEADING_CLS}>Category &amp; Ownership</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Category" hint="Which dashboard section it lives in.">
            <SelectMenu
              className="w-full"
              value={value.category}
              onChange={(v) => onChange({ category: v })}
              options={CREATURE_CATEGORY_ORDER.map((c) => ({ value: c, label: CREATURE_CATEGORY_LABELS[c] }))}
            />
          </Field>
          <Field label="Owner" hint="Which character summons/commands it — optional.">
            <SelectMenu
              className="w-full"
              value={value.ownerCharacterId}
              onChange={(v) => onChange({ ownerCharacterId: v })}
              options={[
                { value: "", label: "— None —" },
                ...characters.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Field label="Source" hint='e.g. "Find Steed", "Wild Shape"'>
            <input className={`${inputCls} w-full`} value={value.source} onChange={(e) => onChange({ source: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* Combat */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Combat</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="AC">
            <NumberInput className={`${inputCls} w-full`} value={value.ac} onChange={(n) => onChange({ ac: n })} />
          </Field>
          <Field label="Armor Detail" hint='e.g. "natural armor"'>
            <input
              className={`${inputCls} w-full`}
              value={value.armorDesc}
              onChange={(e) => onChange({ armorDesc: e.target.value })}
            />
          </Field>
          <Field label="HP">
            <NumberInput className={`${inputCls} w-full`} value={value.hp} onChange={(n) => onChange({ hp: n })} />
          </Field>
          <Field label="Max HP">
            <NumberInput className={`${inputCls} w-full`} value={value.maxHp} onChange={(n) => onChange({ maxHp: n })} />
          </Field>
          <Field label="Hit Dice" hint='e.g. "19d12 + 133"'>
            <input className={`${inputCls} w-full`} value={value.hitDice} onChange={(e) => onChange({ hitDice: e.target.value })} />
          </Field>
          <Field label="Speed (ft)">
            <NumberInput className={`${inputCls} w-full`} value={value.speed} onChange={(n) => onChange({ speed: n })} />
          </Field>
          <Field label="Speed Detail" hint='e.g. "40 ft., fly 80 ft."'>
            <input
              className={`${inputCls} w-full`}
              value={value.speedDetail}
              onChange={(e) => onChange({ speedDetail: e.target.value })}
            />
          </Field>
          <Field label="Initiative Bonus">
            <input
              className={`${inputCls} w-full`}
              value={value.initiativeBonus}
              onChange={(e) => onChange({ initiativeBonus: e.target.value })}
            />
          </Field>
          <Field label="Proficiency Bonus" hint="Optional — added to attacks/saves where applicable.">
            <input
              className={`${inputCls} w-full`}
              value={value.proficiencyBonus}
              onChange={(e) => onChange({ proficiencyBonus: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Stats */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Stats</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(value.stats) as Array<keyof AbilityScores>).map((key) => (
            <Field key={key} label={key.toUpperCase()}>
              <NumberInput className={`${inputCls} w-full`} value={value.stats[key]} onChange={(n) => setStat(key, n)} />
            </Field>
          ))}
        </div>
      </section>

      {/* Saving throws */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Saving Throws</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(value.stats) as Array<keyof AbilityScores>).map((key) => (
            <Field key={key} label={key.toUpperCase()} hint="Blank = plain modifier.">
              <input
                type="number"
                className={`${inputCls} w-full`}
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
        <h2 className={FORM_SECTION_HEADING_CLS}>Senses &amp; Languages</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Senses" hint='e.g. "Darkvision 60 ft., passive Perception 11"'>
            <input className={`${inputCls} w-full`} value={value.senses} onChange={(e) => onChange({ senses: e.target.value })} />
          </Field>
          <Field label="Languages">
            <input
              className={`${inputCls} w-full`}
              value={value.languages}
              onChange={(e) => onChange({ languages: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* Skills */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Skills</h2>
        <Field label="Skills" hint='e.g. "Perception +13, Stealth +6"'>
          <input className={`${inputCls} w-full`} value={value.skills} onChange={(e) => onChange({ skills: e.target.value })} />
        </Field>
      </section>

      {/* Damage types */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Damage Types</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Damage Vulnerabilities">
            <input
              className={`${inputCls} w-full`}
              value={value.damageVulnerabilities}
              onChange={(e) => onChange({ damageVulnerabilities: e.target.value })}
            />
          </Field>
          <Field label="Damage Resistances">
            <input
              className={`${inputCls} w-full`}
              value={value.damageResistances}
              onChange={(e) => onChange({ damageResistances: e.target.value })}
            />
          </Field>
          <Field label="Damage Immunities">
            <input
              className={`${inputCls} w-full`}
              value={value.damageImmunities}
              onChange={(e) => onChange({ damageImmunities: e.target.value })}
            />
          </Field>
          <Field label="Condition Immunities">
            <input
              className={`${inputCls} w-full`}
              value={value.conditionImmunities}
              onChange={(e) => onChange({ conditionImmunities: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <TraitMechanicsEditor traits={value.traits} onChange={(traits) => onChange({ traits })} />

      {/* Spellcasting */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Spellcasting</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Ability" hint="Blank = no spellcasting.">
            <SelectMenu
              className="w-full"
              value={value.spellcastingAbility}
              onChange={(v) => onChange({ spellcastingAbility: v })}
              options={[
                { value: "", label: "— None —" },
                ...STAT_ORDER.map((key) => ({ value: key, label: key.toUpperCase() })),
              ]}
            />
          </Field>
          <Field label="Save DC">
            <input
              className={`${inputCls} w-full`}
              disabled={!value.spellcastingAbility}
              value={value.spellcastingSaveDc}
              onChange={(e) => onChange({ spellcastingSaveDc: e.target.value })}
            />
          </Field>
          <Field label="Attack Bonus">
            <input
              className={`${inputCls} w-full`}
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
                <IconButton
                  tone="danger"
                  onClick={() => removeSpellcastingGroup(index)}
                  aria-label="Remove spellcasting group"
                  className="mt-1.5"
                >
                  ✕
                </IconButton>
              </div>
            ))}
            {value.spellcastingGroups.length === 0 && (
              <p className={HINT_TEXT_CLS}>No spell groups yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className={FORM_SECTION_HEADING_CLS}>Notes</h2>
        <NotesEditor value={ensureNotesHtml(value.notes)} onChange={(notes) => onChange({ notes })} placeholder="Add notes..." />
      </section>
    </div>
  );
}
