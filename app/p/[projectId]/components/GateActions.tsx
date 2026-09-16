"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  OVERRIDE_REASONS,
  OVERRIDE_REASON_LABELS,
  type OverrideReason,
} from "@/lib/portal/status";

interface GateActionsProps {
  buildId: string;
  disabled?: boolean;
}

export function GateActions({ buildId, disabled }: GateActionsProps) {
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
      <p style={{ color: "var(--ink-muted)", margin: 0 }}>
        Gate actions unavailable until the database is connected.
      </p>
    );
  }

  return (
    <div className="gate-actions">
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => void submit("approve")}
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy !== null}
          onClick={() => void submit("override")}
        >
          {busy === "override" ? "Recording…" : "Override & ship"}
        </button>
      </div>
      <label>
        <span
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: "0.35rem",
          }}
        >
          Override reason (§7)
        </span>
        <select
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
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" style={{ color: "var(--ok)", margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
