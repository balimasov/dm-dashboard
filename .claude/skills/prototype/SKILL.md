---
name: prototype
description: Use before building any clickable prototype/mockup for a dm-dashboard UI idea — a new feature exploration, redesign variants, or a screen the user wants to click through before real implementation. Pins the app's actual design tokens (colors, typography, container shapes, icons) so every prototype looks like it belongs to this app instead of reinventing its look each time. Trigger on requests like "зроби прототип", "клікабельний прототип", "накидай варіанти дизайну/UI", "покажи як це може виглядати" — anything asking for a mockup/exploration before writing real code.
---

# dm-dashboard prototyping

This skill exists because prototypes built without it drift — different accent color, different font pairing, different card shapes every time — even though the real app already has one settled visual language. The fix isn't creative freedom per prototype; it's pulling from the same tokens every time, listed below. Don't invent new colors/type/shapes when a value below already covers the case — that defeats the point of this skill.

This is a **project-specific override** of the general `artifact-design` skill's "honor what's already there" step: load `artifact-design` too for its process guidance (sketch-before-build, avoiding generic AI-design defaults, build hygiene), but on any concrete value — a hex/oklch color, a class string, a spacing number — **this file wins**.

## The app in one paragraph

DM Dashboard is a utilitarian, information-dense, **dark-only** tool (no light theme — `color-scheme: dark`, no toggle). No hero sections, no marketing copy, no custom display webfont. It reads more like a cockpit/control panel than a landing page: cards, badges, pills, dense stat grids. Default to this register for every prototype — resist the pull toward a more "designed" landing-page treatment unless the user explicitly asks for one.

## Color tokens

The app reskins Tailwind's own `slate` and `sky` ramps in `src/app/globals.css` (warm "parchment/brass" hue ~60-65° instead of cool blue ~257°, same lightness steps) — so **every plain `bg-slate-*`/`text-slate-*`/`border-slate-*` and `*-sky-*` utility already renders the app's real neutral/accent colors**. In a prototype you write as a self-contained HTML artifact (no Tailwind build step), inline the closest actual values instead of guessing generic slate/sky hex:

- Background (page): `oklch(12.9% 0.03 60)` ≈ `#1c1712` — warm near-black, not pure black/blue-black.
- Foreground (body text): `oklch(96.8% 0.008 60)` ≈ `#f5f2ee` — warm off-white.
- Neutral ramp (slate, warm-shifted): 50 `#faf9f7`, 200 `#e4dfd8`, 400 `#a89f92`, 500 `#847a6c`, 700 `#4a4238`, 800 `#3a332b`, 900 `#2b251f`, 950 `#1c1712`.
- Accent ramp (sky, warm-shifted — buttons/links/focus rings): 400 `#d9a45c`-ish warm amber-gold, 500 `#c88f45`, 600 `#a8763a` (primary button fill), 700 `#8a6030`.
- Don't hand-roll these from scratch per prototype — treat the above as fixed swatches. If a prototype needs a shade not listed, sample it as the same warm hue (~60-65°) at Tailwind's stock slate/sky lightness step, not a cool gray/blue.

Semantic colors (untouched by the reskin — these are literal Tailwind slate/sky-independent hues, reuse exactly):
- **HP bar**: `emerald-500` (healthy) → `amber-500` (mid) → `red-600` (critical). Temp HP: `amber-400`.
- **Concentration**: `violet-500`/`violet-600` (pulsing ring around the whole card, see `.concentrating-ring`).
- **Exhaustion / danger ring**: `red-500`/`red-600`.
- **Selected/active state on a toggle pill** (standard condition, custom condition, any "on" chip): `border-amber-500 bg-amber-500/10 text-amber-300`. Inactive: `border-slate-700 text-slate-400`, hover `hover:border-slate-500 hover:text-slate-200`.
- **Homebrew / custom (DM-authored, not official) content**: `border-dashed` — this is the app's one existing visual signal for "not official SRD content," already used on custom-condition badges/pills. Reuse it any time a prototype needs to distinguish user-created from built-in content; don't invent a new marker (a badge, a different color) for the same meaning.
- **Delete/danger action hover**: `hover:bg-red-950/30 hover:text-red-400`.
- **Primary action**: solid `bg-sky-600` pill, `hover:bg-sky-500`, white text (this is warm-gold in the actual reskinned palette, not literal blue).
- **Inline error text**: `text-red-400`. **Warning text**: `text-amber-400`.

## Typography

No custom typeface — `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Don't pair in a display/body combo the way a marketing page would; this app uses one system stack at different weights/sizes throughout. Real recipes (`src/components/ui/typography.ts`), copy the exact classes into a prototype rather than approximating:

- Page/big-section title: `text-2xl font-bold text-slate-50`
- Modal title: `text-lg font-bold text-slate-50`
- Card title (character/creature name): `text-lg font-semibold text-slate-50`
- Card subtitle (class/level line): `text-sm text-slate-400`
- List-row title: `text-lg font-semibold text-slate-100`
- Form section heading (uppercase): `text-sm uppercase tracking-wide text-slate-500`
- Micro label (small uppercase in-card header): `text-[10px] uppercase tracking-wide text-slate-500`
- Muted caption/hint: `text-xs text-slate-500`
- Muted body / "nothing here yet": `text-sm text-slate-500` (empty-state variant one shade darker: `text-sm text-slate-600`)

## Shapes / containers

- Card (character/creature card, toolkit card): `rounded-xl border shadow-lg shadow-black/20`, background `border-slate-800 bg-slate-900/60`.
- Row card (roster row, list row): `rounded-lg border border-slate-800 bg-slate-900/60`.
- Floating popover/dropdown: `rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/40`.
- Quick-action floating panel (FAB menu): `rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl` — deliberately darker than the popover above.
- Toggle pill (condition, chip): small rounded-full or rounded-md border pill, sized to its text, not a big touch-target button — see the active/inactive classes above.
- Icon-only button, 4 tones, all get the same `rounded p-1` hover-square: `neutral` (dismiss/close, gray), `muted` (row action like edit/duplicate, dimmer gray), `danger` (delete, red-tinted), `accent` (add/create, gold/sky-tinted).

## Icons

Never invent new SVG glyphs or reach for an emoji as a stand-in icon (the app has a real hand-drawn icon set at `src/components/ui/icons.tsx` — pencil, trash/trash-outline, plus/gear/eye, shield/speed/initiative/proficiency, dozens more). Before drawing any icon in a prototype:
1. `Grep`/skim `src/components/ui/icons.tsx` for a name matching the concept.
2. If found, copy its actual `<path>`/`<svg>` markup into the prototype so the icon reads as the same icon a real screenshot would show — this matters a lot when the user is comparing the prototype against a real screenshot (see Methodology below).
3. If genuinely nothing fits, keep the new glyph in the same stroke-based, single-color, no-fill-unless-toggled style as the existing set — not a different icon family/weight.

## Methodology (established over several rounds this session)

1. **Build as a single self-contained HTML file**, published via the `Artifact` tool — that's what makes it clickable/shareable, and keeps it out of the real codebase until a design is actually approved.
2. **When the design space is genuinely open** (more than one reasonable approach), build 2-3 named variants side by side with a picker, not one committed guess. Once the user picks a direction, stop maintaining the losing variants.
3. **When the user gives a size/scale/behavior note** ("зроби на 5x більшим", "виправ висоту"), fix the underlying mechanism (e.g. a mock container sized to sparse content, not to the real intended size) — don't just bump one number without checking why it was wrong.
4. **When the user says the current *production* look is fine and only wants help with a specific *mechanism*** (e.g. "not how it looks, how it's configured"), don't touch the visual output of the part they said is fine — confine changes to the flow/mechanism they actually asked about. Re-read their correction literally rather than re-interpreting it.
5. **When the user posts a real screenshot of the actual app**, rebuild the mock to match it as closely as possible — exact badge shapes, exact spacing, exact icon — before iterating on the new idea layered on top. A prototype that doesn't match the real starting point isn't testing the right change.
6. **Verify visually before showing it** — take a Playwright screenshot of the published/rendered artifact and actually look at it (both variants, both any toggled states) rather than trusting the markup alone. This catches the same class of bug that hit this skill's own motivating case (a popover clipped/collapsed because its mock container didn't match real dimensions).
7. **Iterate on explicit numbered feedback.** When the user gives a numbered list of changes, address each number explicitly and confirm what changed — don't fold them into a vague "updated it" pass.

## When a token isn't listed here

Grep the real source first (`src/app/globals.css` for palette/keyframes, `src/components/ui/containerStyles.ts`, `src/components/ui/typography.ts`, `src/components/ui/icons.tsx`, `src/components/ui/Button.tsx` / `IconButton.tsx`) rather than guessing — this file is a snapshot, not the source of truth. If you find a real, reusable value that should live here for next time, add it back to this file so the next prototype doesn't have to re-derive it.
