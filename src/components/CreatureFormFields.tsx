"use client";

import { AbilityScores, Character, CreatureTrait } from "@/lib/types";

export interface CreatureFormValue {
  templateName: string;
  name: string;
  creatureType: string;
  size: string;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  stats: AbilityScores;
  traits: CreatureTrait[];
  ownerCharacterId: string;
  source: string;
}

export function emptyCreatureFormValue(): CreatureFormValue {
  return {
    templateName: "",
    name: "",
    creatureType: "",
    size: "",
    ac: 10,
    hp: 1,
    maxHp: 1,
    speed: 30,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    traits: [],
    ownerCharacterId: "",
    source: "",
  };
}

const inputCls =
  "rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600";
const addBtnCls = "text-xs text-sky-400 hover:underline";

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

  function updateTrait(index: number, updates: Partial<CreatureTrait>) {
    onChange({ traits: value.traits.map((t, i) => (i === index ? { ...t, ...updates } : t)) });
  }

  function addTrait() {
    onChange({ traits: [...value.traits, { name: "" }] });
  }

  function removeTrait(index: number) {
    onChange({ traits: value.traits.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="AC">
          <input
            type="number"
            className={inputCls}
            value={value.ac}
            onChange={(e) => onChange({ ac: Number(e.target.value) })}
          />
        </Field>
        <Field label="HP">
          <input
            type="number"
            className={inputCls}
            value={value.hp}
            onChange={(e) => onChange({ hp: Number(e.target.value) })}
          />
        </Field>
        <Field label="Max HP">
          <input
            type="number"
            className={inputCls}
            value={value.maxHp}
            onChange={(e) => onChange({ maxHp: Number(e.target.value) })}
          />
        </Field>
        <Field label="Speed (ft)">
          <input
            type="number"
            className={inputCls}
            value={value.speed}
            onChange={(e) => onChange({ speed: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(Object.keys(value.stats) as Array<keyof AbilityScores>).map((key) => (
          <Field key={key} label={key.toUpperCase()}>
            <input
              type="number"
              className={inputCls}
              value={value.stats[key]}
              onChange={(e) => setStat(key, Number(e.target.value))}
            />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-slate-500">Traits &amp; Actions</span>
          <button type="button" onClick={addTrait} className={addBtnCls}>
            + Trait
          </button>
        </div>
        {value.traits.map((t, index) => (
          <div key={index} className="flex flex-wrap items-start gap-2">
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
              onClick={() => removeTrait(index)}
              className="mt-1.5 text-sm text-red-500/80 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
