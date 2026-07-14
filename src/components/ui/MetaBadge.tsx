import { ReactNode } from "react";
import { InfoTooltip } from "../InfoTooltip";

/**
 * Small bordered uppercase badge with a hover/tap hint — the shared visual
 * and behavioral base for every short meta-tag in the Party Toolkit and
 * character cards (recovery type, spell level, Cantrip...). Only the
 * border/text color varies per badge family, chosen deliberately to carry
 * identity (neutral slate for recovery type, violet for spell level/
 * Cantrip) — everything else (size, shape, uppercase weight, and the hint
 * itself working the same way via `InfoTooltip`, including mobile tap) stays
 * identical, so every badge in the app reads and behaves the same way.
 */
export function MetaBadge({ label, panel, colorClassName }: { label: string; panel: ReactNode; colorClassName: string }) {
  return (
    <InfoTooltip hoverOnly panel={panel}>
      <span className={`shrink-0 whitespace-nowrap rounded border px-1 text-[10px] font-medium uppercase ${colorClassName}`}>
        {label}
      </span>
    </InfoTooltip>
  );
}
