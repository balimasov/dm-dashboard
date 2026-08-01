"use client";

import { useEffect, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";
import { SparklesIcon } from "./ui/icons";
import { Modal } from "./ui/Modal";
import { Spinner } from "./ui/Spinner";
import { MUTED_BODY_CLS } from "./ui/typography";

type Target = { campaignId: string; characterId: string } | { campaignId: string; creatureId: string };

/**
 * "What can this character/creature do right now" — asks `/api/assistant/
 * suggest` (an LLM call, given the sheet's *current* spell slots/charges/HP/
 * conditions, not just its full ability list) and shows the answer as plain
 * text. One request per open: no follow-up chat, no conversation history —
 * this is a quick "what've I got" glance, not a chat feature.
 */
export function AiAssistantModal({ name, target, onClose }: { name: string; target: Target; onClose: () => void }) {
  useScrollLock();
  useEscapeToClose(onClose);

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/assistant/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    })
      .then((res) => parseJsonOrThrow<{ suggestion: string }>(res, "The AI assistant couldn't answer right now."))
      .then((data) => {
        if (!cancelled) setSuggestion(data.suggestion);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `target` is a fresh object identity every render — deliberately keyed
    // off the caller mounting a new `AiAssistantModal` (one request per
    // open), not off `target`'s contents changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {loading && (
        <div className="flex items-center gap-3 py-8">
          <Spinner className="h-5 w-5" />
          <p className={MUTED_BODY_CLS}>Thinking...</p>
        </div>
      )}
      {!loading && error && <p className="py-4 text-sm text-red-400">{error}</p>}
      {!loading && suggestion && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{suggestion}</p>}
    </Modal>
  );
}
