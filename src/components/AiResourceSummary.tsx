import { Character, Creature } from "@/lib/types";
import { ordinalLevel } from "@/lib/format";
import { DotMeter, ResourceMeter } from "./ResourceMeter";
import { MUTED_LABEL_CLS } from "./ui/typography";

/**
 * Compact spell-slot/limited-use resource block shown under the AI
 * assistant's action-category blocks — deliberately rendered purely from
 * the entity's own `current_state`, never from the AI response itself
 * (`AiTacticalResponse` carries no resource numbers at all): the sheet is
 * already the single source of truth for these, so recomputing them here
 * sidesteps ever needing the model to echo a count back accurately. Reuses
 * `DotMeter`/`ResourceMeter` — the exact same pips and hover hint the main
 * character card already shows for these, not a new visual language.
 *
 * Creatures have no resource-tracking data model (no `spellSlots`/
 * `resources` fields, just free-text `recharge` on a trait) — renders
 * nothing for one.
 */
export function AiResourceSummary({ entity }: { entity: Character | Creature }) {
  if (!("className" in entity)) return null;
  const c = entity;
  const slots = c.spellSlots.filter((s) => s.max > 0);
  if (slots.length === 0 && c.resources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {slots.length > 0 && (
        <div>
          <p className={MUTED_LABEL_CLS}>Spell Slots</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {slots.map((s) => (
              <div key={s.level} className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-slate-400">{ordinalLevel(s.level)}</span>
                {s.max <= 6 ? (
                  <DotMeter current={s.current} max={s.max} colorClass="bg-violet-400" />
                ) : (
                  <span className="font-medium text-slate-100">
                    {s.current}/{s.max}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {c.resources.length > 0 && (
        <div>
          <p className={MUTED_LABEL_CLS}>Limited Uses</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {c.resources.map((r) => (
              <ResourceMeter key={r.id} resource={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
