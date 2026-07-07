import "server-only";
import { CreatureTemplate } from "./types";

/**
 * Best-effort SRD stat-block lookup against Open5e's public monster API (no
 * key required). Unverified against a live response as of writing — the
 * sandbox this was built in has outbound access to api.open5e.com blocked by
 * its network policy, the same way D&D Beyond is, so the field mapping below
 * is built from the documented Open5e schema rather than a real fetch. Every
 * field read is defensive (`??`/optional chaining) and a mapping failure for
 * any single result just drops that result, so a schema drift degrades to
 * "fewer SRD matches" rather than a broken search. Manual entry always works
 * regardless, and only free SRD content is covered here — Monster
 * Manual-exclusive creatures (a literal "Unicorn" is one) won't show up.
 */
const OPEN5E_BASE = "https://api.open5e.com/monsters/";

function toSpeed(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object") {
    const walk = (raw as Record<string, unknown>).walk;
    return typeof walk === "number" ? walk : 0;
  }
  if (typeof raw === "string") {
    const match = raw.match(/(\d+)\s*ft/);
    return match ? Number(match[1]) : 0;
  }
  return 0;
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapOpen5eMonster(m: Record<string, unknown>): CreatureTemplate | null {
  const name = typeof m.name === "string" ? m.name.trim() : "";
  if (!name) return null;

  const traitSources = [
    ...(Array.isArray(m.special_abilities) ? m.special_abilities : []),
    ...(Array.isArray(m.actions) ? m.actions : []),
  ] as Array<Record<string, unknown>>;
  const traits = traitSources
    .filter((t) => typeof t?.name === "string")
    .slice(0, 8)
    .map((t) => ({
      name: t.name as string,
      description: typeof t.desc === "string" ? t.desc : undefined,
    }));

  const slug = typeof m.slug === "string" && m.slug ? m.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: `srd-${slug}`,
    name,
    creatureType: [m.type, m.subtype].filter((v) => typeof v === "string" && v).join(" ") || undefined,
    size: typeof m.size === "string" ? m.size : undefined,
    ac: toNumber(m.armor_class, 10),
    maxHp: toNumber(m.hit_points, 1),
    speed: toSpeed(m.speed),
    stats: {
      str: toNumber(m.strength, 10),
      dex: toNumber(m.dexterity, 10),
      con: toNumber(m.constitution, 10),
      int: toNumber(m.intelligence, 10),
      wis: toNumber(m.wisdom, 10),
      cha: toNumber(m.charisma, 10),
    },
    traits,
    origin: "srd",
  };
}

export async function searchSrdMonsters(query: string): Promise<CreatureTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let res: Response;
  try {
    res = await fetch(`${OPEN5E_BASE}?search=${encodeURIComponent(trimmed)}&limit=10`, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = await res.json().catch(() => null);
  const results = Array.isArray((json as { results?: unknown } | null)?.results)
    ? ((json as { results: unknown[] }).results as Array<Record<string, unknown>>)
    : [];

  return results
    .map(mapOpen5eMonster)
    .filter((t): t is CreatureTemplate => t !== null);
}
