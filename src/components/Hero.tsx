/** The app's own intro — logo, name, one-paragraph pitch. Shared by the login page and the campaigns list, the two places a visitor lands before picking a campaign, so both introduce the app identically; edit this one file to change either. */
export function Hero() {
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
      <img src="/logo.png" alt="" width={72} height={72} />
      <h1 className="text-2xl font-bold text-slate-50">DM Dashboard</h1>
      <p className="max-w-xl text-sm text-slate-400">
        Running a campaign means juggling character sheets, notes, and a dozen D&D Beyond tabs with no single
        place that has it all. DM Dashboard pulls a whole party — combat stats, inventory, spells, and notes —
        into one screen that stays in sync. Built for my own table, now shared with the rest of the DM community.
      </p>
    </div>
  );
}
