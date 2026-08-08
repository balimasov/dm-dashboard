"use client";

import { useRef, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { UploadIcon } from "./ui/icons";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { MUTED_LABEL_CLS } from "./ui/typography";

/** Just enough shape to preview the file before committing — everything else in it passes straight through to `onImport` untouched, same "don't re-validate what the server already will" boundary `campaignImportSchema` itself draws. */
interface ParsedExport {
  campaign?: { name?: string };
  characters?: unknown[];
  creatures?: unknown[];
}

/**
 * Reads a campaign export file (`GET /api/campaigns/[id]/export` — see
 * `docs/campaign-export-format.md`) client-side and hands the parsed JSON to
 * `onImport`, which POSTs it to `/api/campaigns/import`. Same drag-and-drop/
 * click-to-browse box `ImportCreaturePanel` (`CreatureRosterEditor.tsx`)
 * uses for YAML, minus its textarea — a full campaign export (base64
 * portraits included) is too large to comfortably paste by hand, so this
 * only ever reads from a real file.
 */
export function ImportCampaignModal({
  onClose,
  onImport,
  onResult,
}: {
  onClose: () => void;
  onImport: (payload: unknown) => Promise<unknown>;
  onResult: (message: string, variant: "success" | "error") => void;
}) {
  useEscapeToClose(onClose);
  useScrollLock();

  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setParseError(null);
    setParsed(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result ?? "")) as ParsedExport;
        if (!json.campaign?.name) {
          setParseError("That doesn't look like a campaign export file — no campaign name found.");
          return;
        }
        setFileName(file.name);
        setParsed(json);
      } catch {
        setParseError("Couldn't read that as JSON — is this the right file?");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    try {
      await onImport(parsed);
      onResult(`Imported "${parsed.campaign?.name}".`, "success");
      onClose();
    } catch (err) {
      onResult(err instanceof Error ? err.message : "Failed to import campaign.", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Import Campaign">
      <p className={MUTED_LABEL_CLS}>Import a .json file you saved earlier from any campaign&apos;s Export Campaign action.</p>

      {!parsed ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver ? "border-sky-600 bg-sky-950/20" : "border-slate-700 hover:border-slate-600"
          }`}
        >
          <UploadIcon className="h-6 w-6 text-slate-500" />
          <p className="text-sm font-medium text-slate-200">Drop a .json file here</p>
          <p className={MUTED_LABEL_CLS}>or click to browse</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
          <UploadIcon className="h-5 w-5 shrink-0 text-sky-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{fileName}</p>
            <p className={MUTED_LABEL_CLS}>
              Campaign &ldquo;{parsed.campaign?.name}&rdquo; · {parsed.characters?.length ?? 0}{" "}
              {parsed.characters?.length === 1 ? "character" : "characters"} · {parsed.creatures?.length ?? 0}{" "}
              {parsed.creatures?.length === 1 ? "creature" : "creatures"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setParsed(null);
              setFileName(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="shrink-0 text-xs text-sky-400 hover:underline"
          >
            Choose different
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {parseError && <p className="text-sm text-red-400">{parseError}</p>}

      <div className="flex justify-end gap-2">
        {/* `variant="ghost"`, not `outline` — same Cancel-next-to-solid-action
            footer convention `EditCharacterModal`/`EditCreatureModal` already
            use, not the bordered look (which is for a secondary action that
            competes for attention, not a dismiss). */}
        <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">
          Cancel
        </Button>
        <Button type="button" onClick={handleImport} disabled={!parsed || importing}>
          {importing ? "Importing..." : "Import"}
        </Button>
      </div>
    </Modal>
  );
}
