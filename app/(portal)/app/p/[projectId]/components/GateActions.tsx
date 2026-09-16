"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  OVERRIDE_REASONS,
  OVERRIDE_REASON_LABELS,
  type OverrideReason,
} from "@/lib/portal/status";

interface GateActionsProps {
  buildId: string;
  disabled?: boolean;
}

export const GateActions = ({ buildId, disabled }: GateActionsProps) => {
  const router = useRouter();
  const [reason, setReason] = useState<OverrideReason>(OVERRIDE_REASONS[0]);
  const [busy, setBusy] = useState<"approve" | "override" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (action: "approve" | "override") => {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, string> = { action };
      if (action === "override") body.override_reason = reason;

      const res = await fetch(`/api/builds/${buildId}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Gate action failed");
        return;
      }
      setMessage(action === "approve" ? "Approved." : "Override recorded.");
      router.refresh();
    } catch {
      setError("Network error while updating gate.");
    } finally {
      setBusy(null);
    }
  };

  if (disabled) {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Gate actions unavailable until the database is connected.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-sm"
          disabled={busy !== null}
          onClick={() => void submit("approve")}
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="rounded-sm"
          disabled={busy !== null}
          onClick={() => void submit("override")}
        >
          {busy === "override" ? "Recording…" : "Override & ship"}
        </Button>
      </div>
      <label className="block max-w-sm">
        <span className="mb-1.5 block font-mono text-[0.7rem] tracking-wide text-muted-foreground">
          Override reason (§7)
        </span>
        <select
          className="h-9 w-full rounded-sm border border-border bg-card px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={reason}
          onChange={(e) => setReason(e.target.value as OverrideReason)}
          aria-label="Structured override reason"
        >
          {OVERRIDE_REASONS.map((r) => (
            <option key={r} value={r}>
              {OVERRIDE_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="m-0 text-sm text-success">
          {message}
        </p>
      )}
    </div>
  );
};
