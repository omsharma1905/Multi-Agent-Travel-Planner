# SAFARIX — PRODUCTION ENVIRONMENT SETUP & CONFIGURATION MANUAL

**Phase:** 22 & 22B — Environment Configuration Readiness & Travel Provider Migration  
**Target:** Manual Credential Configuration Guide for SafariX Production Deployment  
**Security Notice:** NEVER commit secrets, API keys, connection strings, or `.env.local` files to Git or share them in prompts. Configure these securely in your production hosting platform (e.g. Vercel, Railway, Fly.io, AWS) or local `.env.local`.

---

## Quick Reference: Required Production Variables

| Variable Name | Required? | Source / Provider | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **YES** | Managed PostgreSQL (Neon, Supabase, Railway) | Persistent storage for users, trips, & itinerary versions |
| `SESSION_SECRET` | **YES** | Locally Generated (32+ bytes) | HMAC session cookie signing |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **YES** | Google AI Studio / GCP Vertex AI | Multi-agent AI itinerary planning & replanning |
| `GOOGLE_PLACES_API_KEY` | **YES** | Google Cloud Console (Places API New) | Verified attraction discovery & restaurant curation |
| `DUFFEL_ACCESS_TOKEN` | **YES** | Duffel (duffel.com) | Live flight offers & accommodation search (replaces decommissioned Amadeus) |
| `DUFFEL_BASE_URL` | Optional | Duffel (`https://api.duffel.com`) | API base endpoint |
| `UPSTASH_REDIS_REST_URL` | **YES** | Upstash Console | Distributed sliding-window rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | **YES** | Upstash Console | Authentication for Upstash REST API |
| `INTERNAL_API_SECRET` | **YES** | Locally Generated (16+ bytes) | Authorization guard for `/api/internal/*` diagnostic routes |
| `NEXT_PUBLIC_APP_URL` | **YES** | Your Custom Domain / Vercel URL | Canonical public app URL |

---

## Step-by-Step Setup Guide

### 1. PostgreSQL Database (`DATABASE_URL`)
SafariX strictly enforces genuine database persistence in production. In-memory demo stores fail closed.

1. Create a managed PostgreSQL database on **Neon** (https://neon.tech), **Supabase** (https://supabase.com), or **Railway** (https://railway.app).
2. Copy the pooled connection string (with SSL mode required):
   ```text
   DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<dbname>?sslmode=require"
   ```
3. If using Supabase or PgBouncer, optionally set `DIRECT_URL` for direct Drizzle migrations:
   ```text
   DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<dbname>"
   ```
4. Push database schemas to your database:
   ```bash
   npm run db:push
   ```

---

### 2. Session Security Secret (`SESSION_SECRET`)
SafariX secures user sessions using HMAC SHA-256 tokens. A secret with at least 32 characters of high entropy is strictly enforced.

1. Generate a secure cryptographic secret in your terminal:
   ```bash
   openssl rand -base64 32
   ```
2. Assign the generated output to `SESSION_SECRET`:
   ```text
   SESSION_SECRET="<generated-base64-string>"
   ```

---

### 3. Google Gemini AI Orchestrator (`GOOGLE_GENERATIVE_AI_API_KEY`)
Powers the Destination, Itinerary, Budget, and Safety agents without mock heuristics.

1. Navigate to **Google AI Studio** (https://aistudio.google.com).
2. Click **Get API key** and generate a new key under your project.
3. Assign the key to:
   ```text
   GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."
   ```

---

### 4. Google Places & Dining APIs (`GOOGLE_PLACES_API_KEY`)
SafariX uses the **Google Places API (New)** for genuine attractions, operating hours, coordinates, and culinary curation.

1. Open **Google Cloud Console** (https://console.cloud.google.com).
2. Create or select your Google Cloud project.
3. Enable the **Places API (New)** under **APIs & Services > Library**.
4. Create an API Key under **APIs & Services > Credentials**.
5. *(Recommended)* Restrict the key to API: `Places API (New)`.
6. Assign the key to:
   ```text
   GOOGLE_PLACES_API_KEY="AIzaSy..."
   ```

---

### 5. Duffel API — Flights & Accommodations (`DUFFEL_ACCESS_TOKEN`)
Replaces decommissioned Amadeus Self-Service APIs. Powers genuine flight offers, airline itineraries, room availability, and hotel pricing.

1. Register at **Duffel** (https://duffel.com).
2. Navigate to **Developers > Access Tokens**.
3. Create a token:
   - For Sandbox / Development: Copy the token starting with `duffel_test_`.
   - For Live Production: Complete business profile and copy the token starting with `duffel_live_`.
4. Assign the token to:
   ```text
   DUFFEL_ACCESS_TOKEN="duffel_test_..."
   DUFFEL_BASE_URL="https://api.duffel.com"
   ```

---

### 6. Upstash Redis Distributed Rate Limiting (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
Protects auth routes, AI planning, and travel APIs against burst attacks and denial of service.

1. Log in to **Upstash** (https://console.upstash.com).
2. Create a new **Redis Database** (Select region nearest to your app hosting).
3. Scroll to the **REST API** section of your database dashboard.
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`:
   ```text
   UPSTASH_REDIS_REST_URL="https://<db-name>.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="AX...="
   ```

---

### 7. Internal Diagnostic Security Guard (`INTERNAL_API_SECRET`)
Protects internal diagnostic endpoints (`/api/internal/*`) in production environments. Any production request without matching `x-internal-secret` header returns 404 Not Found.

1. Generate a high-entropy secret in your terminal:
   ```bash
   openssl rand -hex 24
   ```
2. Assign the secret to:
   ```text
   INTERNAL_API_SECRET="<generated-hex-string>"
   ```

---

### 8. Optional Services

- **Pexels Photography API (`PEXELS_API_KEY`)**:
  - Register at https://www.pexels.com/api/
  - Optional. If omitted, SafariX cleanly renders destination color gradients.
- **Dedicated OSRM Routing (`OSRM_BASE_URL`)**:
  - Default is `https://router.project-osrm.org`.
  - For high production throughput, deploy your own OSRM Docker container and set `OSRM_BASE_URL`.
- **Public App Domain (`NEXT_PUBLIC_APP_URL`)**:
  - In production, set to your canonical domain (e.g. `https://safarix.travel`).

---

## Verifying Your Configuration

Once your environment variables are configured, verify your setup using the built-in diagnostic endpoint:

### In Development:
```bash
curl http://localhost:3000/api/internal/api-diagnostic
```

### In Production:
```bash
curl -H "x-internal-secret: <YOUR_INTERNAL_API_SECRET>" https://safarix.travel/api/internal/api-diagnostic
```

The response will verify that each integration reports `CONFIGURED` and `LIVE_VERIFIED`, and that `overallReadyForProduction` is `true`.
