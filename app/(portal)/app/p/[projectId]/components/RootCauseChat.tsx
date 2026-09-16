"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

export const RootCauseChat = ({
  buildId,
  initialSummary,
}: RootCauseChatProps) => {
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
      : [],
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
    <div className="flex min-h-[28rem] flex-col rounded-sm border border-border bg-card">
      <div className="border-b border-border px-4 py-3 font-mono text-sm font-semibold tracking-tight">
        Root-cause chat
      </div>
      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        ref={logRef}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="m-0 text-sm text-muted-foreground">
            Ask what happened — answers cite only this build&apos;s record.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[95%] rounded-sm border px-3 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "self-end border-foreground bg-foreground text-background"
                : "self-start border-border bg-background text-foreground",
            )}
          >
            {m.text}
            {m.citations && m.citations.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 font-mono text-[0.7rem] text-muted-foreground">
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
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={onSubmit}
      >
        <Input
          className="rounded-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What failed? Swarm? Score?"
          aria-label="Ask about this build"
          disabled={busy}
        />
        <Button type="submit" className="rounded-sm" disabled={busy}>
          {busy ? "…" : "Ask"}
        </Button>
      </form>
    </div>
  );
};
