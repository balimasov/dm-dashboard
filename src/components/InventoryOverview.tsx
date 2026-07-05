import { CATEGORY_LABELS, CATEGORY_ORDER, Character, currencyToGp, ItemCategory, ItemRarity } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";

const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: "text-slate-300",
  Uncommon: "text-emerald-400",
  Rare: "text-sky-400",
  "Very Rare": "text-violet-400",
  Legendary: "text-amber-400",
  Artifact: "text-red-400",
  Varies: "text-slate-500",
  Unknown: "text-slate-500",
};

const COIN_ORDER = ["pp", "gp", "ep", "sp", "cp"] as const;

interface ItemGroup {
  name: string;
  rarity: ItemRarity;
  description?: string;
  holders: Array<{ character: string; quantity: number }>;
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
      items.get(key)!.holders.push({ character: c.name, quantity: item.quantity });
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
 * Splits an ordered row list into two contiguous slices — a category's items
 * are free to break across the column boundary (so the two columns come out
 * within one row of each other instead of following whole-category chunks,
 * which left large gaps whenever the categories didn't happen to divide
 * evenly). A synthetic "continued" header is inserted at the top of the
 * right column when a category's items resume there, so it's never unclear
 * which category a row belongs to. The only rule enforced: never leave a
 * category header as the last row of the left column with none of its items
 * following it — that header is pushed to the right column instead.
 *
 * Rendered as two real DOM columns (CSS Grid), not a `columns-*`
 * multi-column layout: a multi-column formatting context is a known source
 * of containing-block bugs for `position: absolute` descendants, which is
 * exactly what previously made item hover tooltips jump.
 */
function splitRowsIntoColumns(rows: InventoryRow[]): [InventoryRow[], InventoryRow[]] {
  if (rows.length <= 1) return [rows, []];
  let splitIndex = Math.ceil(rows.length / 2);
  while (splitIndex > 0 && rows[splitIndex - 1].kind === "header") splitIndex--;
  if (splitIndex === 0) return [rows, []];

  const left = rows.slice(0, splitIndex);
  const right = rows.slice(splitIndex);
  if (right[0]?.kind === "item") {
    right.unshift({ kind: "header", category: right[0].category, continued: true });
  }
  return [left, right];
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
              className={`text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                idx === 0 ? "mb-2" : "mb-2 mt-3 border-t border-slate-800 pt-3"
              }`}
            >
              {CATEGORY_LABELS[row.category]}
              {row.continued && <span className="ml-1 normal-case text-slate-600">(продовження)</span>}
            </h3>
          );
        }
        const { item } = row;
        const holdersText = item.holders
          .map((h) => (h.quantity > 1 ? `${h.character} x${h.quantity}` : h.character))
          .join(", ");
        return (
          <div key={`${row.category}-${item.name}`} className="flex items-center gap-3 py-0.5">
            <span className="min-w-0 flex-1">
              <ItemName item={item} />
            </span>
            <span title={holdersText} className="max-w-[45%] shrink-0 truncate text-right text-xs text-slate-500">
              {holdersText}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CurrencyLine({ character }: { character: Character }) {
  return (
    <p>
      <span className="text-slate-100">{character.name}:</span>{" "}
      {COIN_ORDER.filter((k) => character.currency[k] > 0)
        .map((k) => `${character.currency[k]} ${k.toUpperCase()}`)
        .join(", ")}
    </p>
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

export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildCategoryGroups(characters);
  const charactersWithCurrency = characters.filter((c) => COIN_ORDER.some((k) => c.currency[k] > 0));
  const totalGp = characters.reduce((sum, c) => sum + currencyToGp(c.currency), 0);

  const [leftRows, rightRows] = splitRowsIntoColumns(flattenToRows(groups));
  const [leftCurrency, rightCurrency] = splitIntoColumns(charactersWithCurrency, () => 1);

  if (groups.length === 0 && charactersWithCurrency.length === 0) {
    return <p className="text-sm text-slate-500">Немає предметів чи грошей у жодного персонажа.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
          {rightRows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-slate-800">
              <div className="sm:pr-6">
                <InventoryColumn rows={leftRows} />
              </div>
              <div className="sm:pl-6">
                <InventoryColumn rows={rightRows} />
              </div>
            </div>
          ) : (
            <InventoryColumn rows={leftRows} />
          )}
        </div>
      )}

      {charactersWithCurrency.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Гроші</h3>
          {rightCurrency.length > 0 ? (
            <div className="grid grid-cols-1 text-sm text-slate-300 sm:grid-cols-2 sm:divide-x sm:divide-slate-800">
              <div className="space-y-1 sm:pr-6">
                {leftCurrency.map((c) => (
                  <CurrencyLine key={c.id} character={c} />
                ))}
              </div>
              <div className="space-y-1 sm:pl-6">
                {rightCurrency.map((c) => (
                  <CurrencyLine key={c.id} character={c} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-slate-300">
              {leftCurrency.map((c) => (
                <CurrencyLine key={c.id} character={c} />
              ))}
            </div>
          )}
          <p className="mt-2 border-t border-slate-800 pt-2 text-sm font-medium text-amber-300">
            Загалом по партії: {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)} GP
          </p>
        </div>
      )}
    </div>
  );
}
