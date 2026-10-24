/**
 * @file src/lib/travel/services/fx-service.ts
 *
 * Deterministic Foreign Exchange Rate & Conversion Service.
 * Converts USD base allowances/estimates into target local destination currencies.
 */

// Exchange rates relative to 1 USD (Realistic standard benchmark peg table)
const USD_BASE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 155.0,
  AED: 3.67,
  IDR: 16200.0,
  THB: 36.5,
  CHF: 0.91,
  AUD: 1.52,
  CAD: 1.37,
  SGD: 1.35,
};

export interface ExchangeRateInfo {
  rate: number;
  sourceCurrency: string;
  targetCurrency: string;
  isEstimate: boolean;
  provider: "benchmark-reference-peg" | "live-ecb";
  attribution: string;
}

export class FXService {
  /**
   * Retrieves full exchange rate metadata and provenance for a currency pair.
   */
  static getRateInfo(targetCurrency: string): ExchangeRateInfo {
    const code = targetCurrency.toUpperCase();
    const rate = USD_BASE_RATES[code] || 1.0;
    return {
      rate,
      sourceCurrency: "USD",
      targetCurrency: code,
      isEstimate: code !== "USD",
      provider: "benchmark-reference-peg",
      attribution: "Realistic benchmark reference peg aligned with global foreign exchange standards.",
    };
  }

  /**
   * Retrieves exchange rate from USD to target currency.
   */
  static getRateFromUSD(targetCurrency: string): number {
    const code = targetCurrency.toUpperCase();
    return USD_BASE_RATES[code] || 1.0;
  }

  /**
   * Converts USD amount to target currency, rounded appropriately.
   */
  static convertFromUSD(amountUSD: number, targetCurrency: string): number {
    const rate = this.getRateFromUSD(targetCurrency);
    const converted = amountUSD * rate;

    // Zero-decimal currencies (JPY, IDR)
    if (targetCurrency === "JPY" || targetCurrency === "IDR") {
      return Math.round(converted);
    }

    // Standard currencies: round to nearest integer or sensible travel increment
    if (targetCurrency === "INR") {
      return Math.round(converted / 10) * 10;
    }

    return Math.round(converted);
  }

  /**
   * Converts amount in source currency back to USD.
   */
  static convertToUSD(amount: number, sourceCurrency: string): number {
    const rate = this.getRateFromUSD(sourceCurrency);
    if (rate <= 0) return amount;
    return amount / rate;
  }
}
