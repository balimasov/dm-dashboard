import { Character } from "@/lib/types";
import { Avatar } from "./Avatar";

export function CharacterAvatar({
  character,
  size = "sm",
}: {
  character: Character;
  size?: "sm" | "md";
}) {
  return <Avatar src={character.avatarUrl} label={character.name} size={size} />;
}
