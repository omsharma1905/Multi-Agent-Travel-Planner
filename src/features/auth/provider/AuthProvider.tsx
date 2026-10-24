/**
 * @file src/features/auth/provider/AuthProvider.tsx
 *
 * Authoritative client Authentication Provider.
 * Synchronizes client state with the server session via /api/auth/session.
 * All credentials, hashing, tokens, and session authority are server-controlled.
 * No passwords or session tokens are stored in localStorage or document.cookie.
 */

"use client";

import { createContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User, AuthContextValue, SignInCredentials, SignUpData } from "../types";
import { ROUTES } from "@/lib/constants";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState<boolean>(initialUser === null);
  const router = useRouter();
  const lastCheckedAtRef = useRef<number>(0);

  /**
   * Authoritative server session validator.
   * Fetches /api/auth/session with cache: "no-store" to bypass browser & router caches.
   */
  const revalidateSession = useCallback(async (force = false): Promise<User | null> => {
    const now = Date.now();
    // Debounce non-forced checks to prevent redundant API calls within 1.5s
    if (!force && now - lastCheckedAtRef.current < 1500) {
      return null;
    }
    lastCheckedAtRef.current = now;

    try {
      const res = await fetch("/api/auth/session", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const serverUser: User | null = data.user || null;
        setUser((prev) => {
          if (prev === null && serverUser === null) return null;
          if (
            prev &&
            serverUser &&
            prev.id === serverUser.id &&
            prev.email === serverUser.email &&
            prev.name === serverUser.name
          ) {
            return prev;
          }
          return serverUser;
        });
        setIsLoading(false);
        return serverUser;
      } else {
        setUser(null);
        setIsLoading(false);
        return null;
      }
    } catch {
      setUser(null);
      setIsLoading(false);
      return null;
    }
  }, []);

  // 1. Synchronize session state from server on mount & listen to history/bfcache
  useEffect(() => {
    let isMounted = true;

    // Clean up any legacy localStorage session artifacts
    try {
      localStorage.removeItem("veora_dev_session");
      localStorage.removeItem("veora_dev_users");
    } catch {
      // ignore
    }

    // Initial session load asynchronously
    async function loadInitialSession() {
      try {
        const res = await fetch("/api/auth/session", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const serverUser: User | null = data.user || null;
            setUser((prev) => {
              if (prev === null && serverUser === null) return null;
              if (
                prev &&
                serverUser &&
                prev.id === serverUser.id &&
                prev.email === serverUser.email &&
                prev.name === serverUser.name
              ) {
                return prev;
              }
              return serverUser;
            });
            setIsLoading(false);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    loadInitialSession();

    // 2. Browser Back/Forward cache (BFCache) and history navigation listener
    const handlePageShow = (event: PageTransitionEvent) => {
      // Revalidate on pageshow only when restored from bfcache (event.persisted is true)
      if (event.persisted) {
        revalidateSession(true);
      }
    };

    const handlePopState = () => {
      // Back/Forward button pressed
      revalidateSession(true);
    };

    const handleVisibilityChange = () => {
      // User switched back to this tab
      if (document.visibilityState === "visible") {
        revalidateSession(false);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidateSession]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to sign in." };
      }

      setUser(data.user || null);
      return { success: true };
    } catch {
      return { success: false, error: "Network error during sign-in. Please try again." };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || "Failed to create account." };
      }

      setUser(resData.user || null);
      return { success: true };
    } catch {
      return { success: false, error: "Network error during sign-up. Please try again." };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
    } catch (err) {
      console.error("[Auth] Network error during sign-out:", err);
    } finally {
      setUser(null);
      setIsLoading(false);
      lastCheckedAtRef.current = Date.now();
      router.replace(ROUTES.home);
    }
  }, [router]);

  const updateProfile = useCallback(
    async (data: { name: string }) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      setIsLoading(true);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, error: err.error || "Failed to update profile." };
        }

        const updatedUser: User = await res.json();
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      } catch {
        return { success: false, error: "Network error updating profile." };
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      revalidateSession,
    }),
    [user, isLoading, signIn, signUp, signOut, updateProfile, revalidateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
