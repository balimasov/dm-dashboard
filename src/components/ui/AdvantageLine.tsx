import { ReactNode } from "react";

/**
 * The one advantage/disadvantage line every hint panel in the app uses —
 * `AbilityScoreHintPanel` (saving throws) and `SkillPanel` (skill checks)
 * used to each hand-roll their own version of this and drifted apart: one
 * colored the whole line, the other only the triangle. Only the ▲/▼ glyph
 * carries the color here — the same convention the skill/passive pills
 * themselves already use for their own inline arrow (`CharacterCard.tsx`,
 * `partyToolkit/SkillsPanel.tsx`) — so the hint reads as the same signal the
 * pill already showed, not a second, differently-styled one.
 */
export function AdvantageLine({ kind, children }: { kind: "advantage" | "disadvantage"; children: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 border-t border-slate-800 pt-2 text-xs leading-snug text-slate-300">
      <span className={`mt-px shrink-0 ${kind === "advantage" ? "text-emerald-400" : "text-red-400"}`}>
        {kind === "advantage" ? "▲" : "▼"}
      </span>
      <span>{children}</span>
    </p>
  );
}
