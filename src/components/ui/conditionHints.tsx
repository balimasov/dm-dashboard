import { getConditionInfo } from "@/lib/conditionInfo";

/**
 * Name + mechanical description for one condition — shared by `StatusRail`'s
 * condition badges (full card) and `VitalsPanel`'s compact condition dots
 * (Party Vitals ring), so hovering either shows the exact same content. The
 * two used to hand-roll near-identical JSX independently; verified they were
 * semantically the same (both built from `getConditionInfo`, same name +
 * description) before merging — unlike Exhaustion's hint, which stays two
 * deliberately different depths (full rules text on the card vs. a bare
 * level number on the compact ring) rather than being forced into one.
 */
export function ConditionHintPanel({ condition }: { condition: string }) {
  const info = getConditionInfo(condition);
  return (
    <p>
      <span className="font-semibold capitalize text-slate-100">{condition}</span>
      {info ? `: ${info}` : ""}
    </p>
  );
}

/** Stacked list of `ConditionHintPanel`s — for a hint that names more than one condition at once (`StatusRail`'s overflow badge). */
export function ConditionsListHintPanel({ conditions }: { conditions: string[] }) {
  return (
    <div className="space-y-1.5">
      {conditions.map((condition) => (
        <ConditionHintPanel key={condition} condition={condition} />
      ))}
    </div>
  );
}
