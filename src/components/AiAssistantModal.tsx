"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { buildAiAvailability, buildAiAvailabilityByName } from "@/lib/aiAvailability";
import { parseJsonOrThrow } from "@/lib/apiClient";
import { buildAiGlossary, buildAiGlossaryByName } from "@/lib/aiGlossary";
import { formatSyncTimestamp } from "@/lib/format";
import { AiTacticalResponse } from "@/lib/schemas";
import { AssistantQueryHistoryEntry, Character, Creature } from "@/lib/types";
import { AiResponseText } from "./AiResponseText";
import { FloatingPanel } from "./ui/FloatingPanel";
import { IconButton } from "./ui/IconButton";
import { DIM_ROW_CARD_CLS, FAINT_TINT_CLS } from "./ui/containerStyles";
import { SendIcon, SparklesIcon } from "./ui/icons";
import { Spinner } from "./ui/Spinner";
import { EMPTY_STATE_CLS, INLINE_ERROR_CLS, MUTED_BODY_CLS, MUTED_LABEL_CLS } from "./ui/typography";

type Target = { campaignId: string; characterId: string } | { campaignId: string; creatureId: string };

/** A follow-up's whole context is just the prior question + the prior plan's own summary — enough for the prompt's FOLLOW-UP REQUESTS section to react to, without keeping a full response object alive past its own turn. */
interface FollowUpSource {
  query: string;
  summary: string;
}

function historyQueryParams(target: Target): string {
  const params = new URLSearchParams({ campaignId: target.campaignId });
  if ("characterId" in target) params.set("characterId", target.characterId);
  else params.set("creatureId", target.creatureId);
  return params.toString();
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-sky-950/60 text-sky-300" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * "What can this character/creature do right now" — first asks (optionally)
 * what the current scene looks like, then sends that plus the sheet's
 * *current* spell slots/charges/HP/conditions to `/api/assistant/suggest`
 * and shows the answer.
 *
 * Two tabs: "Advice" (today's single-answer flow, unchanged in spirit) and
 * "History" (every past ask for this entity, persisted server-side — see
 * `db.ts`'s `assistant_queries` table — so it survives closing/reopening the
 * panel, not just this one open session).
 *
 * A second ask in the same open panel automatically carries the previously
 * shown answer's summary along as follow-up context (`previous_summary` —
 * see the prompt's FOLLOW-UP REQUESTS section), so "what if I move closer
 * first" naturally builds on what was just suggested instead of generating
 * an unrelated fresh overview. The small tag above the input names what's
 * being built on and can be dismissed (✕) to ask something unrelated
 * instead — dismissing only applies to the next ask; the answer after that
 * re-arms follow-up from itself, same as any other answer would. Selecting
 * "Refine this suggestion" on an older History entry sets that specific
 * entry as the follow-up target instead, without disturbing whatever is
 * currently shown on the Advice tab.
 *
 * `entity` is the same `Character`/`Creature` object the caller already has
 * in scope (not re-fetched) — only used client-side to build the hover-hint
 * glossary for `AiResponseText` (see `buildAiGlossary`), never sent
 * anywhere; the actual LLM request still only carries `target`'s ids.
 *
 * Renders in `FloatingPanel`, not `Modal` — the whole point of asking is
 * comparing the suggestion against other characters/creatures still visible
 * on the dashboard, which a centered, backdrop-blocking modal made
 * impossible. Component name kept as-is (matching its call sites) even
 * though it's no longer a modal in the technical sense.
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
  useEscapeToClose(onClose);
  const glossary = useMemo(() => buildAiGlossary(entity), [entity]);
  const glossaryByName = useMemo(() => buildAiGlossaryByName(entity), [entity]);
  const availability = useMemo(() => buildAiAvailability(entity), [entity]);
  const availabilityByName = useMemo(() => buildAiAvailabilityByName(entity), [entity]);

  const [tab, setTab] = useState<"advice" | "history">("advice");
  const [situation, setSituation] = useState("");
  const [asked, setAsked] = useState(false);
  const [askedSituation, setAskedSituation] = useState("");
  const [response, setResponse] = useState<AiTacticalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpSource | null>(null);

  const [history, setHistory] = useState<AssistantQueryHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<AssistantQueryHistoryEntry | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const entityId = "characterId" in target ? target.characterId : target.creatureId;

  function refreshHistory() {
    fetch(`/api/assistant/history?${historyQueryParams(target)}`)
      .then((res) => parseJsonOrThrow<AssistantQueryHistoryEntry[]>(res, "Couldn't load history."))
      .then(setHistory)
      .catch(() => {
        // Silent — an empty/stale History tab isn't worth interrupting the
        // Advice flow over, and the user never explicitly asked for it here.
      })
      .finally(() => setHistoryLoaded(true));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refreshHistory, [target.campaignId, entityId]);

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

  function runQuery(trimmedSituation: string, followUpOverride: FollowUpSource | null) {
    // Guards against a double-fire (an accidental extra click, or Enter
    // pressed again before the first answer lands) sending a second paid LLM
    // call for the exact same question — the button below is also disabled
    // while loading, this covers the Enter-key path too.
    if (loading) return;
    setTab("advice");
    setAsked(true);
    setAskedSituation(trimmedSituation);
    setSituation("");
    setLoading(true);
    setError(null);
    // The bar's own "✦ Best move" vs "Ask" morph already told the user which
    // mode they're getting — this is just relaying that same choice to the
    // API, not a separate decision.
    const responseMode = trimmedSituation ? "focused" : "overview";
    // Plain fetch, not `apiFetch` — this request already has its own "Thinking..."
    // spinner filling the panel below, and it routinely runs for several
    // seconds (an LLM call, not a quick save), so also popping the app-wide
    // centered spinner on top of it was a redundant second loading indicator.
    fetch("/api/assistant/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...target,
        response_mode: responseMode,
        ...(trimmedSituation ? { situation: trimmedSituation } : {}),
        ...(followUpOverride ? { previous_summary: followUpOverride.summary } : {}),
      }),
    })
      .then((res) => parseJsonOrThrow<{ response: AiTacticalResponse }>(res, "The AI assistant couldn't answer right now."))
      .then((data) => {
        setResponse(data.response);
        // Automatically arms the *next* ask to build on this one — the
        // dismissible tag lets the user opt out for just that next question
        // (see `clearFollowUp`), rather than requiring an explicit action to
        // keep the conversation going.
        setFollowUp({ query: trimmedSituation || "Best move", summary: data.response.game_plan.summary });
        refreshHistory();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function ask() {
    runQuery(situation.trim(), followUp);
  }

  function clearFollowUp() {
    setFollowUp(null);
  }

  function refineFromHistory(entry: AssistantQueryHistoryEntry) {
    setFollowUp({ query: entry.query || "Best move", summary: entry.response.game_plan.summary });
    setPreviewEntry(null);
    setTab("advice");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <FloatingPanel
      onClose={onClose}
      storageKey="ai-assistant"
      title={
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 shrink-0 text-sky-400" />
          Turn Advisor: {name}
        </span>
      }
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-800 pb-2">
        <TabButton active={tab === "advice"} onClick={() => setTab("advice")}>
          Advice
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => {
            setTab("history");
            setPreviewEntry(null);
          }}
        >
          History{history.length > 0 ? ` (${history.length})` : ""}
        </TabButton>
      </div>

      {tab === "advice" && (
        <>
          {/* Always in place (not hidden after the first ask) so the player can
              re-ask a follow-up question without closing and reopening the panel. */}
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
              placeholder={followUp ? "refine this suggestion…" : "or describe the situation…"}
              rows={1}
              maxLength={500}
              className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={ask}
              disabled={loading}
              aria-label="Ask"
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-sky-600 font-medium text-white transition-[width,padding] duration-150 hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600 ${
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
          {followUp && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-sky-300 ${FAINT_TINT_CLS}`}>
              <span className="min-w-0 flex-1 truncate">↳ Refining: “{followUp.query}”</span>
              <IconButton tone="neutral" aria-label="Ask something unrelated instead" onClick={clearFollowUp}>
                ✕
              </IconButton>
            </div>
          )}
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
          {!loading && error && <p className={`py-4 ${INLINE_ERROR_CLS}`}>{error}</p>}
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
        </>
      )}

      {tab === "history" &&
        (previewEntry ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                ← Back to history
              </button>
              <button
                type="button"
                onClick={() => refineFromHistory(previewEntry)}
                className="ml-auto rounded-md bg-sky-950/60 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/60"
              >
                Refine this suggestion →
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <p className={MUTED_LABEL_CLS}>Given</p>
              {previewEntry.query ? (
                <p className="mt-1 text-sm text-slate-300">{previewEntry.query}</p>
              ) : (
                <p className="mt-1 text-sm italic text-slate-500">No additional details — general best move.</p>
              )}
            </div>
            <AiResponseText
              response={previewEntry.response}
              glossary={glossary}
              glossaryByName={glossaryByName}
              availability={availability}
              availabilityByName={availabilityByName}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            {!historyLoaded && <p className={MUTED_BODY_CLS}>Loading history...</p>}
            {historyLoaded && history.length === 0 && <p className={EMPTY_STATE_CLS}>No previous questions yet.</p>}
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setPreviewEntry(entry)}
                className={`${DIM_ROW_CARD_CLS} px-3 py-2 text-left hover:border-sky-700`}
              >
                <p className={MUTED_LABEL_CLS}>{formatSyncTimestamp(entry.createdAt)}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-100">{entry.query || "Best move"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{entry.response.game_plan.summary}</p>
              </button>
            ))}
          </div>
        ))}
    </FloatingPanel>
  );
}
