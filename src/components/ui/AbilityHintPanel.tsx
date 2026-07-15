import { ReactNode } from "react";
import { CoverageHolder } from "@/lib/partyToolkit";
import { RichText } from "../RichText";
import { HintPanel } from "./HintPanel";

/**
 * One hover-hint shape for every "trackable ability" in the app — a spell, a
 * feature, a limited-use resource, a passive — replacing what used to be
 * six near-identical hand-rolled panels (`SpellPanel`, `FeaturePanel`,
 * `TrackableHintPanel`, `PassiveHintPanel`, the old `ResourceHintPanel`, the
 * old `AbilityHint`) that each got the same "name / meta line / description"
 * shape slightly wrong in a different way (title color `text-white` in some,
 * `text-slate-100` in others; description sometimes through `RichText`,
 * sometimes a raw string that would leak D&D Beyond's own `**bold**`
 * markers as literal asterisks). Every field here is optional except `name`
 * — a resource with no `source` and no `description` still renders a
 * perfectly normal one-line hint instead of an empty box.
 *
 * Built on `HintPanel` rather than duplicating its title/rows layout: this
 * component only composes `metaLines`/`note`/`status`/`description` into
 * that shared component's single `description` slot, so title styling, row
 * rendering, and the empty-state fallback all come from one place.
 */
export function AbilityHintPanel({
  name,
  subtitle,
  metaLines,
  note,
  status,
  description,
  emptyDescription,
  holders,
}: {
  name: ReactNode;
  /** Shown in parens right after the name — a spell's school, most often. */
  subtitle?: string;
  /** Small uppercase caption line(s) below the name — e.g. "Spell · Wizard", "Class · V, S, M", raw D&D Beyond tags. Falsy entries are skipped, so a caller can pass `[kind, isCantrip && "Cantrip", source].join(" · ")`-style conditionals directly. */
  metaLines?: Array<string | undefined | false>;
  /** A plain (non-uppercase) line between the meta lines and the description — e.g. "Material: a Holy Symbol worth 5+ GP". */
  note?: string;
  /** A single colored status fact the caller has already styled — e.g. "Short Rest recovery" in sky-400, or "2 slots available at 1st level or higher" in emerald/red. */
  status?: ReactNode;
  /** Rules text, rendered through `RichText` so D&D Beyond's `**bold**`/`*italic*` markers and line breaks always render instead of leaking as raw characters. */
  description?: string;
  /** Shown instead of `description` when there is none — most callers just omit both and get nothing, but a few (e.g. a reminder with no synced description yet) want an explicit "no description" line. */
  emptyDescription?: string;
  /** "Who has it" rows — same shape every party-wide hint in the app already uses. */
  holders?: CoverageHolder[];
}) {
  const meta = (metaLines ?? []).filter((line): line is string => Boolean(line));
  const hasBody = meta.length > 0 || note || status || description || emptyDescription;

  return (
    <HintPanel
      title={
        <>
          {name}
          {subtitle && <span className="text-slate-500"> ({subtitle})</span>}
        </>
      }
      description={
        hasBody && (
          <span className="block space-y-1">
            {meta.map((line, i) => (
              <span key={i} className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {line}
              </span>
            ))}
            {note && <span className="block text-slate-500">{note}</span>}
            {status && <span className="block text-xs font-medium">{status}</span>}
            {description ? (
              <span className="block">
                <RichText text={description} />
              </span>
            ) : (
              emptyDescription && <span className="block">{emptyDescription}</span>
            )}
          </span>
        )
      }
      rows={holders}
      rowKey={(h: CoverageHolder) => h.characterId}
      renderRow={(h: CoverageHolder) => h.characterName}
    />
  );
}
