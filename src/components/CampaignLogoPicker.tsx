"use client";

import { AvatarPicker } from "./AvatarPicker";

/** Campaign-flavored alias for the shared `AvatarPicker` crop/upload mechanism. */
export function CampaignLogoPicker({
  logoUrl,
  name,
  onChange,
}: {
  logoUrl?: string;
  name: string;
  onChange: (dataUrl: string) => void;
}) {
  return <AvatarPicker imageUrl={logoUrl} label={name} onChange={onChange} />;
}
