import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { CARD_SUBTITLE_CLS, CARD_TITLE_CLS, MUTED_LABEL_CLS } from "@/components/ui/typography";

/**
 * Shared between the compact card and the Character Details modal (clicking
 * this header is what opens that modal) so both stay visually identical by
 * construction rather than by copy-pasted markup drifting apart over time.
 */
export function CharacterHeader({
  character,
  onClick,
}: {
  character: Character;
  onClick?: () => void;
}) {
  const c = character;
  const content = (
    <>
      <CharacterAvatar character={c} size="md" />
      <div className="min-w-0 flex-1">
        <h2 title={c.name} className={CARD_TITLE_CLS}>
          {c.name}
        </h2>
        <p title={characterInfoLine(c)} className={CARD_SUBTITLE_CLS}>
          {characterInfoLine(c)}
        </p>
        <p className={MUTED_LABEL_CLS}>Lvl {c.level}</p>
      </div>
      <span
        title={c.heroicInspiration ? "Heroic Inspiration: available" : "Heroic Inspiration: none"}
        className={`shrink-0 text-3xl leading-none ${
          c.heroicInspiration ? "inspiration-star text-amber-400" : "text-slate-700"
        }`}
      >
        ★
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-start gap-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
    >
      {content}
    </button>
  );
}
