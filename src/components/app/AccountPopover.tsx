"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AccountPopoverProps {
  /** Visual variant of the trigger button */
  variant?: "dark" | "light" | "custom";
  /** Alignment of popover: down (default from header) or up (from footer) */
  direction?: "down" | "up";
  /** Horizontal alignment: left or right of the trigger button (default: left for up, right for down) */
  align?: "left" | "right";
  /** Optional custom trigger class */
  className?: string;
  /** Optional callback fired when an action is selected (e.g. to close a parent drawer) */
  onActionSelect?: () => void;
}

export function AccountPopover({
  variant = "light",
  direction = "down",
  align,
  className,
  onActionSelect,
}: AccountPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isProfilePage = pathname === ROUTES.profile;

  // Initials computation
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SX";

  // Close on outside click (mouse or touch)
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  // Close on Escape and return focus to trigger
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    },
    [isOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!user) return null;

  const handleNavigateProfile = () => {
    setIsOpen(false);
    onActionSelect?.();
    router.push(ROUTES.profile);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    onActionSelect?.();
    await signOut();
    router.push(ROUTES.home);
  };

  // Trigger styles depending on variant
  const triggerStyles =
    variant === "dark"
      ? "border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/40 text-white backdrop-blur-sm"
      : isProfilePage
      ? "border-[#1F3D2B] bg-[#1F3D2B]/10 text-[#1F3D2B]"
      : "border-[#111111]/15 bg-white/70 hover:bg-white hover:border-[#1F3D2B] text-[#111111]";

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Popover Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User account menu"
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B] shadow-xs cursor-pointer",
          triggerStyles,
        )}
      >
        {/* User Avatar Circle */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F3D2B] font-mono text-[10px] font-bold text-white shadow-xs overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Monospace PROFILE Label */}
        <span
          className={cn(
            "font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
            variant === "dark"
              ? "text-white/90 group-hover:text-white"
              : isProfilePage
              ? "text-[#1F3D2B]"
              : "text-[#111111]/80 group-hover:text-[#1F3D2B]",
          )}
        >
          PROFILE
        </span>

        {/* Subtle Indicator Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "shrink-0 opacity-60 transition-transform duration-200",
            isOpen && (direction === "up" ? "-rotate-180" : "rotate-180"),
            variant === "dark" ? "text-white" : "text-[#111111]",
          )}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Account Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            role="menu"
            aria-orientation="vertical"
            initial={{
              opacity: 0,
              scale: 0.96,
              y: direction === "up" ? 6 : -6,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: direction === "up" ? 6 : -6,
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 w-60 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#111111]/12 bg-white/95 p-2 shadow-2xl backdrop-blur-md focus:outline-none text-[#111111]",
              direction === "down" ? "top-full mt-2" : "bottom-full mb-2",
              (align ?? (direction === "up" ? "left" : "right")) === "left"
                ? direction === "up"
                  ? "left-0 origin-bottom-left"
                  : "left-0 origin-top-left"
                : direction === "up"
                ? "right-0 origin-bottom-right"
                : "right-0 origin-top-right",
            )}
          >
            {/* User Identity Header */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAF7F0] border border-[#111111]/5 mb-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F3D2B] font-mono text-xs font-bold text-white shadow-xs overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#111111]">
                  {user.name}
                </p>
                <p className="truncate font-mono text-[10px] text-[#111111]/50">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Menu Option 1: Go to Profile */}
            <button
              type="button"
              role="menuitem"
              onClick={handleNavigateProfile}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#111111]/85 hover:bg-[#1F3D2B]/8 hover:text-[#1F3D2B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B] cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-[#111111]/50 group-hover:text-[#1F3D2B]"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Go to Profile</span>
            </button>

            {/* Subtle Divider */}
            <div className="my-1 border-t border-[#111111]/8" />

            {/* Menu Option 2: Sign Out */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-red-500"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
