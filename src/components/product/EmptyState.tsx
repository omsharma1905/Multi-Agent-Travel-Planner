import React from "react";
import { PrimaryAction } from "./PrimaryAction";

interface EmptyStateProps {
  category?: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  className?: string;
}

export function EmptyState({
  category = "WORKSPACE",
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-[#111111]/12 bg-[#111111]/[0.02] p-8 sm:p-14 text-center max-w-2xl mx-auto my-12 ${className}`}
    >
      <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold block mb-3">
        {category}
      </span>
      <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111] mb-2">
        {title}
      </h2>
      <p className="text-sm text-[#111111]/70 font-normal leading-relaxed max-w-md mx-auto mb-8">
        {description}
      </p>
      <div>
        <PrimaryAction label={actionLabel} href={actionHref} />
      </div>
    </div>
  );
}
