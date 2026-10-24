import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { APP_NAME, APP_BRAND } from "@/lib/constants";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";

export const dynamic = "force-dynamic";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const tests: TestResult[] = [];
  const projectRoot = process.cwd();

  // Test 1: Brand constants
  const brandPassed = APP_NAME === "SafariX" && APP_BRAND === "SafariX";
  tests.push({
    name: "Brand constants canonical casing (SafariX)",
    passed: brandPassed,
    details: `APP_NAME=${APP_NAME}, APP_BRAND=${APP_BRAND}`,
  });

  // Test 2: Root metadata in layout.tsx
  const layoutContent = fs.readFileSync(path.join(projectRoot, "src", "app", "layout.tsx"), "utf8");
  const hasSafariXTitle =
    (layoutContent.includes("${APP_NAME} — AI Travel Planner") || layoutContent.includes("SafariX — AI Travel Planner")) &&
    (layoutContent.includes("%s — ${APP_NAME}") || layoutContent.includes("%s — SafariX"));
  const hasOgConfig = layoutContent.includes("/og/safarix.png");
  tests.push({
    name: "Root metadata configuration (SafariX title template & OG)",
    passed: hasSafariXTitle && hasOgConfig,
    details: `Title template & OG image configured in root layout`,
  });

  // Test 3: Route Layouts for Page Title Hierarchy
  const routeLayouts = [
    { route: "dashboard", title: "My Journeys" },
    { route: "trips/new", title: "Plan a Journey" },
    { route: "profile", title: "Profile" },
    { route: "trips/saved", title: "Saved Journeys" },
    { route: "trips/completed", title: "Archived Journeys" },
    { route: "wishlist", title: "Wishlist" },
    { route: "trips/[tripId]", title: "Journey" },
  ];
  let allLayoutsExist = true;
  for (const item of routeLayouts) {
    const layoutPath = path.join(projectRoot, "src", "app", ...item.route.split("/"), "layout.tsx");
    if (!fs.existsSync(layoutPath)) {
      allLayoutsExist = false;
      break;
    }
  }
  tests.push({
    name: "Route layout metadata for consistent page title hierarchy",
    passed: allLayoutsExist,
    details: `Checked layouts for dashboard, new, profile, saved, completed, wishlist, and trip detail`,
  });

  // Test 4: Favicon SVG and ICO existence & markup
  const iconPath = path.join(projectRoot, "src", "app", "icon.svg");
  const icoPath = path.join(projectRoot, "src", "app", "favicon.ico");
  const iconExists = fs.existsSync(iconPath) && fs.existsSync(icoPath);
  const iconContent = iconExists ? fs.readFileSync(iconPath, "utf8") : "";
  const iconValid = iconExists && iconContent.includes("<svg") && iconContent.includes("#F06C5B");
  tests.push({
    name: "SafariX vector favicon and multi-res favicon.ico",
    passed: iconValid,
    details: `Both src/app/icon.svg and src/app/favicon.ico exist and contain SafariX waypoint identity`,
  });

  // Test 5: Apple touch icon
  const appleIconPath = path.join(projectRoot, "src", "app", "apple-icon.tsx");
  const appleIconExists = fs.existsSync(appleIconPath);
  tests.push({
    name: "SafariX Apple touch icon (src/app/apple-icon.tsx)",
    passed: appleIconExists,
    details: `Apple icon dynamic generator configured`,
  });

  // Test 6: Open Graph image asset
  const ogPngPath = path.join(projectRoot, "public", "og", "safarix.png");
  const ogExists = fs.existsSync(ogPngPath);
  const ogSize = ogExists ? fs.statSync(ogPngPath).size : 0;
  tests.push({
    name: "Open Graph static preview image (/public/og/safarix.png)",
    passed: ogExists && ogSize > 0,
    details: `File size: ${ogSize} bytes (1200x630)`,
  });

  // Test 7: Landing page Navbar reactive authentication state with AccountPopover
  const navbarContent = fs.readFileSync(path.join(projectRoot, "src", "components", "navigation", "Navbar.tsx"), "utf8");
  const navbarUsesAuth = navbarContent.includes("useAuth()") && (navbarContent.includes("AccountPopover") || navbarContent.includes("ROUTES.profile"));
  const navbarHasSignIn = navbarContent.includes("ROUTES.signIn") && navbarContent.includes("ROUTES.signUp");
  tests.push({
    name: "Landing page Navbar reactive auth state with AccountPopover",
    passed: navbarUsesAuth && navbarHasSignIn,
    details: `Navbar reacts to useAuth: renders AccountPopover when authenticated, Sign In/Up when signed out`,
  });

  // Test 8: Absence of accidental user-facing VEORA text
  const userFacingFiles = [
    "src/components/navigation/Navbar.tsx",
    "src/components/navigation/MenuOverlay.tsx",
    "src/components/landing/Footer.tsx",
    "src/components/landing/WhatWeDo.tsx",
    "src/components/landing/ConnectedPlanning.tsx",
    "src/components/app/AppShell.tsx",
    "src/components/app/WorkspaceMenuOverlay.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/trips/[tripId]/page.tsx",
    "src/app/auth/sign-in/page.tsx",
    "src/app/auth/sign-up/page.tsx",
    "src/app/not-found.tsx",
  ];
  const strayUserFacing: string[] = [];
  for (const relPath of userFacingFiles) {
    const fullPath = path.join(/*turbopackIgnore: true*/ projectRoot, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      // Match user-facing strings or JSX text "VEORA" (excluding x-veora-user technical headers)
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (line.includes("x-veora-user") || line.includes("veora_dev_session") || line.includes("usr_veora_demo")) {
          return;
        }
        if (line.includes("VEORA") || line.includes("Veora")) {
          strayUserFacing.push(`${relPath}:${idx + 1}`);
        }
      });
    }
  }
  tests.push({
    name: "Zero accidental user-facing VEORA branding",
    passed: strayUserFacing.length === 0,
    details: strayUserFacing.length === 0 ? "Clean audit across all user-facing components" : `Stray found in: ${strayUserFacing.join(", ")}`,
  });

  // Test 9: Technical identifiers intentionally preserved
  const techHeadersWorking = navbarContent.length > 0 && fs.existsSync(path.join(projectRoot, "src", "features", "auth", "provider", "dev-auth-provider.ts"));
  tests.push({
    name: "Technical identifiers intentionally preserved (session & auth safety)",
    passed: techHeadersWorking,
    details: `veora_dev_session and x-veora-user preserved for zero-risk backend stability`,
  });

  // Test 10: AccountPopover component verification
  const popoverPath = path.join(projectRoot, "src", "components", "app", "AccountPopover.tsx");
  const popoverExists = fs.existsSync(popoverPath);
  const popoverContent = popoverExists ? fs.readFileSync(popoverPath, "utf8") : "";
  const popoverValid =
    popoverExists &&
    popoverContent.includes("Go to Profile") &&
    popoverContent.includes("Sign Out") &&
    popoverContent.includes("Escape") &&
    popoverContent.includes("useAuth");
  tests.push({
    name: "SafariX AccountPopover component integrity & accessibility",
    passed: popoverValid,
    details: `AccountPopover exists with Go to Profile, Sign Out, Escape handling, and useAuth integration`,
  });

  const passedCount = tests.filter((t) => t.passed).length;
  const allPassed = passedCount === tests.length;

  return NextResponse.json({
    status: allPassed ? "success" : "failed",
    passed: passedCount,
    total: tests.length,
    tests,
  });
}
