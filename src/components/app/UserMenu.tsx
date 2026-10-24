"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.push(ROUTES.home);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F3D2B] font-mono text-xs font-bold text-white shadow-sm overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                // fallback to initials on error
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Name & email */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[#111111] group-hover:text-[#1F3D2B] transition-colors">
            {user.name}
          </p>
          <p className="truncate text-[11px] text-[#111111]/50">{user.email}</p>
        </div>

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-[#111111]/40 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-[#111111]/10 bg-white p-2 shadow-xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* User header info in menu */}
          <div className="px-3 py-2 border-b border-[#111111]/5 mb-1">
            <p className="text-xs font-bold text-[#111111]">{user.name}</p>
            <p className="text-[10px] text-[#111111]/50 truncate font-mono">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push(ROUTES.profile);
            }}
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#111111]/80 hover:bg-[#1F3D2B]/5 hover:text-[#1F3D2B] transition-colors cursor-pointer"
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
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Go to Profile</span>
          </button>

          <div className="my-1 border-t border-[#111111]/5" />

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={handleSignOut}
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
