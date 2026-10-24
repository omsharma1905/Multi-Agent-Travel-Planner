# SafariX — Autonomous Multi-Agent AI Travel Planner

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.2-green?logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.23.6-black?logo=framer)](https://www.framer.com/motion/)

> **SafariX** is a production-grade travel planning platform powered by multi-agent AI collaboration, real-world travel data providers, and deterministic mathematical validation. It replaces hallucinated AI trip generators with verified entities, realistic route geometries, transparent budget syntheses, and safe, fail-safe partial itinerary regeneration.

---

## 1. The Problem SafariX Solves

Most existing AI travel assistants produce superficially convincing but practically unusable itineraries:
- **Hallucinated Establishments**: Recommending restaurants or attractions that do not exist, closed years ago, or are in the wrong city.
- **Impossible Geometries**: Scheduling activities across opposite sides of a metropolitan area within 30 minutes, ignoring real traffic and transit constraints.
- **Fabricated Pricing & Bookings**: Displaying arbitrary prices or falsely claiming flights or hotels are reserved without provider grounding.
- **All-or-Nothing Regeneration**: When a user wants to change one restaurant or switch transport from train to flight, standard LLM generators rewrite the entire vacation, losing all previously approved choices.

**SafariX solves this by decoupling generative intelligence from ground truth:**
1. Real travel data providers supply candidate entities (attractions, dining, stays, transit options).
2. Specialized AI domain agents select and pace experiences based on traveler constraints.
3. Deterministic validators mathematically enforce scheduling sanity, budget totals, and daily uniqueness.
4. Granular editing engines allow surgical replacement of individual days, stays, or activities while preserving the rest of the journey.

---

## 2. Key Capabilities & User Workflows

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  1. COMMISSION  │ ──> │  2. MULTI-AGENT  │ ──> │ 3. INSPECT & INTERACT│
│ Journey Intake  │     │  Orchestration   │     │ Day-by-Day Workspace │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
┌─────────────────┐     ┌──────────────────┐                │
│ 5. PERSISTENCE  │ <── │ 4. FAIL-SAFE     │ <──────────────┘
│ Save / Archive  │     │ Targeted Editing │
└─────────────────┘     └──────────────────┘
```

1. **Intake & Preference Enforcement**: Configure origin, destination, duration (1–30 days), travel party size, budget tier (`budget`, `moderate`, `luxury`), and explicit transport preferences (`auto`, `flight`, `train`, `bus`, `car`).
2. **Transparent Multi-Agent Planning**: Live 8-stage stepper tracking real orchestration events with synchronized status cards across Transit, Stays, Experiences, Dining, Budget, and Itinerary.
3. **Entity-Grounded Itinerary**: Every scheduled stop includes verified addresses, geographic coordinates, opening hours, duration estimates, and canonical Google Maps directions.
4. **Honest Budget Synthesis**: Categorized cost breakdowns (lodging, transit, meals, verified entry tickets) calculated deterministically and clearly marked as planning estimates.
5. **Targeted Journey Editing & Replanning**:
   - Single-day targeted regeneration (unaffected days remain 100% untouched).
   - Modal-driven transport switching with automated schedule and budget updates.
   - Accommodation swaps across verified property alternatives.
   - Attraction and dining replacements from verified destination candidate pools.
   - Natural language modifications with out-of-scope intent guardrails.
   - Concurrency locking and fail-safe rollback preserving the original itinerary on errors.
6. **Journey Organization**: Separate collections for My Journeys, Saved Journeys, and Travel Archive with truthful empty states.

---

## 3. Product Showcase

| Screen | Description |
| :--- | :--- |
| ![Landing Page](docs/screenshots/01-landing-page.png) | **Cinematic Landing Page**: Editorial typography, responsive navigation, and destination showcase. |
| ![Early Access Notice](docs/screenshots/02-early-access-dialog.png) | **Auth-Aware Early Access Notice**: Transparent disclosure regarding free-tier API latency and provider verification. |
| ![Traveler Dashboard](docs/screenshots/03-dashboard.png) | **Traveler Workspace**: Active itineraries, quick status badges, and commission triggers. |
| ![Journey Creation](docs/screenshots/04-journey-creation.png) | **Journey Intake**: 6 structured intake chapters with validation for dates, party size, and transit preferences. |
| ![Planning Progress](docs/screenshots/05-planning-progress.png) | **Multi-Agent Workspace**: Genuine 8-stage sequential orchestration stepper with live domain state tracking. |
| ![Completed Journey](docs/screenshots/06-journey-overview.png) | **Journey Overview**: Destination photography, financial synthesis, booking disclaimers, and interactive edit triggers. |
| ![Day-by-Day Itinerary](docs/screenshots/07-day-by-day-itinerary.png) | **Chronological Itinerary**: Non-overlapping daily timelines, transit segments, and Google Maps routing. |
| ![Journey Editing](docs/screenshots/08-journey-editing.png) | **Targeted Journey Editing**: Modal-driven replacement of transit, stays, or attractions with immediate budget delta recalculation. |
| ![Travel Archive](docs/screenshots/09-archived-journeys.png) | **Travel Archive**: Persisted history of completed journeys with full inspection capability. |

---

## 4. Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Browser Client (Next.js 16.4 / React 19)"]
        UI["Landing & Workspace UI"]
        AuthHook["useAuth (Session Hydration)"]
        EditingUI["JourneyEditingModals"]
    end

    subgraph Server["Next.js Server & API Routes"]
        direction TB
        AuthAPI["/api/auth (Session & Cookies)"]
        TripsAPI["/api/trips (CRUD & Status)"]
        PlanAPI["/api/trips/:id/plan"]
        RegenAPI["/api/trips/:id/regenerate"]
        AltsAPI["/api/trips/:id/regenerate/alternatives"]
        RateLimiter["Distributed Rate Limiter (Upstash / Memory)"]
        LockMgr["PlanningLockManager (Concurrency Control)"]
    end

    subgraph OrchestrationEngine["SafariX Multi-Agent Orchestration Engine"]
        Assembler["TripContextAssembler"]
        
        subgraph Agents["Specialized AI Domain Agents"]
            TransAgent["Transportation Agent"]
            StayAgent["Stay & Sanctuaries Agent"]
            ActAgent["Activities Agent"]
            FoodAgent["Food & Dining Agent"]
            ItinAgent["Itinerary Synthesis Agent"]
        end

        subgraph DeterministicCore["Deterministic Engineering Core"]
            BudgetCalc["BudgetCalculator (Deterministic Math)"]
            Validator["ItineraryValidator (Rules & Invariants)"]
            EditorCore["JourneyEditor (Scoped Mutation Engine)"]
        end
    end

    subgraph DataLayer["Travel Data Layer (Providers)"]
        OpenMeteo["Open-Meteo API (Geocoding)"]
        GooglePlaces["Google Places API (Attractions & Dining)"]
        Amadeus["Amadeus API (Flights & Hotels)"]
        OSRM["OSRM API (Driving Routing)"]
        Pexels["Pexels API (Photography)"]
        FX["FXService (Currency Benchmark)"]
        MapsUtil["Google Maps URL Generator"]
    end

    subgraph Persistence["Persistence & Security"]
        Postgres[(PostgreSQL + Drizzle ORM)]
        MemStore[(In-Memory Resilient Store)]
    end

    UI --> AuthAPI
    UI --> TripsAPI
    UI --> PlanAPI
    UI --> RegenAPI
    UI --> AltsAPI

    PlanAPI & RegenAPI --> RateLimiter
    PlanAPI & RegenAPI --> LockMgr
    PlanAPI --> Assembler
    RegenAPI --> EditorCore

    Assembler --> DataLayer
    EditorCore --> Assembler

    Assembler --> Agents
    Agents --> DeterministicCore
    DeterministicCore --> Validator

    TripsAPI --> Postgres
    TripsAPI -.-> MemStore
    PlanAPI --> Postgres
    RegenAPI --> Postgres
```

---

## 5. Technology Stack & Confirmed Versions

| Technology | Verified Version | Purpose in SafariX |
| :--- | :---: | :--- |
| **Next.js** | `16.4.0` | App Router, Turbopack, Server Actions, Route Handlers, Metadata |
| **React** | `19.0.0` | Server Components, Client State, Concurrent Rendering |
| **TypeScript** | `5.8.3` | End-to-end static typing across schemas, agents, and UI tokens |
| **PostgreSQL** | `16` | Relational persistence for users, trips, preferences, and plans |
| **Drizzle ORM** | `0.45.2` | Type-safe schema definition, relations, migrations (`drizzle-kit 0.31.10`) |
| **postgres-js** | `3.4.9` | High-performance pooled PostgreSQL client driver |
| **Tailwind CSS** | `3.4.17` | Utility-first styling with custom semantic SafariX design tokens |
| **Framer Motion** | `12.23.6` | Curtain intro, modal transitions, and accordion animations |
| **Zod** | `3.24.4` | Strict boundary validation on API requests, schemas, and provider outputs |
| **Upstash Redis** | `^1.39.0` | Distributed persistent rate limiting via `@upstash/ratelimit 2.2.0` |
| **bcryptjs** | `3.0.3` | Cryptographic salt generation and password hashing (cost factor 10) |

---

## 6. Multi-Agent Planning & Validation Pipeline

### The 8 Sequential Orchestration Stages
1. **Stage 1 — Understanding Preferences**: Extracts traveler origin, destination, budget tier, party size, and transit preference.
2. **Stage 2 — Comparing Transportation**: Evaluates routes across flights, trains, buses, and cars. Enforces user preference with a +60 scoring boost; provides transparent fallback if a requested mode is unavailable.
3. **Stage 3 — Finding Accommodation**: Curates stays matching the requested comfort tier (hostel, boutique, luxury) to serve as daily spatial anchors.
4. **Stage 4 — Selecting Activities**: Filters verified attractions by traveler interests, pacing, and opening hours.
5. **Stage 5 — Finding Places to Eat**: Recommends authentic culinary stops matching meal times without daily duplicate restaurants.
6. **Stage 6 — Checking Budget**: Deterministic calculation summing accommodation, transit, meal allowances, and admission fees.
7. **Stage 7 — Building Itinerary**: Assembles a chronologically ordered day-by-day sequence respecting transit buffers and opening times.
8. **Stage 8 — Validating Journey**: Mathematical verification pass via `ItineraryValidator`. If issues are detected, targeted replanning triggers automatically before persistence.

### Deterministic Validation Rules (`ItineraryValidator`)
- **Anti-Hallucination**: Every reference ID in the schedule must resolve to an authentic candidate entity in the provider context.
- **Temporal Consistency**: Items must have strictly ascending start and end times without overlapping.
- **Duration Feasibility**: Each activity duration must respect minimum dwell times and provider operating hours.
- **Anti-Duplicate Visit**: Attractions may be visited at most once across the entire journey.
- **Daily Theme Diversity**: Daily schedules require distinct thematic narratives.

---

## 7. Travel Provider Integrations

| Domain | Provider | Integration Details | Fallback / Graceful Degradation |
| :--- | :--- | :--- | :--- |
| **Geocoding** | **Open-Meteo** | Live HTTP search endpoint; zero API key required. | Memory destination cache. |
| **Attractions** | **Google Places** | Places API (New Text Search) with location, rating, and hours. | Pre-verified destination fixtures. Preserves `null` for unknown ticket costs. |
| **Dining** | **Google Places** | Food search returning verified cuisine types and price levels. | Regional culinary fixture pool. |
| **Flights** | **Amadeus** | Self-Service Flight Offers Search with OAuth2 token auth. | Zero origin fabrication; transparent unavailable notice. |
| **Lodging** | **Amadeus** | Hotel Search API providing room categories and pricing. | Verified boutique and luxury property fixtures. |
| **Routing** | **OSRM** | Open Source Routing Machine for driving distance and duration. | Haversine distance calculation. |
| **Images** | **Pexels** | Curated high-resolution destination photography. | Neutral typographic gradient fallback. |
| **Currency** | **FXService** | Deterministic benchmark reference peg table. | Explicitly disclosed as benchmark estimates (not live ECB). |
| **Maps** | **Google Maps** | Canonical URLs using coordinates and verified Google Place IDs. | Rejects internal mock IDs; falls back to `lat,lng` search. |

---

## 8. Security & Authorization Architecture

- **Authentication**: Signed, HttpOnly, `SameSite=Lax` session cookies (`safarix_session`) with bcrypt password hashing.
- **Strict IDOR Ownership**: All mutations (`PATCH /saved`, `PATCH /status`, `POST /regenerate`, `DELETE /trips/:id`) verify `trip.userId === session.user.id`. Requests for unauthorized trips return **HTTP 404 Not Found** to prevent user enumeration.
- **CSRF Defense**: All mutating requests inspect `Origin` and `Sec-Fetch-Site` headers, rejecting cross-origin submissions with HTTP 403 Forbidden.
- **Distributed Multi-Tier Rate Limiting**:
  - `AUTH`: 5 requests / minute (brute-force defense)
  - `AI_PLANNING`: 3 requests / minute (orchestration compute defense)
  - `PROVIDER_SEARCH`: 30 requests / minute
  - `MUTATION`: 20 requests / minute
  - `READ`: 100 requests / minute
  - *Production Guard*: Security-critical tiers fail closed (HTTP 503) if Upstash Redis becomes unreachable.
- **Production Mock Prevention**: `assertNoMockFallbackInProduction` prevents mock providers from silently operating in live production.

---

## 9. Local Installation & Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL 15+ (optional for local testing; memory store operates out-of-the-box)

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/your-username/safarix.git
cd safarix
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

### Step 3: Database Migration (Optional for local PostgreSQL)
```bash
# Generate SQL migrations
npm run db:generate

# Push schema to PostgreSQL database
npm run db:push
```

### Step 4: Run Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to open SafariX.

---

## 10. Environment Variable Reference

| Variable | Description | Example / Default | Required? |
| :--- | :--- | :--- | :---: |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `http://localhost:3000` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/safarix` | Optional (dev) |
| `SESSION_SECRET` / `NEXTAUTH_SECRET` | 64-character session signing secret | `your-secure-random-64-char-string` | Yes |
| `TRAVEL_DATA_MODE` | Provider mode (`mock` or `real`) | `mock` (dev) / `real` (prod) | Yes |
| `GOOGLE_PLACES_API_KEY` | Google Places API key for attractions and food | `AIzaSy...` | Optional (dev) |
| `AMADEUS_CLIENT_ID` | Amadeus API Key | `your_amadeus_client_id` | Optional (dev) |
| `AMADEUS_CLIENT_SECRET` | Amadeus API Secret | `your_amadeus_secret` | Optional (dev) |
| `PEXELS_API_KEY` | Pexels API Key for destination images | `your_pexels_key` | Optional (dev) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for distributed rate limiting | `https://your-upstash.upstash.io` | Optional (dev) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | `your_upstash_token` | Optional (dev) |

---

## 11. Verification & Test Commands

All test suites have been verified with a **100% pass rate (538 / 538 checks)**:

```bash
# 1. Type-Checking (0 errors)
npm run type-check

# 2. Linting (0 errors, 0 warnings)
npm run lint

# 3. Production Build (37 routes compiled)
npm run build

# 4. End-to-End Product Flow Verification (33 steps)
node scratch/test_phase14_complete_flow.mjs

# 5. Journey Editing & Regeneration Test Suite (47 tests)
node scratch/test_phase13_journey_editing.mjs

# 6. Core Multi-Agent & Travel Regression Suite (279 tests)
node scratch/run_all_tests.js

# 7. Live Penetration & Security Hardening Suite (26 tests)
node scratch/run_penetration_tests.mjs

# 8. Production Launch Verification Suite (40 tests)
node scratch/verify_phase11_production.mjs

# 9. Early Access Browser Automation Suite (33 tests)
node scratch/test_early_access_browser.js

# 10. Responsive Viewport & Overflow Audit (80 viewport checks)
node scratch/audit_responsive.js
```

---

## 12. Known Limitations & Roadmap

1. **Foreign Exchange Rates**: Currency conversion uses a standard benchmark reference table. Integration with live daily European Central Bank (ECB) rate feeds is planned for a future update.
2. **Multi-Factor Authentication (MFA)**: Password hashing (bcrypt) and signed cookies are hardened; TOTP-based 2FA is scheduled for post-launch.
3. **Third-Party Provider Free Tiers**: External APIs (Amadeus, Google Places, Open-Meteo) run on free or test-tier quotas, which may introduce latency or request caps under heavy concurrent traffic.

---

## 13. Important Travel Disclaimer

> **TRAVEL DISCLAIMER**: SafariX is an AI itinerary synthesis and travel intelligence platform. Schedules, prices, operating hours, ticket costs, and availability are subject to change by third-party providers. SafariX does not process payments or issue travel tickets directly. Always verify critical travel details with official airlines, hotels, and venues prior to booking.

---

## 14. License

Copyright © 2026 SafariX Team. All rights reserved. Prepared for portfolio presentation and demonstration.
