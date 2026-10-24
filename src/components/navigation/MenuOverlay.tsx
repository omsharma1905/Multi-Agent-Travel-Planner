"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { SafariXMark } from "./Logo";
import { NAV_LINKS, NAV_SECONDARY_LINKS, APP_BRAND } from "@/lib/constants";

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuOverlay({ isOpen, onClose }: MenuOverlayProps) {
  const [activeImage, setActiveImage] = useState<string>(NAV_LINKS[0].image);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
          key="safarix-editorial-menu"
          className="fixed inset-0 z-50 flex bg-[#082D23] text-[#F3F0E6]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* LEFT: Dynamic Hover Image Preview (Desktop) */}
          <div className="hidden lg:block relative w-5/12 h-full overflow-hidden border-r border-[#104735]/60 bg-black">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.9, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Image
                  src={activeImage}
                  alt={NAV_LINKS.find((item) => item.image === activeImage)?.label ? `${NAV_LINKS.find((item) => item.image === activeImage)?.label} destination preview` : "Destination visual preview"}
                  fill
                  sizes="45vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#082D23]/90 via-transparent to-black/40" />

            <div className="absolute bottom-10 left-10 text-[11px] font-mono tracking-[0.25em] text-[#DDE8DA]">
              {APP_BRAND} · TRAVEL EXPEDITIONS
            </div>
          </div>

          {/* RIGHT: Menu Links & Header */}
          <div className="flex flex-col justify-between flex-1 p-6 sm:p-12 lg:p-16 h-full overflow-y-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-[#104735]/60 pb-6">
              <div className="flex items-center gap-3">
                <SafariXMark size={22} className="text-[#F3F0E6]" />
                <span className="font-display text-sm font-bold tracking-[0.28em] text-[#F3F0E6]">
                  {APP_BRAND}
                </span>
              </div>

              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#F3F0E6] transition-all hover:border-[#F3F0E6] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]"
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

            {/* Main Links — Refined typography, not 800/900 heavy everywhere */}
            <nav className="my-auto py-8">
              <ul className="flex flex-col gap-4 sm:gap-6" role="list">
                {NAV_LINKS.map((link, idx) => (
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
                      className="group flex items-baseline gap-4 sm:gap-6 font-display text-display-md sm:text-display-lg font-semibold tracking-tight text-[#F3F0E6]/75 transition-all hover:text-[#F3F0E6] hover:translate-x-2"
                    >
                      <span className="font-mono text-xs font-normal text-[#F06C5B]">
                        0{idx + 1}
                      </span>
                      <span className="group-hover:text-white transition-colors">
                        {link.label}
                      </span>
                      <span className="hidden sm:inline-block text-xs font-mono uppercase tracking-widest text-[#DDE8DA] opacity-0 group-hover:opacity-100 transition-opacity">
                        {link.tag}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>

            {/* Bottom Bar: Profile & Settings */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-[#104735]/60 pt-6">
              <ul className="flex items-center gap-6" role="list">
                {NAV_SECONDARY_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="text-xs font-medium uppercase tracking-[0.18em] text-[#F3F0E6]/60 hover:text-[#F3F0E6] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] font-mono tracking-widest text-[#F3F0E6]/40">
                TRAVEL INTELLIGENTLY · {APP_BRAND} © 2026
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
