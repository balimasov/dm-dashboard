export function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md border py-1.5 ${
        highlight ? "border-amber-700 bg-amber-950/30" : "border-slate-800 bg-slate-800/40"
      }`}
    >
      <span className={`text-sm font-bold ${highlight ? "text-amber-300" : "text-slate-100"}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}
