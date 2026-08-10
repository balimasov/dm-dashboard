import { CustomConditionTemplate } from "@/lib/types";
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

/**
 * Same shape as `ConditionHintPanel`, for a homebrew `CustomConditionTemplate` —
 * there's no `conditionInfo.ts` lookup for these, so the description comes
 * straight from the condition itself (the same text that also gets sent to
 * the AI assistant, see `assistantContext.ts`).
 */
export function CustomConditionHintPanel({ name, description }: { name: string; description?: string }) {
  return (
    <p>
      <span className="font-semibold text-slate-100">{name}</span>
      {description ? `: ${description}` : ""}
    </p>
  );
}

/** Stacked list of `ConditionHintPanel`s (and, when present, `CustomConditionHintPanel`s first) — for a hint that names more than one condition at once (`StatusRail`'s overflow badge). */
export function ConditionsListHintPanel({
  conditions,
  customConditions = [],
}: {
  conditions: string[];
  customConditions?: CustomConditionTemplate[];
}) {
  return (
    <div className="space-y-1.5">
      {customConditions.map((c) => (
        <CustomConditionHintPanel key={c.id} name={c.name} description={c.description} />
      ))}
      {conditions.map((condition) => (
        <ConditionHintPanel key={condition} condition={condition} />
      ))}
    </div>
  );
}
