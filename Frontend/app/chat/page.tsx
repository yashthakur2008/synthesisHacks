"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/Container";
import { StepHeader } from "@/components/layout/StepHeader";
import { StepGuard } from "@/components/flow/StepGuard";
import { useFlow } from "@/components/flow/FlowProvider";
import { analyze } from "@/lib/mock/analyze";
import { reconstruct } from "@/lib/mock/reconstruct";
import type { Analysis, ChatMessage } from "@/lib/types";
import { DittoMark } from "@/components/identity/DittoMark";

export default function ChatPage() {
  return (
    <StepGuard require="chat">
      <ChatContent />
    </StepGuard>
  );
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function extractUrl(text: string): string | null {
  const explicit = text.match(/https?:\/\/\S+/i);
  if (explicit) return explicit[0].replace(/[.,!?)]+$/, "");
  const domain = text.match(/\b([\w-]+(?:\.[\w-]+)+)(\/\S*)?\b/);
  if (domain) {
    const candidate = domain[0];
    try {
      const u = new URL(`https://${candidate}`);
      if (u.hostname.includes(".")) return `https://${candidate}`;
    } catch {
      return null;
    }
  }
  return null;
}

function ChatContent() {
  const router = useRouter();
  const { state, patch } = useFlow();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"thinking" | "building" | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Seed with a greeting on first arrival.
  useEffect(() => {
    if (state.messages.length === 0) {
      const first = state.preferences?.name?.trim().split(/\s+/)[0];
      const greeting: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text:
          (first ? `Hi ${first} — I'm Ditto. ` : "Hi — I'm Ditto. ") +
          "Paste any web link, and I'll read the page carefully. " +
          "Once I've had a look, tell me how you'd like the new version to feel.",
      };
      patch({ messages: [greeting] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll new messages into view (smooth unless reduced-motion).
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const last = log.querySelector<HTMLElement>("li:last-child");
    if (last) last.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [state.messages.length, busy]);

  function appendMessages(...msgs: ChatMessage[]) {
    patch({ messages: [...state.messages, ...msgs] });
  }

  function setMessagesAnd(msgs: ChatMessage[], patchExtra: Record<string, unknown>) {
    patch({ messages: msgs, ...patchExtra });
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;

    setDraft("");
    const userMsg: ChatMessage = { id: makeId(), role: "user", text };
    const url = extractUrl(text);

    if (url) {
      const messagesAfterUser = [...state.messages, userMsg];
      patch({ messages: messagesAfterUser });
      setBusy("thinking");
      const analysis = await analyze(url);
      const findingsMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: assistantOpener(analysis),
        findings: analysis,
      };
      setMessagesAnd([...messagesAfterUser, findingsMsg], {
        source: { mode: "url", url },
        analysis,
      });
      setBusy(null);
      composerRef.current?.focus();
      return;
    }

    // No URL in this message.
    if (!state.analysis) {
      appendMessages(userMsg, {
        id: makeId(),
        role: "assistant",
        text:
          "I'd love to help — could you paste a link to the page you'd like me to read? " +
          "Anything starting with http:// or https:// works.",
      });
      composerRef.current?.focus();
      return;
    }

    // Treat as intent / direction for the rebuild.
    const nextIntent = state.intent
      ? `${state.intent}\n${text}`
      : text;
    const wantsRebuildNow = /\b(rebuild|create|make it|go ahead|let'?s? go|do it|now)\b/i.test(
      text,
    );
    const ack: ChatMessage = {
      id: makeId(),
      role: "assistant",
      text: assistantAck(text),
      offerRebuild: true,
    };
    setMessagesAnd([...state.messages, userMsg, ack], { intent: nextIntent });
    composerRef.current?.focus();
    if (wantsRebuildNow) void buildRebuilt(nextIntent);
  }

  async function buildRebuilt(intentOverride?: string) {
    if (!state.analysis || busy) return;
    setBusy("building");
    const intent = intentOverride ?? state.intent;
    const buildingMsg: ChatMessage = {
      id: makeId(),
      role: "assistant",
      text: "On it — building a clearer version of the page now…",
    };
    patch({ messages: [...state.messages, buildingMsg] });
    const rebuilt = await reconstruct(state.analysis, state.preferences, intent);
    patch({ rebuilt });
    setBusy(null);
    router.push("/output");
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function resetConversation() {
    patch({
      messages: [
        {
          id: makeId(),
          role: "assistant",
          text:
            "Fresh start. Paste a link to any page you'd like me to look at.",
        },
      ],
      analysis: null,
      source: null,
      intent: "",
      rebuilt: null,
    });
  }

  const liveMessage =
    busy === "thinking"
      ? "Ditto is reading the page."
      : busy === "building"
        ? "Ditto is building the improved version."
        : "";

  const canBuild = Boolean(state.analysis) && state.intent.trim().length > 0;

  return (
    <Container size="md">
      <StepHeader current="chat" />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Talk to Ditto.
          </h1>
          <p className="mt-3 max-w-prose text-[var(--color-ink-soft)] text-lg leading-relaxed">
            Paste a link, ask questions, and describe how you&rsquo;d like the
            rebuilt page to feel.
          </p>
        </div>
        {state.messages.length > 1 ? (
          <button
            type="button"
            onClick={resetConversation}
            className="btn-quiet shrink-0 underline-offset-4 hover:underline"
          >
            Start new chat
          </button>
        ) : null}
      </header>

      <ol
        ref={logRef}
        aria-label="Conversation with Ditto"
        className="mt-10 flex flex-col gap-4 pb-44"
      >
        {state.messages.map((msg) => (
          <Bubble
            key={msg.id}
            message={msg}
            onBuild={() => void buildRebuilt()}
            building={busy === "building"}
          />
        ))}
        {busy === "thinking" ? <ThinkingBubble label="Reading the page…" /> : null}
        {busy === "building" && state.messages.at(-1)?.text.startsWith("On it") ? (
          <ThinkingBubble label="Building the improved version…" />
        ) : null}
      </ol>

      {/* Screen-reader announcement for async work */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {liveMessage}
      </div>

      <form
        onSubmit={handleSend}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-rule)] bg-[color-mix(in_oklab,var(--color-paper)_92%,transparent)] backdrop-blur"
        aria-label="Send a message"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-4 sm:px-8">
          <label htmlFor="composer" className="sr-only">
            Type a message
          </label>
          <div className="flex items-end gap-3">
            <textarea
              id="composer"
              ref={composerRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                state.analysis
                  ? "Tell me how you'd like the new version to feel…"
                  : "Paste a link, or ask me anything…"
              }
              className="field-input min-h-[3rem] flex-1 resize-none"
              disabled={busy !== null}
            />
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={!draft.trim() || busy !== null}
            >
              Send
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[var(--color-ink-muted)] text-xs">
              Enter to send · Shift + Enter for a new line
            </p>
            {canBuild ? (
              <button
                type="button"
                onClick={() => void buildRebuilt()}
                disabled={busy !== null}
                className="rounded-[var(--radius-md)] border border-[var(--color-grow)] bg-[var(--color-grow-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white disabled:opacity-60"
              >
                Create improved version
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </Container>
  );
}

function assistantOpener(analysis: Analysis): string {
  const r = analysis.readability;
  const tone =
    r.level === "difficult"
      ? "It reads on the harder side"
      : r.level === "moderate"
        ? "It reads at a moderate level"
        : "It reads pretty plainly already";
  return (
    `I had a careful look at "${analysis.pageTitle}". ${tone} — about a grade ${r.gradeApprox} reading level. ` +
    `${r.note}\n\nA few things I noticed while reading. Tell me which of these matter most for you, ` +
    `or describe how you'd like the new version to feel.`
  );
}

function assistantAck(userText: string): string {
  const t = userText.toLowerCase();
  if (/\b(child|kid)\b/.test(t))
    return "Got it — I'll make it safe and friendly for younger readers. Want me to build the improved version now?";
  if (/\b(simpler|simpl|plain|easier)\b/.test(t))
    return "Understood — I'll rewrite it in plainer, simpler language. Want me to build the improved version now?";
  if (/\b(caption|transcript|video|audio|hearing)\b/.test(t))
    return "Got it — I'll add captions and a transcript where they're missing. Want me to build the improved version now?";
  if (/\b(short|chunk|paragraph)\b/.test(t))
    return "Understood — I'll keep paragraphs short and break up long sections. Want me to build the improved version now?";
  return "Got it. I'll keep that in mind while I rebuild the page. Want me to build the improved version now?";
}

function Bubble({
  message,
  onBuild,
  building,
}: {
  message: ChatMessage;
  onBuild: () => void;
  building: boolean;
}) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <li className="flex w-full justify-end">
        <div className="flex max-w-[42rem] flex-col gap-3 rounded-[var(--radius-lg)] rounded-br-sm bg-[var(--color-accent-soft)] px-5 py-4 text-[var(--color-ink)]">
          <p className="sr-only">You said:</p>
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.text}
          </div>
        </div>
      </li>
    );
  }
  return (
    <li className="flex w-full justify-start gap-3">
      <div
        aria-hidden="true"
        className="mt-1 shrink-0 text-[var(--color-ink-soft)]"
      >
        <DittoMark size={32} />
      </div>
      <div className="flex max-w-[42rem] flex-col gap-3 rounded-[var(--radius-lg)] rounded-tl-sm border border-[var(--color-rule)] bg-white px-5 py-4 text-[var(--color-ink)]">
        <p className="sr-only">Ditto said:</p>
        <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>
        {message.findings ? <FindingsBlock analysis={message.findings} /> : null}
        {message.offerRebuild ? (
          <div>
            <button
              type="button"
              onClick={onBuild}
              disabled={building}
              className="mt-1 rounded-[var(--radius-md)] border border-[var(--color-grow)] bg-[var(--color-grow-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white disabled:opacity-60"
            >
              Create improved version
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ThinkingBubble({ label }: { label: string }) {
  return (
    <li className="flex w-full justify-start gap-3" aria-hidden="true">
      <div className="mt-1 shrink-0 text-[var(--color-ink-faint)]">
        <DittoMark size={32} />
      </div>
      <div className="flex items-center gap-2 rounded-[var(--radius-lg)] rounded-tl-sm border border-[var(--color-rule)] bg-white px-5 py-3 text-[var(--color-ink-muted)] italic">
        <span className="inline-flex gap-1">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </span>
        <span>{label}</span>
      </div>
    </li>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-ink-faint)]"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function FindingsBlock({ analysis }: { analysis: Analysis }) {
  const sections: { title: string; items: Analysis["missingA11y"] }[] = [
    { title: "Missing accessibility features", items: analysis.missingA11y },
    { title: "Structure that could be clearer", items: analysis.structureIssues },
    { title: "Things that may get in the way", items: analysis.barriers },
  ];
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-[var(--color-rule)] pt-4">
      <p className="text-xs text-[var(--color-ink-muted)]">
        Tap a section to read what I found. Or just describe how you want the
        new version to feel.
      </p>
      {sections.map((s) =>
        s.items.length > 0 ? (
          <details
            key={s.title}
            className="group rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-paper)]/60 open:bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent-strong)] focus-visible:outline-offset-2">
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
                {s.title}
              </span>
              <span className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                <span
                  aria-label={`${s.items.length} ${s.items.length === 1 ? "item" : "items"}`}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-paper-deep)] px-1.5 font-semibold text-[var(--color-ink-soft)]"
                >
                  {s.items.length}
                </span>
                <span
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </span>
            </summary>
            <ul className="flex flex-col gap-3 border-t border-[var(--color-rule)] px-4 py-3">
              {s.items.map((f) => (
                <li
                  key={f.id}
                  className="border-l-2 border-[var(--color-warm)] pl-3"
                >
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    {f.description}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null,
      )}
    </div>
  );
}
