import { CATEGORY_LABELS, CATEGORY_ORDER, Character, currencyToGp, ItemCategory, ItemRarity } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";
import { CharacterChip } from "./ui/CharacterChip";

const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: "text-slate-300",
  Uncommon: "text-emerald-400",
  Rare: "text-blue-400",
  "Very Rare": "text-violet-400",
  Legendary: "text-amber-400",
  Artifact: "text-red-400",
  Varies: "text-slate-500",
  Unknown: "text-slate-500",
};

const COIN_ORDER = ["pp", "gp", "ep", "sp", "cp"] as const;

// Bolder borders/fills than a plain low-opacity tint — against the warm
// dark background introduced with the parchment/brass reskin, a faint
// same-family warm tint (amber, orange) reads as barely-there. `sp` moves
// off `slate` (now part of that warm reskin) to `zinc`, an untouched cool
// neutral — actual silver reads cool/metallic, which also happens to be
// the one coin color guaranteed to stay visible against a warm backdrop.
const COIN_CHIP_CLASS: Record<(typeof COIN_ORDER)[number], string> = {
  pp: "border-violet-400 bg-violet-500/15",
  gp: "border-amber-400 bg-amber-500/15",
  ep: "border-teal-400 bg-teal-500/15",
  sp: "border-zinc-300 bg-zinc-400/15",
  cp: "border-orange-400 bg-orange-500/15",
};

const COIN_CODE_CLASS: Record<(typeof COIN_ORDER)[number], string> = {
  pp: "text-violet-300",
  gp: "text-amber-300",
  ep: "text-teal-300",
  sp: "text-zinc-300",
  cp: "text-orange-300",
};

interface ItemGroup {
  name: string;
  rarity: ItemRarity;
  description?: string;
  holders: Array<{ characterId: string; character: string; avatarUrl?: string; quantity: number }>;
}

interface CategoryGroup {
  category: ItemCategory;
  items: ItemGroup[];
}

type InventoryRow =
  | { kind: "header"; category: ItemCategory; continued?: boolean }
  | { kind: "item"; category: ItemCategory; item: ItemGroup };

function buildCategoryGroups(characters: Character[]): CategoryGroup[] {
  const byCategory = new Map<ItemCategory, Map<string, ItemGroup>>();
  for (const c of characters) {
    for (const item of c.inventory) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, new Map());
      const items = byCategory.get(item.category)!;
      const key = item.name.trim().toLowerCase();
      if (!items.has(key)) {
        items.set(key, { name: item.name, rarity: item.rarity, description: item.description, holders: [] });
      }
      const holders = items.get(key)!.holders;
      const existing = holders.find((h) => h.characterId === c.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        holders.push({ characterId: c.id, character: c.name, avatarUrl: c.avatarUrl, quantity: item.quantity });
      }
    }
  }
  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    items: Array.from(byCategory.get(category)!.values()).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

function flattenToRows(groups: CategoryGroup[]): InventoryRow[] {
  return groups.flatMap((g) => [
    { kind: "header" as const, category: g.category },
    ...g.items.map((item): InventoryRow => ({ kind: "item", category: g.category, item })),
  ]);
}

/**
 * Splits an ordered row list into `numColumns` contiguous slices — a
 * category's items are free to break across a column boundary (so columns
 * come out balanced instead of following whole-category chunks, which left
 * large gaps whenever the categories didn't happen to divide evenly). A
 * synthetic "continued" header is inserted at the top of each column a
 * category's items resume in, so it's never unclear which category a row
 * belongs to. The only rule enforced: never leave a category header as the
 * last row of a column with none of its items following it — that header is
 * pushed to the next column instead.
 *
 * Rendered as real DOM columns (CSS Grid), not a `columns-*` multi-column
 * layout: a multi-column formatting context is a known source of
 * containing-block bugs for `position: absolute` descendants, which is
 * exactly what previously made item hover tooltips jump.
 */
function splitRowsIntoColumns(rows: InventoryRow[], numColumns: number): InventoryRow[][] {
  if (rows.length === 0) return Array.from({ length: numColumns }, () => []);

  const columns: InventoryRow[][] = [];
  let remaining = rows;
  for (let col = 0; col < numColumns - 1; col++) {
    const columnsLeft = numColumns - col;
    if (remaining.length === 0) {
      columns.push([]);
      continue;
    }
    let splitIndex = Math.ceil(remaining.length / columnsLeft);
    while (splitIndex > 0 && remaining[splitIndex - 1].kind === "header") splitIndex--;
    if (splitIndex === 0) {
      columns.push([]);
      continue;
    }
    const colRows = remaining.slice(0, splitIndex);
    let rest = remaining.slice(splitIndex);
    if (rest[0]?.kind === "item") {
      rest = [{ kind: "header", category: rest[0].category, continued: true }, ...rest];
    }
    columns.push(colRows);
    remaining = rest;
  }
  columns.push(remaining);
  return columns;
}

function ItemName({ item }: { item: ItemGroup }) {
  const nameEl = <span className={RARITY_COLOR[item.rarity]}>{item.name}</span>;
  if (!item.description) return nameEl;
  return (
    <InfoTooltip
      panel={
        <p>
          <RichText text={item.description} />
        </p>
      }
    >
      {nameEl}
    </InfoTooltip>
  );
}

function InventoryColumn({ rows }: { rows: InventoryRow[] }) {
  return (
    <div className="text-sm">
      {rows.map((row, idx) => {
        if (row.kind === "header") {
          return (
            <h3
              key={`header-${row.category}-${idx}`}
              className={`text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 ${
                idx > 0
                  ? "mt-3 border-t border-slate-800 pt-3"
                  : row.continued
                    ? "mt-3 border-t border-slate-800 pt-3 sm:mt-0 sm:border-t-0 sm:pt-0"
                    : ""
              }`}
            >
              {CATEGORY_LABELS[row.category]}
              {row.continued && <span className="ml-1 normal-case text-slate-600">(continued)</span>}
            </h3>
          );
        }
        const { item } = row;
        return (
          <div key={`${row.category}-${item.name}`} className="flex items-center gap-3 py-0.5">
            <span className="min-w-0 flex-1">
              <ItemName item={item} />
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              {item.holders.map((h) => (
                <CharacterChip
                  key={h.characterId}
                  name={h.character}
                  avatarUrl={h.avatarUrl}
                  title={h.quantity > 1 ? `${h.character} x${h.quantity}` : h.character}
                />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CurrencyConversionPanel() {
  const rows: Array<[string, string]> = [
    ["1 PP", "10 GP"],
    ["1 EP", "0.5 GP"],
    ["1 SP", "0.1 GP"],
    ["1 CP", "0.01 GP"],
  ];
  return (
    <div>
      <p className="mb-1.5 font-medium text-slate-200">Conversion rate to GP:</p>
      <ul className="space-y-1">
        {rows.map(([coin, gp]) => (
          <li key={coin} className="flex items-baseline justify-between gap-3">
            <span>{coin}</span>
            <span className="text-slate-400">= {gp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoinChip({
  code,
  value,
  chipClass,
  codeClass,
}: {
  code: string;
  value: number | string;
  chipClass: string;
  codeClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${chipClass}`}>
      <span className="text-slate-100">{value}</span>
      <span className={codeClass ?? "text-slate-400"}>{code}</span>
    </span>
  );
}

function CurrencyRow({ character }: { character: Character }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-300">{character.name}</span>
      <div className="flex flex-wrap gap-1.5">
        {COIN_ORDER.filter((k) => character.currency[k] > 0).map((k) => (
          <CoinChip
            key={k}
            code={k.toUpperCase()}
            value={character.currency[k]}
            chipClass={COIN_CHIP_CLASS[k]}
            codeClass={COIN_CODE_CLASS[k]}
          />
        ))}
      </div>
    </div>
  );
}

function splitIntoColumns<T>(entries: T[], weight: (entry: T) => number): [T[], T[]] {
  if (entries.length <= 1) return [entries, []];
  const total = entries.reduce((sum, e) => sum + weight(e), 0);
  let running = 0;
  let splitIndex = entries.length;
  for (let i = 0; i < entries.length; i++) {
    running += weight(entries[i]);
    if (running >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  if (splitIndex >= entries.length) splitIndex = Math.ceil(entries.length / 2);
  return [entries.slice(0, splitIndex), entries.slice(splitIndex)];
}

const ITEM_LIST_COLUMNS = 4;

/** The full party item list, grouped by category — see `CoinsPanel` for currency, kept as a separate panel so the two can sit side by side with `CriticalItemsPanel` above this. */
export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildCategoryGroups(characters);
  if (groups.length === 0) {
    return <p className="text-sm text-slate-500">No items tracked on any character.</p>;
  }

  const columns = splitRowsIntoColumns(flattenToRows(groups), ITEM_LIST_COLUMNS);
  const nonEmptyColumns = columns.filter((c) => c.length > 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      {nonEmptyColumns.length > 1 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col, i) => col.length > 0 && <InventoryColumn key={i} rows={col} />)}
        </div>
      ) : (
        <InventoryColumn rows={nonEmptyColumns[0] ?? []} />
      )}
    </div>
  );
}

/** Party gold, split out from the item list so it can sit next to `CriticalItemsPanel` in one row instead of stacked below the (much taller) item grid. */
export function CoinsPanel({ characters }: { characters: Character[] }) {
  const charactersWithCurrency = characters.filter((c) => COIN_ORDER.some((k) => c.currency[k] > 0));
  const totalGp = characters.reduce((sum, c) => sum + currencyToGp(c.currency), 0);
  const [leftCurrency, rightCurrency] = splitIntoColumns(charactersWithCurrency, () => 1);

  if (charactersWithCurrency.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <InfoTooltip panel={<CurrencyConversionPanel />} inline>
            Coins
          </InfoTooltip>
        </h3>
        <p className="text-sm text-slate-500">No gold on any character.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <InfoTooltip panel={<CurrencyConversionPanel />} inline>
          Coins
        </InfoTooltip>
      </h3>
      {rightCurrency.length > 0 ? (
        <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-y-0 sm:divide-x sm:divide-slate-800">
          <div className="flex flex-col gap-2 sm:pr-6">
            {leftCurrency.map((c) => (
              <CurrencyRow key={c.id} character={c} />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:pl-6">
            {rightCurrency.map((c) => (
              <CurrencyRow key={c.id} character={c} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {leftCurrency.map((c) => (
            <CurrencyRow key={c.id} character={c} />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2">
        <span className="text-sm font-medium text-slate-100">Party total</span>
        <CoinChip
          code="GP"
          value={totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)}
          chipClass={COIN_CHIP_CLASS.gp}
          codeClass={COIN_CODE_CLASS.gp}
        />
      </div>
    </div>
  );
}
