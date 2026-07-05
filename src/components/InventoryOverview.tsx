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

const COIN_COLOR: Record<(typeof COIN_ORDER)[number], string> = {
  pp: "text-slate-200",
  gp: "text-amber-400",
  ep: "text-teal-300",
  sp: "text-slate-400",
  cp: "text-orange-400",
};

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

function CurrencyConversionPanel() {
  const rows: Array<[string, string]> = [
    ["1 PP", "10 GP"],
    ["1 EP", "0.5 GP"],
    ["1 SP", "0.1 GP"],
    ["1 CP", "0.01 GP"],
  ];
  return (
    <div>
      <p className="mb-1.5 font-medium text-slate-200">Курс конвертації в GP:</p>
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

function CoinChip({ coin, amount }: { coin: (typeof COIN_ORDER)[number]; amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-0.5 text-xs font-medium">
      <span className={COIN_COLOR[coin]}>{amount}</span>
      <span className="text-slate-500">{coin.toUpperCase()}</span>
    </span>
  );
}

function CurrencyRow({ character }: { character: Character }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-100">{character.name}</span>
      <div className="flex flex-wrap gap-1.5">
        {COIN_ORDER.filter((k) => character.currency[k] > 0).map((k) => (
          <CoinChip key={k} coin={k} amount={character.currency[k]} />
        ))}
      </div>
    </div>
  );
}

export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildCategoryGroups(characters);
  const charactersWithCurrency = characters.filter((c) => COIN_ORDER.some((k) => c.currency[k] > 0));
  const totalGp = characters.reduce((sum, c) => sum + currencyToGp(c.currency), 0);

  const [leftRows, rightRows] = splitRowsIntoColumns(flattenToRows(groups));

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
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <InfoTooltip panel={<CurrencyConversionPanel />}>Гроші</InfoTooltip>
            </h3>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-300">
                {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)} GP
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-600">Загалом по партії</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {charactersWithCurrency.map((c) => (
              <CurrencyRow key={c.id} character={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
