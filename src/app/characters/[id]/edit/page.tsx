"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCharacters } from "@/hooks/useCharacters";
import {
  AbilityScores,
  Character,
  RECOVERY_LABELS,
  RecoveryType,
  Resource,
  SpellSlotLevel,
} from "@/lib/types";

const RECOVERY_OPTIONS = Object.entries(RECOVERY_LABELS) as Array<
  [RecoveryType, string]
>;

let uid = 0;
function nextId() {
  uid += 1;
  return `new-${Date.now()}-${uid}`;
}

export default function EditCharacterPage() {
  const params = useParams<{ id: string }>();
  const { characters } = useCharacters();
  const found = characters.find((c) => c.id === params.id);

  if (!found) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-500">
        Персонажа не знайдено.{" "}
        <Link href="/" className="text-sky-400 hover:underline">
          До дашборда
        </Link>
      </div>
    );
  }

  return <EditCharacterForm key={found.id} character={found} />;
}

function EditCharacterForm({ character }: { character: Character }) {
  const router = useRouter();
  const { updateCharacter } = useCharacters();
  const [draft, setDraft] = useState<Character>(character);

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

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateCharacter(draft.id, { ...draft, synced: true });
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-50">Редагування персонажа</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← До дашборда
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic info */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Основне</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ім'я">
              <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Раса">
              <input className={inputCls} value={draft.race} onChange={(e) => set("race", e.target.value)} />
            </Field>
            <Field label="Клас">
              <input className={inputCls} value={draft.className} onChange={(e) => set("className", e.target.value)} />
            </Field>
            <Field label="Сабклас">
              <input
                className={inputCls}
                value={draft.subclass ?? ""}
                onChange={(e) => set("subclass", e.target.value)}
              />
            </Field>
            <Field label="Рівень">
              <input
                type="number"
                className={inputCls}
                value={draft.level}
                onChange={(e) => set("level", Number(e.target.value))}
              />
            </Field>
            <Field label="Ініціатива (бонус)">
              <input
                type="number"
                className={inputCls}
                value={draft.initiative}
                onChange={(e) => set("initiative", Number(e.target.value))}
              />
            </Field>
            <Field label="Роль у партії">
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
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Бойовий стан</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="HP">
              <input
                type="number"
                className={inputCls}
                value={draft.combat.hp}
                onChange={(e) => setCombat("hp", Number(e.target.value))}
              />
            </Field>
            <Field label="Max HP">
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
            <Field label="Conditions (через кому)">
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
            <Field label="Concentration">
              <input
                className={inputCls}
                value={draft.combat.concentration ?? ""}
                onChange={(e) => setCombat("concentration", e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Стати</h2>
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

        {/* Resources */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Ресурси</h2>
            <button type="button" onClick={addResource} className={addBtnCls}>
              + Ресурс
            </button>
          </div>
          <div className="space-y-2">
            {draft.resources.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} flex-1 min-w-[140px]`}
                  placeholder="Назва"
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
            ))}
          </div>
        </section>

        {/* Spell slots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">Spell Slots</h2>
            <button type="button" onClick={addSlot} className={addBtnCls}>
              + Рівень
            </button>
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

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
            Скасувати
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Зберегти
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600";
const addBtnCls = "text-xs text-sky-400 hover:underline";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}
