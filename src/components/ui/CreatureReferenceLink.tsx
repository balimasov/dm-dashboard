import { ExternalLinkIcon } from "./icons";

/**
 * A creature's optional `referenceUrl` — used identically by `CreatureCard`
 * and `CreatureDetailsModal`, same spot as `DdbSyncStatus` on the character
 * side. Unlike `DdbSyncStatus`, there's no sync state to reflect (a creature
 * has no importer to sync from — see `Creature.referenceUrl`'s own doc
 * comment), so this is just the bare link. Renders nothing when unset.
 */
export function CreatureReferenceLink({ url }: { url?: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs leading-none text-sky-400 hover:underline"
    >
      Reference <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}
