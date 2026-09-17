"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/portal/queries";

interface CommandPaletteProps {
  projectId: string;
}

export const CommandPalette = ({ projectId }: CommandPaletteProps) => {
  const router = useRouter();
  const dialogId = useId();
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
          { signal: controller.signal },
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

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={dialogId}
    >
      Search{" "}
      <kbd className="ml-1 border border-border bg-muted px-1 font-mono text-[0.65rem] text-muted-foreground">
        ⌘K
      </kbd>
    </Button>
  );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/10 px-4 pt-[12vh]"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          id={dialogId}
          className="w-full max-w-xl overflow-hidden border border-border bg-card"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <Input
            autoFocus
            className="rounded-none border-0 border-b border-border px-4 focus-visible:ring-0"
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
                setSelected((i) =>
                  Math.min(i + 1, Math.max(hits.length - 1, 0)),
                );
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
          <ul
            id={`${dialogId}-list`}
            className="max-h-72 overflow-y-auto py-1"
            role="listbox"
          >
            {loading && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Searching…
              </li>
            )}
            {error && (
              <li className="px-4 py-3 text-sm text-destructive">{error}</li>
            )}
            {!loading && !error && query.trim() && hits.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                No matches in this project.
              </li>
            )}
            {hits.map((hit, index) => (
              <li key={`${hit.type}-${hit.id}`} role="presentation">
                <button
                  type="button"
                  id={`${dialogId}-opt-${index}`}
                  role="option"
                  className={cn(
                    "flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors",
                    index === selected
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/50",
                  )}
                  aria-selected={index === selected}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => go(hit)}
                >
                  <div className="text-sm font-medium">{hit.title}</div>
                  {hit.subtitle && (
                    <div className="font-mono text-xs text-muted-foreground">
                      {hit.subtitle}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-2 font-mono text-[0.7rem] text-muted-foreground">
            Defaults to current project · Esc to close · ↑↓ Enter to navigate
          </div>
        </div>
      </div>
    </>
  );
};
