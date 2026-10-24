"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GREETINGS, INTRO_LANGUAGES } from "./intro-constants";

export { GREETINGS, INTRO_LANGUAGES };

/**
 * Check prefers-reduced-motion media query.
 */
function getReducedMotion(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function subscribeReducedMotion(callback: () => void) {
  try {
    if (typeof window === "undefined") return () => {};
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  } catch {
    return () => {};
  }
}

export interface SafariXIntroProps {
  onComplete?: () => void;
}

export function SafariXIntro({ onComplete }: SafariXIntroProps = {}) {
  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Greeting cycling sequence plays on every mount/load of the landing page
  useEffect(() => {
    if (isReducedMotion) {
      // Reduced motion: show calm Hello for ~500ms then slide upward
      const timer = setTimeout(() => {
        setVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }

    // Rapid greeting sequence (~100ms per greeting across 12 items)
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < GREETINGS.length) {
        setCurrentIndex(idx);
      } else {
        clearInterval(interval);
        // Hold final Hello briefly (~250ms), then trigger upward curtain reveal
        setTimeout(() => {
          setVisible(false);
        }, 250);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isReducedMotion]);

  if (isDismissed) {
    return null;
  }

  const handleExitComplete = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      (window as unknown as { __SAFARIX_INTRO_COMPLETE__?: boolean }).__SAFARIX_INTRO_COMPLETE__ = true;
      window.dispatchEvent(new CustomEvent("safarix:intro-complete"));
    }
    onComplete?.();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          key="safarix-intro-overlay"
          id="safarix-intro-overlay"
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white overflow-hidden pointer-events-auto"
          initial={{ y: 0 }}
          exit={{
            y: "-100%",
            transition: {
              duration: isReducedMotion ? 0.45 : 1.05,
              ease: isReducedMotion ? "easeInOut" : [0.22, 1, 0.36, 1],
            },
          }}
        >
          <div className="relative flex items-center justify-center w-full px-4 text-center select-none">
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.12 }}
                className="font-display font-bold text-5xl sm:text-6xl md:text-7xl tracking-tight text-white leading-none"
              >
                {GREETINGS[currentIndex]}
              </motion.h1>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
