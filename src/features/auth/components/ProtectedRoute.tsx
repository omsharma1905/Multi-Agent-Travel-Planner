"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { SafariXMark } from "@/components/navigation/Logo";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, revalidateSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Revalidate when restored from bfcache or history navigation
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        revalidateSession?.(true);
      }
    };

    const handlePopState = () => {
      revalidateSession?.(true);
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [revalidateSession]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store current path so user returns to their destination after authenticating
      const redirectTarget = encodeURIComponent(pathname || ROUTES.dashboard);
      router.replace(`${ROUTES.signIn}?redirect=${redirectTarget}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // While checking session or redirecting, display calm minimal loading state
  if (isLoading || !isAuthenticated) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center bg-[#F8F5EE] px-6 text-[#111111]"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-4">
          <SafariXMark size={32} className="text-[#1F3D2B] animate-pulse" />
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#111111]/50">
            Checking credentials...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
