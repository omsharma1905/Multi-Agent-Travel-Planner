"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { signInSchema, signUpSchema, SignInInput, SignUpInput } from "../types";
import { DEMO_USER } from "../provider/dev-auth-provider";
import { ROUTES } from "@/lib/constants";
import { SafariXMark } from "@/components/navigation/Logo";
import { useToast } from "@/components/ui/Toast";
import { StitchIcon } from "@/components/landing/stitch/StitchIcon";

interface AuthCardProps {
  initialMode?: "sign-in" | "sign-up";
}

export function AuthCard({ initialMode = "sign-in" }: AuthCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();
  const [, startTransition] = useTransition();

  const rawRedirect = searchParams.get("redirect");
  const decodedTarget = rawRedirect ? decodeURIComponent(rawRedirect) : ROUTES.dashboard;
  const isAuthTarget =
    decodedTarget.startsWith("/auth/") ||
    decodedTarget === ROUTES.signIn ||
    decodedTarget === ROUTES.signUp;
  const redirectTarget = isAuthTarget ? ROUTES.dashboard : decodedTarget;

  const { isAuthenticated, isLoading, signIn, signUp } = useAuth();

  // Mode management: derived from pathname with user override for fluid local transition
  const isPathSignUp = pathname?.includes("sign-up");
  const [userSelectedMode, setUserSelectedMode] = useState<"sign-in" | "sign-up" | null>(null);
  const mode = userSelectedMode ?? (isPathSignUp ? "sign-up" : initialMode);

  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [signInData, setSignInData] = useState<SignInInput>({ email: "", password: "" });
  const [signInErrors, setSignInErrors] = useState<Partial<Record<keyof SignInInput, string>>>({});
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmittingSignIn, setIsSubmittingSignIn] = useState(false);

  const [signUpData, setSignUpData] = useState<SignUpInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signUpErrors, setSignUpErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && !rawRedirect?.startsWith("/auth/")) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, isLoading, router, redirectTarget, rawRedirect]);

  // Synchronize state with browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setUserSelectedMode(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Switch handlers that update URL without full page reload
  const handleSwitchToSignUp = () => {
    setUserSelectedMode("sign-up");
    setSignInError(null);
    setSignInErrors({});
    const newUrl = rawRedirect ? `${ROUTES.signUp}?redirect=${encodeURIComponent(rawRedirect)}` : ROUTES.signUp;
    window.history.pushState(null, "", newUrl);
  };

  const handleSwitchToSignIn = () => {
    setUserSelectedMode("sign-in");
    setSignUpError(null);
    setSignUpErrors({});
    const newUrl = rawRedirect ? `${ROUTES.signIn}?redirect=${encodeURIComponent(rawRedirect)}` : ROUTES.signIn;
    window.history.pushState(null, "", newUrl);
  };

  // Demo fill helper
  const handleQuickFillDemo = () => {
    setSignInData({
      email: DEMO_USER.email,
      password: "password123",
    });
    setSignInErrors({});
    setSignInError(null);
  };

  // Sign In submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInErrors({});

    const validation = signInSchema.safeParse({ email: signInData.email.trim(), password: signInData.password });
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignInInput, string>> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof SignInInput;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setSignInErrors(fieldErrors);
      return;
    }

    setIsSubmittingSignIn(true);
    try {
      const res = await signIn(validation.data);
      if (!res.success) {
        setSignInError(res.error ?? "Invalid credentials. Please verify and try again.");
        setIsSubmittingSignIn(false);
        return;
      }
      startTransition(() => {
        router.replace(redirectTarget);
      });
    } catch {
      setSignInError("Authentication service unavailable. Please retry.");
      setIsSubmittingSignIn(false);
    }
  };

  // Sign Up submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpErrors({});

    const validation = signUpSchema.safeParse(signUpData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof SignUpInput;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setSignUpErrors(fieldErrors);
      return;
    }

    setIsSubmittingSignUp(true);
    try {
      const res = await signUp(validation.data);
      if (!res.success) {
        setSignUpError(res.error ?? "Failed to create account. Please try another email.");
        setIsSubmittingSignUp(false);
        return;
      }
      startTransition(() => {
        router.replace(ROUTES.dashboard);
      });
    } catch {
      setSignUpError("Registration service unavailable. Please retry.");
      setIsSubmittingSignUp(false);
    }
  };

  const isSignUp = mode === "sign-up";

  return (
    <div className="w-full max-w-[960px] lg:max-w-[1000px] mx-auto select-none">
      {/* Top bar with back to home */}
      <div className="flex items-center justify-between mb-4 px-2">
        <Link
          href={ROUTES.home}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#F4F1E5]/75 hover:text-[#F4F1E5] transition-colors group"
        >
          <span className="transition-transform group-hover:-translate-x-1" aria-hidden="true">
            ←
          </span>
          <span>Back to SafariX</span>
        </Link>
        <div className="font-mono text-[11px] tracking-widest uppercase text-[#F4F1E5]/50 hidden sm:block">
          SAFARIX MEMBER PORTAL // EXPEDITION ARCHIVE
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="relative w-full rounded-2xl md:bg-[#F4F1E5] bg-[#0c1311] border border-white/10 md:border-white/15 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden md:h-[530px] lg:h-[540px]">
        {/* ========================================================================= */}
        {/* DESKTOP VIEW: Landscape Diagonal Split with Sweeping Motion Panel          */}
        {/* ========================================================================= */}

        {/* Form Container Left: SIGN IN FORM */}
        <div
          className="hidden md:flex absolute inset-y-0 left-0 w-1/2 p-9 lg:p-12 flex-col justify-between text-[#063D2E] transition-opacity duration-300"
          style={{
            pointerEvents: isSignUp ? "none" : "auto",
            opacity: isSignUp ? 0 : 1,
          }}
          aria-hidden={isSignUp ? "true" : undefined}
          tabIndex={isSignUp ? -1 : undefined}
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#063D2E]/60">
                SAFARIX PORTAL
              </span>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#063D2E]/70 hover:text-[#063D2E] underline underline-offset-2"
                >
                  Demo Fill
                </button>
              )}
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-[#063D2E] tracking-tight">
              Sign in
            </h2>
            <p className="text-xs text-[#063D2E]/70 mt-1">
              Access your saved journeys and customized travel itineraries.
            </p>
          </div>

          {/* Form Error Alert */}
          {signInError && (
            <div
              role="alert"
              className="my-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 flex items-center gap-2"
            >
              <span className="font-bold">!</span>
              <span>{signInError}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSignInSubmit} noValidate className="space-y-3.5 my-auto">
            {/* Email */}
            <div>
              <label
                htmlFor="desktop-signin-email"
                className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-1"
              >
                Email address
              </label>
              <input
                id="desktop-signin-email"
                type="email"
                autoComplete="email"
                value={signInData.email}
                onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                disabled={isSubmittingSignIn || isSignUp}
                placeholder="traveler@safarix.com"
                className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3.5 py-2 text-sm text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                aria-invalid={Boolean(signInErrors.email)}
              />
              {signInErrors.email && (
                <p className="mt-1 font-mono text-[11px] text-red-600">{signInErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="desktop-signin-password"
                  className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#063D2E]/80"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Password Recovery",
                      "Password recovery instructions have been sent to your registered email address.",
                    )
                  }
                  tabIndex={isSignUp ? -1 : 0}
                  className="font-mono text-[10px] text-[#063D2E]/70 hover:text-[#063D2E] underline underline-offset-2"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  id="desktop-signin-password"
                  type={showSignInPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={signInData.password}
                  onChange={(e) => setSignInData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmittingSignIn || isSignUp}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3.5 py-2 pr-10 text-sm text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                  aria-invalid={Boolean(signInErrors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword((prev) => !prev)}
                  tabIndex={isSignUp ? -1 : 0}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/50 hover:text-[#063D2E] p-1 text-xs"
                  aria-label={showSignInPassword ? "Hide password" : "Show password"}
                >
                  {showSignInPassword ? "Hide" : "Show"}
                </button>
              </div>
              {signInErrors.password && (
                <p className="mt-1 font-mono text-[11px] text-red-600">{signInErrors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="desktop-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                tabIndex={isSignUp ? -1 : 0}
                className="h-3.5 w-3.5 rounded border-[#063D2E]/30 text-[#063D2E] focus:ring-[#063D2E]"
              />
              <label
                htmlFor="desktop-remember"
                className="text-xs text-[#063D2E]/70 select-none cursor-pointer"
              >
                Remember this device
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingSignIn || isSignUp}
              className="w-full mt-2 rounded-lg bg-[#063D2E] hover:bg-[#094c3a] text-[#F4F1E5] py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmittingSignIn ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Switch Prompt */}
          <div className="pt-2 text-center text-xs text-[#063D2E]/70">
            <span>Don&apos;t have an account? </span>
            <button
              type="button"
              onClick={handleSwitchToSignUp}
              tabIndex={isSignUp ? -1 : 0}
              className="font-bold text-[#063D2E] hover:underline underline-offset-4"
            >
              Create account
            </button>
          </div>
        </div>

        {/* Form Container Right: SIGN UP FORM */}
        <div
          className="hidden md:flex absolute inset-y-0 right-0 w-1/2 p-9 lg:p-12 flex-col justify-between text-[#063D2E] transition-opacity duration-300"
          style={{
            pointerEvents: !isSignUp ? "none" : "auto",
            opacity: !isSignUp ? 0 : 1,
          }}
          aria-hidden={!isSignUp ? "true" : undefined}
          tabIndex={!isSignUp ? -1 : undefined}
        >
          {/* Header */}
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#063D2E]/60 block mb-1">
              SAFARIX MEMBERSHIP
            </span>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-[#063D2E] tracking-tight">
              Create account
            </h2>
            <p className="text-xs text-[#063D2E]/70 mt-0.5">
              Begin planning complete, bespoke travel journeys.
            </p>
          </div>

          {/* Form Error Alert */}
          {signUpError && (
            <div
              role="alert"
              className="my-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 flex items-center gap-2"
            >
              <span className="font-bold">!</span>
              <span>{signUpError}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSignUpSubmit} noValidate className="space-y-2.5 my-auto">
            {/* Full Name */}
            <div>
              <label
                htmlFor="desktop-signup-name"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
              >
                Full name
              </label>
              <input
                id="desktop-signup-name"
                type="text"
                autoComplete="name"
                value={signUpData.name}
                onChange={(e) => setSignUpData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isSubmittingSignUp || !isSignUp}
                placeholder="Elena Rostova"
                className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3 py-1.5 text-xs text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                aria-invalid={Boolean(signUpErrors.name)}
              />
              {signUpErrors.name && (
                <p className="mt-0.5 font-mono text-[10px] text-red-600">{signUpErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="desktop-signup-email"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
              >
                Email address
              </label>
              <input
                id="desktop-signup-email"
                type="email"
                autoComplete="email"
                value={signUpData.email}
                onChange={(e) => setSignUpData((prev) => ({ ...prev, email: e.target.value }))}
                disabled={isSubmittingSignUp || !isSignUp}
                placeholder="traveler@safarix.com"
                className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3 py-1.5 text-xs text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                aria-invalid={Boolean(signUpErrors.email)}
              />
              {signUpErrors.email && (
                <p className="mt-0.5 font-mono text-[10px] text-red-600">{signUpErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="desktop-signup-password"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
              >
                Password (min 8 chars)
              </label>
              <div className="relative">
                <input
                  id="desktop-signup-password"
                  type={showSignUpPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmittingSignUp || !isSignUp}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3 py-1.5 pr-10 text-xs text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                  aria-invalid={Boolean(signUpErrors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword((prev) => !prev)}
                  tabIndex={!isSignUp ? -1 : 0}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/50 hover:text-[#063D2E] p-1 text-[11px]"
                  aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                >
                  {showSignUpPassword ? "Hide" : "Show"}
                </button>
              </div>
              {signUpErrors.password && (
                <p className="mt-0.5 font-mono text-[10px] text-red-600">{signUpErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="desktop-signup-confirm"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="desktop-signup-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={signUpData.confirmPassword}
                  onChange={(e) =>
                    setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  disabled={isSubmittingSignUp || !isSignUp}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#063D2E]/20 bg-white/70 px-3 py-1.5 pr-10 text-xs text-[#063D2E] placeholder:text-[#063D2E]/35 focus:bg-white focus:border-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E] transition-all disabled:opacity-50"
                  aria-invalid={Boolean(signUpErrors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={!isSignUp ? -1 : 0}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/50 hover:text-[#063D2E] p-1 text-[11px]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              {signUpErrors.confirmPassword && (
                <p className="mt-0.5 font-mono text-[10px] text-red-600">
                  {signUpErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingSignUp || !isSignUp}
              className="w-full mt-2 rounded-lg bg-[#063D2E] hover:bg-[#094c3a] text-[#F4F1E5] py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmittingSignUp ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </form>

          {/* Switch Prompt */}
          <div className="pt-1.5 text-center text-xs text-[#063D2E]/70">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={handleSwitchToSignIn}
              tabIndex={!isSignUp ? -1 : 0}
              className="font-bold text-[#063D2E] hover:underline underline-offset-4"
            >
              Sign in
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIGNATURE ANIMATED DEEP-GREEN DIAGONAL PANEL                              */}
        {/* Sweeps across the card, changing diagonal geometry from right to left     */}
        {/* ========================================================================= */}
        <motion.div
          className="hidden md:flex absolute top-0 bottom-0 z-20 w-[55%] flex-col justify-between p-9 lg:p-12 bg-[#063D2E] text-[#F4F1E5] shadow-2xl overflow-hidden"
          initial={false}
          animate={{
            left: isSignUp ? "0%" : "45%",
            clipPath: isSignUp
              ? "polygon(0% 0%, 100% 0%, 86% 100%, 0% 100%)"
              : "polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)",
          }}
          transition={{
            duration: shouldReduceMotion ? 0.05 : 0.72,
            ease: [0.65, 0, 0.35, 1],
          }}
        >
          {/* Subtle Ambient Glow inside Panel */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A4D3B]/40 via-transparent to-black/30 pointer-events-none" />

          {/* Top Brand Marker */}
          <div className="relative z-10 flex items-center gap-2.5">
            <SafariXMark size={22} className="text-[#F4F1E5]" />
            <span className="font-display font-bold tracking-wider uppercase text-base text-[#F4F1E5]">
              SafariX
            </span>
          </div>

          {/* Dynamic Editorial Content with coordinated crossfade */}
          <div className="relative z-10 max-w-sm">
            <AnimatePresence mode="wait">
              {isSignUp ? (
                <motion.div
                  key="signup-content"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold">
                    JOIN THE EXPEDITION
                  </p>
                  <h3 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#F4F1E5] leading-tight">
                    Start your <br />
                    <span className="font-serif italic font-normal text-emerald-200">
                      next journey.
                    </span>
                  </h3>
                  <p className="text-xs text-[#F4F1E5]/80 leading-relaxed font-light">
                    Curate and harmonize flights, stays, dining, and daily highlights into one seamless, grounded rhythm.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signin-content"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold">
                    INTELLIGENT TRAVEL
                  </p>
                  <h3 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#F4F1E5] leading-tight">
                    Welcome <br />
                    <span className="font-serif italic font-normal text-emerald-200">
                      back.
                    </span>
                  </h3>
                  <p className="text-xs text-[#F4F1E5]/80 leading-relaxed font-light">
                    Your next adventure is waiting. Pick up right where you left off with synchronized travel intelligence.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Metamark */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#F4F1E5]/40 border-t border-white/10 pt-3">
            <span>Multi-Agent Engine</span>
            <span>Est. 2026</span>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* MOBILE VIEW: Premium Immersive Experience with Segment Switcher           */}
        {/* ========================================================================= */}
        <div className="flex md:hidden flex-col w-full text-[#FBFBFA]">
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0E2A24]/60 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/10 blur-2xl rounded-full pointer-events-none" />

          {/* Branded Mobile Header */}
          <div className="p-5 sm:p-6 pb-4 relative z-10 border-b border-white/10 bg-[#081C1B]/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#0E2A24] border border-[#E9C349]/40 flex items-center justify-center text-[#E9C349]">
                  <StitchIcon name="explore" className="w-3.5 h-3.5" />
                </span>
                <span className="font-headline-md text-lg tracking-tight text-[#FBFBFA]">
                  SAFARI<span className="text-[#E9C349]">X</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#E9C349]/80 bg-[#0E2A24] px-2 py-0.5 rounded-full border border-[#E9C349]/20 ml-1">
                  PORTAL
                </span>
              </div>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#E9C349] hover:underline px-2 py-1 rounded bg-white/5 border border-white/10"
                >
                  Demo Fill
                </button>
              )}
            </div>

            {/* Travel Coordinates Watermark */}
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#FBFBFA]/40 mb-3">
              <span>EXPEDITION ARCHIVE</span>
              <span>20.84° N · 107.04° E</span>
            </div>

            {/* Welcome Heading & Message */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-1"
            >
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#FBFBFA] leading-tight">
                {isSignUp ? (
                  <>
                    Start your{" "}
                    <span className="font-serif italic font-normal text-[#E9C349]">
                      next journey.
                    </span>
                  </>
                ) : (
                  <>
                    Welcome{" "}
                    <span className="font-serif italic font-normal text-[#E9C349]">
                      back.
                    </span>
                  </>
                )}
              </h3>
              <p className="text-xs text-[#FBFBFA]/70 leading-relaxed font-light">
                {isSignUp
                  ? "Create your account for personalized sanctuaries, itineraries & agent orchestration."
                  : "Access your saved expeditions and synchronized agent travel dossiers."}
              </p>
            </motion.div>

            {/* Segment Toggle */}
            <div className="mt-4 grid grid-cols-2 rounded-full bg-black/40 p-1 border border-white/10 text-center font-mono text-xs uppercase tracking-wider relative shadow-inner">
              <button
                type="button"
                data-testid="mobile-tab-signin"
                onClick={handleSwitchToSignIn}
                className={`py-2 rounded-full transition-all font-semibold flex items-center justify-center gap-1.5 ${
                  !isSignUp
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#E9C349] text-[#081C1B] shadow-md"
                    : "text-[#FBFBFA]/70 hover:text-white"
                }`}
              >
                <span>Sign in</span>
              </button>
              <button
                type="button"
                data-testid="mobile-tab-signup"
                onClick={handleSwitchToSignUp}
                className={`py-2 rounded-full transition-all font-semibold flex items-center justify-center gap-1.5 ${
                  isSignUp
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#E9C349] text-[#081C1B] shadow-md"
                    : "text-[#FBFBFA]/70 hover:text-white"
                }`}
              >
                <span>Sign up</span>
              </button>
            </div>
          </div>

          {/* Form Content in Deep Teal Glass */}
          <div className="p-5 sm:p-6 relative z-10 flex-1">
            {!isSignUp ? (
              /* Mobile Sign In Form */
              <motion.form
                key="mobile-signin"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignInSubmit}
                noValidate
                className="space-y-4"
              >
                {signInError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-200 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold">!</span>
                    <span>{signInError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="mobile-signin-email"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3.5 min-h-[46px]">
                    <StitchIcon name="mail" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signin-email"
                      type="email"
                      autoComplete="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={isSubmittingSignIn}
                      placeholder="traveler@safarix.com"
                      className="w-full bg-transparent text-sm text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2.5"
                    />
                  </div>
                  {signInErrors.email && (
                    <p className="mt-1 font-mono text-[11px] text-red-400 pl-1">{signInErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="mobile-signin-password"
                      className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75"
                    >
                      Password
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleQuickFillDemo}
                        className="font-mono text-[10px] text-[#E9C349]/80 hover:text-[#E9C349] tracking-wider underline underline-offset-2"
                      >
                        Demo Fill
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Password Recovery", "Instructions sent to registered email.")
                        }
                        className="font-mono text-[10px] text-[#E9C349] hover:underline tracking-wider"
                      >
                        Forgot?
                      </button>
                    </div>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3.5 min-h-[46px]">
                    <StitchIcon name="lock" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      disabled={isSubmittingSignIn}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2.5 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showSignInPassword ? "visibility_off" : "visibility"} className="w-4 h-4" />
                    </button>
                  </div>
                  {signInErrors.password && (
                    <p className="mt-1 font-mono text-[11px] text-red-400 pl-1">
                      {signInErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSignIn}
                  className="w-full mt-3 min-h-[48px] rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E9C349] to-[#D4AF37] text-[#081C1B] font-title-md text-sm font-bold shadow-[0_12px_24px_-6px_rgba(233,195,73,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingSignIn ? (
                    <>
                      <StitchIcon name="refresh" className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to SafariX</span>
                      <StitchIcon name="arrow_forward" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* Mobile Sign Up Form */
              <motion.form
                key="mobile-signup"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignUpSubmit}
                noValidate
                className="space-y-3"
              >
                {signUpError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-200 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold">!</span>
                    <span>{signUpError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="mobile-signup-name"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Full name
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="person" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-name"
                      type="text"
                      autoComplete="name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={isSubmittingSignUp}
                      placeholder="Elena Rostova"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2"
                    />
                  </div>
                  {signUpErrors.name && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">{signUpErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-email"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="mail" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-email"
                      type="email"
                      autoComplete="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={isSubmittingSignUp}
                      placeholder="traveler@safarix.com"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2"
                    />
                  </div>
                  {signUpErrors.email && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">{signUpErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-password"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Password (min 8 chars)
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="lock" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      disabled={isSubmittingSignUp}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showSignUpPassword ? "visibility_off" : "visibility"} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {signUpErrors.password && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">
                      {signUpErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-confirm"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Confirm password
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="verified" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      disabled={isSubmittingSignUp}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showConfirmPassword ? "visibility_off" : "visibility"} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {signUpErrors.confirmPassword && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">
                      {signUpErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSignUp}
                  className="w-full mt-3 min-h-[48px] rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E9C349] to-[#D4AF37] text-[#081C1B] font-title-md text-sm font-bold shadow-[0_12px_24px_-6px_rgba(233,195,73,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingSignUp ? (
                    <>
                      <StitchIcon name="refresh" className="w-4 h-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create SafariX Account</span>
                      <StitchIcon name="arrow_forward" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>
        </div>
      
      </div>

      {/* Bottom privacy and terms footer */}
      <div className="mt-6 text-center text-[11px] text-[#F4F1E5]/40 font-mono flex items-center justify-center gap-4 flex-wrap">
        <span>© 2026 SafariX Travel</span>
        <Link href={ROUTES.privacy} className="hover:text-[#F4F1E5] underline underline-offset-2">
          Privacy Policy
        </Link>
        <Link href={ROUTES.terms} className="hover:text-[#F4F1E5] underline underline-offset-2">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
