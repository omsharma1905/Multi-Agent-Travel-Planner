# SAFARIX — CORE PRODUCT RECOVERY REPORT
**Date:** October 12, 2026  
**Auditor / Specialist:** Senior Application & Integration Architect  
**Final Status Verdict:** `CODE_FIXED_EXTERNAL_BLOCKERS_REMAIN`

---

## 1. Executive Summary

A deep end-to-end investigation was executed on SafariX to determine why planning resulted in hollow itineraries, indefinite `WAITING FOR...` UI badges, uninformative "Change Stay" dialogs, and misleading "already most economical" notifications on "Reduce Cost".

### Key Diagnostic Findings:
1. **Google Places HTTP 403 Forbidden (`PERMISSION_DENIED`)**:
   - Both Places API (New) (`places.googleapis.com`) and Legacy Geocoding return HTTP 403 / `REQUEST_DENIED`.
   - **Root Cause**: The Google Cloud project associated with `GOOGLE_PLACES_API_KEY` requires **Google Cloud Billing activation** and the **"Places API (New)"** library enabled in Google Cloud Console. Without this, zero verified attractions, landmarks, or restaurants can be fetched.
2. **Duffel Stays HTTP 403 Forbidden**:
   - `https://api.duffel.com/stays/search` returns HTTP 403: `"This feature is not enabled for your account. Please contact sales to get access: https://duffel.com/contact-us"`.
   - **Root Cause**: The Duffel sandbox account has Duffel Flights active (returning 59 real flight offers), but Duffel Stays is a gated add-on requiring sales activation.
3. **Product & UI Misrepresentations (Now Completely Fixed)**:
   - When real stays and places were blocked externally, the orchestrator generated an itinerary with only transit and generic free time, yet tagged the plan as `status: "completed"` and `ITINERARY BUILT`.
   - UI status indicators previously only knew `"waiting"`, `"in_progress"`, and `"found"`, leaving failed domains frozen on `WAITING FOR ACCOMMODATIONS`, `WAITING FOR EXPERIENCES`, etc.
   - `ChangeStayModal` opened with an empty list without explaining provider unavailability.
   - `journey-editor.ts` (`reduceCost`) falsely claimed current selections "already represent the most economical verified options" when candidate pools were completely empty.

All code-level flaws, false-completion statuses, misleading error messages, and UI badges have been remediated with zero mock compromises. The application now honestly declares provider availability, rejects hollow plans from being marked completed, and provides explicit diagnostic feedback.

---

## 2. Root Cause Analysis Matrix

| Observed Issue | Code Location | Root Cause | Implemented Resolution |
| :--- | :--- | :--- | :--- |
| **Accommodation stuck on `WAITING FOR ACCOMMODATIONS`** | `src/app/trips/[tripId]/page.tsx` line 444–449, 1065–1070 | UI only mapped `status === "waiting"` if `plan.stay` was null, even after planning finished. | Updated `domainStatuses.stays` to detect `unavailable` or `no_results`. Displays `ACCOMMODATION PROVIDER UNAVAILABLE` badge and explanatory alert. |
| **Experience stuck on `WAITING FOR EXPERIENCES`** | `src/app/trips/[tripId]/page.tsx` line 450–455, 1406–1413 | Same as above. Hardcoded `status === "waiting"` when activities agent returned null. | Updated `domainStatuses.experiences` to reflect `unavailable`. Displays `ATTRACTIONS PROVIDER UNAVAILABLE` badge and billing activation guidance. |
| **Dining stuck on `WAITING FOR DINING`** | `src/app/trips/[tripId]/page.tsx` line 456–461, 1640–1647 | Same as above. Hardcoded `status === "waiting"` when dining agent returned null. | Updated `domainStatuses.food` to reflect `unavailable`. Displays `DINING PROVIDER UNAVAILABLE` badge and billing activation guidance. |
| **Hollow transit-only itinerary marked `ITINERARY BUILT`** | `src/lib/orchestration/orchestrator.ts` line 356–380 | Orchestrator only validated day count and reference IDs; never checked plan completeness. Marked hollow schedule as `status: "completed"`. | Implemented `PlanCompleteness` and `deriveCompleteness()`. If an itinerary contains 0 activities and 0 stays, orchestrator rejects `completed` status, flags as `failed`, and marks badge as `INCOMPLETE JOURNEY`. |
| **Change Stay dialog empty with no explanation** | `src/app/api/trips/[tripId]/regenerate/alternatives/route.ts` & `src/components/trips/JourneyEditingModals.tsx` | Route returned `{ stays: [] }` without availability status. Modal displayed generic `"No alternative accommodations available"`. | Route now returns `stayAvailability`. `ChangeStayModal` now renders an alert explaining that Duffel Stays access is not activated on the account. |
| **Reduce Cost claimed "already most economical"** | `src/lib/orchestration/editing/journey-editor.ts` line 386–394 | When `candidatePlans.length === 0` due to 0 candidate stays, code defaulted to claiming optimality. | Code now checks if stays were unavailable. Returns exact blocker: `"Unable to reduce costs: Verified accommodation candidates are currently unavailable from external providers (Duffel Stays access required)."`. |

---

## 3. Detailed Fixes & Code Modifications

### 3.1. Plan Completeness & Orchestration Invariants
- Modified `src/lib/orchestration/types.ts`:
  - Added `DomainOutcome = "ready" | "unavailable" | "no_results" | "optional" | "failed"`.
  - Added `PlanCompleteness` interface tracking domain-by-domain outcomes and hollow detection.
  - Added `completeness?: PlanCompleteness` to `OrchestrationResult`.
- Modified `src/lib/orchestration/orchestrator.ts`:
  - Implemented `deriveCompleteness(context, sharedContext, itinerary)`.
  - Enforced invariant: An itinerary containing 0 activities, 0 stays, and 0 dining options cannot pass as `completed`. It is persisted as `failed` with clear failure telemetry.

### 3.2. Truthful UI Badges & Status Indicators
- Modified `src/lib/design-tokens.ts`:
  - Added `unavailable` (`PROVIDER UNAVAILABLE`, amber badge) and `no_results` (`NO RESULTS FOUND`, neutral badge) to `STATUS_STYLES`.
- Modified `src/components/product/PlanningStatus.tsx`:
  - Expanded `DomainPlanStatus` to include `unavailable` and `no_results`.
- Modified `src/app/trips/[tripId]/page.tsx`:
  - Dynamically computes `domainStatuses` based on provider readiness and plan completeness.
  - Replaced generic placeholder text in Sections 02 (Stay), 03 (Experiences), and 04 (Food) with structured cards explaining the exact external provider status.
  - Section 05 (Your Itinerary) renders an amber alert banner when an incomplete journey schedule is loaded.

### 3.3. Change Stay & Journey Editing Truthfulness
- Modified `src/app/api/trips/[tripId]/regenerate/alternatives/route.ts`:
  - Returns `stayAvailability`, `placesAvailability`, `foodAvailability`, and `transportAvailability` alongside candidates.
- Modified `src/components/trips/JourneyEditingModals.tsx` (`ChangeStayModal`):
  - Accepts `providerStatus` and `providerError`. When Duffel Stays is unavailable, shows an explanatory warning banner and disables switching.
- Modified `src/lib/orchestration/editing/journey-editor.ts` (`reduceCost`):
  - Checks if candidate pools were empty due to provider unavailability. Returns truthful explanation instead of claiming the existing selections are optimal.

---

## 4. Database & Migration Status

- Neon database configuration in `.env.local` is present and connected.
- Neon has 0 public tables currently created. In development mode, `TripsRepository` safely catches missing table errors and uses an in-memory Map store.
- **Safe Migration Procedure (Manual Deployment in Phase 23)**:
  ```bash
  # Run once against your Neon production database
  npm run db:migrate
  ```
  *Note: Per strict instructions, no destructive database commands were run.*

---

## 5. Verification & Test Evidence

### 5.1. Automated Regression Suite
Ran `node scratch/test_core_recovery.mjs`:
```
=== SAFARIX CORE PRODUCT RECOVERY REGRESSION SUITE ===
1. Testing Plan Completeness Logic...
✓ Correctly detected hollow transport-only itinerary

2. Testing Reduce Cost Blocker Feedback...
✓ Reduce Cost returns truthful provider blocker message

3. Testing Change Stay Availability Fallback...
✓ Change Stay captures truthful external provider status

4. Testing Status Indicator Tokens...
✓ Status indicators cover all truthful provider states

=== ALL CORE RECOVERY TESTS PASSED (4/4) ===
```

### 5.2. Type Checking & Production Build
- `npm run type-check`: **0 errors** (Passed)
- `npm run lint -- --max-warnings 0`: **0 errors, 0 warnings** (Passed)
- `npm run build`: **Compiled successfully** (Next.js Turbopack optimized build completed in 5.5s; all 38 static and dynamic routes compiled).

---

## 6. External Actions Required by User (Provider Blockers)

To achieve full end-to-end live planning with stays and attractions populated:
1. **Google Cloud Console (Places & Geocoding)**:
   - Navigate to Google Cloud Console (`console.cloud.google.com`).
   - Enable **Billing** on the project containing `GOOGLE_PLACES_API_KEY`.
   - Enable the **"Places API (New)"** API library (`places.googleapis.com`).
2. **Duffel Account (Stays)**:
   - Contact Duffel sales / support (`https://duffel.com/contact-us`) or review your Duffel dashboard to activate the **Stays** capability on your sandbox account.

Once these two account-level permissions are activated, the real provider pipelines in SafariX will immediately ingest live hotel and attractions inventory without requiring any further code changes.
