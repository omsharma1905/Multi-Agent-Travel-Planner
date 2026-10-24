<USER_REQUEST>
# SafariX — Master Application Repair, Data Integrity, Provider Reliability & UI/UX Overhaul

## Mission

Perform a comprehensive, evidence-driven audit and repair of the existing SafariX application. Identify and resolve the real causes of the functional bugs, incorrect travel information, unreliable external integrations, hardcoded or fabricated content, image failures, itinerary inaccuracies, and weak visual design discovered during manual testing.

**This is an implementation task, not an audit-only task.** Inspect the actual code, reproduce the failures, fix them, run meaningful regression tests, and report the verified results.

Do not stop after identifying problems. Do not merely modify labels to hide errors. Do not declare success because TypeScript, ESLint, or the production build passes.

## 1. Mandatory working rules

1. Inspect the existing implementation and current Git/worktree state before changing anything.
2. Treat the previously completed database, authentication, caching, refresh-loop, and initial bug fixes as existing work to preserve—not as tasks to rebuild from scratch.
3. Do not repeat broad investigations that have already been completed unless a concrete regression or unresolved failure requires it.
4. Make minimal, cohesive changes that address verified root causes. Refactor only where necessary to implement a correct solution.
5. Preserve the existing Next.js, React, TypeScript, Tailwind, Framer Motion, Drizzle, and Neon PostgreSQL architecture.
6. Keep the application genuinely free to operate. Do not introduce paid APIs, mandatory billing accounts, card-required services, or new paid dependencies.
7. Never fabricate restaurant names, ratings, opening hours, prices, flight availability, flight fares, travel durations, accommodation availability, coordinates, or booking confirmations.
8. Do not use placeholder records presented as real businesses or attractions. Examples of unacceptable production content include “Restaurant H,” “Restaurant 17,” and “Restaurant 3.”
9. Keep PostgreSQL authoritative for persisted data. Preserve session validation, authorization, trip ownership, cache TTLs, cache invalidation, and password security.
10. Do not remove working functionality, redesign authentication unnecessarily, rewrite the orchestration architecture, or change the database schema unless a demonstrated defect makes it necessary.
11. Do not deploy, publish, or change production infrastructure.
12. Do not stop after the first issue. Work through all confirmed issues and their closely related causes in this single repair pass.

## 2. Establish a reliable baseline

Before modifying code, inspect the existing project and identify:

- The active Next.js development server and any duplicate server processes.
- Current TypeScript, lint, build, and test commands.
- Existing provider adapters, orchestration agents, Zod schemas, itinerary generation, persistence, image routes, and UI components.
- Current modifications and uncommitted work so existing changes are not overwritten.
- Actual environment-variable names and which free integrations are configured, without printing secret values.
- The previously added test suites and whether they genuinely exercise application behavior.

Reproduce the reported issues using the existing application and representative trip data. Capture the real HTTP responses, provider results, server logs, browser console errors, and relevant database records.

Create a concise internal defect inventory with root cause, affected code, expected behavior, implemented fix, and regression test for every confirmed issue.

If a provider or environment is temporarily unavailable, continue with independent fixes and tests. Clearly distinguish a verified repair from an integration that could not be live-tested.

## 3. Critical issue A — Destination images and HTTP 504 errors

### Observed problems

- Image requests sometimes fail with `504 Gateway Timeout`.
- Destination images load slowly or do not load at all.
- Country flags sometimes appear instead of destination photography.
- Flags and other unsuitable images can look distorted inside wide hero containers.
- The application previously depended on Pexels, but a usable Pexels API key is not available.

### Required investigation and implementation

Trace the entire image pipeline from the destination input through image-provider lookup, server-side image routes, URL validation, Next.js image optimization, browser requests, and rendered image components.

Determine which component actually generates the 504 response. Do not assume that every image failure originates in Wikimedia or that the Next.js optimizer is always responsible.

Implement the following:

- Use available, genuinely free image sources already supported by the application, prioritizing Wikimedia Commons or other verified free sources that fit the existing architecture.
- Do not require a Pexels key or introduce a paid image service.
- Filter flags, coats of arms, seals, logos, locator maps, icons, and unsuitable SVG images from photographic destination results.
- Prefer real destination photographs, recognizable landmarks, city skylines, architecture, and landscapes.
- Improve search query construction and relevance ranking. A country name alone should not automatically select its flag.
- Avoid unnecessarily sequential provider requests. Use bounded timeouts, appropriate concurrency, and controlled retries where useful.
- Cache successful image metadata and suitable results with explicit freshness and invalidation behavior. Do not cache failed responses indefinitely.
- Avoid repeatedly fetching the same destination image for every component or navigation.
- Prevent image failures from blocking page rendering or triggering an application-wide loading loop.
- Validate image hosts and URL schemes. Preserve Next.js image optimization and existing security restrictions.
- Ensure fallback UI appears immediately when an image is unavailable and does not cause layout shifts.
- Preserve source attribution and license information wherever required.

### Image and visual presentation requirements

Create a consistent destination-image presentation system that supports:

- Wide landscape photography for destination heroes.
- Correct aspect ratios and `object-fit` behavior.
- Responsive image sizing and appropriate loading priorities.
- Graceful fallbacks with attractive destination typography and subtle visual treatment.
- No stretched flags, broken image icons, or blank oversized image regions.

A missing image must never be replaced with a fabricated image URL or misleading photograph.

### Acceptance criteria

- Image-provider timeouts are bounded and do not stall the whole page.
- Repeated destination renders do not cause unnecessary duplicate fetches.
- Image routes return truthful, appropriate HTTP statuses.
- Failed requests display a graceful fallback.
- Test valid photographs, flags, SVGs, invalid URLs, unreachable providers, and timeout scenarios.
- Measure actual request behavior and latency where possible; do not invent performance measurements.

## 4. Critical issue B — Transportation retrieval, routes, costs, and durations

### Observed problems

- Transportation results are missing or semantically inconsistent.
- Transport may be marked unavailable even when local transit is appropriate.
- A flight from Lucknow to Paris was displayed with a four-hour duration and `$0 / traveler`.
- The selected flight description claimed a direct route and zero stops without demonstrated flight data.
- Flight and transport booking/search links may be lost or misleading.

The Lucknow-to-Paris example must be used as a regression scenario.

### Required investigation

Inspect the complete transportation flow, including:

- `AirportResolver.ts` and the verified airport registry.
- `OutboundTransportProvider.ts`.
- Transportation agent prompts, output schemas, and candidate mapping.
- Provider adapters and any OSRM, routing, geocoding, or flight-search integrations.
- Transport selection and itinerary construction.
- Cost and duration calculations.
- Transport status badges, descriptions, and outbound search links.
- Any static registry entries or deterministic estimates that are currently treated as verified facts.

Identify which fields originate from actual provider results, which are user preferences, which are computed estimates, and which are unknown.

### Required behavior

**A. Distinguish route search from verified transportation data.**

Generating a Google Flights URL is not proof that a flight exists. A flight-search link must not be represented as a confirmed flight, airline, direct route, stop count, departure time, ticket price, or bookable itinerary.

If only an external search is available, label it honestly as an external flight search. Do not invent a carrier such as “Major Commercial Airlines” and present it as a real provider.

**B. Correct transportation prices.**

- Never display `$0` when the fare is unknown.
- Unknown fares must remain null or explicitly unavailable.
- Separate verified fares, user-supplied budgets, calculated estimates, and unavailable prices.
- Do not interpret a missing value as zero.
- Standardize currency using explicit currency codes and valid conversion data where conversion is supported.
- Do not compare amounts in different currencies as though they were equivalent.
- Do not invent currency exchange rates.
- Do not claim a price is verified unless a genuine source supplied it.

**C. Correct transportation durations.**

- Obtain durations from an appropriate routing or schedule provider when available.
- Use OSRM only for the supported road-routing modes; do not use road-driving durations as flight durations.
- Never calculate an international flight duration using an arbitrary constant or a local road-routing fallback.
- Do not assume that airport-to-airport distance equals flight duration.
- If reliable duration data is unavailable, show “Duration unavailable” or a clearly labeled, defensible estimate when a valid calculation method and assumptions exist.
- Do not claim a flight is direct or has zero stops without source evidence.

**D. Improve route and airport resolution.**

- Support city-name resolution outside the current airport registry without silently treating arbitrary cities as verified airports.
- Separate geocoded cities, verified airports, inferred airport candidates, and unresolved locations.
- Resolve ambiguous locations safely and ask for clarification where necessary.
- Generate useful external search links from validated city labels when IATA codes cannot be resolved, while labeling the destination as a search rather than a verified option.
- Preserve outbound search links through schemas, agents, persistence, and UI projections.

**E. Handle local and intercity transport correctly.**

Use explicit semantic states for:

- Intercity transportation selected.
- Local or regional transit only.
- No intercity transport required.
- Transport not specified.
- Route search available but no verified transport option returned.
- Provider unavailable or failed.
- Additional information required.

Do not display “No intercity transit was required” when an origin was explicitly provided and the required journey has not been resolved.

### Acceptance criteria

The Lucknow-to-Paris scenario must never show a fabricated four-hour flight, zero-dollar fare, invented carrier, or unsupported direct-flight claim.

Test domestic and international journeys, missing origins, unresolved cities, missing provider credentials, empty results, routing failures, unknown prices, currency differences, and external-search fallbacks.

## 5. Critical issue C — Restaurant names and dining data integrity

### Observed problems

The dining cards contain generic or suspicious names such as:

- Restaurant H
- Restaurant 17
- Restaurant 3

Descriptions like “a local dining establishment in Paris” do not provide useful or trustworthy restaurant recommendations.

### Required investigation

Trace restaurant discovery from the actual free provider through OSM query construction, provider parsing, deduplication, ranking, schema validation, itinerary selection, persistence, and display.

Inspect `osm-place-provider.ts`, dining-specific services, agent prompts, schemas, and any fallback generators.

Search the project for:

- Generic restaurant-name templates.
- Sequential or random restaurant numbering.
- Placeholder descriptions.
- Hardcoded restaurant arrays.
- Artificial ratings, prices, cuisine types, opening hours, or website URLs.
- Fallback code that converts empty provider results into plausible-looking businesses.

### Required implementation

- Use genuine provider-returned restaurant names and stable source identifiers.
- Require sufficient source evidence to treat a record as a real restaurant.
- Use OSM tags and categories appropriately, with a conservative minimum quality threshold.
- Prefer actual named restaurants over unnamed generic features.
- Deduplicate records by stable provider identifiers and reasonable geographic/name matching.
- Rank restaurants by relevance, location, traveler preferences, cuisine evidence, and available source quality.
- Do not invent cuisine, opening hours, ratings, price ranges, or official websites.
- When information is missing, show that it is unknown rather than generating a plausible sentence.
- When there are too few suitable restaurants, return fewer results and explain that more could not be verified.
- Use a useful empty state with a map search or external discovery link instead of fake restaurant cards.
- Keep source identifiers, map URLs, and outbound website URLs correctly associated with each record.
- Ensure itinerary dining entries refer to the same real records shown in the dining section.

### Acceptance criteria

Production data must not contain fabricated numbered restaurants or generic names masquerading as verified businesses.

Add tests for empty results, unnamed OSM features, duplicates, missing cuisine tags, missing hours, malformed websites, and valid named restaurants.

## 6. Critical issue D — Activities and attraction quality

### Observed problems

- Irrelevant infrastructure and road features have appeared among tourist attractions.
- Some attractions appear to be weakly relevant or duplicate related landmarks.
- The activities agent previously emitted a Gemini schema validation error involving `selectedPlaces` and missing `placeId` fields.
- Internal technical error messages were previously visible in user-facing content.

### Required investigation and implementation

- Recheck the current attraction filters against actual OSM and Wikimedia results.
- Exclude roads, junctions, administrative areas, bus depots, and other non-tourist infrastructure unless they are genuinely recognized visitor attractions.
- Validate candidate identities and source IDs before the LLM can select them.
- Ensure selected activities reference actual retrieved candidate IDs.
- Harden schema normalization against supported alternate LLM output structures without silently accepting invalid identities.
- Provide a clear, explicit JSON output contract in the activities prompt.
- Use deterministic ranking and filtering as the fallback when the free LLM provider fails.
- Keep raw provider exceptions in server-side diagnostics and observability; never expose stack traces, Zod issue dumps, or API internals to users.
- Preserve a truthful indication of degraded results without falsely claiming that AI successfully curated them.
- Remove duplicates and rank actual attractions using geographic relevance, visitor suitability, and traveler interests.
- Avoid selecting multiple near-identical attractions simply to reach a fixed quota.

A valid deterministic fallback is acceptable. Fabricated attractions and invented evidence are not.

### Acceptance criteria

Test malformed Gemini responses, schema mismatches, empty candidate sets, road-heavy search results, duplicate attractions, and provider outages.

## 7. Critical issue E — End-to-end itinerary consistency

Inspect the full trip-generation and itinerary-editing pipeline, including transportation, lodging, dining, activities, budget optimization, day regeneration, and replacement actions.

Fix the following classes of defects:

- Itinerary entries referencing candidates that are not present in the corresponding validated results.
- Inconsistent names between result cards and itinerary entries.
- Transportation details that contradict the selected transport option.
- Duplicate or geographically impractical daily schedules.
- Arbitrary travel times or impossible route durations.
- Unsupported hotel, restaurant, or activity availability claims.
- Budget calculations that treat unknown prices as zero.
- Savings claims that are not backed by comparable prices in the same currency.
- Replacement or regeneration actions that introduce fabricated candidates.
- Provider errors leaking into saved trip reasoning or descriptions.
- Persistence and trip-versioning errors when editing or regenerating itineraries.

Preserve the existing budget optimization functionality and the previously repaired “Make it cheaper” workflow. If no valid cheaper alternatives exist, report that honestly and preserve the existing itinerary.

Do not create fake transport, food, activity, or lodging entries merely to fill a daily schedule. Mark unavailable information honestly, and ensure all selected entities remain traceable to genuine source records.

Add cross-section consistency checks so the same selected candidate has the same identity and supported facts in every view.

## 8. Critical issue F — Full hardcoded-data and fabricated-fallback audit

Search the entire active application, not just the files already mentioned.

Inspect:

- Provider adapters and their fallback behavior.
- Agent prompts and schemas.
- Destination and airport registries.
- Restaurant and attraction ranking.
- Transport estimates.
- Itinerary scheduling.
- Budget and currency calculations.
- Image selection and caching.
- Demo data, fixtures, seeded records, and development fallbacks.
- UI labels, placeholder content, badges, and empty states.
- Environment configuration and disabled or unavailable integrations.

Classify findings as:

1. Legitimate configuration or verified reference data.
2. Valid deterministic business logic.
3. Test-only fixtures that cannot leak into production.
4. Potentially misleading static content.
5. Fabricated or unsupported production claims.
6. Unnecessary duplication or fragile fallback behavior.

Do not remove legitimate deterministic logic or verified registries merely because they are static. The goal is to eliminate **hardcoded facts that falsely appear to be live, personalized, or provider-verified data**, not to prohibit normal application configuration.

Replace misleading production fallbacks with source-backed results, explicit unknown states, or clear empty states.

## 9. Critical issue G — Comprehensive UI/UX redesign and image-rich presentation

### Current problem

The website feels overly black-and-white, static, and visually plain. The current trip overview has too much repetitive text, generic cards, weak imagery, and limited visual hierarchy.

Improve the experience substantially while preserving SafariX's recognizable identity, existing navigation, core workflows, and useful design elements.

### Design direction

Create a premium, editorial travel-planning experience: immersive, visual, polished, responsive, and interactive.

Use:

- Large, high-quality destination photography where available.
- Strong typography and a clear hierarchy between titles, descriptions, metadata, and actions.
- A deliberate palette with warm neutral backgrounds, deep forest or teal accents, and restrained coral highlights.
- Consistent spacing, borders, radii, shadows, and iconography.
- More meaningful visual variation between the hero, transportation, stays, attractions, dining, and itinerary.
- Attractive destination cards with appropriate photography or elegant fallbacks.
- Subtle Framer Motion transitions and responsive interaction states.
- Better empty states, skeletons, error feedback, hover/focus states, and loading feedback.
- Responsive layouts for desktop, tablet, and mobile.
- Accessible contrast, keyboard navigation, semantic HTML, and reduced-motion support.

### Specific areas

**Destination hero**

- Make the selected destination visually prominent.
- Use correctly cropped destination photography.
- Present trip dates, duration, traveler count, and relevant summary information cleanly.
- Keep fallbacks elegant and compact.

**Transportation**

- Improve the route presentation with clear origin/destination hierarchy, meaningful mode icons, and concise source-backed metadata.
- Make verified prices and estimates visually distinct from unknown values.
- Provide clear outbound search actions.
- Never make an unverified flight look like a confirmed booking.

**Activities**

- Use photo-forward landmark cards when real, relevant images are available.
- Present names, short descriptions, locations, and source-supported information clearly.
- Avoid repetitive badges and excessive technical metadata.
- Do not display meaningless zero-star ratings.

**Dining**

- Make restaurant cards visually useful with genuine names, location details, cuisine only when supported, and clear map or website links.
- Do not create generic placeholder restaurant records to fill a grid.
- Handle missing restaurant imagery without degrading the whole page.

**Itinerary**

- Improve day navigation and the visual timeline.
- Group entries by day and time.
- Clearly distinguish transport, accommodation, activities, and dining.
- Keep replacement and regeneration controls discoverable, with appropriate pending and error states.
- Preserve the user's current selections and trip edits.
- Avoid overcrowding the page with duplicated descriptions.

**Interaction**

- Ensure buttons, filters, day selectors, replacement actions, transport changes, and regeneration controls actually work.
- Add visual feedback for asynchronous operations.
- Prevent accidental duplicate requests and confusing concurrent updates.
- Preserve form state and current trip state when appropriate.

Do not introduce a new component library solely for visual polish. Reuse the current stack and shared components. Do not perform a wholesale rewrite of unrelated pages.

### UI acceptance criteria

- No broken image placeholders or visibly stretched destination images.
- No generic restaurant names or raw technical errors.
- No false `$0` fares or unsupported durations.
- No `0.0` ratings when the source provides no rating.
- Consistent visual hierarchy across the major trip sections.
- Functional keyboard-accessible controls and responsive layouts.
- Real imagery when available, with elegant, truthful fallbacks otherwise.

## 10. Critical issue H — Authentication, database cache, SSR and browser stability regression

Preserve and regression-test the previously implemented fixes.

The existing reports state that the application uses HMAC-signed session cookies, PostgreSQL persistence, and in-memory repository caches with a 60-second TTL, clone-safe trip reads, ownership checks, and cache invalidation.

Verify these behaviors without replacing the architecture:

- Missing, expired, and tampered session tokens are rejected.
- A signed token for a deleted user cannot authorize access.
- Protected server pages and APIs enforce authentication.
- Trip access is restricted to its owner, including cache-hit paths.
- Writes remain authoritative in PostgreSQL.
- Updates and deletions invalidate or refresh caches correctly.
- Cached objects cannot be mutated through shared references.
- Development fallbacks cannot silently conceal production persistence failures.
- Sensitive authenticated responses are not improperly reused across users or stale sessions.
- Sign-out invalidates the session correctly.
- Browser Back and Forward do not resurrect invalid authentication state.
- `pageshow` handlers do not trigger unnecessary duplicate requests on every normal load.
- Root and route layouts do not enter middleware/layout redirect loops.
- The previous React 19 Suspense error does not recur.
- Fast Refresh does not continuously rebuild without code changes.
- Server rendering remains compatible with real database latency.

Do not solve rendering errors by suppressing console errors, forcing the entire app to client rendering, removing meaningful Suspense boundaries, or weakening authentication.

**Important cache correctness rule:** In-memory cache hits must not bypass required database freshness, deletion, or revocation checks beyond the explicitly accepted TTL and consistency guarantees. Validate that the actual implementation honors those guarantees.

## 11. Test strategy — prove real behavior

Use the existing test suites where useful. Fix inadequate tests rather than adding duplicate tests that merely repeat implementation assumptions.

### Required regression scenarios

1. Fresh unauthenticated landing-page visit.
2. Sign-up, sign-in, refresh, and sign-out.
3. Back/Forward navigation with valid and invalidated sessions.
4. Dashboard and trip access with valid sessions.
5. Non-owner access to another user's trip.
6. Cache hit, cache expiry, mutation, deletion, and database failure.
7. Image-provider timeout, invalid URL, flag rejection, successful image lookup, and graceful fallback.
8. Transportation from Lucknow to Paris with no real flight pricing or schedule provider.
9. Transportation for supported domestic and intercity routes.
10. Missing or ambiguous origin/destination.
11. Unresolved airports and external flight-search fallback.
12. Unknown fare, currency mismatch, and unknown duration.
13. Empty, malformed, duplicate, or infrastructure-heavy attraction results.
14. Gemini activities schema failure and deterministic fallback.
15. Empty dining results and generic/unnamed restaurant rejection.
16. Consistent itinerary references across cards, day schedules, and replacement actions.
17. Budget optimization when lower-priced candidates are unavailable or unpriced.
18. Rapid navigation and repeated actions.
19. Browser console and network inspection on all critical routes.
20. Desktop, tablet, and mobile layout checks.

Use genuine provider data when the relevant service is available. Mock network failures or provider responses only within isolated tests; never insert mocked records into the production data layer.

For external services that cannot be reliably tested live, separate deterministic adapter tests from explicitly labeled live integration tests.

## 12. Quality gates and completion requirements

After implementing the fixes:

- Run the project's actual TypeScript type-check.
- Run ESLint with the repository's configured strictness.
- Run the production build.
- Run the relevant existing test suites and new regression tests.
- Run real browser tests against the active application.
- Inspect browser console output and failed network requests.
- Inspect actual returned API payloads and representative persisted records.
- Verify the trip detail page visually after the fixes.
- Check for regressions in authentication, trip creation, persistence, editing, and itinerary generation.

Do not claim that every error has been eliminated solely because a test suite passes. Do not fabricate test counts, browser results, latency numbers, or successful provider calls.

If a check fails, fix the underlying defect and rerun the affected check. If an external dependency prevents a live test, report that exact limitation and the tests that were still completed.

## 13. Final report format

Return a concise but evidence-based implementation report containing:

1. Confirmed root causes and the corresponding fixes.
2. Files changed and the reason for each significant change.
3. Hardcoded or fabricated production behavior removed.
4. Transportation, image, restaurant, and attraction provider behavior after the fixes.
5. UI/UX improvements completed.
6. Tests actually executed, with real pass/fail counts.
7. Live integration tests performed and their observed outcomes.
8. Any unresolved defects or external service limitations.
9. Any environment variables or manual configuration that remains necessary.
10. Confirmation that deployment was not performed.

Do not mark an issue “resolved” unless the relevant fix and its regression verification have actually completed.

## Final instruction

Complete this repair pass in the existing project. Prioritize data integrity and correctness first, provider reliability second, and visual polish alongside the functional repairs. Preserve existing working functionality and architectural decisions.

Do not return only a plan. Investigate, implement, verify, and report the actual results. Do not deploy.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-24T09:46:33+05:30.
</ADDITIONAL_METADATA>