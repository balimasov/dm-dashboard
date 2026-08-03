"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { buildAiAvailability, buildAiAvailabilityByName } from "@/lib/aiAvailability";
import { parseJsonOrThrow } from "@/lib/apiClient";
import { buildAiGlossary, buildAiGlossaryByName } from "@/lib/aiGlossary";
import { formatSyncTimestamp } from "@/lib/format";
import { AssistantChatMessage, Character, Creature } from "@/lib/types";
import { AiChatReply, AiResponseText } from "./AiResponseText";
import { CollapseChevron } from "./ui/CollapseChevron";
import { FloatingPanel } from "./ui/FloatingPanel";
import { IconButton } from "./ui/IconButton";
import { AI_CHIP_CLS } from "./ui/containerStyles";
import { SendIcon, SparklesIcon, TrashOutlineIcon } from "./ui/icons";
import { Spinner } from "./ui/Spinner";
import { EMPTY_STATE_CLS, INLINE_ERROR_CLS, MUTED_BODY_CLS } from "./ui/typography";

type Target = { campaignId: string; characterId: string } | { campaignId: string; creatureId: string };

/**
 * The canned follow-up questions shown under the latest plan card. Each has
 * its own emoji (distinct across the set, so they read as different actions
 * at a glance rather than a row of identical pills) and a `query` that's
 * allowed to differ from the visible `label` — the cinematic one asks a much
 * more detailed question than its short chip label shows, since the model
 * only leans into "epic/cinematic/improvised" when the actual prompt says so
 * explicitly, not from a two-word label alone.
 */
export const QUICK_QUESTIONS: { emoji: string; label: string; query: string }[] = [
  { emoji: "🎯", label: "Чому це найкраще?", query: "Чому це найкраще?" },
  { emoji: "🔀", label: "Який альтернативний варіант?", query: "Який альтернативний варіант?" },
  { emoji: "🔋", label: "Як зберегти ресурси?", query: "Як зберегти ресурси?" },
  {
    emoji: "🎭",
    label: "Які імпровізовані варіанти?",
    query:
      "Запропонуй 2-3 цікаві імпровізовані дії для цього ходу — не заклинання чи здібності з листа персонажа, а фізичні дії з оточенням чи проти самого ворога, на кшталт: перекинути стіл для укриття, розлити олію під ноги ворогам, обвалити стелаж чи люстру на противників, перерізати мотузку й обвалити щось на ворогів, кинути пісок в очі, забарикадувати двері, зіштовхнути ворога зі сходів чи в прірву, погасити освітлення, використати ворога як живий щит, вибити зброю з рук, спровокувати чи обдурити ворога удаваною капітуляцією, зістрибнути на ворога згори, скотити бочку зі схилу. Це лише приклади для натхнення, не обмежуйся ними — придумай варіанти, що пасують саме під описану ситуацію й оточення персонажа. Для кожного варіанта коротко опиши, що персонаж фізично робить і який тактичний ефект це дає, і врахуй, що фінальний результат такої дії завжди лишається на розсуд DM.",
  },
  {
    emoji: "🎬",
    label: "Який кінематографічний варіант?",
    query:
      "Опиши максимально кінематографічний і епічний варіант дій цього ходу з упором на конкретну фізичну хореографію персонажа — куди він рухається, на що застрибує чи чіпляється, як саме завдає удару чи застосовує здібність — а не лише на атмосферу сцени. Навіть якщо тактично це не найоптимальніший вибір.",
  },
];

function historyQueryParams(target: Target): string {
  const params = new URLSearchParams({ campaignId: target.campaignId });
  if ("characterId" in target) params.set("characterId", target.characterId);
  else params.set("creatureId", target.creatureId);
  return params.toString();
}

function GivenBox({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      {query ? (
        <p className="text-sm text-slate-300">{query}</p>
      ) : (
        <p className="text-sm italic text-slate-500">No additional details — general best move.</p>
      )}
    </div>
  );
}

/**
 * The structured turn-plan card — a distinct message type inside the chat
 * feed (not a separate screen). Every plan is kept once superseded by a
 * newer one, just collapsed to its header by default (`isLatest` decides
 * the initial state; the user can still freely re-expand/re-collapse any
 * of them) — history is never deleted here, only cleared wholesale via the
 * panel header's trash action.
 */
function PlanCard({
  message,
  isLatest,
  collapsed,
  onToggle,
  onPickChip,
  glossary,
  glossaryByName,
  availability,
  availabilityByName,
  flaggedNames,
}: {
  message: Extract<AssistantChatMessage, { kind: "plan" }>;
  isLatest: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onPickChip: (question: string) => void;
  glossary: ReturnType<typeof buildAiGlossary>;
  glossaryByName: ReturnType<typeof buildAiGlossary>;
  availability: ReturnType<typeof buildAiAvailability>;
  availabilityByName: ReturnType<typeof buildAiAvailability>;
  flaggedNames: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-sky-800/60 bg-sky-950/10">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 rounded-t-xl px-3 py-2 text-left hover:bg-sky-950/20"
        >
          <CollapseChevron open={!collapsed} className="text-slate-500" />
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-sky-300">
            <SparklesIcon className="h-3 w-3 shrink-0" />
            Suggested move
          </span>
          <span className="text-xs text-slate-500">{formatSyncTimestamp(message.createdAt)}</span>
        </button>
        {!collapsed && (
          <div className="flex flex-col gap-3 border-t border-sky-900/40 p-3">
            <GivenBox query={message.query} />
            <AiResponseText
              response={message.plan}
              glossary={glossary}
              glossaryByName={glossaryByName}
              availability={availability}
              availabilityByName={availabilityByName}
              flaggedNames={flaggedNames}
            />
          </div>
        )}
      </div>
      {isLatest && !collapsed && (
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q.label} type="button" onClick={() => onPickChip(q.query)} className={AI_CHIP_CLS}>
              <span aria-hidden="true">{q.emoji}</span> {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Right-aligned timestamp under a user bubble, left-aligned under a reply bubble — same small muted-caption treatment either side, Telegram's own convention for "when was this sent" without competing with the message text for attention. */
function BubbleTimestamp({ createdAt, align }: { createdAt: string; align: "left" | "right" }) {
  return <p className={`px-1 text-[10px] text-slate-600 ${align === "right" ? "text-right" : "text-left"}`}>{formatSyncTimestamp(createdAt)}</p>;
}

function UserBubble({ text, createdAt }: { text: string; createdAt: string }) {
  return (
    <div className="ml-auto flex max-w-[85%] flex-col">
      <div className="rounded-2xl rounded-br-sm bg-sky-600 px-3 py-2 text-sm text-white">{text}</div>
      <BubbleTimestamp createdAt={createdAt} align="right" />
    </div>
  );
}

function ReplyBubble({
  message,
  glossary,
  glossaryByName,
  flaggedNames,
}: {
  message: Extract<AssistantChatMessage, { kind: "reply" }>;
  glossary: ReturnType<typeof buildAiGlossary>;
  glossaryByName: ReturnType<typeof buildAiGlossary>;
  flaggedNames: Set<string>;
}) {
  return (
    <div className="flex max-w-[92%] flex-col">
      <div className="rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-900/70 px-3 py-2">
        <AiChatReply text={message.reply} glossary={glossary} glossaryByName={glossaryByName} flaggedNames={flaggedNames} />
      </div>
      <BubbleTimestamp createdAt={message.createdAt} align="left" />
    </div>
  );
}

/**
 * "What can this character/creature do right now" (a structured plan card)
 * plus an ordinary chat for follow-up questions — both live in the same
 * scrolling feed, not separate screens/tabs. A plan card is its own message
 * type (collapsible, kept once superseded rather than deleted); a "Запитати"
 * question becomes a user bubble followed by a short plain-text reply
 * bubble, with no repeated option list.
 *
 * The feed *is* the entity's persisted conversation (`assistant_messages` in
 * `db.ts`) — opening the panel loads it via `GET /api/assistant/history`, so
 * reopening later continues the same conversation instead of starting blank.
 * The header's trash action clears it entirely (`DELETE` on the same
 * endpoint), gated behind a native confirm since it's irreversible.
 *
 * `entity` is the same `Character`/`Creature` object the caller already has
 * in scope (not re-fetched) — only used client-side to build the hover-hint
 * glossary for `AiResponseText`/`AiChatReply` (see `buildAiGlossary`), never
 * sent anywhere; the actual LLM request still only carries `target`'s ids.
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
  zIndexClassName,
}: {
  name: string;
  target: Target;
  entity: Character | Creature;
  onClose: () => void;
  /** Forwarded to `FloatingPanel` — see its own doc comment. Callers opening this from inside an already-open `Modal` (the details modals' own "Ask AI" pill) pass `"z-[60]"` so the panel lands above that modal's backdrop instead of behind it. */
  zIndexClassName?: string;
}) {
  useEscapeToClose(onClose);
  const glossary = useMemo(() => buildAiGlossary(entity), [entity]);
  const glossaryByName = useMemo(() => buildAiGlossaryByName(entity), [entity]);
  const availability = useMemo(() => buildAiAvailability(entity), [entity]);
  const availabilityByName = useMemo(() => buildAiAvailabilityByName(entity), [entity]);
  // Same `flaggedAbilities`/`flaggedTraits` name-matching convention
  // `reminders.tsx` uses for the card's own 🔥 badge — an option the model
  // lists that's also flagged gets the same flame prefix here, done
  // app-side against data we already know exactly, rather than asking the
  // model to somehow infer which of its own suggested options the DM
  // happens to have flagged.
  const flaggedNames = useMemo(
    () => new Set("className" in entity ? (entity.flaggedAbilities ?? []) : (entity.flaggedTraits ?? [])),
    [entity]
  );

  const [situation, setSituation] = useState("");
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The text of an in-flight "ask" — shown as its own bubble the instant the
  // request goes out (see `submit`), rather than waiting for the reply to
  // come back before the question itself appears. Left set on failure (not
  // cleared in the `.catch()` below) so the question stays visible next to
  // the error message instead of vanishing along with it; a "plan" submit
  // clears it, since a rebuilt plan's own `query` is shown inside its
  // `GivenBox` instead, not as a bubble.
  const [pendingAsk, setPendingAsk] = useState<{ text: string; createdAt: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  // The most recently appended message's own wrapper (see the `.map` below)
  // — scrolled to its *top* when a new one arrives (see the effect below),
  // rather than the feed's bottom: a long plan card's bottom edge is deep
  // past its own summary/header, so scrolling to the feed's absolute end
  // was landing the DM past the very thing a fresh plan needs them to read
  // first.
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const entityId = "characterId" in target ? target.characterId : target.creatureId;

  useEffect(() => {
    fetch(`/api/assistant/history?${historyQueryParams(target)}`)
      .then((res) => parseJsonOrThrow<AssistantChatMessage[]>(res, "Couldn't load this conversation."))
      .then(setMessages)
      .catch(() => {
        // Silent — an empty feed (as if this were a fresh conversation)
        // isn't worth interrupting the panel over.
      })
      .finally(() => setMessagesLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.campaignId, entityId]);

  // While a request is in flight (a pending "ask" bubble, or the generic
  // "Thinking..." spinner for a plan), scroll to the feed's actual bottom so
  // that placeholder is visible.
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [loading, pendingAsk]);

  // Once a new message actually lands, scroll *its own top* into view
  // instead — for a short reply this looks the same as scrolling to the
  // bottom, but for a plan card it means landing on the header/summary
  // instead of buried past the full option list. Runs after the effect
  // above in the same commit (React runs effects in declaration order), so
  // this is the one that wins when a message arrives in the same update
  // that clears `loading`.
  useEffect(() => {
    if (messages.length > 0) lastMessageRef.current?.scrollIntoView({ block: "start" });
  }, [messages.length]);

  // Grows the bar with the text instead of scrolling inside a fixed-height
  // box — matches the single-line "chat input" feel up until someone actually
  // writes several lines, capped so a very long paste doesn't push the
  // buttons off screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [situation]);

  function submit(intent: "plan" | "ask", text: string) {
    // Guards against a double-fire (an accidental extra click, or Enter
    // pressed again before the last turn lands) sending a second paid LLM
    // call for the exact same question — the buttons below are also
    // disabled while loading, this covers the Enter-key path too.
    if (loading) return;
    setLoading(true);
    setError(null);
    setPendingAsk(intent === "ask" ? { text, createdAt: new Date().toISOString() } : null);
    const responseMode = text ? "focused" : "overview";
    fetch("/api/assistant/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...target,
        intent,
        ...(intent === "plan" ? { response_mode: responseMode } : {}),
        ...(text ? { situation: text } : {}),
      }),
    })
      .then((res) => parseJsonOrThrow<{ message: AssistantChatMessage }>(res, "The AI assistant couldn't answer right now."))
      .then((data) => {
        setMessages((prev) => [...prev, data.message]);
        setPendingAsk(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function suggestMove() {
    const text = situation.trim();
    setSituation("");
    submit("plan", text);
  }

  function ask() {
    const text = situation.trim();
    if (!text) return;
    setSituation("");
    submit("ask", text);
  }

  function onDeleteHistory() {
    if (messages.length === 0) return;
    if (!window.confirm("Clear this conversation? This can't be undone.")) return;
    fetch(`/api/assistant/history?${historyQueryParams(target)}`, { method: "DELETE" })
      .then(() => setMessages([]))
      .catch(() => {
        // A failed clear just leaves the conversation as-is — nothing to reconcile client-side.
      });
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const lastPlanId = [...messages].reverse().find((m) => m.kind === "plan")?.id;
  function isPlanCollapsed(id: string): boolean {
    const defaultCollapsed = id !== lastPlanId;
    return collapsedIds.has(id) ? !defaultCollapsed : defaultCollapsed;
  }

  const hasMessages = messages.length > 0;

  return (
    <FloatingPanel
      onClose={onClose}
      storageKey="ai-assistant"
      zIndexClassName={zIndexClassName}
      title={
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 shrink-0 text-sky-400" />
          Ask AI: {name}
        </span>
      }
      headerActions={
        <IconButton tone="danger" onClick={onDeleteHistory} aria-label="Clear conversation" title="Clear conversation">
          <TrashOutlineIcon className="h-4 w-4" />
        </IconButton>
      }
    >
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {!messagesLoaded && <p className={MUTED_BODY_CLS}>Loading...</p>}
        {messagesLoaded && !hasMessages && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center">
            <p className={EMPTY_STATE_CLS}>Ask this assistant anything D&D:</p>
            <p className={EMPTY_STATE_CLS}>⚔️ the best move for the current turn</p>
            <p className={EMPTY_STATE_CLS}>📜 current state and resources</p>
            <p className={EMPTY_STATE_CLS}>📖 any D&D 2024 (5.5e) rules question</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id} ref={i === messages.length - 1 ? lastMessageRef : undefined}>
            {msg.kind === "plan" ? (
              <PlanCard
                message={msg}
                isLatest={msg.id === lastPlanId}
                collapsed={isPlanCollapsed(msg.id)}
                onToggle={() => toggleCollapse(msg.id)}
                onPickChip={(q) => submit("ask", q)}
                glossary={glossary}
                glossaryByName={glossaryByName}
                availability={availability}
                availabilityByName={availabilityByName}
                flaggedNames={flaggedNames}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {msg.query && <UserBubble text={msg.query} createdAt={msg.createdAt} />}
                <ReplyBubble message={msg} glossary={glossary} glossaryByName={glossaryByName} flaggedNames={flaggedNames} />
              </div>
            )}
          </div>
        ))}
        {pendingAsk !== null && (
          <div className="flex flex-col gap-2">
            <UserBubble text={pendingAsk.text} createdAt={pendingAsk.createdAt} />
            {loading && (
              <div className="flex max-w-[92%] items-center gap-3 rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-900/70 px-3 py-2">
                <Spinner className="h-4 w-4" />
                <p className={MUTED_BODY_CLS}>Thinking...</p>
              </div>
            )}
          </div>
        )}
        {loading && pendingAsk === null && (
          <div className="flex items-center gap-3 py-2">
            <Spinner className="h-5 w-5" />
            <p className={MUTED_BODY_CLS}>Thinking...</p>
          </div>
        )}
        {!loading && error && <p className={INLINE_ERROR_CLS}>{error}</p>}
        <div ref={feedEndRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-800 pt-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-950 py-1.5 pl-4 pr-1.5 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/30">
          <textarea
            ref={textareaRef}
            autoFocus
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // Typed text reads as a question to ask; an empty bar has
                // nothing to "ask," so it falls back to suggesting a move
                // instead. Both buttons are always on screen regardless.
                if (situation.trim()) ask();
                else suggestMove();
              }
            }}
            placeholder="describe the situation, or ask anything D&D…"
            rows={1}
            maxLength={500}
            className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
        </div>
        {/* Both actions are always on screen, even for the very first
            message — a fresh conversation isn't necessarily starting with
            "what's my best move," it might just as well open with a
            state/rules question via "Ask" instead. "Suggest move" always
            reads the same regardless of whether the note above is empty or
            not — see `suggestMove`/`route.ts`'s own comment: a typed note is
            just extra detail for a clean read of the *current* sheet, never
            a follow-up to the prior turn (that's what "Ask" is for). */}
        <div className="flex gap-2">
          {/* Pill-shaped (`rounded-full`, fixed `h-9`) unlike every `Button`
              variant's own baked-in `rounded-lg`/padding, so these stay plain
              `<button>`s rather than risking the same equal-specificity
              Tailwind class conflict `Button`'s own doc comment warns about
              — but the focus-visible ring and disabled treatment below still
              match that shared component's, instead of the plain
              `disabled:opacity-50` every button in the app moved away from. */}
          <button
            type="button"
            onClick={suggestMove}
            disabled={loading}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-700 text-sm font-medium text-slate-200 hover:border-sky-600 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:border-slate-700"
          >
            <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
            Suggest move
          </button>
          <button
            type="button"
            onClick={ask}
            disabled={loading}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-sky-600 text-sm font-medium text-white hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            <SendIcon className="h-4 w-4 shrink-0" />
            Ask
          </button>
        </div>
        <p className="truncate text-center text-[11px] text-slate-500">
          <b className="font-semibold text-slate-400">Suggest move:</b> leave note empty for the best move, or add
          details to factor in.
        </p>
      </div>
    </FloatingPanel>
  );
}
