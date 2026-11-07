"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@/features/auth/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountPopover } from "@/components/app/AccountPopover";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StitchIcon } from "./StitchIcon";

interface StitchNavbarProps {
  initialUser?: User | null;
}

const NAV_ITEMS = [
  { id: "hero", label: "Home", href: "#hero", icon: "explore" },
  { id: "sanctuaries", label: "Sanctuaries", href: "#sanctuaries", icon: "public" },
  { id: "agents", label: "Intelligence", href: "#agents", icon: "auto_awesome" },
  { id: "methodology", label: "Method", href: "#methodology", icon: "history_edu" },
  { id: "concierge", label: "Contact", href: "#concierge", icon: "support_agent" },
];

export function StitchNavbar({ initialUser }: StitchNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const { user: clientUser, isLoading } = useAuth();

  const activeUser = !isLoading ? clientUser : (initialUser !== undefined ? initialUser : clientUser);
  const isAuth = Boolean(activeUser);

  // Track header scroll transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy: dynamically update active section based on viewport intersection
  useEffect(() => {
    const sectionIds = ["hero", "sanctuaries", "agents", "methodology", "concierge"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0 && visible[0].target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -40% 0px",
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Direct URL hash loading and browser back/forward support
  useEffect(() => {
    const handleHashNavigation = () => {
      const rawHash = window.location.hash.replace("#", "");
      if (!rawHash) {
        if (window.scrollY < 100) setActiveSection("hero");
        return;
      }
      const target = document.getElementById(rawHash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(rawHash);
      }
    };

    const timer = setTimeout(handleHashNavigation, 120);
    window.addEventListener("hashchange", handleHashNavigation);
    window.addEventListener("popstate", handleHashNavigation);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", handleHashNavigation);
      window.removeEventListener("popstate", handleHashNavigation);
    };
  }, []);

  // Smooth scroll handler with robust fallback
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname);
      }
      setActiveSection("hero");
      return;
    }

    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  return (
    <>
      {/* Floating Desktop & Tablet Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
        <div className="w-full px-4 sm:px-6 lg:px-12 pt-3 sm:pt-4">
          <div
            className={cn(
              "h-16 sm:h-20 w-full rounded-full px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300",
              scrolled
                ? "bg-[#0c0f0e]/90 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(8,28,27,0.45),0_4px_12px_0_rgba(8,28,27,0.2)] border border-white/10"
                : "bg-[#0c0f0e]/60 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(8,28,27,0.18),0_4px_12px_0_rgba(8,28,27,0.06)] border border-white/5",
            )}
          >
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface rounded-full active:bg-surface-variant transition-colors"
                aria-label="Toggle navigation drawer"
                aria-expanded={mobileMenuOpen}
                aria-controls="safarix-drawer"
              >
                <StitchIcon name={mobileMenuOpen ? "close" : "menu"} className="w-6 h-6" />
              </button>

              <a
                href="#hero"
                onClick={(e) => handleNavClick(e, "hero")}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-container border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <StitchIcon name="explore" className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </span>
                <span className="font-headline-md text-xl sm:text-2xl tracking-tight text-on-surface">
                  SAFARI<span className="text-secondary">X</span>
                </span>
              </a>
            </div>

            {/* Center: Segmented Navigation Pill (Desktop >= 1024px) */}
            <nav className="hidden lg:flex items-center p-1 rounded-full bg-surface-container-low/80 backdrop-blur-xl border border-white/5 mx-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    data-testid={`nav-item-${item.id}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                    className={cn(
                      "px-4 lg:px-5 py-1.5 rounded-full font-label-md text-xs tracking-wider uppercase transition-all duration-300",
                      isActive
                        ? "bg-primary-container text-primary-fixed shadow-inner font-semibold"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Right: CTA & User Account */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-end">
              <Link
                href={ROUTES.trips.new}
                className="hidden sm:inline-flex items-center justify-center px-4 sm:px-5 lg:px-6 py-2 rounded-full bg-secondary font-title-md text-xs sm:text-sm text-on-secondary shadow-lg hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Plan Expedition</span>
              </Link>

              {/* User Avatar & Popover */}
              {isAuth ? (
                <div className="relative">
                  <AccountPopover variant="dark" direction="down" align="right" />
                </div>
              ) : (
                <Link
                  href={ROUTES.signIn}
                  className="w-8 h-8 rounded-full bg-primary-container border border-primary/40 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
                  aria-label="Sign in"
                >
                  <StitchIcon name="person" className="w-[18px] h-[18px]" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        id="safarix-drawer"
        className={cn(
          "fixed inset-0 z-40 bg-surface-container-lowest/95 backdrop-blur-2xl transition-all duration-300 flex flex-col pt-24 px-6 pb-safe lg:hidden",
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4",
        )}
      >
        <div className="flex flex-col gap-6 flex-1 justify-center max-w-sm mx-auto w-full">
          <span className="font-label-md text-xs uppercase tracking-[0.2em] text-secondary/80">
            Bespoke Navigation
          </span>
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className={cn(
                    "font-headline-lg text-2xl flex items-center justify-between transition-colors py-2 px-3.5 rounded-xl",
                    isActive
                      ? "text-secondary bg-surface-container-high/80 font-semibold"
                      : "text-on-surface hover:text-secondary hover:bg-surface-container-high/30"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-3">
                    <StitchIcon
                      name={item.icon}
                      className={cn("w-6 h-6", isActive ? "text-secondary" : "text-primary")}
                    />
                    {item.label}
                  </span>
                  <StitchIcon
                    name="arrow_forward_ios"
                    className={cn("w-5 h-5", isActive ? "text-secondary" : "text-on-surface-variant")}
                  />
                </a>
              );
            })}
          </nav>

          <div className="pt-4 flex flex-col gap-3">
            <Link
              href={ROUTES.trips.new}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-12 rounded-full bg-secondary text-on-secondary-container font-title-md text-base flex items-center justify-center gap-2 shadow-[0_12px_24px_-6px_rgba(233,195,73,0.3)] active:scale-[0.98] transition-transform"
            >
              <span>Begin Journey</span>
              <StitchIcon name="north_east" className="w-[18px] h-[18px]" />
            </Link>

            {isAuth ? (
              <Link
                href={ROUTES.dashboard}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 rounded-full bg-surface-container-high text-on-surface font-title-md text-sm flex items-center justify-center gap-2 active:bg-surface-variant transition-colors"
              >
                <span>My Journeys</span>
              </Link>
            ) : (
              <Link
                href={ROUTES.signIn}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 rounded-full bg-surface-container-high text-on-surface font-title-md text-sm flex items-center justify-center gap-2 active:bg-surface-variant transition-colors"
              >
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
