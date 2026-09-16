"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/portal/queries";

interface CommandPaletteProps {
  projectId: string;
}

export function CommandPalette({ projectId }: CommandPaletteProps) {
  const router = useRouter();
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setSelected(0);
    setError(null);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isPalette =
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey);
      if (isPalette) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&projectId=${encodeURIComponent(projectId)}`,
          { signal: controller.signal }
        );
        const data = (await res.json()) as {
          hits?: SearchHit[];
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Search failed");
          setHits([]);
          return;
        }
        setHits(data.hits ?? []);
        setSelected(0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Search failed");
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open, projectId]);

  const go = (hit: SearchHit) => {
    close();
    router.push(hit.href);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-controls={dialogId}
      >
        Search <span className="kbd">⌘K</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded="true"
        aria-controls={dialogId}
      >
        Search <span className="kbd">⌘K</span>
      </button>
      <div
        className="cmd-overlay"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          id={dialogId}
          className="cmd-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specs, builds, projects…"
            aria-autocomplete="list"
            aria-controls={`${dialogId}-list`}
            aria-activedescendant={
              hits[selected] ? `${dialogId}-opt-${selected}` : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && hits[selected]) {
                e.preventDefault();
                go(hits[selected]!);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
          <ul id={`${dialogId}-list`} className="cmd-list" role="listbox">
            {loading && (
              <li className="cmd-hint" style={{ border: "none" }}>
                Searching…
              </li>
            )}
            {error && (
              <li className="cmd-hint" style={{ border: "none", color: "var(--danger)" }}>
                {error}
              </li>
            )}
            {!loading && !error && query.trim() && hits.length === 0 && (
              <li className="cmd-hint" style={{ border: "none" }}>
                No matches in this project.
              </li>
            )}
            {hits.map((hit, index) => (
              <li key={`${hit.type}-${hit.id}`} role="presentation">
                <button
                  type="button"
                  id={`${dialogId}-opt-${index}`}
                  role="option"
                  className="cmd-item"
                  aria-selected={index === selected}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => go(hit)}
                >
                  <div className="title">{hit.title}</div>
                  {hit.subtitle && (
                    <div className="subtitle">{hit.subtitle}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="cmd-hint">
            Defaults to current project · Esc to close · ↑↓ Enter to navigate
          </div>
        </div>
      </div>
    </>
  );
}
