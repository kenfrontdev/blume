"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PortalStatus } from "@/lib/portal/status";

interface StatusBadgeProps {
  status: PortalStatus;
  className?: string;
}

const STATUS_CLASS: Record<PortalStatus, string> = {
  blocked: "border-destructive/40 text-destructive",
  partial: "border-warning/40 text-warning",
  complete: "border-success/40 text-success",
  shipped: "border-success/40 text-success",
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-sm font-mono text-[0.7rem] font-medium tracking-wide",
      STATUS_CLASS[status],
      className,
    )}
  >
    <span
      className={cn(
        "mr-1.5 inline-block size-1.5 rounded-full",
        status === "blocked" && "bg-destructive",
        status === "partial" && "bg-warning",
        (status === "complete" || status === "shipped") && "bg-success",
      )}
      aria-hidden="true"
    />
    {status}
  </Badge>
);
