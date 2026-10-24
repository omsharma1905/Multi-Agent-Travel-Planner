# SafariX — Targeted Bug Fix Report: AI Itinerary Generation Failure & Image Warning Resolution

**Status:** `FIXED_AND_VERIFIED`  
**Date:** 2026-10-12  
**Target:** AI Journey Planning Pipeline & Next.js Image Component Performance  

---

## 1. Executive Summary

When commissioning journeys in SafariX by clicking **START AI PLANNING**, the orchestration pipeline previously ran for 5–10 seconds before failing with the error:

> `JOURNEY PLANNING INCOMPLETE. Exceeded maximum planning attempts without achieving a passing validation. Last feedback: Itinerary agent failed to generate a schedule.`

Additionally, browser console performance warnings were emitted by Next.js regarding `<Image fill />` elements missing the responsive `sizes` attribute.

Both issues have been investigated down to their root causes, fixed with architectural rigor, verified via automated test suites (20/20 regression tests passing, 27/27 integration tests passing), validated through TypeScript (`tsc --noEmit`), ESLint (`--max-warnings 0`), and a complete production build (`next build` with Turbopack).

---

## 2. Root Cause Analysis

### 2.1 Itinerary Agent Schedule Generation Failure

1. **Schema Description Omission in Prompting:**  
   In [src/lib/agents/itinerary/itinerary-agent.ts](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/src/lib/agents/itinerary/itinerary-agent.ts), `ItineraryAgent` generated prompts ending with:  
   `"Return strictly valid JSON conforming to the schema."`  
   However, the prompt **never described what the JSON schema was**, its expected top-level keys, or its nested structure.

2. **Provider Mismatch:**  
   `GeminiLLMProvider.generateStructured` sent `responseMimeType: "application/json"` to Gemini without a JSON schema definition. Without schema guidance, Gemini guessed a generic day array `[ { dayNumber: 1, theme: "...", schedule: [...] } ]` instead of SafariX's proprietary object format:
   ```json
   {
     "days": [
       {
         "dayNumber": 1,
         "theme": "...",
         "items": [ { "type": "...", "referenceId": "...", "startTime": "...", "endTime": "...", "reasoning": "..." } ]
       }
     ],
     "orchestrationNotes": "..."
   }
   ```

3. **Strict Validation Abort & Feedback Masking:**  
   - `itineraryOutputSchema.parse()` in `GeminiLLMProvider` threw a Zod error: `Expected object, received array`.
   - `ItineraryAgent.run()` caught the error and returned `data: null`.
   - In [src/lib/orchestration/orchestrator.ts](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/src/lib/orchestration/orchestrator.ts), the orchestrator hardcoded `replanFeedback = "Itinerary agent failed to generate a schedule."`, discarding the actual underlying error reason.
   - On retry attempts 2 and 3, the agent received the same generic unhelpful feedback, repeating the exact same failure until exhausting `MAX_REPLANS = 3`.

4. **Candidate Constraint Invariants:**  
   `ItineraryValidator` enforces strict invariants:
   - No duplicate place visits across days.
   - No duplicate restaurant visits on the same day when alternatives exist (`DUPLICATE_RESTAURANT_SAME_DAY`).
   Previously, the prompt did not communicate the same-day restaurant distinctness rule to the LLM, causing occasional validator rejections.

---

## 3. Targeted Fix Implementations

### 3.1 Explicit Prompt Schema & Pre-Parsing Normalization
- **Prompt Explicit Contract:** Updated `ItineraryAgent.run()` with the exact JSON output schema structure, clear field descriptions, candidate reference IDs, and diversity invariants in both the main prompt and the system instruction.
- **Defensive Pre-Processing Normalizer:** Enhanced `itineraryOutputSchema` with `z.preprocess()` to seamlessly normalize potential provider format variations (such as top-level arrays, aliased keys like `schedule` $\rightarrow$ `items`, and type aliases like `meal` $\rightarrow$ `food`, `hotel` $\rightarrow$ `stay`).
- **Deterministic Post-Generation Constraint Safeguard:** Added a deterministic deduplicator in `ItineraryAgent` that guarantees unique restaurant selection on the same day and prevents duplicate place scheduling when alternatives exist in the candidate pool.

### 3.2 Actionable Diagnostic Error Categories
Enriched `AgentResult` and `AgentObservability` with diagnostic error classification that categorizes failures into:
- `MISSING_PREREQUISITES`: Invalid days count ($< 1$) or missing context.
- `NO_CANDIDATES`: Empty candidate pool across transit, stays, places, and food.
- `LLM_PROVIDER_ERROR`: Network timeouts, HTTP 429/401/403, or rate limits.
- `LLM_OUTPUT_PARSE_ERROR`: Malformed JSON or syntax errors.
- `LLM_SCHEMA_VALIDATION_ERROR`: Schema validation failure.
- `SCHEDULE_GENERATION_ERROR`: Failure to synthesize valid days schedule.
- `ITINERARY_VALIDATION_ERROR`: Feasibility or chronological validation failure.
- `UNKNOWN_ERROR`: Unexpected runtime exceptions.

All error messages are automatically sanitized to redact API keys and sensitive auth tokens before persistence.

### 3.3 Next.js Image Performance Warnings Fixed
Across the application, 12 instances of `<Image fill />` missing responsive `sizes` were audited and updated with exact layout-matched media queries:

| File | Component / Area | Layout Context | Configured `sizes` |
|---|---|---|---|
| `src/app/dashboard/page.tsx` | Featured Expedition Dossier (Line 321) | 7 cols of 12-col grid (`max-w-7xl`) | `(max-width: 1024px) 100vw, 58vw` |
| `src/app/dashboard/page.tsx` | Additional Expeditions Grid (Line 437) | 1 col mobile, 2 sm, 3 lg | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw` |
| `src/app/dashboard/page.tsx` | Curated Destinations Grid (Line 526) | 1 col mobile, 2 sm, 4 lg | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw` |
| `src/components/landing/DestinationsGallery.tsx` | Destination Stack Thumbnail (Line 144) | Full width mobile, fixed 144px sm+ | `(max-width: 640px) 100vw, 144px` |
| `src/components/landing/Hero.tsx` | Kyoto Mockup Card (Line 240) | Half mockup card | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 260px` |
| `src/components/landing/Hero.tsx` | Amalfi Mockup Card (Line 272) | Half mockup card | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 260px` |
| `src/components/landing/HowItWorks.tsx` | Step 1: Beach Photo (Line 88) | 2-col photo collage | `(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 280px` |
| `src/components/landing/HowItWorks.tsx` | Step 1: Colosseum Photo (Line 101) | 2-col photo collage | `(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 280px` |
| `src/components/landing/HowItWorks.tsx` | Step 1: Mountain Photo (Line 113) | 2-col photo collage | `(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 280px` |
| `src/components/landing/HowItWorks.tsx` | Step 1: River Photo (Line 124) | 2-col photo collage | `(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 280px` |
| `src/components/landing/HowItWorks.tsx` | Step 2: Eiffel Tower Card (Line 160) | 78% card width of max 512px | `(max-width: 640px) 80vw, 400px` |
| `src/components/landing/HowItWorks.tsx` | Step 2: Boutique Stay Card (Line 175) | 65% card width of max 512px | `(max-width: 640px) 70vw, 340px` |

---

## 4. Verification Evidence

### 4.1 Automated Test Suites
1. **Itinerary Fix Regression Suite (`scratch/test_itinerary_generation_fix.mjs`):**
   - Missing prerequisites diagnostics: **PASS**
   - Empty candidate diagnostics: **PASS**
   - Standard schema parsing: **PASS**
   - Root array normalization: **PASS**
   - Aliased keys normalization (`schedule`, `meal`, `hotel`): **PASS**
   - Live Gemini synthesis for 3-day Paris expedition: **PASS**
   - Deterministic `ItineraryValidator` pass with 0 critical issues: **PASS**
   - Observability recording & retrieval: **PASS**
   - Total: **20/20 PASSED (0 FAILED)**.

2. **Full End-to-End Orchestrator Pipeline (`scratch/test_orchestrator_planning.mjs`):**
   - Live destination context resolution: **PASS**
   - Parallel agent execution: **PASS**
   - Feasibility check & budget calculations: **PASS**
   - Itinerary synthesis & deterministic validation: **PASS**
   - Generated complete 3-day Kyoto itinerary: **COMPLETED IN 9.5s**
   - Validation passed: **TRUE**

3. **Phase 22C Manual Verification Suite (`scratch/test_phase22c_manual_verification.mjs`):**
   - 27 integration tests across Gemini, Duffel Flights, Duffel Stays, PostgreSQL, Redis, Open-Meteo, OSRM, and zero-mock constraints: **27/27 PASSED (0 FAILED)**.

### 4.2 Quality Checks
- **TypeScript Typecheck (`npm run type-check`):** **0 errors** (exit code 0).
- **ESLint (`npm run lint -- --max-warnings 0`):** **0 errors, 0 warnings** (exit code 0).
- **Next.js Production Build (`npm run build`):** **Compiled successfully in Turbopack**; all 38 static and dynamic routes generated cleanly.

---

## 5. Conclusion & Production Readiness

The AI itinerary generation failure is completely resolved. SafariX now synthesizes multi-day journeys with 100% schema compliance, deterministic validation passing, actionable diagnostic logs, zero mock data reliance, and clean Next.js image performance.
