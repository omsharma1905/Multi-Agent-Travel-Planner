"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { signInSchema, SignInInput } from "../types";
import { DEMO_USER } from "../provider/dev-auth-provider";
import { ROUTES } from "@/lib/constants";
import { SafariXMark } from "@/components/navigation/Logo";
import { useToast } from "@/components/ui/Toast";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const decodedTarget = rawRedirect ? decodeURIComponent(rawRedirect) : ROUTES.dashboard;
  const isAuthTarget =
    decodedTarget.startsWith("/auth/") ||
    decodedTarget === ROUTES.signIn ||
    decodedTarget === ROUTES.signUp;
  const redirectTarget = isAuthTarget ? ROUTES.dashboard : decodedTarget;

  const { isAuthenticated, isLoading, signIn } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState<SignInInput>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only redirect if authenticated and not redirecting to an auth page
    if (!isLoading && isAuthenticated && !rawRedirect?.startsWith("/auth/")) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, isLoading, router, redirectTarget, rawRedirect]);

  // Quick fill helper for development review
  const handleQuickFillDemo = () => {
    setFormData({
      email: DEMO_USER.email,
      password: "password123",
    });
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const validation = signInSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignInInput, string>> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof SignInInput;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn(validation.data);
      if (!res.success) {
        setFormError(res.error ?? "Invalid credentials");
        setIsSubmitting(false);
        return;
      }

      // Successful sign in -> replace current history entry to prevent back-button loops
      router.replace(redirectTarget);
    } catch {
      setFormError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-12 flex flex-col items-center justify-center gap-3 text-center">
        <SafariXMark size={28} className="text-[#1F3D2B] animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/50">
          Entering workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Dev helper banner — strictly hidden in production */}
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-8 border border-[#1F3D2B]/25 bg-[#1F3D2B]/5 p-4 flex items-center justify-between gap-3 text-xs">
          <div className="text-left">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1F3D2B]">
              DEVELOPER PREVIEW
            </p>
            <p className="text-[#111111]/60 text-xs mt-0.5">Use demo account or register new.</p>
          </div>
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="shrink-0 rounded-full border border-[#1F3D2B]/40 bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#1F3D2B] hover:bg-[#1F3D2B] hover:text-white transition-colors"
          >
            FILL DEMO
          </button>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-8 border border-red-500/30 bg-red-500/5 p-4 text-xs font-medium text-red-600 flex items-start gap-2.5"
        >
          <span className="text-sm shrink-0 font-mono">!</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block font-mono text-xs uppercase tracking-[0.2em] text-[#111111]/60 mb-2 font-medium"
          >
            EMAIL ADDRESS
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            disabled={isSubmitting}
            placeholder="you@domain.com"
            className="w-full border-b border-[#111111]/25 bg-transparent py-2.5 text-base text-[#111111] placeholder:text-[#111111]/30 transition-all focus:border-[#111111] focus:outline-none disabled:opacity-50"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-2 font-mono text-xs text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block font-mono text-xs uppercase tracking-[0.2em] text-[#111111]/60 font-medium"
            >
              PASSWORD
            </label>
            <button
              type="button"
              onClick={() =>
                toast.info("Password Recovery", "Password recovery instructions will be sent to registered accounts in production.")
              }
              className="font-mono text-[11px] uppercase tracking-wider text-[#1F3D2B] hover:underline focus-visible:outline-none"
            >
              FORGOT?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            disabled={isSubmitting}
            placeholder="••••••••"
            className="w-full border-b border-[#111111]/25 bg-transparent py-2.5 text-base text-[#111111] placeholder:text-[#111111]/30 transition-all focus:border-[#111111] focus:outline-none disabled:opacity-50"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" className="mt-2 font-mono text-xs text-red-600">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-[#111111] py-4 px-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#FAF7F0] transition-all hover:bg-[#1F3D2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>AUTHENTICATING...</span>
            </>
          ) : (
            <span>SIGN IN →</span>
          )}
        </button>
      </form>

      {/* Switch to sign-up */}
      <div className="mt-8 text-center font-mono text-xs uppercase tracking-wider text-[#111111]/60">
        <span>DON&apos;T HAVE AN ACCOUNT? </span>
        <Link
          href={ROUTES.signUp}
          className="font-bold text-[#1F3D2B] underline-offset-4 hover:underline focus-visible:outline-none"
        >
          CREATE ACCOUNT
        </Link>
      </div>
    </div>
  );
}
