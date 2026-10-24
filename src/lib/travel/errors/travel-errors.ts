/**
 * @file src/lib/travel/errors/travel-errors.ts
 *
 * Structured domain error hierarchy for the Travel Data Layer.
 * Prevents provider implementation details and raw API stack traces from leaking to consumers.
 */

export class TravelError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code = "TRAVEL_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = "TravelError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DestinationNotFoundError extends TravelError {
  constructor(destinationQuery: string) {
    super(
      `Destination could not be resolved for query: "${destinationQuery}".`,
      "DESTINATION_NOT_FOUND",
      { destinationQuery },
    );
    this.name = "DestinationNotFoundError";
  }
}

export class ProviderUnavailableError extends TravelError {
  constructor(provider: string, reason?: string) {
    super(
      `Travel provider "${provider}" is currently unavailable.${reason ? ` Reason: ${reason}` : ""}`,
      "PROVIDER_UNAVAILABLE",
      { provider, reason },
    );
    this.name = "ProviderUnavailableError";
  }
}

export class RateLimitError extends TravelError {
  constructor(provider: string, retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded for provider "${provider}".`,
      "RATE_LIMITED",
      { provider, retryAfterSeconds },
    );
    this.name = "RateLimitError";
  }
}

export class InvalidProviderResponseError extends TravelError {
  constructor(provider: string, validationIssues?: unknown) {
    super(
      `Provider "${provider}" returned invalid or malformed data that failed schema validation.`,
      "INVALID_PROVIDER_RESPONSE",
      { provider, validationIssues },
    );
    this.name = "InvalidProviderResponseError";
  }
}

export class NoResultsError extends TravelError {
  constructor(searchType: string, queryParams?: Record<string, unknown>) {
    super(
      `No travel results found for ${searchType}.`,
      "NO_RESULTS",
      { searchType, queryParams },
    );
    this.name = "NoResultsError";
  }
}

export class TravelDataUnavailableError extends TravelError {
  constructor(item: string) {
    super(
      `Requested travel data for "${item}" is unavailable.`,
      "TRAVEL_DATA_UNAVAILABLE",
      { item },
    );
    this.name = "TravelDataUnavailableError";
  }
}

export class ProviderConfigurationError extends TravelError {
  constructor(provider: string, reason: string) {
    super(
      `Configuration error for travel provider "${provider}": ${reason}`,
      "PROVIDER_CONFIGURATION_ERROR",
      { provider, reason },
    );
    this.name = "ProviderConfigurationError";
  }
}

export class OriginRequiredError extends TravelError {
  constructor(destination: string) {
    super(
      `Transport search to "${destination}" requires an explicit traveler origin location or airport code.`,
      "ORIGIN_REQUIRED",
      { destination },
    );
    this.name = "OriginRequiredError";
  }
}

export class OriginNotFoundError extends TravelError {
  constructor(originQuery: string) {
    super(
      `Origin could not be resolved for query: "${originQuery}".`,
      "ORIGIN_NOT_FOUND",
      { originQuery },
    );
    this.name = "OriginNotFoundError";
  }
}


