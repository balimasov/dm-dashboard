import { Character, currencyToGp, ItemRarity, RARITY_ORDER } from "@/lib/types";

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
  holders: Array<{ character: string; quantity: number }>;
}

function buildRarityGroups(characters: Character[]): Array<{ rarity: ItemRarity; items: ItemGroup[] }> {
  const byRarity = new Map<ItemRarity, Map<string, ItemGroup>>();
  for (const c of characters) {
    for (const item of c.inventory) {
      if (!byRarity.has(item.rarity)) byRarity.set(item.rarity, new Map());
      const items = byRarity.get(item.rarity)!;
      const key = item.name.trim().toLowerCase();
      if (!items.has(key)) items.set(key, { name: item.name, holders: [] });
      items.get(key)!.holders.push({ character: c.name, quantity: item.quantity });
    }
  }
  return RARITY_ORDER.filter((r) => byRarity.has(r)).map((rarity) => ({
    rarity,
    items: Array.from(byRarity.get(rarity)!.values()).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function InventoryOverview({ characters }: { characters: Character[] }) {
  const groups = buildRarityGroups(characters);
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
              key={group.rarity}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20"
            >
              <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${RARITY_COLOR[group.rarity]}`}>
                {group.rarity}
              </h3>
              <ul className="space-y-1.5 text-sm">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <span className="text-slate-100">{item.name}</span>
                    <span className="text-slate-500">
                      {" — "}
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
