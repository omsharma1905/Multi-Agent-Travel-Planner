"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/navigation/Logo";
import { UserMenu } from "./UserMenu";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { label: "My Journeys", href: ROUTES.dashboard },
  { label: "Saved Journeys", href: ROUTES.trips.saved },
  { label: "Archived Journeys", href: ROUTES.trips.completed },
  { label: "Plan a Journey", href: ROUTES.trips.new },
  { label: "Profile", href: ROUTES.profile },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically reset drawer when route changes during render
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

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

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#111111]/10 bg-[#FAF7F0]/95 px-4 backdrop-blur-md">
      {/* Mobile brand */}
      <Logo markSize={20} textColor="text-[#111111]" />

      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open navigation menu"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#111111]/15 text-[#111111] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isOpen ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 flex flex-col justify-between bg-[#F8F5EE] p-6 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav aria-label="Mobile Navigation">
            <ul className="space-y-2">
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === ROUTES.dashboard
                    ? pathname === ROUTES.dashboard
                    : pathname?.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
                        isActive
                          ? "bg-[#1F3D2B] text-white"
                          : "text-[#111111]/80 hover:bg-black/5 hover:text-[#111111]",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs opacity-50">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-[#111111]/10 pt-4 pb-6">
            <UserMenu />
          </div>
        </div>
      )}
    </header>
  );
}
