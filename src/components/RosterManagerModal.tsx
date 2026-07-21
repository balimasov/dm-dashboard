"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { useCreatures } from "@/hooks/useCreatures";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { CampaignRosterEditor } from "@/components/CampaignRosterEditor";
import { CreatureRosterEditor } from "@/components/CreatureRosterEditor";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CREATURE_CATEGORY_EMOJI, CREATURE_CATEGORY_LABELS, CREATURE_CATEGORY_ORDER, Character, CreatureCategory } from "@/lib/types";

export type RosterTab = "characters" | CreatureCategory;

/**
 * Dedicated, much roomier home for adding/managing characters and creatures
 * — split out of `CampaignFormModal`'s old cramped "Characters & Creatures"
 * tab (which stacked both editors in a `max-w-2xl` modal shared with
 * campaign settings) into its own `max-w-4xl` modal, same size class as
 * `CampaignJournalModal`. One tab per roster: Characters, then one per
 * `CreatureCategory` — the category a creature belongs to is now purely a
 * function of which tab it was added from, not a separate selector inside
 * `CreatureRosterEditor` (see that component's own `category` prop).
 */
export function RosterManagerModal({
  campaignId,
  initialTab,
  charactersState,
  creaturesState,
  characters,
  onClose,
}: {
  campaignId: string;
  initialTab: RosterTab;
  charactersState: ReturnType<typeof useCharacters>;
  creaturesState: ReturnType<typeof useCreatures>;
  characters: Character[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<RosterTab>(initialTab);

  useScrollLock();
  useEscapeToClose(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-slate-800 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">Characters &amp; Creatures</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          scrollable
          options={[
            { value: "characters", label: "🛡️ Characters" },
            ...CREATURE_CATEGORY_ORDER.map((c) => ({
              value: c,
              label: `${CREATURE_CATEGORY_EMOJI[c]} ${CREATURE_CATEGORY_LABELS[c]}`,
            })),
          ]}
        />

        <div className="scrollbar-themed mt-4 flex-1 overflow-y-auto px-1 pt-1">
          {tab === "characters" ? (
            <CampaignRosterEditor campaignId={campaignId} charactersState={charactersState} />
          ) : (
            <CreatureRosterEditor category={tab} creaturesState={creaturesState} characters={characters} />
          )}
        </div>
      </div>
    </div>
  );
}
