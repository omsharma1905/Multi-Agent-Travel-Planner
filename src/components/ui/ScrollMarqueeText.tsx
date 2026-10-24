"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollMarqueeTextProps {
  text: string;
  speed?: number;
  direction?: "left" | "right";
  opacity?: number;
  fontSize?: string;
  repeatCount?: number;
  className?: string;
  outline?: boolean;
  font?: "serif" | "sans" | "mono";
  separator?: string;
}

export function ScrollMarqueeText({
  text,
  speed = 1,
  direction = "left",
  opacity = 0.04,
  fontSize = "clamp(4.5rem, 14vw, 15rem)",
  repeatCount = 6,
  className,
  outline = false,
  font = "serif",
  separator = "·",
}: ScrollMarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll of the container or viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Base translation calculation based on direction and speed factor
  const factor = direction === "left" ? -1 : 1;
  const moveDistance = 240 * speed * factor;

  const rawX = useTransform(scrollYProgress, [0, 1], [0, moveDistance]);
  // Spring smoothing for a silky, fluid physical response
  const smoothX = useSpring(rawX, { damping: 25, stiffness: 120, mass: 0.2 });

  const fontClass =
    font === "serif" ? "font-serif" : font === "mono" ? "font-mono" : "font-sans";

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none select-none overflow-hidden whitespace-nowrap py-2",
        className,
      )}
      aria-hidden="true"
    >
      <motion.div
        style={{ x: smoothX, opacity }}
        className={cn(
          "inline-flex items-center gap-8 font-bold uppercase leading-none tracking-tight",
          fontClass,
          outline
            ? "text-transparent [-webkit-text-stroke:1px_currentColor] text-white"
            : "text-white",
        )}
      >
        {Array.from({ length: repeatCount }).map((_, idx) => (
          <span key={idx} className="inline-flex items-center gap-8" style={{ fontSize }}>
            <span>{text}</span>
            {separator && (
              <span className="opacity-40" style={{ fontSize: "0.45em" }}>
                {separator}
              </span>
            )}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
