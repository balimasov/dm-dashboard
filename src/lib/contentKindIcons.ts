/**
 * One small glyph per "kind" of trackable content — a weapon attack, a
 * feature/trait, a known spell — shown both on the tab that lists them
 * (`CharacterDetailsModal`, Party Toolkit's Actions & Resources panel) and
 * next to each entry in `RemindersPanel`, so a DM scanning a mixed list of
 * reminders (or switching tabs) can tell what kind of thing they're looking
 * at without reading the label. A creature's Traits share the Feature glyph
 * — mechanically the same "ability with a description" shape as a
 * character's own Features and Traits tab.
 */
export const CONTENT_KIND_ICON = {
  weapons: "⚔️",
  features: "💠",
  spells: "🔮",
} as const;

export type ContentKind = keyof typeof CONTENT_KIND_ICON;
