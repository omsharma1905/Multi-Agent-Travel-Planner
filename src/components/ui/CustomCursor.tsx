"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

type CursorVariant = "default" | "link" | "button" | "image";

function subscribePointerFine(callback: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getPointerFineSnapshot() {
  return window.matchMedia("(pointer: fine)").matches;
}

function getPointerFineServerSnapshot() {
  return false;
}

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>("default");

  const isFinePointer = useSyncExternalStore(
    subscribePointerFine,
    getPointerFineSnapshot,
    getPointerFineServerSnapshot,
  );

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  // Raw mouse coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Outer ring spring (subtle organic trailing lag)
  const ringX = useSpring(mouseX, { damping: 28, stiffness: 240, mass: 0.5 });
  const ringY = useSpring(mouseY, { damping: 28, stiffness: 240, mass: 0.5 });

  // Inner dot spring (near-instant direct responsiveness)
  const dotX = useSpring(mouseX, { damping: 45, stiffness: 850, mass: 0.1 });
  const dotY = useSpring(mouseY, { damping: 45, stiffness: 850, mass: 0.1 });

  const targetRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isFinePointer) return;

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as Element | null;
      if (!target || target === targetRef.current) return;
      targetRef.current = target;

      // 1. Explicit data-cursor override
      const explicitCursor = target.closest("[data-cursor]")?.getAttribute("data-cursor");
      if (explicitCursor === "button" || explicitCursor === "link" || explicitCursor === "image") {
        setVariant(explicitCursor);
        return;
      }

      // 2. Buttons or interactive triggers
      if (target.closest("button") || target.closest('[role="button"]')) {
        setVariant("button");
        return;
      }

      // 3. Links
      if (target.closest("a") || target.closest('[role="link"]')) {
        setVariant("link");
        return;
      }

      // 4. Imagery & Media
      if (target.closest("img") || target.closest("video") || target.closest("[data-cursor-image]")) {
        setVariant("image");
        return;
      }

      setVariant("default");
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
    };
  }, [isFinePointer, isVisible, mouseX, mouseY]);

  // Touch screens / mobile devices: do NOT render custom cursor DOM
  if (!isFinePointer) return null;

  // Dynamic sizes and styling per state
  let ringSize = 30; // default 28-34px
  let ringBorderColor = "rgba(255, 255, 255, 0.45)";
  let ringBg = "transparent";

  if (variant === "link") {
    ringSize = 38;
    ringBorderColor = "rgba(255, 255, 255, 0.85)";
    ringBg = "rgba(255, 255, 255, 0.05)";
  } else if (variant === "button") {
    ringSize = 46; // 40-48px on button
    ringBorderColor = "rgba(31, 61, 43, 0.9)"; // SafariX Forest accent
    ringBg = "rgba(31, 61, 43, 0.12)";
  } else if (variant === "image") {
    ringSize = 42;
    ringBorderColor = "rgba(229, 168, 59, 0.85)"; // SafariX Warm Sun accent
    ringBg = "rgba(229, 168, 59, 0.08)";
  }

  // If reduced motion is requested, eliminate trailing lag
  const ringXPos = reducedMotion ? mouseX : ringX;
  const ringYPos = reducedMotion ? mouseY : ringY;
  const dotXPos = reducedMotion ? mouseX : dotX;
  const dotYPos = reducedMotion ? mouseY : dotY;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* Secondary: Smooth trailing ring (28-34px default, expanding on interactive targets) */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border border-solid mix-blend-difference"
        style={{
          x: ringXPos,
          y: ringYPos,
          width: ringSize,
          height: ringSize,
          translateX: "-50%",
          translateY: "-50%",
          borderColor: ringBorderColor,
          backgroundColor: ringBg,
        }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 320,
        }}
      />

      {/* Primary: Solid SafariX Waypoint Accent Dot (7px) */}
      <motion.div
        className="fixed top-0 left-0 rounded-full shadow-[0_0_8px_rgba(240,108,91,0.5)]"
        style={{
          x: dotXPos,
          y: dotYPos,
          width: 7,
          height: 7,
          translateX: "-50%",
          translateY: "-50%",
          backgroundColor: "#F06C5B", // SafariX signature coral waypoint accent
        }}
      />
    </div>
  );
}
