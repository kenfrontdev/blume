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
  shipped: "border-border text-muted-foreground",
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-none font-mono text-[0.7rem] font-medium tracking-wide",
      STATUS_CLASS[status],
      className,
    )}
  >
    {status}
  </Badge>
);
