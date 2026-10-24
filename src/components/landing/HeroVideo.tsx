"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

interface HeroVideoProps {
  src?: string;
  mobileSrc?: string;
  poster?: string;
}

export function HeroVideo({
  src = "",
  mobileSrc = "",
  poster = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85",
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Only attach listeners when an actual video asset is available
    if (!src) return;

    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setVideoLoaded(true);
    const handleError = () => setVideoError(true);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#111111]">
      {/* High-resolution colorful landscape poster (Vibrant mountain pass / travelling vista) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          videoLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          src={poster}
          alt="Cinematic scenic travel corridor"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105"
        />
      </div>

      {/* Video layer with desktop and mobile sources */}
      {!videoError && src && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={`h-full w-full object-cover object-center transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <source src={mobileSrc} media="(max-width: 640px)" type="video/mp4" />
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Subtle cinematic gradient scrim — keeps video naturally vibrant, slightly darker on left/top for text */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35"
        aria-hidden="true"
      />
    </div>
  );
}
