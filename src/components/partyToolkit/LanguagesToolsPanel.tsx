import { Character } from "@/lib/types";
import { computeLanguageCoverage, computeToolCoverage } from "@/lib/partyToolkit";
import { SectionLabel, ToolkitCard } from "../ui/ToolkitCard";
import { CoverageCountRow } from "./shared";

/** Only languages/tools actually present in the party — no pinned list anymore, see `computeLanguageCoverage`/`computeToolCoverage`. */
const LANGUAGE_DESCRIPTION = "Can speak, read, and write this language.";
const TOOL_DESCRIPTION = "Adds their proficiency bonus to ability checks made using this tool.";

export function LanguagesToolsPanel({ characters }: { characters: Character[] }) {
  const languages = computeLanguageCoverage(characters);
  const tools = computeToolCoverage(characters);

  return (
    <ToolkitCard title="Languages & Tools">
      <SectionLabel>Languages</SectionLabel>
      {languages.length === 0 ? (
        <p className="text-sm text-slate-600">No languages tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {languages.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={LANGUAGE_DESCRIPTION} />
          ))}
        </div>
      )}
      <SectionLabel className="mt-3">Tools</SectionLabel>
      {tools.length === 0 ? (
        <p className="text-sm text-slate-600">No tool proficiencies tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {tools.map((entry) => (
            <CoverageCountRow key={entry.name} entry={entry} description={TOOL_DESCRIPTION} />
          ))}
        </div>
      )}
    </ToolkitCard>
  );
}
