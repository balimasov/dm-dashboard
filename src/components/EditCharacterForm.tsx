"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AbilityScores,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  Character,
  Currency,
  InventoryItem,
  ItemCategory,
  ItemRarity,
  RARITY_ORDER,
  RECOVERY_LABELS,
  RecoveryType,
  Resource,
  Sense,
  SKILL_LABELS,
  SkillName,
  SpellcastingStats,
  SpellSlotLevel,
} from "@/lib/types";
import { fetchAndParseDdbCharacter } from "@/lib/sync";
import { patchCharacter } from "@/lib/characterApi";
import { SyncTimestamp } from "./SyncTimestamp";

const RECOVERY_OPTIONS = Object.entries(RECOVERY_LABELS) as Array<[RecoveryType, string]>;

let uid = 0;
function nextId() {
  uid += 1;
  return `new-${Date.now()}-${uid}`;
}

export function EditCharacterForm({ character }: { character: Character }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Character>(character);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const synced = await fetchAndParseDdbCharacter(draft);
      setDraft(synced);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Unknown sync error.");
    } finally {
      setSyncing(false);
    }
  }

  function set<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function setCombat<K extends keyof Character["combat"]>(
    key: K,
    value: Character["combat"][K]
  ) {
    setDraft((d) => ({ ...d, combat: { ...d.combat, [key]: value } }));
  }

  function setStat(key: keyof AbilityScores, value: number) {
    setDraft((d) => ({ ...d, stats: { ...d.stats, [key]: value } }));
  }

  function toggleSavingThrow(key: keyof AbilityScores, proficient: boolean) {
    setDraft((d) => ({
      ...d,
      savingThrowProficiencies: proficient
        ? [...d.savingThrowProficiencies, key]
        : d.savingThrowProficiencies.filter((k) => k !== key),
    }));
  }

  function setSkillProficiency(name: SkillName, state: "none" | "proficient" | "expertise") {
    setDraft((d) => {
      const existing = d.skillProficiencies.find((s) => s.name === name);
      const withoutSkill = d.skillProficiencies.filter((s) => s.name !== name);
      if (state === "none" && !existing?.advantage) return { ...d, skillProficiencies: withoutSkill };
      return {
        ...d,
        skillProficiencies: [
          ...withoutSkill,
          {
            name,
            proficient: state !== "none",
            expertise: state === "expertise",
            ...(existing?.advantage
              ? { advantage: existing.advantage, advantageNote: existing.advantageNote }
              : {}),
          },
        ],
      };
    });
  }

  function setSkillAdvantage(name: SkillName, state: "none" | "advantage" | "disadvantage") {
    setDraft((d) => {
      const existing = d.skillProficiencies.find((s) => s.name === name);
      const withoutSkill = d.skillProficiencies.filter((s) => s.name !== name);
      const stillTrained = existing?.proficient || existing?.expertise;
      if (state === "none") {
        if (!stillTrained) return { ...d, skillProficiencies: withoutSkill };
        return {
          ...d,
          skillProficiencies: [
            ...withoutSkill,
            { name, proficient: existing.proficient, expertise: existing.expertise },
          ],
        };
      }
      return {
        ...d,
        skillProficiencies: [
          ...withoutSkill,
          { name, proficient: existing?.proficient ?? false, expertise: existing?.expertise ?? false, advantage: state },
        ],
      };
    });
  }

  function setDamageList(field: "resistances" | "immunities" | "vulnerabilities", value: string) {
    setDraft((d) => ({
      ...d,
      [field]: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  function setAdvantages(value: string) {
    setDraft((d) => ({
      ...d,
      advantages: value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  function updateSense(index: number, updates: Partial<Sense>) {
    setDraft((d) => ({
      ...d,
      senses: d.senses.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    }));
  }

  function addSense() {
    setDraft((d) => ({ ...d, senses: [...d.senses, { name: "", range: 60 }] }));
  }

  function removeSense(index: number) {
    setDraft((d) => ({ ...d, senses: d.senses.filter((_, i) => i !== index) }));
  }

  function updateResource(id: string, updates: Partial<Resource>) {
    setDraft((d) => ({
      ...d,
      resources: d.resources.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }

  function addResource() {
    setDraft((d) => ({
      ...d,
      resources: [
        ...d.resources,
        { id: nextId(), name: "", current: 0, max: 1, recovery: "short-rest" },
      ],
    }));
  }

  function removeResource(id: string) {
    setDraft((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id) }));
  }

  function updateSlot(level: number, updates: Partial<SpellSlotLevel>) {
    setDraft((d) => ({
      ...d,
      spellSlots: d.spellSlots.map((s) => (s.level === level ? { ...s, ...updates } : s)),
    }));
  }

  function addSlot() {
    setDraft((d) => {
      const usedLevels = new Set(d.spellSlots.map((s) => s.level));
      let level = 1;
      while (usedLevels.has(level) && level <= 9) level += 1;
      return { ...d, spellSlots: [...d.spellSlots, { level, current: 0, max: 1 }] };
    });
  }

  function removeSlot(level: number) {
    setDraft((d) => ({ ...d, spellSlots: d.spellSlots.filter((s) => s.level !== level) }));
  }

  function setSpellcasting<K extends keyof SpellcastingStats>(key: K, value: number) {
    setDraft((d) => ({
      ...d,
      spellcasting: { modifier: 0, attack: 0, saveDc: 0, ...d.spellcasting, [key]: value },
    }));
  }

  function updateItem(id: string, updates: Partial<InventoryItem>) {
    setDraft((d) => ({
      ...d,
      inventory: d.inventory.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  }

  function addItem() {
    setDraft((d) => ({
      ...d,
      inventory: [...d.inventory, { id: nextId(), name: "", rarity: "Common", category: "Gear", quantity: 1 }],
    }));
  }

  function removeItem(id: string) {
    setDraft((d) => ({ ...d, inventory: d.inventory.filter((i) => i.id !== id) }));
  }

  function setCurrency(key: keyof Currency, value: number) {
    setDraft((d) => ({ ...d, currency: { ...d.currency, [key]: value } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await patchCharacter(draft.id, { ...draft, synced: true });
      router.push("/");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save character.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-50">Edit Character</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Back to dashboard
        </Link>
      </div>

      {draft.dndBeyondUrl && (
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync with D&D Beyond"}
          </button>
          {draft.lastSyncedAt && (
            <span className="text-xs text-slate-500">
              Last synced: <SyncTimestamp iso={draft.lastSyncedAt} />
            </span>
          )}
        </div>
      )}
      {syncError && <p className="text-sm text-red-400 mb-6">{syncError}</p>}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic info */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Basic Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Race">
              <input className={inputCls} value={draft.race} onChange={(e) => set("race", e.target.value)} />
            </Field>
            <Field label="Class">
              <input className={inputCls} value={draft.className} onChange={(e) => set("className", e.target.value)} />
            </Field>
            <Field label="Subclass">
              <input
                className={inputCls}
                value={draft.subclass ?? ""}
                onChange={(e) => set("subclass", e.target.value)}
              />
            </Field>
            <Field label="Level">
              <input
                type="number"
                className={inputCls}
                value={draft.level}
                onChange={(e) => set("level", Number(e.target.value))}
              />
            </Field>
            <Field label="Initiative (bonus)">
              <input
                type="number"
                className={inputCls}
                value={draft.initiative}
                onChange={(e) => set("initiative", Number(e.target.value))}
              />
            </Field>
            <Field label="Party Role">
              <input className={inputCls} value={draft.role} onChange={(e) => set("role", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-300 mt-6">
              <input
                type="checkbox"
                checked={draft.heroicInspiration}
                onChange={(e) => set("heroicInspiration", e.target.checked)}
              />
              Heroic Inspiration
            </label>
          </div>
        </section>

        {/* Combat state */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Combat State</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="HP">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.hp}
                onChange={(e) => setCombat("hp", Number(e.target.value))}
              />
            </Field>
            <Field
              label="Max HP"
              hint={
                draft.maxHpLocked
                  ? "Locked — sync won't change this value."
                  : "Recalculated automatically on the next sync."
              }
            >
              <input
                type="number"
                className={inputCls}
                value={draft.combat.maxHp}
                onChange={(e) => setCombat("maxHp", Number(e.target.value))}
              />
            </Field>
            <Field label="Temp HP">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.tempHp}
                onChange={(e) => setCombat("tempHp", Number(e.target.value))}
              />
            </Field>
            <Field label="AC">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.ac}
                onChange={(e) => setCombat("ac", Number(e.target.value))}
              />
            </Field>
            <Field label="Speed">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.speed}
                onChange={(e) => setCombat("speed", Number(e.target.value))}
              />
            </Field>
            <Field label="Passive Perception">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.passivePerception}
                onChange={(e) => setCombat("passivePerception", Number(e.target.value))}
              />
            </Field>
            <Field label="Passive Investigation">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.passiveInvestigation}
                onChange={(e) => setCombat("passiveInvestigation", Number(e.target.value))}
              />
            </Field>
            <Field label="Passive Insight">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.passiveInsight}
                onChange={(e) => setCombat("passiveInsight", Number(e.target.value))}
              />
            </Field>
            <Field label="Exhaustion">
              <input
                type="number"
                min={0}
                max={6}
                className={inputCls}
                value={draft.combat.exhaustion}
                onChange={(e) => setCombat("exhaustion", Number(e.target.value))}
              />
            </Field>
            <Field label="Conditions (comma-separated)">
              <input
                className={inputCls}
                value={draft.combat.conditions.join(", ")}
                onChange={(e) =>
                  setCombat(
                    "conditions",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.maxHpLocked ?? false}
              onChange={(e) => set("maxHpLocked", e.target.checked)}
            />
            Lock Max HP (ignore automatic recalculation on sync)
          </label>
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Stats</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(Object.keys(draft.stats) as Array<keyof AbilityScores>).map((key) => (
              <Field key={key} label={key.toUpperCase()}>
                <input
                  type="number"
                  className={inputCls}
                  value={draft.stats[key]}
                  onChange={(e) => setStat(key, Number(e.target.value))}
                />
              </Field>
            ))}
          </div>
        </section>

        {/* Saving throws */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Saving Throws (proficient)</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(Object.keys(draft.stats) as Array<keyof AbilityScores>).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.savingThrowProficiencies.includes(key)}
                  onChange={(e) => toggleSavingThrow(key, e.target.checked)}
                />
                {key.toUpperCase()}
              </label>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Skills</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(SKILL_LABELS) as SkillName[]).map((name) => {
              const current = draft.skillProficiencies.find((s) => s.name === name);
              const state = current?.expertise ? "expertise" : current?.proficient ? "proficient" : "none";
              const advState = current?.advantage ?? "none";
              return (
                <div key={name} className="flex items-center justify-between gap-2 text-sm text-slate-300">
                  <span className="min-w-0 flex-1 truncate">{SKILL_LABELS[name]}</span>
                  <select
                    className={inputCls}
                    value={state}
                    onChange={(e) =>
                      setSkillProficiency(name, e.target.value as "none" | "proficient" | "expertise")
                    }
                  >
                    <option value="none">—</option>
                    <option value="proficient">Proficient</option>
                    <option value="expertise">Expertise</option>
                  </select>
                  <select
                    className={inputCls}
                    value={advState}
                    onChange={(e) =>
                      setSkillAdvantage(name, e.target.value as "none" | "advantage" | "disadvantage")
                    }
                  >
                    <option value="none">—</option>
                    <option value="advantage">Adv</option>
                    <option value="disadvantage">Disadv</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>

        {/* Resistances / Immunities / Vulnerabilities */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">
            Resistances / Immunities / Vulnerabilities
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Resistances (comma-separated)">
              <input
                className={inputCls}
                value={draft.resistances.join(", ")}
                onChange={(e) => setDamageList("resistances", e.target.value)}
              />
            </Field>
            <Field label="Immunities (comma-separated)">
              <input
                className={inputCls}
                value={draft.immunities.join(", ")}
                onChange={(e) => setDamageList("immunities", e.target.value)}
              />
            </Field>
            <Field label="Vulnerabilities (comma-separated)">
              <input
                className={inputCls}
                value={draft.vulnerabilities.join(", ")}
                onChange={(e) => setDamageList("vulnerabilities", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Advantages (one per line)"
            hint='e.g. "Advantage: Saving Throws — to avoid or end the Charmed condition"'
          >
            <textarea
              className={`${inputCls} w-full`}
              rows={2}
              value={draft.advantages.join("\n")}
              onChange={(e) => setAdvantages(e.target.value)}
            />
          </Field>
        </section>

        {/* Senses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Senses</h2>
            <button type="button" onClick={addSense} className={addBtnCls}>
              + Sense
            </button>
          </div>
          <div className="space-y-2">
            {draft.senses.map((s, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} flex-1 min-w-[140px]`}
                  placeholder="Name (e.g. Darkvision)"
                  value={s.name}
                  onChange={(e) => updateSense(index, { name: e.target.value })}
                />
                <input
                  type="number"
                  className={`${inputCls} w-20`}
                  value={s.range}
                  onChange={(e) => updateSense(index, { range: Number(e.target.value) })}
                />
                <span className="text-slate-500">ft</span>
                <button
                  type="button"
                  onClick={() => removeSense(index)}
                  className="text-red-500/80 hover:text-red-400 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Resources</h2>
            <button type="button" onClick={addResource} className={addBtnCls}>
              + Resource
            </button>
          </div>
          <div className="space-y-2">
            {draft.resources.map((r) => (
              <div key={r.id} className="space-y-1.5 rounded-md border border-slate-800 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputCls} flex-1 min-w-[140px]`}
                    placeholder="Name"
                    value={r.name}
                    onChange={(e) => updateResource(r.id, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    className={`${inputCls} w-20`}
                    value={r.current}
                    onChange={(e) => updateResource(r.id, { current: Number(e.target.value) })}
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    className={`${inputCls} w-20`}
                    value={r.max}
                    onChange={(e) => updateResource(r.id, { max: Number(e.target.value) })}
                  />
                  <select
                    className={inputCls}
                    value={r.recovery}
                    onChange={(e) => updateResource(r.id, { recovery: e.target.value as RecoveryType })}
                  >
                    {RECOVERY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeResource(r.id)}
                    className="text-red-500/80 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Short description (hover hint)"
                  value={r.description ?? ""}
                  onChange={(e) => updateResource(r.id, { description: e.target.value })}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Spell slots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Spells</h2>
            <button type="button" onClick={addSlot} className={addBtnCls}>
              + Level
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Modifier">
              <input
                type="number"
                className={inputCls}
                value={draft.spellcasting?.modifier ?? 0}
                onChange={(e) => setSpellcasting("modifier", Number(e.target.value))}
              />
            </Field>
            <Field label="Spell Attack">
              <input
                type="number"
                className={inputCls}
                value={draft.spellcasting?.attack ?? 0}
                onChange={(e) => setSpellcasting("attack", Number(e.target.value))}
              />
            </Field>
            <Field label="Save DC">
              <input
                type="number"
                className={inputCls}
                value={draft.spellcasting?.saveDc ?? 0}
                onChange={(e) => setSpellcasting("saveDc", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="space-y-2">
            {draft.spellSlots
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((s) => (
                <div key={s.level} className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 w-10">L{s.level}</span>
                  <input
                    type="number"
                    className={`${inputCls} w-20`}
                    value={s.current}
                    onChange={(e) => updateSlot(s.level, { current: Number(e.target.value) })}
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    className={`${inputCls} w-20`}
                    value={s.max}
                    onChange={(e) => updateSlot(s.level, { max: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(s.level)}
                    className="text-red-500/80 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </section>

        {/* Inventory */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Inventory</h2>
            <button type="button" onClick={addItem} className={addBtnCls}>
              + Item
            </button>
          </div>
          <div className="space-y-2">
            {draft.inventory.map((item) => (
              <div key={item.id} className="space-y-1.5 rounded-md border border-slate-800 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputCls} flex-1 min-w-[140px]`}
                    placeholder="Name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  />
                  <select
                    className={inputCls}
                    value={item.category}
                    onChange={(e) => updateItem(item.id, { category: e.target.value as ItemCategory })}
                  >
                    {CATEGORY_ORDER.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputCls}
                    value={item.rarity}
                    onChange={(e) => updateItem(item.id, { rarity: e.target.value as ItemRarity })}
                  >
                    {RARITY_ORDER.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className={`${inputCls} w-20`}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-red-500/80 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Short description (hover hint)"
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-3">
            <Field label="PP">
              <input
                type="number"
                className={inputCls}
                value={draft.currency.pp}
                onChange={(e) => setCurrency("pp", Number(e.target.value))}
              />
            </Field>
            <Field label="GP">
              <input
                type="number"
                className={inputCls}
                value={draft.currency.gp}
                onChange={(e) => setCurrency("gp", Number(e.target.value))}
              />
            </Field>
            <Field label="EP">
              <input
                type="number"
                className={inputCls}
                value={draft.currency.ep}
                onChange={(e) => setCurrency("ep", Number(e.target.value))}
              />
            </Field>
            <Field label="SP">
              <input
                type="number"
                className={inputCls}
                value={draft.currency.sp}
                onChange={(e) => setCurrency("sp", Number(e.target.value))}
              />
            </Field>
            <Field label="CP">
              <input
                type="number"
                className={inputCls}
                value={draft.currency.cp}
                onChange={(e) => setCurrency("cp", Number(e.target.value))}
              />
            </Field>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Notes</h2>
          <textarea
            className={`${inputCls} w-full`}
            rows={3}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </section>

        {saveError && <p className="text-sm text-red-400">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600";
const addBtnCls = "text-xs text-sky-400 hover:underline";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {children}
      {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
    </label>
  );
}
