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

function buildCategoryGroups(characters: Character[]): Array<{ category: ItemCategory; items: ItemGroup[] }> {
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

export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildCategoryGroups(characters);
  const charactersWithCurrency = characters.filter((c) => COIN_ORDER.some((k) => c.currency[k] > 0));
  const totalGp = characters.reduce((sum, c) => sum + currencyToGp(c.currency), 0);

  if (groups.length === 0 && charactersWithCurrency.length === 0) {
    return <p className="text-sm text-slate-500">Немає предметів чи грошей у жодного персонажа.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <div
              key={group.category}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20"
            >
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS[group.category]}
              </h3>
              <ul className="space-y-1.5 text-sm">
                {group.items.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      <ItemName item={item} />
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {item.holders
                        .map((h) => (h.quantity > 1 ? `${h.character} x${h.quantity}` : h.character))
                        .join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {charactersWithCurrency.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Гроші</h3>
          <div className="space-y-1 text-sm text-slate-300">
            {charactersWithCurrency.map((c) => (
              <p key={c.id}>
                <span className="text-slate-100">{c.name}:</span>{" "}
                {COIN_ORDER.filter((k) => c.currency[k] > 0)
                  .map((k) => `${c.currency[k]} ${k.toUpperCase()}`)
                  .join(", ")}
              </p>
            ))}
          </div>
          <p className="mt-2 border-t border-slate-800 pt-2 text-sm font-medium text-amber-300">
            Загалом по партії: {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)} GP
          </p>
        </div>
      )}
    </div>
  );
}
