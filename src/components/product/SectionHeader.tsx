import React from "react";

interface SectionHeaderProps {
  number?: string;
  title: string;
  badge?: React.ReactNode;
  description?: string;
}

export function SectionHeader({
  number,
  title,
  badge,
  description,
}: SectionHeaderProps) {
  return (
    <div className="border-b border-[#111111]/10 pb-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {number && (
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F06C5B] font-semibold">
              {number}
            </span>
          )}
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#111111]">
            {title}
          </h2>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-[#111111]/60 font-normal">
          {description}
        </p>
      )}
    </div>
  );
}
