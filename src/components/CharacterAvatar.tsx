import { Character } from "@/lib/types";
import { Avatar } from "./Avatar";

export function CharacterAvatar({
  character,
  size = "sm",
  zoomable,
}: {
  character: Character;
  size?: "sm" | "md";
  zoomable?: boolean;
}) {
  return <Avatar src={character.avatarUrl} label={character.name} size={size} zoomable={zoomable} />;
}
