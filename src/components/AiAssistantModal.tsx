"use client";

import { useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";
import { RichText } from "./RichText";
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
 */
export function AiAssistantModal({ name, target, onClose }: { name: string; target: Target; onClose: () => void }) {
  useScrollLock();
  useEscapeToClose(onClose);

  const [situation, setSituation] = useState("");
  const [asked, setAsked] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function ask() {
    setAsked(true);
    setLoading(true);
    setError(null);
    const trimmed = situation.trim();
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
      panelClassName="max-h-[80vh] w-full max-w-lg gap-4 overflow-y-auto border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/40"
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
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
          <Button onClick={ask} className="self-end">
            Ask
          </Button>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 py-8">
          <Spinner className="h-5 w-5" />
          <p className={MUTED_BODY_CLS}>Thinking...</p>
        </div>
      )}
      {!loading && error && <p className="py-4 text-sm text-red-400">{error}</p>}
      {!loading && suggestion && (
        <p className="text-sm leading-relaxed text-slate-200">
          <RichText text={suggestion} />
        </p>
      )}
    </Modal>
  );
}
