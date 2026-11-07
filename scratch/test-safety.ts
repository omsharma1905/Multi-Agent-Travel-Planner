type TripFixture = { tripId: string; userId: string };

export class ScratchTestFixtures {
  private readonly userIds = new Set<string>();
  private readonly trips = new Map<string, TripFixture>();
  private cleaned = false;

  assertIsolatedDatabase(apiBaseUrl?: string): void {
    if (apiBaseUrl !== undefined) {
      throw new Error(
        "HTTP scratch tests are disabled because the API server's active database identity cannot be independently verified. No fixtures may be created or cleaned up.",
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    const declaredTestDatabaseUrl = process.env.SAFARIX_TEST_DATABASE_URL;
    const declaredServerTestDatabaseUrl = process.env.SAFARIX_TEST_SERVER_DATABASE_URL;

    if (
      process.env.SAFARIX_RUN_SCRATCH_TESTS !== "true" ||
      !databaseUrl ||
      databaseUrl !== declaredTestDatabaseUrl ||
      databaseUrl !== declaredServerTestDatabaseUrl
    ) {
      throw new Error(
        "Direct database scratch tests require explicit matching test database URL declarations.",
      );
    }

    let databaseName: string;
    let databaseHost: string;
    try {
      const parsed = new URL(databaseUrl);
      databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      databaseHost = parsed.hostname;
    } catch {
      throw new Error("Scratch tests require a valid isolated test database URL.");
    }

    if (!/(^|[-_])(test|testing|scratch)([-_]|$)/i.test(databaseName)) {
      throw new Error("Scratch tests refused a database not clearly named as a test database.");
    }
    if (databaseHost === "localhost" || databaseHost === "127.0.0.1" || databaseHost === "::1") {
      // Local test databases are permitted when explicitly named and matched above.
    } else if (process.env.SAFARIX_ALLOW_REMOTE_TEST_DATABASE !== "true") {
      throw new Error("Remote scratch-test databases require explicit SAFARIX_ALLOW_REMOTE_TEST_DATABASE=true.");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Scratch tests cannot run with NODE_ENV=production.");
    }
  }

  trackUser(userId: string): void {
    this.userIds.add(userId);
  }

  trackTrip(tripId: string, userId: string): void {
    this.trips.set(tripId, { tripId, userId });
  }

  async cleanup(): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;

    const [{ TripsRepository }, { UsersRepository }] = await Promise.all([
      import("../src/features/trips/repository"),
      import("../src/features/auth/user-repository"),
    ]);

    const failures: string[] = [];
    for (const { tripId, userId } of this.trips.values()) {
      try {
        const trip = await TripsRepository.getTripById(tripId, userId);
        if (trip && !(await TripsRepository.deleteTrip(tripId, userId))) {
          failures.push(`trip fixture ${tripId}`);
        }
      } catch (error) {
        failures.push(`trip fixture ${tripId}: ${String(error)}`);
      }
    }

    for (const userId of this.userIds) {
      try {
        const user = await UsersRepository.getUserRecordById(userId);
        if (user && !(await UsersRepository.deleteAccount(userId))) {
          failures.push(`user fixture ${userId}`);
        }
      } catch (error) {
        failures.push(`user fixture ${userId}: ${String(error)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Scratch fixture cleanup failed: ${failures.join("; ")}`);
    }
  }
}

export async function runScratchTest(
  run: (fixtures: ScratchTestFixtures) => Promise<void>,
  apiBaseUrl?: string,
): Promise<void> {
  const fixtures = new ScratchTestFixtures();
  fixtures.assertIsolatedDatabase(apiBaseUrl);
  try {
    await run(fixtures);
  } finally {
    await fixtures.cleanup();
  }
}
