import { Character } from "@/lib/types";

const SIZE_CLASSES = {
  sm: "h-14 w-14 text-lg",
  md: "h-16 w-16 text-xl",
} as const;

export function CharacterAvatar({
  character,
  size = "sm",
}: {
  character: Character;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (character.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable D&D Beyond CDN domain; not worth configuring remotePatterns for a small thumbnail
      <img
        src={character.avatarUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-md border border-slate-800 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-800 font-semibold text-slate-600`}
    >
      {character.name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
