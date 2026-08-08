import { InfoTooltip } from "@/components/InfoTooltip";

/**
 * One icon + hover-hint + text row — the shared shape behind every quick
 * combat stat (AC/Speed/Initiative/Prof for a character; AC/Speed/
 * Initiative/Languages/CR for a creature). Both cards build their own stack
 * of these rather than each hand-rolling the icon/tooltip/truncate markup
 * per stat, so a future change to how one of these rows looks (spacing,
 * icon size, tooltip behavior) only has to happen here.
 *
 * The hint anchors to `label` only (e.g. just "AC"), not the value next to
 * it — consistent with every other hint in these cards except the ones on
 * skills/passive-perception/resources/spells/features, which hint the whole
 * pill or row since there's no separate "name" part to isolate there.
 */
export function IconStat({
  icon,
  panel,
  label,
  children,
  className = "",
  valueTitle,
}: {
  icon: React.ReactNode;
  panel: React.ReactNode;
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Shown as a native hover tooltip over the value itself (not the label) — for a value long enough to truncate (e.g. a creature's Languages line), so the full text is still reachable on hover instead of just cut off. */
  valueTitle?: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      {icon}
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        <InfoTooltip panel={panel}>
          {/* Same muted-label-plus-colon convention `SenseEntries`/`DamageInfoList` already use for Darkvision/Resist/Immune — this row used to be the one place with a bare, brighter (inherited `text-slate-300`) label and no colon. */}
          <span className="text-slate-500">{label}:</span>
        </InfoTooltip>
        <span title={valueTitle} className="min-w-0 flex-1 truncate">
          {children}
        </span>
      </span>
    </span>
  );
}
