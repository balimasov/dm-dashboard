/** A DM's campaign — its own name, freeform notes, and character roster (characters point back via `Character.campaignId`). */
export interface Campaign {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  /** A square (cropped client-side) base64 data URI — absent falls back to an initial letter, same as `CharacterAvatar` does for characters. */
  logoUrl?: string;
  /** Reference links the DM wants reachable mid-session (rules docs, lore notes, a Google Doc of ideas...) — shown via the floating `QuickLinksButton`, capped at 10 in the editor. */
  quickLinks?: QuickLink[];
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

/** A campaign plus its roster size — used for the campaigns list, where showing a count doesn't require loading every character or creature. */
export interface CampaignSummary extends Campaign {
  characterCount: number;
  creatureCount: number;
}
