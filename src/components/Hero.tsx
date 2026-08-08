import { PAGE_TITLE_CLS } from "./ui/typography";

/**
 * The app's own intro — logo, name, one-paragraph pitch. Shared by the login
 * page and the campaigns list, the two places a visitor lands before picking
 * a campaign, so both introduce the app identically; edit this one file to
 * change either.
 *
 * The logo is 2x its original pixel size (144px, was 72px) but only at the
 * `sm` breakpoint and up — at full size on a narrow phone it (plus the
 * tagline paragraph below it) pushed the campaign list below the fold,
 * leaving barely one row visible without scrolling. The tagline is hidden
 * below `sm` for the same reason: on the campaigns list it was the single
 * biggest chunk of vertical space between "you opened the page" and "you can
 * see your campaigns," and on the login page (this component's only other
 * caller) losing four lines of marketing copy costs nothing a phone user
 * needs. Verified with Playwright at a 375×667 viewport: 2-3 campaign rows
 * stay visible above the fold with 3 real campaigns in the list.
 */
export function Hero() {
  return (
    <div className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-10 sm:gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset, no need for next/image here */}
      <img src="/logo.png" alt="" width={144} height={144} className="h-18 w-18 sm:h-36 sm:w-36" />
      <h1 className={PAGE_TITLE_CLS}>DM Dashboard</h1>
      <p className="hidden max-w-xl text-sm text-slate-400 sm:block">
        Running a campaign means juggling character sheets, notes, and a dozen D&D Beyond tabs with no single
        place that has it all. DM Dashboard pulls a whole party — combat stats, inventory, spells, and notes —
        into one screen that stays in sync. Built for my own table, now shared with the rest of the DM community.
      </p>
    </div>
  );
}
