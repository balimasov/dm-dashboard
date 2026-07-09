# Campaign export format

DM Dashboard can export a single campaign — its own record plus every
character and creature in it — as one JSON file, for backup or for feeding
into some other tool. This document describes that JSON so it can be parsed
without needing the app's source.

## Getting an export

- **In the app**: click **Export** next to a campaign on the campaigns list,
  or **Export** in the header of a campaign's dashboard page. Both trigger a
  direct file download.
- **Directly**: `GET /api/campaigns/{campaignId}/export` (requires the same
  login session as the rest of the app). The response sets
  `Content-Disposition: attachment` with a filename like
  `the-sundered-vale-2026-07-09.json`.

## Top-level shape

```
{
  "exportFormatVersion": 1,
  "exportedAt": "2026-07-09T21:14:03.512Z",
  "appVersion": "0.71.0",
  "campaign": { ... },
  "characters": [ { ... }, ... ],
  "creatures": [ { ... }, ... ]
}
```

| Field | Type | Description |
|---|---|---|
| `exportFormatVersion` | number | Version of this **envelope** (the shape described in this document) — see [Versioning](#versioning) below. |
| `exportedAt` | string | ISO 8601 timestamp of when the export was generated. |
| `appVersion` | string | The app's own `package.json` version at export time — informational, not meant to gate parsing. |
| `campaign` | object | The campaign itself. Shape: `Campaign` in `src/lib/types.ts`. |
| `characters` | array | Every character in the campaign, in the same order shown on the dashboard. Shape: `Character[]` in `src/lib/types.ts`. |
| `creatures` | array | Every creature (companion, mount, summon, familiar...) in the campaign. Shape: `Creature[]` in `src/lib/types.ts`. |

## Source of truth for field-by-field shape

`campaign`, each entry of `characters`, and each entry of `creatures` are
**not** a separate export-only format — they're the exact same
`Campaign`/`Character`/`Creature` objects the app uses internally,
serialized as-is. That means:

- The full, authoritative, always-current field list for each is the
  `Campaign`, `Character`, and `Creature` TypeScript interfaces in
  [`src/lib/types.ts`](../src/lib/types.ts) (along with the smaller types
  they reference — `CombatState`, `AbilityScores`, `Resource`,
  `SpellSlotLevel`, `SpellcastingStats`, `KnownSpell`, `Feature`,
  `SkillProficiency`, `Sense`, `InventoryItem`, `Currency`, `QuickNote`,
  `CreatureTrait`). Every field there has a doc comment explaining what it
  means and why it exists.
- **This is deliberate, and it's what keeps this document from going stale**:
  adding a new field to `Character` (as happens regularly — this app has
  grown considerably since launch) makes it show up in every future export
  automatically, with zero changes needed to the export route itself. This
  document doesn't attempt to re-list every field, since that list would
  immediately drift out of sync with `types.ts`; it only describes the
  stable envelope above and the general conventions below.
- The example below is illustrative (real field values, trimmed to one
  short character and one creature for readability) — refer to `types.ts`
  for the complete, exact field list.

## General conventions

- **IDs** (`id`, `campaignId`, `ownerCharacterId`, `templateId`, ...) are
  opaque strings internal to this app's database — don't assume any
  particular format, and don't expect them to match D&D Beyond's own
  character IDs.
- **Optional fields** are omitted entirely (not `null`) when absent — e.g. a
  character with no subclass has no `subclass` key at all, rather than
  `"subclass": null`. Treat any field in `types.ts` marked with `?` as
  possibly missing.
- **Images** (`Campaign.logoUrl`, `Character.avatarUrl`, `Creature.avatarUrl`)
  are base64 `data:` URIs when set, not external links — they can make a
  character/creature's JSON noticeably larger than one without a portrait.
- **Timestamps** (`Campaign.createdAt`, `Character.lastSyncedAt`,
  `exportedAt`) are ISO 8601 strings in UTC.
- **Computed vs. manually-edited fields**: most `Character` fields (stats,
  resources, spells, skills, resistances, senses...) are either synced
  verbatim from a linked D&D Beyond character or hand-typed in the app's
  edit form — the export doesn't distinguish which, since the app itself
  treats them identically once saved. `Character.synced` /
  `Character.lastSyncedAt` / `Character.dndBeyondUrl` tell you whether a
  character is linked to D&D Beyond at all.
- **Unknown fields**: don't error on top-level or nested keys you don't
  recognize — new ones get added over time (see Versioning).

## Versioning

`exportFormatVersion` only changes when the **envelope** itself changes
shape — e.g. if `characters` were ever renamed, moved, or restructured into
something other than a flat array. It does **not** change when a field is
added to `Campaign`/`Character`/`Creature`, since those pass through
unmodified from the app's own data model and are expected to grow over
time. A consumer that reads the envelope fields listed above and treats
unrecognized fields on `campaign`/`characters[]`/`creatures[]` as
ignorable extras will keep working across those additions without needing
updates.

If `exportFormatVersion` ever increments, this document will be updated
alongside it.

## Example

A trimmed but structurally complete example (one character, one creature,
long free-text fields shortened with `…`):

```json
{
  "exportFormatVersion": 1,
  "exportedAt": "2026-07-09T21:14:03.512Z",
  "appVersion": "0.71.0",
  "campaign": {
    "id": "campaign-abc123",
    "name": "The Sundered Vale",
    "notes": "## Session 12\n\nThe party reached…",
    "createdAt": "2026-01-04T18:02:11.000Z",
    "logoUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg…"
  },
  "characters": [
    {
      "id": "char-def456",
      "campaignId": "campaign-abc123",
      "name": "Ragnar \"Black Rage\"",
      "avatarUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg…",
      "race": "Orc",
      "className": "Barbarian",
      "subclass": "Path of the Berserker",
      "level": 5,
      "role": "Frontline",
      "heroicInspiration": true,
      "initiative": 2,
      "combat": {
        "hp": 37,
        "maxHp": 38,
        "tempHp": 0,
        "ac": 17,
        "speed": 30,
        "passivePerception": 11,
        "passiveInvestigation": 12,
        "passiveInsight": 11,
        "conditions": [],
        "exhaustion": 0
      },
      "stats": { "str": 18, "dex": 14, "con": 16, "int": 8, "wis": 10, "cha": 8 },
      "resources": [
        {
          "id": "res-1",
          "name": "Rage",
          "current": 3,
          "max": 4,
          "recovery": "long-rest",
          "source": "Class",
          "description": "In battle, you fight with primal ferocity…"
        }
      ],
      "spellSlots": [],
      "knownSpells": [],
      "features": [
        { "id": "feat-1", "name": "Reckless Attack", "category": "action", "description": "When you make your first…" }
      ],
      "savingThrowProficiencies": ["str", "con"],
      "skillProficiencies": [
        { "name": "athletics", "proficient": true, "expertise": false }
      ],
      "resistances": ["Fire"],
      "immunities": [],
      "vulnerabilities": [],
      "advantages": [],
      "senses": [{ "name": "Darkvision", "range": 60 }],
      "inventory": [
        { "id": "item-1", "name": "Greataxe", "quantity": 1, "rarity": "common", "category": "weapon" }
      ],
      "currency": { "cp": 0, "sp": 5, "ep": 0, "gp": 18, "pp": 0 },
      "notes": "A Berserker who trades caution for raw damage output…",
      "quickNotes": [{ "id": "qn-1", "text": "Owes 20gp to the blacksmith in Nightstone" }],
      "flaggedAbilities": ["Reckless Attack"],
      "concentrating": false,
      "dndBeyondUrl": "https://www.dndbeyond.com/characters/12345678",
      "synced": true,
      "lastSyncedAt": "2026-07-09T21:00:00.000Z"
    }
  ],
  "creatures": [
    {
      "id": "creature-ghi789",
      "campaignId": "campaign-abc123",
      "templateId": "bestiary-riding-horse",
      "templateName": "Riding Horse",
      "name": "Thunder",
      "creatureType": "Beast",
      "size": "Large",
      "ac": 10,
      "hp": 13,
      "maxHp": 13,
      "tempHp": 0,
      "speed": 60,
      "stats": { "str": 16, "dex": 10, "con": 12, "int": 2, "wis": 11, "cha": 7 },
      "traits": [],
      "conditions": [],
      "ownerCharacterId": "char-def456",
      "source": "Purchased in Waterdeep",
      "flaggedTraits": []
    }
  ]
}
```
