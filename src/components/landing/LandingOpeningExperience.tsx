"use client";

import React, { useState } from "react";
import { SafariXIntro } from "./SafariXIntro";
import { EarlyAccessDialog } from "@/components/early-access/EarlyAccessDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * LandingOpeningExperience
 *
 * Coordinates the opening experience of the SafariX landing page:
 * 1. Multilingual intro animation plays completely
 * 2. On intro curtain exit completion, transitions introComplete to true
 * 3. Evaluates authoritative authentication state from useAuth():
 *    - If visitor is NOT authenticated and auth has resolved (!isLoading && !user):
 *      EarlyAccessDialog opens cleanly via React state
 *    - If visitor is authenticated (user != null):
 *      EarlyAccessDialog remains completely suppressed
 * 4. Dismissal only closes the dialog for the current page session.
 *    Reloading while unauthenticated will display the dialog again after intro.
 */
export function LandingOpeningExperience() {
  const [introComplete, setIntroComplete] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { user, isLoading } = useAuth();

  // Core business rule:
  // showEarlyAccessDialog = introComplete && !isLoading && !user && !isDismissed
  const shouldShowEarlyAccess =
    introComplete && !isLoading && !user && !isDismissed;

  return (
    <>
      <SafariXIntro onComplete={() => setIntroComplete(true)} />
      <EarlyAccessDialog
        isOpen={shouldShowEarlyAccess}
        introComplete={introComplete}
        onClose={() => setIsDismissed(true)}
      />
    </>
  );
}
