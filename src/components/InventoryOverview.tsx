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

/**
 * Splits an ordered list into two contiguous slices (like a phonebook split
 * across two printed columns) balanced by `weight` rather than raw count, so
 * e.g. one huge category and three tiny ones don't end up 1-vs-3.  Kept as
 * two real DOM columns (CSS Grid) instead of a `columns-*` multi-column
 * layout: entries never get sliced mid-way, and — since a multi-column
 * formatting context is a known source of containing-block bugs for
 * `position: absolute` descendants — this also keeps item hover tooltips
 * from mispositioning.
 */
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

function CategoryBlock({ group }: { group: CategoryGroup }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {CATEGORY_LABELS[group.category]}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {group.items.map((item) => {
          const holdersText = item.holders
            .map((h) => (h.quantity > 1 ? `${h.character} x${h.quantity}` : h.character))
            .join(", ");
          return (
            <li key={item.name} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <ItemName item={item} />
              </span>
              <span
                title={holdersText}
                className="max-w-[45%] shrink-0 truncate text-right text-xs text-slate-500"
              >
                {holdersText}
              </span>
            </li>
          );
        })}
      </ul>
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

export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildCategoryGroups(characters);
  const charactersWithCurrency = characters.filter((c) => COIN_ORDER.some((k) => c.currency[k] > 0));
  const totalGp = characters.reduce((sum, c) => sum + currencyToGp(c.currency), 0);

  const [leftGroups, rightGroups] = splitIntoColumns(groups, (g) => g.items.length);
  const [leftCurrency, rightCurrency] = splitIntoColumns(charactersWithCurrency, () => 1);

  if (groups.length === 0 && charactersWithCurrency.length === 0) {
    return <p className="text-sm text-slate-500">Немає предметів чи грошей у жодного персонажа.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
          {rightGroups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-slate-800">
              <div className="divide-y divide-slate-800 sm:pr-6">
                {leftGroups.map((group) => (
                  <CategoryBlock key={group.category} group={group} />
                ))}
              </div>
              <div className="divide-y divide-slate-800 sm:pl-6">
                {rightGroups.map((group) => (
                  <CategoryBlock key={group.category} group={group} />
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {leftGroups.map((group) => (
                <CategoryBlock key={group.category} group={group} />
              ))}
            </div>
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
