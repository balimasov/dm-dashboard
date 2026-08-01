"use client";

import { useMemo, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";
import { buildAiGlossary } from "@/lib/aiGlossary";
import { Character, Creature } from "@/lib/types";
import { AiResponseText } from "./AiResponseText";
import { Button } from "./ui/Button";
import { SparklesIcon } from "./ui/icons";
import { Modal } from "./ui/Modal";
import { Spinner } from "./ui/Spinner";
import { MUTED_BODY_CLS, MUTED_LABEL_CLS } from "./ui/typography";

type Target = { campaignId: string; characterId: string } | { campaignId: string; creatureId: string };

/**
 * "What can this character/creature do right now" — first asks (optionally)
 * what the current scene looks like, then sends that plus the sheet's
 * *current* spell slots/charges/HP/conditions to `/api/assistant/suggest`
 * and shows the answer. One request per open: no follow-up chat, no
 * conversation history — this is a quick "what've I got" glance, not a chat
 * feature. The situation step can be skipped entirely for a generic answer.
 *
 * `entity` is the same `Character`/`Creature` object the caller already has
 * in scope (not re-fetched) — only used client-side to build the hover-hint
 * glossary for `AiResponseText` (see `buildAiGlossary`), never sent
 * anywhere; the actual LLM request still only carries `target`'s ids.
 */
export function AiAssistantModal({
  name,
  target,
  entity,
  onClose,
}: {
  name: string;
  target: Target;
  entity: Character | Creature;
  onClose: () => void;
}) {
  useScrollLock();
  useEscapeToClose(onClose);
  const glossary = useMemo(() => buildAiGlossary(entity), [entity]);

  const [situation, setSituation] = useState("");
  const [asked, setAsked] = useState(false);
  const [askedSituation, setAskedSituation] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function ask() {
    const trimmed = situation.trim();
    setAsked(true);
    setAskedSituation(trimmed);
    setLoading(true);
    setError(null);
    apiFetch("/api/assistant/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimmed ? { ...target, situation: trimmed } : target),
    })
      .then((res) => parseJsonOrThrow<{ suggestion: string }>(res, "The AI assistant couldn't answer right now."))
      .then((data) => setSuggestion(data.suggestion))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 shrink-0 text-sky-400" />
          {name} — what can they do right now?
        </span>
      }
      panelClassName="max-h-[80vh] w-full max-w-2xl gap-4 overflow-y-auto border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/40"
    >
      {!asked && (
        <div className="flex flex-col gap-3">
          <div>
            <p className={MUTED_LABEL_CLS}>Current situation (optional)</p>
            <textarea
              autoFocus
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="e.g. Standing on a cliff edge, surrounded by 5 goblins and a warlock — what's my best option?"
              rows={3}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
          <div className={`flex items-center justify-between ${MUTED_LABEL_CLS}`}>
            <span>Enter to ask · Shift+Enter for a new line</span>
            <Button onClick={ask}>Ask</Button>
          </div>
        </div>
      )}
      {asked && askedSituation && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <p className={MUTED_LABEL_CLS}>Situation you described</p>
          <p className="mt-0.5 text-sm text-slate-300">{askedSituation}</p>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 py-8">
          <Spinner className="h-5 w-5" />
          <p className={MUTED_BODY_CLS}>Thinking...</p>
        </div>
      )}
      {!loading && error && <p className="py-4 text-sm text-red-400">{error}</p>}
      {!loading && suggestion && <AiResponseText text={suggestion} glossary={glossary} />}
    </Modal>
  );
}
