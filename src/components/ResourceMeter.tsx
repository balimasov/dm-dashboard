import { RECOVERY_LABELS, Resource } from "@/lib/types";

function DotMeter({ current, max }: { current: number; max: number }) {
  return (
    <span className="tracking-widest text-amber-400">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < current ? "●" : "○"}</span>
      ))}
    </span>
  );
}

export function ResourceMeter({ resource }: { resource: Resource }) {
  const showDots = resource.max > 0 && resource.max <= 6;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{resource.name}</span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        {showDots && <DotMeter current={resource.current} max={resource.max} />}
        <span className="text-slate-100 font-medium">
          {resource.current}/{resource.max}
        </span>
        <span className="text-xs text-slate-500">
          {RECOVERY_LABELS[resource.recovery]}
        </span>
      </span>
    </div>
  );
}
