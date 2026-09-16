"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatAnswer, ChatCitation } from "@/lib/portal/chat";

interface RootCauseChatProps {
  buildId: string;
  initialSummary?: ChatAnswer | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
}

export function RootCauseChat({ buildId, initialSummary }: RootCauseChatProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialSummary
      ? [
          {
            id: "summary",
            role: "assistant",
            text: initialSummary.answer,
            citations: initialSummary.citations,
          },
        ]
      : []
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setInput("");

    try {
      const res = await fetch(`/api/builds/${buildId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as ChatAnswer & { error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: data.error ?? "Chat request failed.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.answer,
          citations: data.citations,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "Network error talking to the build chat.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <div className="chat-panel panel">
      <div
        style={{
          padding: "0.85rem 1rem",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
        }}
      >
        Root-cause chat
      </div>
      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <p style={{ color: "var(--ink-muted)", margin: 0 }}>
            Ask what happened — answers cite only this build&apos;s record.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="chat-bubble" data-role={m.role}>
            {m.text}
            {m.citations && m.citations.length > 0 && (
              <ul className="chat-citations">
                {m.citations.map((c) => (
                  <li key={`${c.kind}-${c.ref}`}>
                    [{c.kind}] {c.ref} — {c.excerpt}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What failed? Swarm? Score?"
          aria-label="Ask about this build"
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
