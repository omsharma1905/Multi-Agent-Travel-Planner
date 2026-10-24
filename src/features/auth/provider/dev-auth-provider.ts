/**
 * @file src/features/auth/provider/dev-auth-provider.ts
 *
 * Development-only constants.
 * Production authentication is strictly server-side (/api/auth/*) using bcrypt.
 * No plaintext passwords or client-side session credentials are stored here.
 */

import { User } from "../types";

// Default pre-seeded demo user identity for development preview UX
export const DEMO_USER: User = {
  id: "usr_veora_demo_01",
  name: "Elena Rostova",
  email: "demo@safarix.travel",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  createdAt: "2026-01-01T00:00:00.000Z",
};
