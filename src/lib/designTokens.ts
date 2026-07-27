/**
 * Semantic color roles — the one thing the app's existing color system
 * (see the `@theme` reskin in `globals.css`) never had: everywhere else in
 * the codebase, "danger"/"positive"/"warning"/"info" are spelled out as raw
 * Tailwind classes chosen per call site, and they've drifted (danger is
 * `red-400` in most places but `rose-*` in `Pill`/`TraitMechanicsEditor`,
 * with no rule for which). This file doesn't invent new colors — each
 * role's `badge` value is the exact `border-{c}-700 bg-{c}-950/30
 * text-{c}-300` recipe already used identically across the app for
 * bordered badges (e.g. `MECHANIC_STYLE.heal`/`.save` in
 * `creatureForm/TraitMechanicsEditor.tsx`, `Pill`'s `amber` variant), and
 * `text`/`border`/`bg` are the standalone pieces of that same recipe for
 * contexts that don't need the full badge (e.g. `text-red-400` for an error
 * message, matching the majority convention over `rose-*`). One place to
 * change "what does danger look like" going forward.
 */
export type DesignTokenRole = "danger" | "positive" | "warning" | "info";

export interface DesignToken {
  /** Standalone text color, e.g. an error message or a hover state. */
  text: string;
  /** Standalone border color, e.g. a left-accent bar. */
  border: string;
  /** Standalone tinted background, pairs with `border`/`text`. */
  bg: string;
  /** The full `border + bg + text` combo for a small bordered badge. */
  badge: string;
}

export const DESIGN_TOKENS: Record<DesignTokenRole, DesignToken> = {
  danger: {
    text: "text-red-400",
    border: "border-red-700",
    bg: "bg-red-950/30",
    badge: "border-red-700 bg-red-950/30 text-red-300",
  },
  positive: {
    text: "text-emerald-400",
    border: "border-emerald-700",
    bg: "bg-emerald-950/30",
    badge: "border-emerald-700 bg-emerald-950/30 text-emerald-300",
  },
  warning: {
    text: "text-amber-400",
    border: "border-amber-700",
    bg: "bg-amber-950/30",
    badge: "border-amber-700 bg-amber-950/30 text-amber-300",
  },
  info: {
    text: "text-violet-400",
    border: "border-violet-700",
    bg: "bg-violet-950/30",
    badge: "border-violet-700 bg-violet-950/30 text-violet-300",
  },
};
