"use client";

import { Character } from "@/lib/types";
import { computePartyPassiveSummary } from "@/lib/partyToolkit";
import { DefensesPanel } from "./partyToolkit/DefensesPanel";
import { LanguagesToolsPanel } from "./partyToolkit/LanguagesToolsPanel";
import { ResourceCoveragePanel } from "./partyToolkit/ResourceCoveragePanel";
import { SensesPanel } from "./partyToolkit/SensesPanel";
import { SkillsPanel } from "./partyToolkit/SkillsPanel";
import { SpellSlotsResourcesPanel } from "./partyToolkit/SpellSlotsResourcesPanel";

/**
 * Party Toolkit — Iterations 1-4: Skills, Passives, Spell Slots, Resources,
 * Senses, Defenses, Languages & Tools, Spell & Ability Coverage.
 * Reference-only: no dice roller, no roll buttons, no success/fail
 * resolution. `characters` is expected to already be filtered to the
 * visible roster (same set shown in the Party row above it).
 *
 * Each panel is its own file under `partyToolkit/`; this component is just
 * the layout grid that arranges them. `partyToolkit/shared.tsx` carries the
 * handful of pieces more than one panel needs (the generic hover-hint
 * layout, the usage-danger color scale, the coverage count row...).
 */
export function PartyToolkit({
  characters,
  initialResourceCoverageOpen,
}: {
  characters: Character[];
  initialResourceCoverageOpen: boolean;
}) {
  const passives = computePartyPassiveSummary(characters);

  if (characters.length === 0 || !passives) {
    return <p className="text-sm text-slate-600">No characters yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkillsPanel characters={characters} passives={passives} />
        <SpellSlotsResourcesPanel characters={characters} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SensesPanel characters={characters} />
        <DefensesPanel characters={characters} />
        <LanguagesToolsPanel characters={characters} />
      </div>

      {/* PREVIEW — merges Spell Slots & Resources + Spell & Ability Coverage
          into one categorized, quantity-aware list (see ResourceCoveragePanel's
          own doc comment). The old Spell & Ability Coverage panel is already
          gone, confirmed replaced by this one — SpellSlotsResourcesPanel is
          the one panel still pending removal, once it's confirmed too. */}
      <p className="text-xs text-slate-600">Preview below — also merges in Spell Slots &amp; Resources.</p>
      <ResourceCoveragePanel characters={characters} initialOpen={initialResourceCoverageOpen} />
    </div>
  );
}
