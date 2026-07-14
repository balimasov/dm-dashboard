/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shapes for D&D Beyond's undocumented character-service JSON response
 * (character-service.dndbeyond.com/character/v5/character/{id}).
 *
 * This is a third-party API we don't control and don't have a schema for,
 * so these types are deliberately a *shallow* net rather than a full model:
 * top-level fields on `RawDdbData` and common modifier fields on
 * `RawDdbModifier` are named explicitly (so a typo like `data.claases`
 * fails `tsc`), but nested definition/feature/action/item shapes are left
 * as `any` (via the named aliases below) rather than reverse-engineered
 * field-by-field. `ddbParser/`'s own comments document real inconsistencies
 * in this data (e.g. `isGranted` being unreliable for choice-driven grants,
 * `componentId` not always resolving to a definition's own `id`) —
 * pretending to fully type an undocumented API we've only ever seen through
 * a handful of sample exports would just be a confident-looking lie.
 *
 * This file is the one place in `ddbParser/` allowed to write a bare `any`
 * — everywhere else imports one of the named aliases below instead, so an
 * untyped escape hatch always reads as a deliberate, named decision rather
 * than an untyped value that crept in by accident.
 */

/** A loosely-typed nested shape (definition, feature, action entry...) not worth reverse-engineering field-by-field. */
export type RawDdbAny = any;

export interface RawDdbModifier {
  type?: string;
  subType?: string;
  entityId?: number | null;
  value?: number | null;
  fixedValue?: number | null;
  isGranted?: boolean;
  statId?: number;
  restriction?: string;
  componentId?: number;
  friendlySubtypeName?: string;
  bonusTypes?: number[];
  // Escape hatch: modifiers carry many more situational fields than the
  // ones above (largeAllowed, dice, availableToMulticlass...) that aren't
  // worth enumerating for the handful of call sites that touch them.
  [key: string]: unknown;
}

export interface RawDdbResponse {
  success: boolean;
  data: RawDdbData;
}

export interface RawDdbData {
  name?: string;
  inspiration?: boolean;
  decorations?: { avatarUrl?: string };
  race?: RawDdbAny;
  classes?: RawDdbAny[];
  background?: RawDdbAny;
  feats?: RawDdbAny[];
  options?: { race?: RawDdbAny[]; class?: RawDdbAny[]; feat?: RawDdbAny[] };
  actions?: { race?: RawDdbAny[]; class?: RawDdbAny[]; feat?: RawDdbAny[] };
  inventory?: RawDdbAny[];
  modifiers?: Record<string, RawDdbModifier[]>;
  stats?: Array<{ id: number; value: number | null }>;
  bonusStats?: Array<{ id: number; value: number | null }>;
  overrideStats?: Array<{ id: number; value: number | null }>;
  baseHitPoints?: number;
  bonusHitPoints?: number | null;
  overrideHitPoints?: number | null;
  removedHitPoints?: number;
  temporaryHitPoints?: number;
  deathSaves?: { successCount?: number; failCount?: number };
  conditions?: RawDdbAny[];
  currencies?: { cp?: number; sp?: number; ep?: number; gp?: number; pp?: number };
  customDefenseAdjustments?: RawDdbAny[];
  characterValues?: Array<{ typeId: number; value: unknown }>;
  spells?: { race?: RawDdbAny[]; class?: RawDdbAny[]; background?: RawDdbAny[]; item?: RawDdbAny[]; feat?: RawDdbAny[] };
  classSpells?: RawDdbAny[];
  pactMagic?: Array<{ level: number; used: number }>;
  spellSlots?: Array<{ level: number; used: number }>;
}
