---
name: prototype
description: Use before building any clickable prototype/mockup for a dm-dashboard UI idea — a new feature exploration, redesign variants, or a screen the user wants to click through before real implementation. Pins the app's actual design tokens (colors, typography, container shapes, icons) and a standard page structure so every prototype looks like it belongs to this app and reads the same way round to round. Trigger on requests like "зроби прототип", "клікабельний прототип", "накидай варіанти дизайну/UI", "покажи як це може виглядати" — anything asking for a mockup/exploration before writing real code.
---

# dm-dashboard prototyping

This skill exists because prototypes built without it drift — different accent color, different font pairing, different card shapes every time, different variant-numbering scheme every time — even though the real app already has one settled visual language and this skill already has one settled page structure. The fix isn't creative freedom per prototype; it's pulling from the same tokens and the same shape every time, both listed below. Don't invent new colors/type/shapes/structure when a value below already covers the case — that defeats the point of this skill.

This is a **project-specific override** of the general `artifact-design` skill's "honor what's already there" step: load `artifact-design` too for its process guidance (sketch-before-build, avoiding generic AI-design defaults, build hygiene), but on any concrete value — a hex/oklch color, a class string, a spacing number, or the page structure below — **this file wins**.

## The app in one paragraph

DM Dashboard is a utilitarian, information-dense, **dark-only** tool (no light theme — `color-scheme: dark`, no toggle). No hero sections, no marketing copy, no custom display webfont. It reads more like a cockpit/control panel than a landing page: cards, badges, pills, dense stat grids. Default to this register for every prototype — resist the pull toward a more "designed" landing-page treatment unless the user explicitly asks for one.

## Structure of every prototype

Every prototype page this skill produces follows the same shape, top to bottom, regardless of topic:

1. **`<title>`** — names this round's topic. Republish to the same file path (and, if already published, the same artifact `url`) on every update within one thread, so the link never changes mid-conversation.
2. **Requirements block** — always first, before any variant. A ✅/✗ checklist:
   - ✅ what's carrying over unchanged (from earlier in this thread, or from the real production baseline if this is the first round touching this piece of UI).
   - ✅ what's new/being explored in this specific round.
   - ✗ anything explicitly rejected in an earlier round — keep it visible so it doesn't silently get re-proposed a few rounds later.
3. **Current-state block** ("Поточний стан" / "Поточні кольори" / etc.) — only when redesigning something that already ships in the app (not a brand-new feature with no prior form). Built from real extracted values (measured pixels, real component classes — see "Pixel-accurate colors and dimensions" below), not guesses. This is the baseline every variant gets compared against, and it's what makes "is this actually better" answerable at a glance instead of from memory.
4. **Variant blocks**:
   - Default to **exactly 3 variants** on the first request in a round, unless the user names a different count.
   - Numbering is always literal and always leads: **"Варіант 1"**, **"Варіант 2"**, **"Варіант 3"**. A descriptive name comes *after* the number ("Варіант 2 — Збалансований"), never replaces it — no bare "Compact"/"Bold"/named-only variants.
   - A branch within one variant gets a Latin letter appended directly to the number, no space: **"Варіант 2A"**, **"Варіант 2B"**.
   - Each variant block gets its own short rationale (1-2 sentences: what it trades off against the others), not just a visual with no explanation.
5. **Recommendation block** — always present, after every variant, even when the direction seems obvious. State an actual opinion with the trade-off that drove it ("B — the progression reads at a glance without M and SR blurring together"), never just "I like X" with no reason, and never omit it hoping the visuals speak for themselves.
6. **Narrowing protocol**, once the user picks a direction and asks for a follow-up round on it:
   - Delete the losing variants entirely — don't keep them "for context." A reader comparing 3 live options and a reader confirming 1 finished direction need different pages, not the same page with some options grayed out.
   - Keep the chosen one, relabeled with a status tag ("Затверджено" / "Фінал") instead of its old "Варіант N" framing.
   - Keep the current-state block if the thread had one — the comparison-against-shipped-reality stays relevant right up until the change actually ships in code.

## Color tokens

The app reskins Tailwind's own `slate` and `sky` ramps in `src/app/globals.css` (warm "parchment/brass" hue ~60-65° instead of cool blue ~257°, same lightness steps) — so **every plain `bg-slate-*`/`text-slate-*`/`border-slate-*` and `*-sky-*` utility already renders the app's real neutral/accent colors**. In a prototype you write as a self-contained HTML artifact (no Tailwind build step), inline the closest actual values instead of guessing generic slate/sky hex:

- Background (page, and modal panels — both resolve to the same color): `oklch(12.9% 0.03 60)`, measured pixel `#0f0500` — near-black with only a faint warm tint, noticeably darker than it looks written out as oklch. (An earlier version of this file approximated this as `#1c1712` "by eye" from the oklch string — that approximation was wrong enough to be visible once compared side-by-side with the real app; see "Pixel-accurate colors and dimensions" below for how `#0f0500` was actually confirmed.)
- Foreground (body text): `oklch(96.8% 0.008 60)` ≈ `#f5f2ee` — warm off-white.
- Neutral ramp (slate, warm-shifted) — 800 and 900 below are measured pixels (confirmed via canvas readback), the rest are still eye-approximated from the oklch step and worth re-measuring the same way before leaning on them for a pixel-critical prototype: 50 `#faf9f7`, 200 `#e4dfd8`, 400 `#a89f92`, 500 `#847a6c`, 700 `#4a4238`, **800 `#352517` (measured)**, **900 `#231407` (measured)**, 950 `#0f0500` (measured, same as page background above).
- Accent ramp (sky, warm-shifted — buttons/links/focus rings, still eye-approximated, not yet pixel-measured): 400 `#d9a45c`-ish warm amber-gold, 500 `#c88f45`, 600 `#a8763a` (primary button fill), 700 `#8a6030`.
- Don't hand-roll these from scratch per prototype — treat the above as fixed swatches. If a prototype needs a shade not listed, sample it as the same warm hue (~60-65°) at Tailwind's stock slate/sky lightness step, not a cool gray/blue — and if the prototype is pixel-critical, measure it rather than eyeballing the step.

Semantic colors (untouched by the reskin — these are literal Tailwind slate/sky-independent hues, reuse exactly):
- **HP bar**: `emerald-500` (healthy) → `amber-500` (mid) → `red-600` (critical). Temp HP: `amber-400`.
- **Concentration**: `violet-500`/`violet-600` (pulsing ring around the whole card, see `.concentrating-ring`).
- **Exhaustion / danger ring**: `red-500`/`red-600`.
- **Selected/active state on a toggle pill** (standard condition, custom condition, any "on" chip): `border-amber-500 bg-amber-500/10 text-amber-300`. Inactive: `border-slate-700 text-slate-400`, hover `hover:border-slate-500 hover:text-slate-200`.
- **Homebrew / custom (DM-authored, not official) content**: `border-dashed` — this is the app's one existing visual signal for "not official SRD content," already used on custom-condition badges/pills. Reuse it any time a prototype needs to distinguish user-created from built-in content; don't invent a new marker (a badge, a different color) for the same meaning.
- **Delete/danger action hover**: `hover:bg-red-950/30 hover:text-red-400`.
- **Primary action**: solid `bg-sky-600` pill, `hover:bg-sky-500`, white text (this is warm-gold in the actual reskinned palette, not literal blue).
- **Inline error text**: `text-red-400`. **Warning text**: `text-amber-400`.
- **Chip/badge fill recipe** (recovery-type badges, mastery tags, recharge, trait effects — anything built on `MetaBadge`/chip-family `Pill` colors): `border-[HEX] bg-[HEX]/46 text-[HEX]` — border and text at full opacity, background at 46% alpha over whatever's behind it. Reuse this exact 46% alpha for a new chip tone rather than picking a different one per prototype; a bolder/louder tone should still use this recipe; a real background-behind-it example should still come from the measured background above, not a lighter placeholder — see the SR/LR/M recovery-badge palette work for a worked example of the whole recipe applied against the real measured background.

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
- "Label:" line before a value/chip row (Senses, Resist/Immune/Vulnerable, Proficiencies): `text-sm text-slate-500`, normal case, literal colon — not an uppercase eyebrow heading on its own line. Confirmed 14px (`text-sm`), not the ambient 16px a plain unstyled `<span>` would inherit — this exact mismatch (16px where 14px was needed) shipped once already, so don't skip setting the size explicitly.

## Shapes / containers

- Card (character/creature card, toolkit card): `rounded-xl border shadow-lg shadow-black/20`, background `border-slate-800 bg-slate-900/60`.
- Row card (roster row, list row): `rounded-lg border border-slate-800 bg-slate-900/60`.
- Floating popover/dropdown: `rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/40`.
- Quick-action floating panel (FAB menu): `rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl` — deliberately darker than the popover above.
- Toggle pill (condition, chip): small rounded-full or rounded-md border pill, sized to its text, not a big touch-target button — see the active/inactive classes above.
- Icon-only button, 4 tones, all get the same `rounded p-1` hover-square: `neutral` (dismiss/close, gray), `muted` (row action like edit/duplicate, dimmer gray), `danger` (delete, red-tinted), `accent` (add/create, gold/sky-tinted).
- **Character/creature details modal**: `rounded-xl border`, `max-w-[1040px]`, `p-3.5` (14px) padding, `md:max-h-[85vh]`. Its two-column body (`DetailsTwoColumn`) is an even **50/50 `flex-1` split** with a `gap-4` (16px) gutter between columns — NOT a narrow fixed sidebar next to a wide content pane. Don't eyeball a plausible-looking ratio for this or any other real modal/panel; read the actual `max-w-*`/`flex-*`/`gap-*` classes from the component source first (see "Pixel-accurate colors and dimensions" below) — an early prototype this session got this specific modal's proportions wrong by guessing, and it wasn't caught until the user asked for real dimensions explicitly.

## Icons

Never invent new SVG glyphs or reach for an emoji as a stand-in icon (the app has a real hand-drawn icon set at `src/components/ui/icons.tsx` — pencil, trash/trash-outline, plus/gear/eye, shield/speed/initiative/proficiency, dozens more). Before drawing any icon in a prototype:
1. `Grep`/skim `src/components/ui/icons.tsx` for a name matching the concept.
2. If found, copy its actual `<path>`/`<svg>` markup into the prototype so the icon reads as the same icon a real screenshot would show — this matters a lot when the user is comparing the prototype against a real screenshot (see Methodology below).
3. If genuinely nothing fits, keep the new glyph in the same stroke-based, single-color, no-fill-unless-toggled style as the existing set — not a different icon family/weight.

## Pixel-accurate colors and dimensions

Backgrounds, modal/column dimensions, and any value being compared 1:1 against a real screen must be **exact** — not eyeballed, not approximated from memory, even from this file's own listed swatches above. This file's hex values are a fast default for a quick early-round sketch; they are not guaranteed pixel-accurate, and two real cases this session prove why that gap matters (the `#1c1712`-vs-`#0f0500` background and the fixed-sidebar-vs-50/50 modal split, both cited above).

- **Colors**: when a prototype needs to match production exactly (a final-round palette, anything the user calls "critical," anything being checked against a real screenshot they attached), verify against the *live-rendered* app instead of trusting this file's swatches at face value:
  1. Start the dev server and open the real screen in Playwright.
  2. Don't stop at `getComputedStyle` alone — this app's reskinned colors often compute to `oklch(...)`/`lab(...)` strings, which don't translate to hex by eye and aren't reliably "close enough" to guess from.
  3. Round-trip the color through a 1×1 canvas (`ctx.fillStyle = computedColor; ctx.fillRect(0,0,1,1); ctx.getImageData(0,0,1,1).data`) to read back the actual rendered RGB bytes, regardless of what color space the CSS engine reported it in.
  4. Use that confirmed hex in the prototype, not the written-down approximation.
- **Dimensions**: read the real Tailwind classes straight from the component source (`max-w-[Npx]`, `flex-1` vs. a fixed width, `gap-*`, `p-*`) rather than guessing a plausible-looking ratio.
- Once verified, feed the confirmed value back into this file (see "When a token isn't listed here" below) so the next prototype in this app doesn't have to re-derive it from scratch — this is exactly how the measured `800`/`900`/`950` neutrals and the modal's real 50/50 split ended up documented above instead of staying tribal knowledge from one thread.

## Methodology (established over several rounds this session)

1. **Build as a single self-contained HTML file**, published via the `Artifact` tool — that's what makes it clickable/shareable, and keeps it out of the real codebase until a design is actually approved.
2. **Follow the page structure above** (Requirements → optional current-state → numbered variants → recommendation) every time — see that section for the full shape and the narrowing protocol once a variant is picked.
3. **When the user gives a size/scale/behavior note** ("зроби на 5x більшим", "виправ висоту"), fix the underlying mechanism (e.g. a mock container sized to sparse content, not to the real intended size) — don't just bump one number without checking why it was wrong.
4. **When the user says the current *production* look is fine and only wants help with a specific *mechanism*** (e.g. "not how it looks, how it's configured"), don't touch the visual output of the part they said is fine — confine changes to the flow/mechanism they actually asked about. Re-read their correction literally rather than re-interpreting it.
5. **When the user posts a real screenshot of the actual app**, rebuild the mock to match it as closely as possible — exact badge shapes, exact spacing, exact icon — before iterating on the new idea layered on top. A prototype that doesn't match the real starting point isn't testing the right change.
6. **Verify visually before showing it** — take a Playwright screenshot of the published/rendered artifact and actually look at it (every variant, every toggled state, and a zoomed crop of the specific area that changed when the change is small — a chip color, a text size). This catches the same class of bug that hit this skill's own motivating cases (a popover clipped/collapsed because its mock container didn't match real dimensions; a background/ratio that looked right until measured).
7. **Iterate on explicit numbered feedback.** When the user gives a numbered list of changes, address each number explicitly and confirm what changed — don't fold them into a vague "updated it" pass.
8. **Treat "final" as a real state, not just the last round.** Once a palette/layout is explicitly approved, the artifact should read as finished (see the narrowing protocol above) — a reader opening the link later shouldn't have to guess whether they're looking at an open comparison or a shipped decision.

## When a token isn't listed here

Grep the real source first (`src/app/globals.css` for palette/keyframes, `src/components/ui/containerStyles.ts`, `src/components/ui/typography.ts`, `src/components/ui/icons.tsx`, `src/components/ui/Button.tsx` / `IconButton.tsx`) rather than guessing — this file is a snapshot, not the source of truth. For anything pixel-critical (a color, a dimension), verify it against the live-rendered app per "Pixel-accurate colors and dimensions" above rather than trusting a written-down approximation, even one already in this file. If you find a real, reusable value that should live here for next time, add it back to this file so the next prototype doesn't have to re-derive it.
