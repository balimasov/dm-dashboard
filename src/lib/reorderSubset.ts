import { arrayMove } from "@dnd-kit/sortable";

/**
 * Reorders only the items matching `predicate` (moving `activeId` to
 * `overId`'s slot among just those), leaving every other item's position in
 * the full list untouched — the dashboard's Party row and each creature
 * category row are each a *visible-only* slice of a larger, DB-persisted
 * `position` ordering (hidden characters/creatures, and every *other*
 * creature category, aren't part of what's actually draggable in a given
 * row). `reorderCharacters`/`reorderCreatures` set `position` from array
 * index for exactly the ids passed in, so handing them a bare subset would
 * both scramble the untouched groups' own relative order (their `position`
 * values would collide with the freshly 0-indexed subset) and — worse —
 * silently drop every id *not* in that subset from client state (`useCharacters`/
 * `useCreatures` treat "not in orderedIds" as "no longer present"). Returning
 * the complete list's id order, with only the matching items permuted,
 * avoids both.
 */
export function reorderSubset<T extends { id: string }>(
  fullList: T[],
  predicate: (item: T) => boolean,
  activeId: string,
  overId: string
): string[] {
  const subset = fullList.filter(predicate);
  const oldIndex = subset.findIndex((item) => item.id === activeId);
  const newIndex = subset.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return fullList.map((item) => item.id);
  }
  const reordered = arrayMove(subset, oldIndex, newIndex);
  let cursor = 0;
  return fullList.map((item) => (predicate(item) ? reordered[cursor++].id : item.id));
}
