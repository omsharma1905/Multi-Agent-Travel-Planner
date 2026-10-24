"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { AccountPopover } from "./AccountPopover";
import { SafariXMark } from "@/components/navigation/Logo";
import { APP_BRAND, ROUTES } from "@/lib/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface WorkspaceMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const WORKSPACE_NAV_LINKS = [
  {
    label: "YOUR JOURNEYS",
    href: ROUTES.dashboard,
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    tag: "COLLECTION",
    subtitle: "Active itineraries & next chapters",
  },
  {
    label: "PLAN A JOURNEY",
    href: ROUTES.trips.new,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    tag: "CREATE",
    subtitle: "Curate a new bespoke expedition",
  },
  {
    label: "SAVED JOURNEYS",
    href: ROUTES.trips.saved,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    tag: "SAVED",
    subtitle: "Curated journeys kept for inspiration",
  },
  {
    label: "COMPLETED",
    href: ROUTES.trips.completed,
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    tag: "ARCHIVE",
    subtitle: "Where you have been",
  },
  {
    label: "WISHLIST",
    href: ROUTES.wishlist,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    tag: "PLACES",
    subtitle: "Destinations not ready to be forgotten",
  },
  {
    label: "PROFILE",
    href: ROUTES.profile,
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
    tag: "ACCOUNT",
    subtitle: "Personal travel identity & preferences",
  },
];

export function WorkspaceMenuOverlay({ isOpen, onClose }: WorkspaceMenuOverlayProps) {
  const [activeImage, setActiveImage] = useState<string>(WORKSPACE_NAV_LINKS[0].image);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll and set focus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="safarix-workspace-menu"
          className="fixed inset-0 z-50 flex bg-[#111111] text-[#F8F5EE]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation menu"
        >
          {/* LEFT: Dynamic Hover Image Preview (Desktop) */}
          <div className="hidden lg:block relative w-5/12 h-full overflow-hidden border-r border-white/10 bg-black">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 0.9, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55 }}
                className="absolute inset-0"
              >
                <Image
                  src={activeImage}
                  alt={WORKSPACE_NAV_LINKS.find((item) => item.image === activeImage)?.label ? `${WORKSPACE_NAV_LINKS.find((item) => item.image === activeImage)?.label} workspace preview` : "Destination visual preview"}
                  fill
                  sizes="45vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

            <div className="absolute bottom-10 left-10 space-y-1 text-[11px] font-mono tracking-[0.25em] text-[#F4B942]">
              <div>{APP_BRAND} · PERSONAL WORKSPACE</div>
              <div className="text-white/40">{user?.email || "AUTHENTICATED EXPLORER"}</div>
            </div>
          </div>

          {/* RIGHT: Menu Links & Header */}
          <div className="flex flex-col flex-1 h-full min-h-0 relative">
            {/* Top Bar (Pinned) */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-12 lg:p-16 pb-5 shrink-0">
              <div className="flex items-center gap-3">
                <SafariXMark size={22} className="text-[#1F3D2B]" />
                <span className="font-display text-base font-bold tracking-[0.28em] text-white">
                  {APP_BRAND}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.25em] text-[#FAF7F0]/40">
                  TRAVEL JOURNAL
                </span>
              </div>

              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-all hover:border-[#1F3D2B] hover:bg-[#1F3D2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
                aria-label="Close navigation menu"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 4L16 16M16 4L4 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Main Links (Scrollable if viewport is short) */}
            <nav className="flex-1 overflow-y-auto p-5 sm:p-12 lg:p-16 py-6 sm:py-8 min-h-0">
              <ul className="flex flex-col gap-4 sm:gap-6" role="list">
                {WORKSPACE_NAV_LINKS.map((link, idx) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={onClose}
                      onMouseEnter={() => setActiveImage(link.image)}
                      className="group flex items-baseline gap-4 sm:gap-6 font-display text-display-md sm:text-display-lg font-semibold tracking-tight text-white/75 transition-all hover:text-white hover:translate-x-2"
                    >
                      <span className="font-mono text-xs font-normal text-[#F06C5B]">
                        0{idx + 1}
                      </span>
                      <span className="group-hover:text-white transition-colors">
                        {link.label}
                      </span>
                      <span className="hidden sm:inline-block text-xs font-mono uppercase tracking-widest text-[#F4B942] opacity-0 group-hover:opacity-100 transition-opacity">
                        {link.tag}
                      </span>
                    </Link>
                    <p className="ml-8 sm:ml-10 text-xs font-light text-white/40 group-hover:text-white/60 transition-colors">
                      {link.subtitle}
                    </p>
                  </motion.li>
                ))}
              </ul>
            </nav>

            {/* Bottom Bar: Account Popover & Copyright (Pinned, z-30, unclipped) */}
            <div className="p-5 sm:p-12 lg:p-16 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-white/10 shrink-0 relative z-30 overflow-visible bg-[#111111]/80 backdrop-blur-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap relative">
                  <AccountPopover variant="dark" direction="up" align="left" onActionSelect={onClose} />
                </div>

                <p className="text-[11px] font-mono tracking-widest text-white/30">
                  TRAVEL INTELLIGENTLY · {APP_BRAND} © 2026
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
