import { dump as dumpYaml } from "js-yaml";
import { CREATURE_IMPORT_FIELDS, CREATURE_IMPORT_SECTIONS, CreatureFieldSpec } from "./creatureImportSchema";

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

/** One `# comment` line per line of `doc`, wrapped to keep the template readable in a plain text editor. */
function commentBlock(doc: string): string {
  const words = doc.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > 78) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.map((line) => `# ${line}`).join("\n");
}

function scalarValue(value: unknown): string {
  return dumpYaml(value ?? "", { flowLevel: -1 }).trim();
}

function fieldBlock(field: CreatureFieldSpec): string {
  const requiredTag = field.required ? " (обов'язково)" : "";
  const doc = commentBlock(`${field.doc}${requiredTag}`);

  if (field.kind === "abilityScores" || field.kind === "partialAbilityScores") {
    const body = dumpYaml(field.example ?? {}, { indent: 2 }).trimEnd();
    return `${doc}\n${String(field.key)}:\n${indent(body, 2)}`;
  }

  if (field.kind === "traits") {
    const body = dumpYaml(field.example ?? [], { indent: 2 }).trimEnd();
    return `${doc}\n${String(field.key)}:\n${indent(body, 2)}`;
  }

  return `${doc}\n${String(field.key)}: ${scalarValue(field.example)}`;
}

const HEADER = `# ============================================================
# DM Dashboard — шаблон кастомної істоти / супутника / NPC
# ============================================================
# Заповни поля нижче — вручну або попроси AI підготувати цей
# файл за описом істоти (весь потрібний контекст — прямо в
# коментарях, можеш віддати цей файл асистенту як є).
#
# Поля з позначкою (обов'язково) мають бути заповнені. Решту
# можна лишити порожньою або видалити рядок повністю — якщо
# значення не вказане, картка істоти просто не покаже цей рядок,
# так само як і для істот, доданих через пошук по SRD.
#
# Як імпортувати: у кампанії відкрий Settings → Characters &
# Creatures → розділ Creatures → вкладка "Import from file" →
# встав вміст цього файлу (або завантаж його) → Import.
# ============================================================
`;

const FOOTER = `
# ============================================================
# Прив'язка до персонажа (необов'язково)
# ============================================================
# Ім'я персонажа з цієї кампанії, якому належить супутник —
# застосунок сам знайде відповідного персонажа за іменем під час
# імпорту. Залиш порожнім, якщо істота нікому не належить.
ownerCharacter: ""
`;

/**
 * Generates the downloadable/copyable YAML template — one section per block
 * of `CREATURE_IMPORT_FIELDS`, in the same order the fields appear on the
 * creature card. Regenerated from the schema on every call, so it can never
 * silently drift from `CreatureTemplate`/`AddCreatureInput` — a field added
 * there and reflected in `creatureImportSchema.ts` shows up here
 * automatically, with no separate template file to remember to update.
 */
export function buildCreatureImportTemplate(): string {
  const bySection = new Map<string, CreatureFieldSpec[]>();
  for (const field of CREATURE_IMPORT_FIELDS) {
    if (!field.includeInTemplate) continue;
    if (!bySection.has(field.section)) bySection.set(field.section, []);
    bySection.get(field.section)!.push(field);
  }

  const sections = CREATURE_IMPORT_SECTIONS.filter((s) => s !== "Прив'язка до персонажа")
    .map((section) => {
      const fields = bySection.get(section) ?? [];
      if (fields.length === 0) return null;
      const heading = `# ============================================================\n# ${section}\n# ============================================================`;
      const body = fields.map(fieldBlock).join("\n\n");
      return `${heading}\n${body}`;
    })
    .filter((s): s is string => s !== null);

  return `${HEADER}\n${sections.join("\n\n")}\n${FOOTER}`;
}
