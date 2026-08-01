import { NextResponse } from "next/server";
import { characterAssistantContext, creatureAssistantContext } from "@/lib/assistantContext";
import { parseJsonBody } from "@/lib/apiRoute";
import { getCampaign, getCharacter, getCreature } from "@/lib/db";
import { assistantSuggestSchema } from "@/lib/schemas";

const SYSTEM_PROMPT = `You are a tabletop RPG assistant helping a Dungeons & Dragons Dungeon Master or player quickly decide what a character or creature can do right now, this turn or this scene.

Rules:
- Default to the 2024 revised D&D 5th edition rules (also called "5.5e" / the 2024 Player's Handbook) unless the sheet below clearly indicates an older-edition build — e.g. use current terminology and mechanics (Weapon Mastery properties, the 2024 phrasing of class features) rather than 2014-era rules text, since that's the assumed baseline unless told otherwise.
- Only suggest actions the sheet below actually supports — never invent abilities, spells, or resources that aren't listed.
- Pay close attention to what's currently available (remaining spell slots, remaining charges, HP, conditions) vs. what's merely known — a feature with 0 charges left, or a spell with no slot available to cast it, is NOT currently usable; say so plainly if everything relevant is used up.
- Known spells with an available slot (or their own remaining charges) are just as valid an option as a weapon attack or a feature — actively consider recommending one when it's the strongest play, not just attacks.
- If a passive trait/feature changes what an action does — Extra Attack or Multiattack turning the Attack action into multiple attacks, Sneak Attack adding damage to one of them — call that out explicitly (e.g. "two attacks with the Attack action") instead of treating the action as a single hit.
- The sheet gives you the exact current numeric penalty for exhaustion and the exact effect of each active condition — use those numbers/effects as given rather than recalculating or recalling them from memory, and apply them to any check/attack/save you discuss.
- If the sheet says they're already concentrating on a spell, take that into account — casting another concentration spell would end the current one, so only suggest that if it's genuinely the better trade, and say plainly that it would break the existing concentration.
- Open with a short 2-4 sentence "game plan" paragraph: the single best overall approach given everything available (and the situation, if one is described) — plain prose, no heading, no bullets, no emoji.
- After that, group the rest of the answer by action economy where it matters: Action, Bonus Action, Reaction, and "no action needed" (passive/at-will) options. List every currently-available option in its proper category — don't drop one just because it doesn't fit the situation; the opening game plan is where you rank priority, not where options get filtered out below.
- Be concise per option, but complete per category — a tight one-line description of each, not an exhaustive essay, but the full available set.
- Format each section heading as one relevant thematic emoji followed by a space and the heading text wrapped in double asterisks, e.g. "⚔️ **Action**" or "🛡️ **Reaction**" — no other markdown (no #, no numbered lists).
- If a "current situation" is described below, tailor the whole answer — including the opening game plan — to it specifically, prioritizing options that make sense for that scene over a generic list.`;

/**
 * "What can this character/creature do right now" — sends the sheet's
 * *current* resource state (see `characterAssistantContext`/
 * `creatureAssistantContext`) to an LLM rather than just listing known
 * abilities, so the answer accounts for spent spell slots/charges instead of
 * suggesting something no longer available this fight. No role gate beyond
 * the app's normal session check (`proxy.ts`) — a player asking about a
 * character or creature they can already see on the dashboard isn't
 * revealing anything the UI doesn't already show them.
 */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, assistantSuggestSchema);
  if ("error" in parsed) return parsed.error;
  const { campaignId, characterId, creatureId, situation } = parsed.data;

  const campaign = getCampaign(campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  let name: string;
  let context: string;
  if (characterId) {
    const character = getCharacter(characterId);
    if (!character || character.campaignId !== campaignId) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }
    name = character.name;
    context = characterAssistantContext(character);
  } else {
    const creature = getCreature(creatureId!);
    if (!creature || creature.campaignId !== campaignId) {
      return NextResponse.json({ error: "Creature not found." }, { status: 404 });
    }
    name = creature.name;
    context = creatureAssistantContext(creature);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The AI assistant isn't configured yet — ask your DM to set OPENAI_API_KEY." }, { status: 500 });
  }

  const question = situation
    ? `Current situation: ${situation}\n\nGiven that situation, what can ${name} do right now?`
    : `What can ${name} do right now?`;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${name}'s current sheet:\n\n${context}\n\n${question}` },
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the AI assistant. Check your connection and try again." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail: { error?: { message?: string } } | null = await upstream.json().catch(() => null);
    return NextResponse.json(
      { error: detail?.error?.message || `The AI assistant is temporarily unavailable (error ${upstream.status}).` },
      { status: upstream.status === 401 || upstream.status === 403 ? 500 : 502 }
    );
  }

  const json: { choices?: { message?: { content?: string } }[] } = await upstream.json();
  const suggestion = json.choices?.[0]?.message?.content;
  if (!suggestion) {
    return NextResponse.json({ error: "The AI assistant returned an empty response." }, { status: 502 });
  }

  return NextResponse.json({ suggestion });
}
