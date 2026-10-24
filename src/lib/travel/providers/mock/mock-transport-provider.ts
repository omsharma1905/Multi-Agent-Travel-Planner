/**
 * @file src/lib/travel/providers/mock/mock-transport-provider.ts
 *
 * Deterministic Mock Transport Provider supporting multi-modal transit options.
 */

import { TransportProvider, TransportFilter } from "../interfaces";
import { TransportOption } from "../../types";
import { MOCK_TRANSPORT_OPTIONS } from "./fixtures/transport";
import { transportOptionSchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";
import { normalizeSearchString } from "../../normalizers";
import { generateDynamicTransport } from "./dynamic-fallback";

export class MockTransportProvider implements TransportProvider {
  private options: TransportOption[];

  constructor(customOptions: TransportOption[] = MOCK_TRANSPORT_OPTIONS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockTransportProvider cannot be instantiated in production environment.",
      );
    }
    this.options = customOptions;
  }


  async searchTransport(filter: TransportFilter): Promise<TransportOption[]> {
    const orig = normalizeSearchString(filter.origin);
    const dest = normalizeSearchString(filter.destination);

    // Extract main city tokens (e.g. "tokyo", "kyoto")
    const origTokens = orig.split(" ").filter((t) => t.length > 2);
    const destTokens = dest.split(" ").filter((t) => t.length > 2);

    let results = this.options.filter((opt) => {
      const optOrig = normalizeSearchString(opt.origin);
      const optDest = normalizeSearchString(opt.destination);

      const origMatch =
        optOrig.includes(orig) ||
        orig.includes(optOrig) ||
        origTokens.some((token) => optOrig.includes(token));

      const destMatch =
        optDest.includes(dest) ||
        dest.includes(optDest) ||
        destTokens.some((token) => optDest.includes(token));

      return origMatch && destMatch;
    });

    if (filter.preferredModes && filter.preferredModes.length > 0) {
      results = results.filter((opt) => filter.preferredModes!.includes(opt.mode));
    }

    // Fall back to dynamic multimodal transit options for arbitrary routes if no match
    if (results.length === 0 && filter.origin && filter.destination) {
      const dynamic = generateDynamicTransport(filter.origin, filter.destination);
      results = filter.preferredModes && filter.preferredModes.length > 0
        ? dynamic.filter((opt) => filter.preferredModes!.includes(opt.mode))
        : dynamic;
    }

    if (filter.maxStops !== undefined) {
      results = results.filter((opt) => typeof opt.stops === "number" && opt.stops <= filter.maxStops!);
    }

    // Deterministic sorting: train and flight prioritized, then duration ascending
    results.sort((a, b) => (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999));

    for (const item of results) {
      const check = transportOptionSchema.safeParse(item);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-transport", check.error.format());
      }
    }

    return results;
  }
}
