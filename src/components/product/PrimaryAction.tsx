import React from "react";
import Link from "next/link";

interface PrimaryActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function PrimaryAction({
  label,
  href,
  onClick,
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}: PrimaryActionProps) {
  const content = (
    <>
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
      ) : null}
      <span>{label}</span>
      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
    </>
  );

  const baseClasses =
    "inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1F3D2B] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F8F5EE] hover:bg-[#14281C] hover:shadow-md transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed";

  if (href && !disabled) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${className}`}
    >
      {content}
    </button>
  );
}

interface SecondaryActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SecondaryAction({
  label,
  href,
  onClick,
  disabled = false,
  className = "",
}: SecondaryActionProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#171A18]/20 bg-white/70 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#171A18] hover:border-[#1F3D2B] hover:bg-[#E3EBE4]/60 transition-all backdrop-blur-xs";

  if (href && !disabled) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
    >
      <span>{label}</span>
    </button>
  );
}
