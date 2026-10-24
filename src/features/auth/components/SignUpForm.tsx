"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { signUpSchema, SignUpInput } from "../types";
import { ROUTES } from "@/lib/constants";
import { SafariXMark } from "@/components/navigation/Logo";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const { isAuthenticated, isLoading, signUp } = useAuth();

  const [formData, setFormData] = useState<SignUpInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !rawRedirect?.startsWith("/auth/")) {
      router.replace(ROUTES.dashboard);
    }
  }, [isAuthenticated, isLoading, router, rawRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const validation = signUpSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof SignUpInput;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUp(validation.data);
      if (!res.success) {
        setFormError(res.error ?? "Failed to create account");
        setIsSubmitting(false);
        return;
      }

      // Successful registration -> replace current history entry
      router.replace(ROUTES.dashboard);
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
        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="block font-mono text-xs uppercase tracking-[0.2em] text-[#111111]/60 mb-2 font-medium"
          >
            FULL NAME
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            disabled={isSubmitting}
            placeholder="Elena Rostova"
            className="w-full border-b border-[#111111]/25 bg-transparent py-2.5 text-base text-[#111111] placeholder:text-[#111111]/30 transition-all focus:border-[#111111] focus:outline-none disabled:opacity-50"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-2 font-mono text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

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
          <label
            htmlFor="password"
            className="block font-mono text-xs uppercase tracking-[0.2em] text-[#111111]/60 mb-2 font-medium"
          >
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            disabled={isSubmitting}
            placeholder="At least 6 characters"
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

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block font-mono text-xs uppercase tracking-[0.2em] text-[#111111]/60 mb-2 font-medium"
          >
            CONFIRM PASSWORD
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            disabled={isSubmitting}
            placeholder="Re-enter password"
            className="w-full border-b border-[#111111]/25 bg-transparent py-2.5 text-base text-[#111111] placeholder:text-[#111111]/30 transition-all focus:border-[#111111] focus:outline-none disabled:opacity-50"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirm-error" className="mt-2 font-mono text-xs text-red-600">
              {errors.confirmPassword}
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
              <span>CREATING ACCOUNT...</span>
            </>
          ) : (
            <span>CREATE ACCOUNT →</span>
          )}
        </button>
      </form>

      {/* Switch to sign-in */}
      <div className="mt-8 text-center font-mono text-xs uppercase tracking-wider text-[#111111]/60">
        <span>ALREADY HAVE AN ACCOUNT? </span>
        <Link
          href={ROUTES.signIn}
          className="font-bold text-[#1F3D2B] underline-offset-4 hover:underline focus-visible:outline-none"
        >
          SIGN IN
        </Link>
      </div>
    </div>
  );
}
