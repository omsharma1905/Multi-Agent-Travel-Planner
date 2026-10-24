"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const EARLY_ACCESS_STORAGE_KEY = "safarix_early_access_notice_acknowledged";
export const EARLY_ACCESS_CONTACT_EMAIL = "nothing480727@gmail.com";

export interface EarlyAccessDialogProps {
  /**
   * Signal indicating whether the opening intro animation has finished.
   * State-driven directly by LandingOpeningExperience.
   */
  introComplete?: boolean;
  /**
   * Optional controlled open state override.
   */
  isOpen?: boolean;
  /**
   * Optional callback when dialog is dismissed/closed in the current session.
   */
  onClose?: () => void;
  /**
   * If true, suppresses automatic open on mount/intro-complete (useful for testing).
   */
  disableAutoOpen?: boolean;
}

/**
 * EarlyAccessDialog
 *
 * Polished, accessible Early Access / Beta transparency modal for SafariX.
 * Renders immediately after the multilingual intro animation finishes
 * for unauthenticated visitors. Authenticated users do not see this notice.
 *
 * Closing the notice dismisses it only for the active page session;
 * subsequent visits while logged out will show the dialog again.
 */
export function EarlyAccessDialog({
  introComplete = false,
  isOpen: controlledIsOpen,
  onClose,
  disableAutoOpen = false,
}: EarlyAccessDialogProps) {
  const isReducedMotion = useReducedMotion();
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);

  const { user, isLoading } = useAuth();
  const [hasDismissedSession, setHasDismissedSession] = useState(false);

  // Authentication state is the single source of truth.
  // localStorage acknowledgement is intentionally NOT used for permanent suppression.
  const isControlled = controlledIsOpen !== undefined;
  const isDialogVisible = isControlled
    ? controlledIsOpen
    : !disableAutoOpen && !hasDismissedSession && introComplete && !isLoading && !user;

  // Dismiss for current session (does NOT persist to localStorage)
  const handleDismiss = useCallback(() => {
    setHasDismissedSession(true);
    onClose?.();
  }, [onClose]);

  // Accessibility: Focus management, Escape key, and Focus trapping
  useEffect(() => {
    if (!isDialogVisible) return;

    // Store previously focused element to restore upon closing
    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    // Auto-focus the primary CTA after render
    const focusTimer = setTimeout(() => {
      if (ctaButtonRef.current) {
        ctaButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }, 50);

    // Keyboard navigation (Escape to close, Tab trapping)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      // Restore previous focus
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isDialogVisible, handleDismiss]);

  return (
    <AnimatePresence>
      {isDialogVisible && (
        <motion.div
          key="early-access-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReducedMotion ? 0.15 : 0.2 }}
          role="presentation"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            ref={dialogRef}
            key="early-access-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-access-title"
            aria-describedby="early-access-description"
            tabIndex={-1}
            initial={
              isReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 14 }
            }
            animate={
              isReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              isReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 14 }
            }
            transition={{
              duration: isReducedMotion ? 0.2 : 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 w-full max-w-lg bg-[#FAF7F0] text-[#111111] border border-[#111111]/15 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            {/* Header with Badge & Close Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1F3D2B]/10 border border-[#1F3D2B]/20 text-[#1F3D2B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F3D2B] animate-pulse" />
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest">
                    EARLY ACCESS NOTICE
                  </span>
                </div>
                <h2
                  id="early-access-title"
                  className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111] leading-tight"
                >
                  SAFARIX IS IN EARLY ACCESS
                </h2>
              </div>

              {/* Close (X) button */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close Early Access Notice"
                className="flex-shrink-0 p-2 rounded-xl text-[#111111]/50 hover:text-[#111111] hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3D2B]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description / Content Body */}
            <div id="early-access-description" className="space-y-3.5 text-sm sm:text-[15px] text-[#111111]/85 leading-relaxed font-normal">
              <p>
                SafariX is currently in its early access phase.
              </p>
              <p>
                Some of the travel services we use are running on free-tier APIs, so certain requests may take a little longer than usual. In some cases, travel information may also be incomplete or occasionally inaccurate while we continue improving the system.
              </p>
              <p>
                Please verify important travel details, prices, availability, and schedules with the official provider before making any bookings.
              </p>
              <p>
                If you notice something incorrect or something doesn&#39;t work as expected, we&#39;d really appreciate it if you let us know.
              </p>
            </div>

            {/* Contact Information Box */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-black/[0.03] border border-[#111111]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/60">
                CONTACT &amp; FEEDBACK
              </span>
              <a
                href={`mailto:${EARLY_ACCESS_CONTACT_EMAIL}`}
                className="font-mono text-xs sm:text-sm font-semibold text-[#1F3D2B] hover:text-[#14281C] underline hover:no-underline transition-colors break-all focus:outline-none focus:ring-2 focus:ring-[#1F3D2B] rounded"
              >
                {EARLY_ACCESS_CONTACT_EMAIL}
              </a>
            </div>

            {/* Action Footer */}
            <div className="pt-2">
              <button
                ref={ctaButtonRef}
                type="button"
                onClick={handleDismiss}
                className="w-full py-3.5 px-6 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#FAF7F0] font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-150 inline-flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#1F3D2B] focus:ring-offset-2 cursor-pointer"
              >
                GOT IT — LET&#39;S EXPLORE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
