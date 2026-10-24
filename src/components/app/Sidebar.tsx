"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/navigation/Logo";
import { UserMenu } from "./UserMenu";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "My Journeys",
    href: ROUTES.dashboard,
    icon: (active) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: "Saved Journeys",
    href: ROUTES.trips.saved,
    icon: (active) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
  },
  {
    label: "Archived Journeys",
    href: ROUTES.trips.completed,
    icon: (active) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect width="22" height="5" x="1" y="3" rx="1" />
        <line x1="10" x2="14" y1="12" y2="12" />
      </svg>
    ),
  },
  {
    label: "Plan a Journey",
    href: ROUTES.trips.new,
    icon: (active) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: ROUTES.profile,
    icon: (active) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col justify-between w-64 shrink-0 border-r border-[#111111]/10 bg-[#FAF7F0] p-6 h-screen sticky top-0"
      aria-label="Application Navigation"
    >
      <div className="flex flex-col gap-8">
        {/* Brand Header */}
        <div className="pt-2">
          <Logo textColor="text-[#111111]" />
        </div>

        {/* Navigation list */}
        <nav aria-label="Main App Navigation">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === ROUTES.dashboard
                  ? pathname === ROUTES.dashboard
                  : pathname?.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]",
                      isActive
                        ? "bg-[#1F3D2B] text-white shadow-sm"
                        : "text-[#111111]/70 hover:bg-black/5 hover:text-[#111111]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-white" : "text-[#111111]/50 group-hover:text-[#111111]",
                      )}
                    >
                      {item.icon(isActive)}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Footer User Menu */}
      <div className="border-t border-[#111111]/10 pt-4">
        <UserMenu />
      </div>
    </aside>
  );
}
