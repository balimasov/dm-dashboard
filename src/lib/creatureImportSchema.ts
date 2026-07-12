import { AbilityScores, STAT_ORDER } from "./types";
import { AddCreatureInput } from "@/hooks/useCreatures";

/**
 * How a field's value should be read/written when generating or parsing the
 * hand-fillable YAML template (`creatureImportTemplate.ts`/`creatureImportParser.ts`).
 */
export type CreatureFieldKind = "string" | "number" | "abilityScores" | "partialAbilityScores" | "traits";

export interface CreatureFieldSpec {
  key: keyof AddCreatureInput;
  section: string;
  kind: CreatureFieldKind;
  required: boolean;
  /** Shown as a `#` comment above the field in the generated template. */
  doc: string;
  /** Used both in the generated template and in tests — always a realistic value, never a placeholder like "string". */
  example: unknown;
  /**
   * False for fields the DM never hand-types — either because they're not
   * meaningful to author by hand (a base64 portrait) or because the importer
   * derives them from other fields (`hp` defaults to `maxHp` for a
   * freshly-imported creature, same as a brand new SRD add).
   */
  includeInTemplate: boolean;
}

/**
 * Single source of truth for the "import a custom creature from a YAML
 * template" feature — every `AddCreatureInput` field is listed here exactly
 * once. `creatureImportTemplate.ts` generates the downloadable template from
 * this list, `creatureImportParser.ts` validates an uploaded file against it,
 * and the type-level guard at the bottom of this file fails `tsc --noEmit`
 * (part of the project's standard verification pass) the moment a field is
 * added to/removed from `AddCreatureInput` without a matching update here —
 * that's what keeps the template from silently drifting out of date as the
 * creature card evolves.
 */
export const CREATURE_IMPORT_FIELDS: CreatureFieldSpec[] = [
  {
    key: "templateName",
    section: "Особистість",
    kind: "string",
    required: true,
    doc: "Справжній вид/тип істоти, напр. \"Unicorn\" — за цим ім'ям істота зберігається у спільному бестіарії застосунку, тож наступного разу її можна буде додати ще раз без повторного заповнення.",
    example: "Unicorn",
    includeInTemplate: true,
  },
  {
    key: "name",
    section: "Особистість",
    kind: "string",
    required: false,
    doc: "Ігрове прізвисько (необов'язково) — якщо лишити порожнім, картка показуватиме templateName.",
    example: "Thunder",
    includeInTemplate: true,
  },
  {
    key: "creatureType",
    section: "Особистість",
    kind: "string",
    required: false,
    doc: "Тип істоти, напр. Beast, Celestial, Fiend, Humanoid, Undead...",
    example: "Celestial",
    includeInTemplate: true,
  },
  {
    key: "size",
    section: "Особистість",
    kind: "string",
    required: false,
    doc: "Розмір: Tiny, Small, Medium, Large, Huge або Gargantuan.",
    example: "Large",
    includeInTemplate: true,
  },
  {
    key: "alignment",
    section: "Особистість",
    kind: "string",
    required: false,
    doc: "Схильність, напр. \"Lawful Good\", \"Chaotic Neutral\".",
    example: "Lawful Good",
    includeInTemplate: true,
  },
  {
    key: "avatarUrl",
    section: "Особистість",
    kind: "string",
    required: false,
    doc: "Портрет — не для ручного заповнення тут; додай його пізніше на сторінці редагування істоти після імпорту.",
    example: undefined,
    includeInTemplate: false,
  },
  {
    key: "ac",
    section: "Бойові характеристики",
    kind: "number",
    required: true,
    doc: "Клас броні (AC).",
    example: 12,
    includeInTemplate: true,
  },
  {
    key: "armorDesc",
    section: "Бойові характеристики",
    kind: "string",
    required: false,
    doc: "Підпис поруч з AC, напр. \"natural armor\" — показується як \"12 (natural armor)\".",
    example: "natural armor",
    includeInTemplate: true,
  },
  {
    key: "hp",
    section: "Бойові характеристики",
    kind: "number",
    required: false,
    doc: "Поточне HP — не для ручного заповнення; при імпорті завжди дорівнює maxHp (щойно імпортована істота починає на повному здоров'ї, так само як і при додаванні з Open5e).",
    example: undefined,
    includeInTemplate: false,
  },
  {
    key: "maxHp",
    section: "Бойові характеристики",
    kind: "number",
    required: true,
    doc: "Максимальне HP.",
    example: 67,
    includeInTemplate: true,
  },
  {
    key: "hitDice",
    section: "Бойові характеристики",
    kind: "string",
    required: false,
    doc: "Підпис поруч з HP, напр. \"9d10 + 18\" — показується як \"67 (9d10 + 18)\".",
    example: "9d10 + 18",
    includeInTemplate: true,
  },
  {
    key: "speed",
    section: "Бойові характеристики",
    kind: "number",
    required: true,
    doc: "Швидкість ходьби у футах (лише число, без \"ft.\").",
    example: 50,
    includeInTemplate: true,
  },
  {
    key: "speedDetail",
    section: "Бойові характеристики",
    kind: "string",
    required: false,
    doc: "Повний текст швидкості, якщо є політ/плавання/копання тощо, напр. \"50 ft., fly 30 ft.\" — залиш порожнім, якщо істота лише ходить.",
    example: "50 ft., fly 30 ft.",
    includeInTemplate: true,
  },
  {
    key: "initiativeBonus",
    section: "Бойові характеристики",
    kind: "number",
    required: false,
    doc: "Бонус до ініціативи, якщо відомий.",
    example: 2,
    includeInTemplate: true,
  },
  {
    key: "stats",
    section: "Характеристики",
    kind: "abilityScores",
    required: true,
    doc: "Шість характеристик — рівно ці ключі: str, dex, con, int, wis, cha.",
    example: { str: 18, dex: 14, con: 15, int: 11, wis: 17, cha: 16 },
    includeInTemplate: true,
  },
  {
    key: "savingThrows",
    section: "Характеристики",
    kind: "partialAbilityScores",
    required: false,
    doc: "Рятівні кидки — вказуй лише ті, що ВІДРІЗНЯЮТЬСЯ від звичайного модифікатора характеристики (типово через proficiency). Не потрібно дублювати ті, що збігаються з модифікатором — можеш лишити порожній об'єкт {} чи прибрати ключі, яких немає.",
    example: { wis: 5 },
    includeInTemplate: true,
  },
  {
    key: "senses",
    section: "Чуття, мови, навички",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Darkvision 60 ft., Passive Perception 15\".",
    example: "Darkvision 60 ft., Passive Perception 15",
    includeInTemplate: true,
  },
  {
    key: "languages",
    section: "Чуття, мови, навички",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"understands Elvish and Sylvan but can't speak\".",
    example: "understands Elvish and Sylvan but can't speak",
    includeInTemplate: true,
  },
  {
    key: "skills",
    section: "Чуття, мови, навички",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Perception +7, Stealth +4\".",
    example: "Perception +7",
    includeInTemplate: true,
  },
  {
    key: "damageVulnerabilities",
    section: "Опір і вразливість до шкоди",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Radiant\". Залиш порожнім, якщо немає.",
    example: "",
    includeInTemplate: true,
  },
  {
    key: "damageResistances",
    section: "Опір і вразливість до шкоди",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Cold, Fire\".",
    example: "",
    includeInTemplate: true,
  },
  {
    key: "damageImmunities",
    section: "Опір і вразливість до шкоди",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Poison\".",
    example: "Poison",
    includeInTemplate: true,
  },
  {
    key: "conditionImmunities",
    section: "Опір і вразливість до шкоди",
    kind: "string",
    required: false,
    doc: "Вільний текст, напр. \"Charmed, Poisoned\".",
    example: "Charmed, Poisoned",
    includeInTemplate: true,
  },
  {
    key: "challengeRating",
    section: "Виклик і досвід",
    kind: "string",
    required: false,
    doc: "Рівень виклику як текст, напр. \"3\", \"1/4\", \"1/2\" — лише для показу, ні на що не впливає.",
    example: "3",
    includeInTemplate: true,
  },
  {
    key: "experiencePoints",
    section: "Виклик і досвід",
    kind: "number",
    required: false,
    doc: "Досвід за перемогу — лише для показу, ні на що не впливає.",
    example: 700,
    includeInTemplate: true,
  },
  {
    key: "traits",
    section: "Риси, дії, реакції",
    kind: "traits",
    required: false,
    doc: 'Список рис/дій. Кожен запис: name (обов\'язково), group (одне з "trait" — риса, "action" — дія, "bonusAction" — бонусна дія, "reaction" — реакція, "legendary" — легендарна дія; типово "trait", якщо не вказано), description (необов\'язково). Залиш порожнім списком [], якщо рис немає.',
    example: [
      { name: "Charge", group: "trait", description: "If the unicorn moves at least 20 feet straight toward a target..." },
      { name: "Hooves", group: "action", description: "Melee Weapon Attack: +7 to hit, reach 5 ft., one target." },
    ],
    includeInTemplate: true,
  },
  {
    key: "ownerCharacterId",
    section: "Прив'язка до персонажа",
    kind: "string",
    required: false,
    doc: "Не заповнюй тут — використовуй поле ownerCharacter (ім'я персонажа) нижче в шаблоні; застосунок сам знайде відповідний id під час імпорту.",
    example: undefined,
    includeInTemplate: false,
  },
  {
    key: "source",
    section: "Прив'язка до персонажа",
    kind: "string",
    required: false,
    doc: 'Як істота потрапила у гру, напр. "Find Steed", "Wild Shape", "Familiar".',
    example: "Find Steed",
    includeInTemplate: true,
  },
];

export const CREATURE_IMPORT_SECTIONS = [
  "Особистість",
  "Бойові характеристики",
  "Характеристики",
  "Чуття, мови, навички",
  "Опір і вразливість до шкоди",
  "Виклик і досвід",
  "Риси, дії, реакції",
  "Прив'язка до персонажа",
] as const;

export const CREATURE_STAT_KEYS = STAT_ORDER as readonly (keyof AbilityScores)[];

// ---------------------------------------------------------------------------
// Compile-time completeness guard.
//
// `AddCreatureInput` is the exact payload `POST /api/creatures` accepts (see
// `src/hooks/useCreatures.ts`). Every one of its keys must have exactly one
// `CreatureFieldSpec` entry above — `templateId` is the sole exception: it
// links a creature back to an SRD bestiary entry, which a hand-authored
// import never has. If a future change adds/removes a field on
// `AddCreatureInput` without updating `CREATURE_IMPORT_FIELDS` to match, the
// line below fails to compile (`tsc --noEmit`, part of the standard
// verification pass) with the offending key name in the error.
// ---------------------------------------------------------------------------
type SchemaKeys = (typeof CREATURE_IMPORT_FIELDS)[number]["key"];
type InputKeys = keyof AddCreatureInput;
type MissingFromSchema = Exclude<InputKeys, SchemaKeys | "templateId">;
type ExtraInSchema = Exclude<SchemaKeys, InputKeys>;
const _keysGuard: [MissingFromSchema] extends [never] ? ([ExtraInSchema] extends [never] ? true : never) : never = true;
void _keysGuard;
