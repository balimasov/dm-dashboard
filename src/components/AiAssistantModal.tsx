"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { buildAiAvailability, buildAiAvailabilityByName } from "@/lib/aiAvailability";
import { apiFetch, parseJsonOrThrow } from "@/lib/apiClient";
import { buildAiGlossary, buildAiGlossaryByName } from "@/lib/aiGlossary";
import { AiTacticalResponse } from "@/lib/schemas";
import { Character, Creature } from "@/lib/types";
import { AiResponseText } from "./AiResponseText";
import { SendIcon, SparklesIcon } from "./ui/icons";
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
  const glossaryByName = useMemo(() => buildAiGlossaryByName(entity), [entity]);
  const availability = useMemo(() => buildAiAvailability(entity), [entity]);
  const availabilityByName = useMemo(() => buildAiAvailabilityByName(entity), [entity]);

  const [situation, setSituation] = useState("");
  const [asked, setAsked] = useState(false);
  const [askedSituation, setAskedSituation] = useState("");
  const [response, setResponse] = useState<AiTacticalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grows the bar with the text instead of scrolling inside a fixed-height
  // box — matches the single-line "chat input" feel up until someone actually
  // writes several lines, capped so a very long paste doesn't push the Ask
  // button off screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [situation]);

  function ask() {
    const trimmed = situation.trim();
    setAsked(true);
    setAskedSituation(trimmed);
    setSituation("");
    setLoading(true);
    setError(null);
    // The bar's own "✦ Best move" vs "Ask" morph already told the user which
    // mode they're getting — this is just relaying that same choice to the
    // API, not a separate decision.
    const responseMode = trimmed ? "focused" : "overview";
    apiFetch("/api/assistant/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, response_mode: responseMode, ...(trimmed ? { situation: trimmed } : {}) }),
    })
      .then((res) => parseJsonOrThrow<{ response: AiTacticalResponse }>(res, "The AI assistant couldn't answer right now."))
      .then((data) => setResponse(data.response))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 shrink-0 text-sky-400" />
          Turn Advisor: {name}
        </span>
      }
      panelClassName="max-h-[80vh] w-full max-w-2xl gap-4 overflow-y-auto border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/40"
    >
      {/* Always in place (not hidden after the first ask) so the player can
          re-ask a follow-up question without closing and reopening the modal. */}
      <div className="flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-950 py-1.5 pl-4 pr-1.5 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/30">
        <textarea
          ref={textareaRef}
          autoFocus
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="or describe the situation…"
          rows={1}
          maxLength={500}
          className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={ask}
          aria-label="Ask"
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-sky-600 font-medium text-white transition-[width,padding] duration-150 hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
            situation.trim() ? "h-9 w-9" : "h-9 px-3.5 text-sm"
          }`}
        >
          {situation.trim() ? (
            <SendIcon className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
              Best move
            </>
          )}
        </button>
      </div>
      {asked && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <p className={MUTED_LABEL_CLS}>Given</p>
          {askedSituation ? (
            <p className="mt-1 text-sm text-slate-300">{askedSituation}</p>
          ) : (
            <p className="mt-1 text-sm italic text-slate-500">No additional details — general best move.</p>
          )}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 py-8">
          <Spinner className="h-5 w-5" />
          <p className={MUTED_BODY_CLS}>Thinking...</p>
        </div>
      )}
      {!loading && error && <p className="py-4 text-sm text-red-400">{error}</p>}
      {!loading && response && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <p className={MUTED_LABEL_CLS}>Answer</p>
          <div className="mt-2">
            <AiResponseText
              response={response}
              glossary={glossary}
              glossaryByName={glossaryByName}
              availability={availability}
              availabilityByName={availabilityByName}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
