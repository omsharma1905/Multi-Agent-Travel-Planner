import Link from "next/link";
import React from "react";

interface PageHeaderProps {
  category?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function PageHeader({
  category,
  title,
  subtitle,
  backHref,
  backLabel = "BACK",
  action,
}: PageHeaderProps) {
  return (
    <header className="border-b border-[#111111]/10 pb-6 sm:pb-8">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#111111]/60 hover:text-[#111111] transition-colors mb-4 group"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          <span>{backLabel}</span>
        </Link>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {category && (
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold mb-2">
              {category}
            </p>
          )}
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#171A18] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm sm:text-base text-[#5C625E] font-normal max-w-xl">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 rounded-full bg-[#1F3D2B] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F8F5EE] hover:bg-[#14281C] transition-all shadow-sm shrink-0"
          >
            <span>{action.label}</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </header>
  );
}
