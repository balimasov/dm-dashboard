import { RECOVERY_LABELS, RECOVERY_SHORT_LABELS, Resource } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";

/** Fixed-size CSS circles instead of "●"/"○" glyphs — those render at different visual weights per font. */
export function DotMeter({
  current,
  max,
  colorClass = "bg-amber-400",
}: {
  current: number;
  max: number;
  colorClass?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full border ${
            i < current ? `${colorClass} border-transparent` : "border-slate-600"
          }`}
        />
      ))}
    </span>
  );
}

export function ResourceMeter({ resource }: { resource: Resource }) {
  const showDots = resource.max > 0 && resource.max <= 6;
  const hasHint = Boolean(resource.source || resource.description);
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 flex-1 text-slate-300">
        {hasHint ? (
          <InfoTooltip
            panel={
              <div className="space-y-1">
                <p className="font-medium text-slate-100">{resource.name}</p>
                {resource.source && (
                  <p className="text-xs uppercase tracking-wide text-slate-500">{resource.source}</p>
                )}
                {resource.description && (
                  <p>
                    <RichText text={resource.description} />
                  </p>
                )}
              </div>
            }
          >
            {resource.name}
          </InfoTooltip>
        ) : (
          resource.name
        )}
      </span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        {showDots ? (
          <DotMeter current={resource.current} max={resource.max} />
        ) : (
          <span className="text-slate-100 font-medium">
            {resource.current}/{resource.max}
          </span>
        )}
        <span className="text-xs text-slate-500" title={RECOVERY_LABELS[resource.recovery]}>
          {RECOVERY_SHORT_LABELS[resource.recovery]}
        </span>
      </span>
    </div>
  );
}
