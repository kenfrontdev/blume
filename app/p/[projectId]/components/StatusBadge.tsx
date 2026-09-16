"use client";

import type { PortalStatus } from "@/lib/portal/status";

interface StatusBadgeProps {
  status: PortalStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={className ? `status-badge ${className}` : "status-badge"}
      data-status={status}
    >
      <span className="live-dot" aria-hidden="true" />
      {status}
    </span>
  );
}
