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

    const validation = signInSchema.safeParse(signInData);
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
      <div className="relative w-full rounded-2xl bg-[#F4F1E5] border border-white/15 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden min-h-[540px] md:h-[530px] lg:h-[540px]">
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
        {/* MOBILE VIEW: Compact Responsive Stack with Segment Switcher               */}
        {/* ========================================================================= */}
        <div className="flex md:hidden flex-col w-full h-full">
          {/* Top Green Banner */}
          <div className="bg-[#063D2E] text-[#F4F1E5] p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SafariXMark size={20} className="text-[#F4F1E5]" />
                <span className="font-display font-bold tracking-wider uppercase text-sm text-[#F4F1E5]">
                  SafariX
                </span>
              </div>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="font-mono text-[10px] uppercase tracking-wider text-emerald-200 underline"
                >
                  Demo Fill
                </button>
              )}
            </div>

            <h3 className="font-display text-2xl font-bold tracking-tight text-[#F4F1E5] leading-tight">
              {isSignUp ? (
                <>
                  Start your{" "}
                  <span className="font-serif italic font-normal text-emerald-200">
                    next journey.
                  </span>
                </>
              ) : (
                <>
                  Welcome{" "}
                  <span className="font-serif italic font-normal text-emerald-200">
                    back.
                  </span>
                </>
              )}
            </h3>
            <p className="text-xs text-[#F4F1E5]/75 mt-1 font-light">
              {isSignUp
                ? "Create your account for personalized journeys."
                : "Your next adventure is waiting."}
            </p>

            {/* Segment Toggle */}
            <div className="mt-4 grid grid-cols-2 rounded-lg bg-black/25 p-1 text-center font-mono text-xs uppercase tracking-wider">
              <button
                type="button"
                data-testid="mobile-tab-signin"
                onClick={handleSwitchToSignIn}
                className={`py-1.5 rounded-md transition-all font-semibold ${
                  !isSignUp
                    ? "bg-[#F4F1E5] text-[#063D2E] shadow"
                    : "text-[#F4F1E5]/70 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                data-testid="mobile-tab-signup"
                onClick={handleSwitchToSignUp}
                className={`py-1.5 rounded-md transition-all font-semibold ${
                  isSignUp
                    ? "bg-[#F4F1E5] text-[#063D2E] shadow"
                    : "text-[#F4F1E5]/70 hover:text-white"
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          {/* Form Content in Ivory */}
          <div className="p-6 bg-[#F4F1E5] text-[#063D2E] flex-1">
            {!isSignUp ? (
              /* Mobile Sign In Form */
              <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                {signInError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    {signInError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="mobile-signin-email"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-1"
                  >
                    Email address
                  </label>
                  <input
                    id="mobile-signin-email"
                    type="email"
                    autoComplete="email"
                    value={signInData.email}
                    onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={isSubmittingSignIn}
                    placeholder="traveler@safarix.com"
                    className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3.5 py-2 text-sm text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                  />
                  {signInErrors.email && (
                    <p className="mt-1 font-mono text-[11px] text-red-600">{signInErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="mobile-signin-password"
                      className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#063D2E]/80"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Password Recovery", "Instructions sent to registered email.")
                      }
                      className="font-mono text-[10px] text-[#063D2E]/70 underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
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
                      className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3.5 py-2 pr-10 text-sm text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/60 p-1 text-xs"
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      {showSignInPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {signInErrors.password && (
                    <p className="mt-1 font-mono text-[11px] text-red-600">
                      {signInErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSignIn}
                  className="w-full mt-2 rounded-lg bg-[#063D2E] text-[#F4F1E5] py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  {isSubmittingSignIn ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              /* Mobile Sign Up Form */
              <form onSubmit={handleSignUpSubmit} noValidate className="space-y-3">
                {signUpError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700"
                  >
                    {signUpError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="mobile-signup-name"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
                  >
                    Full name
                  </label>
                  <input
                    id="mobile-signup-name"
                    type="text"
                    autoComplete="name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isSubmittingSignUp}
                    placeholder="Elena Rostova"
                    className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3 py-1.5 text-xs text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                  />
                  {signUpErrors.name && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-600">{signUpErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-email"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
                  >
                    Email address
                  </label>
                  <input
                    id="mobile-signup-email"
                    type="email"
                    autoComplete="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={isSubmittingSignUp}
                    placeholder="traveler@safarix.com"
                    className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3 py-1.5 text-xs text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                  />
                  {signUpErrors.email && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-600">{signUpErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-password"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
                  >
                    Password (min 8 chars)
                  </label>
                  <div className="relative">
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
                      className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3 py-1.5 pr-10 text-xs text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/60 p-1 text-xs"
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {signUpErrors.password && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-600">
                      {signUpErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-confirm"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#063D2E]/80 mb-0.5"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
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
                      className="w-full rounded-lg border border-[#063D2E]/20 bg-white/80 px-3 py-1.5 pr-10 text-xs text-[#063D2E] focus:outline-none focus:ring-1 focus:ring-[#063D2E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#063D2E]/60 p-1 text-xs"
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

                <button
                  type="submit"
                  disabled={isSubmittingSignUp}
                  className="w-full mt-2 rounded-lg bg-[#063D2E] text-[#F4F1E5] py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  {isSubmittingSignUp ? "Creating account..." : "Create account"}
                </button>
              </form>
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
