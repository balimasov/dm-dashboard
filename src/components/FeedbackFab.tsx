const FEEDBACK_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1-8HTlPqOw8GXD7lq96pnL0SXAOFdE1PfRCcssn35jJ4/edit?gid=0#gid=0";

function GoogleSheetsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#43A047" d="M37,45H11c-1.657,0-3-1.343-3-3V6c0-1.657,1.343-3,3-3h19l10,10v29C40,43.657,38.657,45,37,45z" />
      <path fill="#C8E6C9" d="M40,13H30V3L40,13z" />
      <g fill="#E8F5E9">
        <rect x="14" y="21" width="20" height="2.5" />
        <rect x="14" y="26" width="20" height="2.5" />
        <rect x="14" y="31" width="20" height="2.5" />
        <rect x="14" y="21" width="2.5" height="12.5" />
        <rect x="22.75" y="21" width="2.5" height="12.5" />
        <rect x="31.5" y="21" width="2.5" height="12.5" />
      </g>
    </svg>
  );
}

export function FeedbackFab() {
  return (
    <a
      href={FEEDBACK_SHEET_URL}
      target="_blank"
      rel="noreferrer"
      className="group fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-black/40 ring-1 ring-slate-700 transition hover:scale-105"
    >
      <GoogleSheetsIcon className="h-7 w-7" />
      <span className="sr-only">Список побажань і доопрацювань (Google Таблиці)</span>
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-56 rounded-md border border-slate-700 bg-slate-950 p-2 text-xs leading-snug text-slate-300 shadow-xl group-hover:block">
        Мої побажання й ідеї для доопрацювання — відкрити Google Таблицю
      </span>
    </a>
  );
}
