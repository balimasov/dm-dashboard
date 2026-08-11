"use client";

import { useRef, useState } from "react";
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
import {
  CREATURE_CATEGORY_LABELS,
  CREATURE_CATEGORY_SINGULAR_LABELS,
  Character,
  Creature,
  CreatureCategory,
  CreatureSearchHit,
  CreatureTemplate,
} from "@/lib/types";
import { creatureInfoLine } from "@/lib/format";
import { emptyCreatureFormValue } from "@/components/CreatureFormFields";
import { formValueToAddCreatureInput, templateToFormValue } from "@/lib/creatureForm";
import { buildCreatureImportTemplate } from "@/lib/creatureImportTemplate";
import { parseCreatureImportYaml } from "@/lib/creatureImportParser";
import { Avatar } from "@/components/Avatar";
import { CreatureHpHistoryModal } from "@/components/CreatureHpHistoryModal";
import { EditCreatureModal } from "@/components/EditCreatureModal";
import { RosterRow } from "@/components/RosterRow";
import { Toast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { CreatureCategoryChip } from "@/components/ui/CreatureCategoryChip";
import { EntityActionsMenu } from "@/components/ui/EntityActionsMenu";
import { OwnerBadge } from "@/components/ui/OwnerBadge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ROW_CARD_CLS } from "@/components/ui/containerStyles";
import { inputCls } from "@/components/ui/Field";
import {
  CARD_META_CLS,
  CARD_SUBTITLE_CLS,
  CARD_TITLE_CLS,
  EMPTY_STATE_CLS,
  FORM_SECTION_HEADING_CLS,
  MUTED_LABEL_CLS,
  WARNING_TEXT_CLS,
} from "@/components/ui/typography";

/** Reports one add/import attempt's outcome up to the shared toast in `CreatureRosterEditor` — success or failure, same convention as the sync-summary toast on the dashboard. */
type ResultReporter = (message: string, variant: "success" | "error") => void;

type CreatureAddMode = "search" | "import" | "manual";

const ADD_MODE_OPTIONS: Array<{ mode: CreatureAddMode; icon: string; label: string; sub: string }> = [
  { mode: "search", icon: "🔍", label: "Search SRD", sub: "Free bestiary" },
  { mode: "import", icon: "📄", label: "Import File", sub: ".yaml stat block" },
  { mode: "manual", icon: "✏️", label: "Add Manually", sub: "Blank stat block" },
];

/**
 * First step of adding a creature — three equally-weighted cards instead of
 * the old dropdown that only ever offered Search/Import and read as a
 * skippable setting rather than the actual entry point. Manual add used to
 * only be reachable as a link buried inside a *failed* search (`"Add it
 * anyway"`) — now it's a full peer, reachable in one click same as the
 * other two, without needing to search-and-fail first.
 */
function AddCreatureModePicker({ onPick }: { onPick: (mode: CreatureAddMode) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">How do you want to add this creature?</p>
      <div className="grid grid-cols-3 gap-2.5">
        {ADD_MODE_OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onPick(o.mode)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-4 text-center hover:border-sky-600 hover:bg-slate-800"
          >
            <span className="text-2xl">{o.icon}</span>
            <span className="text-sm font-semibold text-slate-200">{o.label}</span>
            <span className={MUTED_LABEL_CLS}>{o.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Deliberately minimal, same weight as the character roster's "paste a
 * D&D Beyond link" add step — search for the general name, pick a match,
 * done. No stat-block form shown here at all; the full stat block is
 * filled in afterwards via the creature's own edit modal (the pencil icon
 * on its row below), same as a character's details are edited via its own
 * modal rather than inline in this list. A search that turns up nothing
 * isn't a dead end — `AddManuallyPanel`/`ImportCreaturePanel` are the other
 * two equally-weighted ways in, one "← Choose a different way" click away
 * (see `CreatureRosterEditor`'s own mode picker).
 *
 * Search results are lightweight previews (name/type/size/CR) — a popular
 * query can return upwards of a hundred creature hits, so the full stat
 * block is only fetched (`/api/bestiary/resolve`) for the one actually
 * picked, not for every row in the list.
 */
function AddCreaturePanel({
  onAdd,
  addedTemplateIds,
  category,
  onResult,
  busy,
}: {
  onAdd: (input: AddCreatureInput) => Promise<Creature>;
  /** Bestiary template ids already present in this campaign's roster — lets a search hit show "(Added)" instead of leaving no trace of a creature the DM already added a minute ago (e.g. while adding several different hits from one search). */
  addedTemplateIds: Set<string>;
  /** Current value of the shared category selector rendered above this panel — applied to whatever gets added. */
  category: CreatureCategory;
  onResult: ResultReporter;
  /** True while any of the three add panels (this one included) has a request in flight — see `CreatureRosterEditor`'s own doc comment on why this is tracked one level up instead of per-panel. Disables this panel's own buttons even when its *own* local flags are idle, so switching to this panel mid-import can't fire a second, overlapping add. */
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<CreatureSearchHit[]>([]);
  // A hit's own id — so adding one hit doesn't relabel every other "Add"
  // button in the list as "Adding...". Still non-null (and so disabling
  // every button) for the whole request, to avoid firing a second add
  // before the first resolves.
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
      await onAdd({ ...formValueToAddCreatureInput(templateToFormValue(template), template.id), category });
      // Deliberately not resetting the search here — the results list stays
      // put so adding a second creature from the same search (e.g. both the
      // "Owl" and "Giant Owl" hits) doesn't require re-searching from
      // scratch. The roster list below still updates immediately via
      // `onAdd`/`useCreatures`, same as before.
      onResult(`Added "${template.name}" as ${CREATURE_CATEGORY_SINGULAR_LABELS[category]}.`, "success");
    } catch {
      setSearchError(`Failed to load "${hit.name}"'s stat block — try again.`);
      onResult(`Failed to add "${hit.name}".`, "error");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={`flex-1 ${inputCls}`}
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
        <Button type="button" onClick={handleSearch} disabled={!query.trim() || searching || busy}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </div>
      {searchError && <p className={WARNING_TEXT_CLS}>{searchError}</p>}

      {searched && results.length > 0 && (
        <ul className="scrollbar-themed max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {results.map((t) => (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-3 ${ROW_CARD_CLS} px-3 py-2`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{t.name}</p>
                <p className={`truncate ${MUTED_LABEL_CLS}`}>
                  {creatureInfoLine(t)}
                  {t.challengeRating && ` · CR ${t.challengeRating}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addHit(t)}
                disabled={addingId !== null || busy}
                className="shrink-0 text-sm text-sky-400 hover:underline disabled:opacity-50"
              >
                {addingId === t.id ? "Adding..." : addedTemplateIds.has(t.id) ? "Add (Added)" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className={EMPTY_STATE_CLS}>
          No matches for &quot;{query.trim()}&quot; — likely not free SRD content (e.g. a Monster Manual exclusive).
          Try Add Manually or Import File instead.
        </p>
      )}
    </div>
  );
}

/**
 * The bare "just give it a name" path — for a creature that isn't free SRD
 * content and isn't worth writing out a full YAML file for either (most
 * homebrew NPCs, a one-off monster). Adds a blank stat block under the
 * typed name, same as `AddCreaturePanel`'s search used to fall back to
 * before manual add became its own equally-weighted panel; the full stat
 * block is filled in afterwards via the creature's own edit modal.
 */
function AddManuallyPanel({
  onAdd,
  category,
  onResult,
  busy,
}: {
  onAdd: (input: AddCreatureInput) => Promise<Creature>;
  /** Applied to whatever gets added. */
  category: CreatureCategory;
  onResult: ResultReporter;
  /** See `AddCreaturePanel`'s own doc comment on this same prop. */
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAdd({ ...formValueToAddCreatureInput({ ...emptyCreatureFormValue(), templateName: trimmed }), category });
      onResult(`Added "${trimmed}" as ${CREATURE_CATEGORY_SINGULAR_LABELS[category]}.`, "success");
      setName("");
    } catch {
      onResult(`Failed to add "${trimmed}".`, "error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={`flex-1 ${inputCls}`}
          placeholder="e.g. Riverside Bandit"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" onClick={handleAdd} disabled={!name.trim() || adding || busy}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>
      <p className={MUTED_LABEL_CLS}>Adds a blank stat block — fill in AC, HP, stats etc. via its own Edit form after.</p>
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
  category,
  onResult,
  busy,
}: {
  onAdd: (input: AddCreatureInput) => Promise<Creature>;
  /** Resolves the template's plain-text `ownerCharacter: "Aria"` field to an id — the parser itself only knows the schema, not any particular campaign's roster. */
  characters: Character[];
  /** The roster manager's active category tab — wins over whatever `category:` line the imported file itself has, since the tab is now the one place category is chosen. */
  category: CreatureCategory;
  onResult: ResultReporter;
  /** See `AddCreaturePanel`'s own doc comment on this same prop. */
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateText(next: string) {
    setText(next);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => updateText(String(reader.result ?? ""));
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
      try {
        await onAdd({ ...input, ownerCharacterId, category });
      } catch {
        onResult(`Failed to import "${input.templateName}".`, "error");
        return;
      }
      setWarnings(outcome.warnings);
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onResult(`Added "${input.templateName}" as ${CREATURE_CATEGORY_SINGULAR_LABELS[category]}.`, "success");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* One bordered box instead of an "Upload file..." button sitting
          above a separate textarea — those read as two competing ways in,
          when they're really just two ways to fill this one box (typed/
          pasted text, a click-to-browse file, or a dropped file all land
          in the same place). */}
      <div
        className={`overflow-hidden rounded-lg border transition-colors ${
          dragOver ? "border-sky-600 bg-sky-950/20" : "border-slate-800 bg-slate-900"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => updateText(e.target.value)}
          placeholder="Встав заповнений YAML-шаблон сюди..."
          rows={7}
          className="scrollbar-themed w-full resize-none bg-transparent px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        <div className={`flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/40 px-3 py-1.5 ${MUTED_LABEL_CLS}`}>
          <span>Drag &amp; drop a .yaml file here</span>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 text-sky-400 hover:underline">
            or upload...
          </button>
        </div>
      </div>
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

      {/* Template link moved down next to Import, deliberately not up by the
          mode picker's own "← Choose a different way" — the two were
          crowding each other as two small text links stacked right on top
          of one another. */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={downloadTemplate} className="text-sm text-sky-400 hover:underline">
          Download template (.yaml)
        </button>
        <Button type="button" onClick={handleImport} disabled={!text.trim() || importing || busy}>
          {importing ? "Importing..." : "Import"}
        </Button>
      </div>
    </div>
  );
}

function CreatureRow({
  creature,
  characters,
  onEdit,
  onRemove,
  onToggleHidden,
  onDuplicate,
  onShowHpHistory,
}: {
  creature: Creature;
  characters: Character[];
  onEdit: (creature: Creature) => void;
  onRemove: (id: string) => Promise<void>;
  onToggleHidden: (id: string) => void;
  onDuplicate: (creature: Creature, count: number) => void;
  onShowHpHistory: () => void;
}) {
  const owner = characters.find((c) => c.id === creature.ownerCharacterId);
  const infoLine = creatureInfoLine(creature);

  return (
    <RosterRow
      id={creature.id}
      dimmed={creature.hidden}
      avatar={
        <div className="relative shrink-0">
          <Avatar src={creature.avatarUrl} label={creature.name} />
          <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
            <CreatureCategoryChip category={creature.category} size="sm" />
          </div>
          {/* Same corner-badge + hover-hint treatment as `CreatureHeader`'s
              own owner badge — replaces the old plain-text "OwnerName ·
              Source" caption below, which duplicated the name without the
              hint (level/class) the badge's tooltip already gives for free. */}
          {owner && (
            <div className="absolute -left-2 -top-2">
              <OwnerBadge owner={owner} />
            </div>
          )}
        </div>
      }
      actions={
        <EntityActionsMenu
          onEdit={() => onEdit(creature)}
          name={creature.name}
          hidden={creature.hidden}
          onToggleHidden={() => onToggleHidden(creature.id)}
          linkUrl={creature.referenceUrl}
          linkLabel="Open Reference"
          onDuplicate={(count) => onDuplicate(creature, count)}
          onShowHpHistory={onShowHpHistory}
          onRemove={() => onRemove(creature.id)}
        />
      }
    >
      {/* Same three-line recipe as `CreatureHeader`'s own card header
          (`CARD_TITLE_CLS`/`CARD_SUBTITLE_CLS`/`CARD_META_CLS`) instead of
          this row's previously different sizes/colors, so a creature reads
          the same whether shown here or on its dashboard card. */}
      <p title={creature.name} className={CARD_TITLE_CLS}>
        {creature.name}
        {creature.hidden && <span className="ml-2 text-xs font-normal text-slate-500">(hidden)</span>}
      </p>
      {infoLine && (
        <p title={infoLine} className={CARD_SUBTITLE_CLS}>
          {infoLine}
        </p>
      )}
      {creature.challengeRating && <p className={CARD_META_CLS}>CR {creature.challengeRating}</p>}
      {creature.source && (
        <p title={creature.source} className="truncate text-xs text-slate-600">
          {creature.source}
        </p>
      )}
    </RosterRow>
  );
}

/**
 * The add/edit/remove UI for one creature category (Companions/Enemies/
 * NPCs) — embedded as one tab of `RosterManagerModal`. `category` is fixed
 * by the tab itself now (not a selector in this component), so the "Added
 * Creatures" list only ever shows/reorders/searches within that one
 * category — other categories' creatures and their own `position` order
 * are untouched by anything that happens here (see `reorderCreatures`'s
 * per-id update in `db.ts`, which never touches ids outside the list it's
 * given).
 */
export function CreatureRosterEditor({
  category,
  creaturesState,
  characters,
}: {
  category: CreatureCategory;
  /** Owned by the caller (`RosterManagerModal`) — either its own `useCreatures()` instance, or one lifted from a page that already renders this same roster elsewhere (e.g. the dashboard), so edits made here apply to that same state instead of a disconnected copy. */
  creaturesState: ReturnType<typeof useCreatures>;
  characters: Character[];
}) {
  const { creatures, addCreature, duplicateCreature, removeCreature, reorderCreatures, updateCreature, clearHpHistory } =
    creaturesState;

  const [editingCreature, setEditingCreature] = useState<Creature | null>(null);
  const [hpHistoryCreature, setHpHistoryCreature] = useState<Creature | null>(null);

  function handleToggleHidden(id: string) {
    const creature = creatures.find((c) => c.id === id);
    if (creature) updateCreature(id, { hidden: !creature.hidden });
  }

  async function handleDuplicate(creature: Creature, count: number) {
    try {
      const copies = await duplicateCreature(creature, count);
      const message =
        copies.length === 1
          ? `Duplicated "${creature.name}" as "${copies[0].name}".`
          : `Duplicated "${creature.name}" into ${copies.length} copies.`;
      setToast({ message, variant: "success" });
    } catch {
      setToast({ message: `Failed to duplicate "${creature.name}".`, variant: "error" });
    }
  }

  const inCategory = creatures.filter((c) => c.category === category);

  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"active" | "hidden">("active");

  const activeCount = inCategory.filter((c) => !c.hidden).length;
  const hiddenCount = inCategory.filter((c) => c.hidden).length;

  const trimmedQuery = query.trim().toLowerCase();
  const visibleList = inCategory
    .filter((c) => (visibility === "active" ? !c.hidden : c.hidden))
    .filter((c) => !trimmedQuery || c.name.toLowerCase().includes(trimmedQuery));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleList.findIndex((c) => c.id === active.id);
    const newIndex = visibleList.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(visibleList, oldIndex, newIndex);
    reorderCreatures(reordered.map((c) => c.id));
  }

  const addedTemplateIds = new Set(
    creatures.map((c) => c.templateId).filter((id): id is string => Boolean(id))
  );

  // `null` shows the mode picker; picking a card commits to one of the
  // three add panels below, with a "← Choose a different way" link back to
  // `null`. Deliberately never reset back to `null` after a successful add
  // (see each panel's own `onAdd` handler) — the DM stays on whichever
  // panel they picked so adding several creatures in a row via the same
  // method doesn't mean re-choosing a method every time.
  const [addMode, setAddMode] = useState<CreatureAddMode | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const onAddResult = (message: string, variant: "success" | "error") => setToast({ message, variant });

  // Each add panel tracks its own in-flight state locally (`searching`,
  // `importing`, `adding`...) for its own button's label/disabling — but
  // that alone only guards *that* panel's own buttons. Nothing stopped a
  // DM from clicking "← Choose a different way" while e.g. an import was
  // still resolving and firing a second, overlapping add from a
  // freshly-mounted sibling panel. `busy` is tracked one level up here and
  // passed to all three so each panel's buttons stay disabled for the
  // whole app-wide request, not just its own.
  const [busy, setBusy] = useState(false);
  async function addCreatureTracked(input: AddCreatureInput): Promise<Creature> {
    setBusy(true);
    try {
      return await addCreature(input);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        {addMode === null ? (
          <AddCreatureModePicker onPick={setAddMode} />
        ) : (
          <>
            {/* `block`, not the default `inline-block` a bare `<button>`
                renders as — without it this sits a couple pixels lower than
                the mode picker's own `<p>` heading it replaces (the
                inline-block baseline-alignment quirk), which read as the
                whole panel "jumping" when switching in and out of a mode
                despite both elements sharing identical margin/line-height/
                font-size otherwise. */}
            <button
              type="button"
              onClick={() => setAddMode(null)}
              className="mb-3 block text-sm text-slate-400 hover:text-slate-200"
            >
              ← Choose a different way
            </button>
            {addMode === "search" && (
              <AddCreaturePanel
                onAdd={addCreatureTracked}
                addedTemplateIds={addedTemplateIds}
                category={category}
                onResult={onAddResult}
                busy={busy}
              />
            )}
            {addMode === "import" && (
              <ImportCreaturePanel
                onAdd={addCreatureTracked}
                characters={characters}
                category={category}
                onResult={onAddResult}
                busy={busy}
              />
            )}
            {addMode === "manual" && (
              <AddManuallyPanel onAdd={addCreatureTracked} category={category} onResult={onAddResult} busy={busy} />
            )}
          </>
        )}
      </div>
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}

      <h3 className={`mb-3 mt-5 ${FORM_SECTION_HEADING_CLS}`}>Added Creatures</h3>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className={`min-w-0 flex-1 ${inputCls}`}
        />
        <SegmentedControl
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "active", label: `Active (${activeCount})` },
            { value: "hidden", label: `Hidden (${hiddenCount})` },
          ]}
        />
      </div>
      {visibleList.length === 0 ? (
        <p className={EMPTY_STATE_CLS}>
          {inCategory.length === 0
            ? `No ${CREATURE_CATEGORY_LABELS[category].toLowerCase()} yet.`
            : "No matches for the current search/filter."}
        </p>
      ) : (
        <DndContext id="creatures-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleList.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {visibleList.map((creature) => (
                <CreatureRow
                  key={creature.id}
                  creature={creature}
                  characters={characters}
                  onEdit={setEditingCreature}
                  onRemove={removeCreature}
                  onToggleHidden={handleToggleHidden}
                  onDuplicate={handleDuplicate}
                  onShowHpHistory={() => setHpHistoryCreature(creature)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {editingCreature && (
        <EditCreatureModal
          creature={editingCreature}
          characters={characters}
          onClose={() => setEditingCreature(null)}
          onUpdate={updateCreature}
        />
      )}

      {hpHistoryCreature && (
        <CreatureHpHistoryModal
          creature={hpHistoryCreature}
          onClear={() => clearHpHistory(hpHistoryCreature.id)}
          onClose={() => setHpHistoryCreature(null)}
        />
      )}
    </div>
  );
}
