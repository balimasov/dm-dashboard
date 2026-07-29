/**
 * Merges what used to be two separate "Stats"/"Saving Throws" sections
 * (each its own `StatBox` grid) into one six-box grid — each box stacks the
 * ability modifier over the save bonus instead of two full grids each with
 * their own heading/gap. Same numbers as before, just paired per ability
 * instead of laid out as two passes over the same six letters — shared by
 * `CharacterCard`/`CharacterDetailsModal` and `CreatureStatBlock` so all
 * three read as the exact same recipe rather than three near-identical
 * hand-copies. `highlight` is a plain boolean the caller computes its own
 * way — a character's is "has a saving-throw proficiency", a creature's is
 * "differs from its raw ability modifier" — this component doesn't need to
 * know which.
 */
export function AbilityScoreBox({
  label,
  modifier,
  save,
  highlight,
}: {
  label: string;
  modifier: string;
  save: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border border-slate-800 bg-slate-800/40 py-1.5">
      <span className="text-sm font-bold text-slate-100">{modifier}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-amber-300" : "text-slate-400"}`}>{save}</span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}
