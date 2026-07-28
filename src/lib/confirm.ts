/**
 * Byte-identical `window.confirm` call duplicated across 3 remove-from-
 * campaign affordances (`SortableCharacterRow`, `CreatureRosterEditor`,
 * `EntityActionsMenu`) before being pulled into one place — a future wording
 * change (or swapping the browser confirm for a styled modal) now happens
 * once instead of three times.
 */
export function confirmRemoveFromCampaign(name: string): boolean {
  return window.confirm(`Remove "${name}" from this campaign? This can't be undone.`);
}
