/**
 * The app's one loading spinner — was hand-copied identically in three
 * places (`CampaignJournalModal.tsx` twice, `GlobalLoadingIndicator.tsx`
 * once) before being pulled into one place. `className` overrides the
 * default `h-6 w-6` sizing for a call site that needs something different.
 */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-slate-700 border-t-sky-400 ${className}`} />;
}
