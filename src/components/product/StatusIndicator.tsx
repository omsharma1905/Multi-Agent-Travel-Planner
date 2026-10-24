import React from "react";
import { STATUS_STYLES } from "@/lib/design-tokens";

export type StatusType = keyof typeof STATUS_STYLES;

interface StatusIndicatorProps {
  status: StatusType | string;
  customLabel?: string;
  size?: "sm" | "md";
}

export function StatusIndicator({
  status,
  customLabel,
  size = "md",
}: StatusIndicatorProps) {
  const normalizedKey = (status.toLowerCase().replace(/\s+/g, "_") as StatusType);
  const style = STATUS_STYLES[normalizedKey] || STATUS_STYLES.planning;
  const label = customLabel || style.label;

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[10px]"
      : "px-3 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-mono uppercase tracking-wider font-semibold ${style.badge} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <span>{label}</span>
    </span>
  );
}
