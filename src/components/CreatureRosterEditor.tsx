"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AddCreatureInput, useCreatures } from "@/hooks/useCreatures";
import { apiFetch } from "@/lib/apiClient";
import { Character, Creature, CreatureSearchHit, CreatureTemplate, creatureInfoLine } from "@/lib/types";
import { emptyCreatureFormValue } from "@/components/CreatureFormFields";
import { formValueToAddCreatureInput, templateToFormValue } from "@/lib/creatureForm";
import { buildCreatureImportTemplate } from "@/lib/creatureImportTemplate";
import { parseCreatureImportYaml } from "@/lib/creatureImportParser";
import { Avatar } from "@/components/Avatar";
import { RosterRow } from "@/components/RosterRow";

/**
 * Deliberately minimal, same weight as the character roster's "paste a
 * D&D Beyond link" add step — search for the general name, pick a match (or
 * add it blank if nothing's found), done. No stat-block form shown here at
 * all; the full stat block is filled in afterwards via each creature's own
 * `/creatures/[id]/edit` page, same as a character's details live on its own
 * edit page rather than inline in this list.
 *
 * Search results are lightweight previews (name/type/size/CR) — a popular
 * query can return upwards of a hundred creature hits, so the full stat
 * block is only fetched (`/api/bestiary/resolve`) for the one actually
 * picked, not for every row in the list.
 */
function AddCreaturePanel({
  onAdd,
  addedTemplateIds,
}: {
  onAdd: (input: AddCreatureInput) => Promise<Creature>;
  /** Bestiary template ids already present in this campaign's roster — lets a search hit show "(Added)" instead of leaving no trace of a creature the DM already added a minute ago (e.g. while adding several different hits from one search). */
  addedTemplateIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatureSearchHit[]>([]);
  // Which single row is in flight — a hit's own id, or "manual" for the
  // no-results "Add it anyway" fallback — rather than one shared flag, so
  // adding one hit doesn't relabel every other "Add" button in the list as
  // "Adding...". Still non-null (and so disabling every button) for the
  // whole request, to avoid firing a second add before the first resolves.
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiFetch(`/api/bestiary?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as CreatureSearchHit[];
      setResults(data);
      setSearched(true);
    } catch {
      setSearchError("Search failed — you can still add this creature manually below.");
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function addHit(hit: CreatureSearchHit) {
    setAddingId(hit.id);
    try {
      const res = await apiFetch(`/api/bestiary/resolve?id=${encodeURIComponent(hit.id)}`);
      if (!res.ok) throw new Error("Failed to load stat block.");
      const template = (await res.json()) as CreatureTemplate;
      await onAdd(formValueToAddCreatureInput(templateToFormValue(template), template.id));
      // Deliberately not resetting the search here — the results list stays
      // put so adding a second creature from the same search (e.g. both the
      // "Owl" and "Giant Owl" hits) doesn't require re-searching from
      // scratch. The roster list below still updates immediately via
      // `onAdd`/`useCreatures`, same as before.
    } catch {
      setSearchError(`Failed to load "${hit.name}"'s stat block — try again.`);
    } finally {
      setAddingId(null);
    }
  }

  async function addManual() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setAddingId("manual");
    try {
      await onAdd(formValueToAddCreatureInput({ ...emptyCreatureFormValue(), templateName: trimmed }));
      reset();
    } finally {
      setAddingId(null);
    }
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
          placeholder="Unicorn, Wolf, Imp..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearched(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>
      {searchError && <p className="text-sm text-amber-400">{searchError}</p>}

      {searched && results.length > 0 && (
        <ul className="scrollbar-themed max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {results.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{t.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {creatureInfoLine(t)}
                  {t.challengeRating && ` · CR ${t.challengeRating}`}
                  <span className="ml-1.5 text-slate-600">{t.origin === "srd" ? "(SRD)" : "(Saved)"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => addHit(t)}
                disabled={addingId !== null}
                className="shrink-0 text-sm text-sky-400 hover:underline disabled:opacity-50"
              >
                {addingId === t.id ? "Adding..." : addedTemplateIds.has(t.id) ? "Add (Added)" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className="text-sm text-slate-600">
          No matches for &quot;{query.trim()}&quot; — likely not free SRD content (e.g. a Monster Manual exclusive).{" "}
          <button
            type="button"
            onClick={addManual}
            disabled={addingId !== null}
            className="text-sky-400 hover:underline disabled:opacity-50"
          >
            {addingId === "manual" ? "Adding..." : "Add it anyway"}
          </button>
          , then fill in its stat block on its own edit page.
        </p>
      )}
    </div>
  );
}

function downloadTemplate() {
  const blob = new Blob([buildCreatureImportTemplate()], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "creature-template.yaml";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Alternative to `AddCreaturePanel`'s Open5e search — for a creature/NPC that
 * isn't free SRD content (a homebrew monster, a published-book exclusive, an
 * NPC the DM wrote up by hand or with an AI's help). The downloadable
 * template is generated from the same schema the parser validates against
 * (`creatureImportSchema.ts`), so the two can never silently drift apart.
 */
function ImportCreaturePanel({
  onAdd,
  characters,
}: {
  onAdd: (input: AddCreatureInput) => Promise<Creature>;
  /** Resolves the template's plain-text `ownerCharacter: "Aria"` field to an id — the parser itself only knows the schema, not any particular campaign's roster. */
  characters: Character[];
}) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!text.trim()) return;
    setImporting(true);
    setErrors([]);
    setWarnings([]);
    try {
      const outcome = parseCreatureImportYaml(text);
      if (!outcome.ok) {
        setErrors(outcome.errors);
        setWarnings(outcome.warnings);
        return;
      }
      const { input, ownerCharacterName } = outcome.result;
      let ownerCharacterId: string | undefined;
      if (ownerCharacterName) {
        const match = characters.find((c) => c.name.toLowerCase() === ownerCharacterName.toLowerCase());
        if (match) {
          ownerCharacterId = match.id;
        } else {
          outcome.warnings.push(`Персонажа "${ownerCharacterName}" не знайдено в цій кампанії — прив'язку до власника пропущено.`);
        }
      }
      await onAdd({ ...input, ownerCharacterId });
      setWarnings(outcome.warnings);
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Download template (.yaml)
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Upload file...
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Встав заповнений YAML-шаблон сюди, або завантаж файл вище..."
        rows={8}
        className="scrollbar-themed w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600"
      />

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3">
          <p className="mb-1 text-sm font-medium text-red-400">Не вдалося імпортувати — виправ і спробуй ще раз:</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-300">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-400">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={!text.trim() || importing}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        {importing ? "Importing..." : "Import"}
      </button>
    </div>
  );
}

function CreatureRow({
  creature,
  characters,
  onRemove,
}: {
  creature: Creature;
  characters: Character[];
  onRemove: (id: string) => Promise<void>;
}) {
  const owner = characters.find((c) => c.id === creature.ownerCharacterId);
  const infoLine = creatureInfoLine(creature);
  const ownerLine = [owner?.name, creature.source].filter(Boolean).join(" · ");

  return (
    <RosterRow
      id={creature.id}
      avatar={<Avatar src={creature.avatarUrl} label={creature.name} />}
      actions={
        <>
          <Link href={`/creatures/${creature.id}/edit`} className="text-slate-400 hover:text-slate-200">
            Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(`Remove "${creature.name}" from this campaign? This can't be undone.`);
              if (confirmed) onRemove(creature.id);
            }}
            className="text-red-500/80 hover:text-red-400"
          >
            Remove
          </button>
        </>
      }
    >
      <p title={creature.name} className="truncate text-lg font-semibold text-slate-100">
        {creature.name}
      </p>
      {infoLine && (
        <p title={infoLine} className="truncate text-xs text-slate-500">
          {infoLine}
        </p>
      )}
      {creature.challengeRating && <p className="text-xs text-slate-600">CR {creature.challengeRating}</p>}
      {ownerLine && (
        <p title={ownerLine} className="truncate text-xs text-slate-600">
          {ownerLine}
        </p>
      )}
    </RosterRow>
  );
}

/** The add/edit/remove creature-companion UI, embedded inside `CampaignFormModal` below the character roster editor — same shape as `CampaignRosterEditor`, but for companions/summons instead of player characters. */
export function CreatureRosterEditor({
  creaturesState,
  characters,
}: {
  /** Owned by the caller (`CampaignFormModal`) — either its own `useCreatures()` instance, or one lifted from a page that already renders this same roster elsewhere (e.g. the dashboard), so edits made here apply to that same state instead of a disconnected copy. */
  creaturesState: ReturnType<typeof useCreatures>;
  characters: Character[];
}) {
  const { creatures, addCreature, removeCreature, reorderCreatures } = creaturesState;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = creatures.findIndex((c) => c.id === active.id);
    const newIndex = creatures.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(creatures, oldIndex, newIndex);
    reorderCreatures(reordered.map((c) => c.id));
  }

  const addedTemplateIds = new Set(
    creatures.map((c) => c.templateId).filter((id): id is string => Boolean(id))
  );

  const [addMode, setAddMode] = useState<"search" | "import">("search");
  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
    }`;

  return (
    <div>
      <div className="mb-3 flex gap-1">
        <button type="button" className={tabCls(addMode === "search")} onClick={() => setAddMode("search")}>
          Search SRD
        </button>
        <button type="button" className={tabCls(addMode === "import")} onClick={() => setAddMode("import")}>
          Import from file
        </button>
      </div>
      {addMode === "search" ? (
        <AddCreaturePanel onAdd={addCreature} addedTemplateIds={addedTemplateIds} />
      ) : (
        <ImportCreaturePanel onAdd={addCreature} characters={characters} />
      )}

      <h3 className="mb-3 mt-5 text-sm uppercase tracking-wide text-slate-500">
        Added Creatures ({creatures.length})
      </h3>
      {creatures.length === 0 ? (
        <p className="text-sm text-slate-600">No companions or summons yet.</p>
      ) : (
        <DndContext id="creatures-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={creatures.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {creatures.map((creature) => (
                <CreatureRow key={creature.id} creature={creature} characters={characters} onRemove={removeCreature} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
