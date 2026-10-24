/**
 * @file src/lib/travel/services/currency-resolver.ts
 *
 * Destination Currency & Locale Resolution Engine.
 * Resolves local currency codes and symbols based on destination country or canonical region.
 */

export interface CurrencyDetails {
  code: string;
  symbol: string;
  name: string;
}

// Canonical Country Code / Name to Currency Mapping
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyDetails> = {
  IN: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  INDIA: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  JP: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  JAPAN: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  FR: { code: "EUR", symbol: "€", name: "Euro" },
  FRANCE: { code: "EUR", symbol: "€", name: "Euro" },
  IT: { code: "EUR", symbol: "€", name: "Euro" },
  ITALY: { code: "EUR", symbol: "€", name: "Euro" },
  ES: { code: "EUR", symbol: "€", name: "Euro" },
  SPAIN: { code: "EUR", symbol: "€", name: "Euro" },
  DE: { code: "EUR", symbol: "€", name: "Euro" },
  GERMANY: { code: "EUR", symbol: "€", name: "Euro" },
  GB: { code: "GBP", symbol: "£", name: "British Pound" },
  UK: { code: "GBP", symbol: "£", name: "British Pound" },
  UNITED_KINGDOM: { code: "GBP", symbol: "£", name: "British Pound" },
  AE: { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  UAE: { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  DUBAI: { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  US: { code: "USD", symbol: "$", name: "US Dollar" },
  USA: { code: "USD", symbol: "$", name: "US Dollar" },
  ID: { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah" },
  INDONESIA: { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah" },
  BALI: { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah" },
  TH: { code: "THB", symbol: "฿", name: "Thai Baht" },
  THAILAND: { code: "THB", symbol: "฿", name: "Thai Baht" },
  CH: { code: "CHF", symbol: "CHF ", name: "Swiss Franc" },
  SWITZERLAND: { code: "CHF", symbol: "CHF ", name: "Swiss Franc" },
  AU: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  AUSTRALIA: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  CA: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  CANADA: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  SG: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  SINGAPORE: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
};

// Known destination keywords to currency
const DESTINATION_KEYWORD_MAP: Record<string, CurrencyDetails> = {
  goa: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  delhi: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  mumbai: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  jaipur: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  mathura: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  bangalore: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  tokyo: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  kyoto: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  osaka: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  paris: { code: "EUR", symbol: "€", name: "Euro" },
  rome: { code: "EUR", symbol: "€", name: "Euro" },
  barcelona: { code: "EUR", symbol: "€", name: "Euro" },
  berlin: { code: "EUR", symbol: "€", name: "Euro" },
  london: { code: "GBP", symbol: "£", name: "British Pound" },
  edinburgh: { code: "GBP", symbol: "£", name: "British Pound" },
  dubai: { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  bali: { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah" },
  bangkok: { code: "THB", symbol: "฿", name: "Thai Baht" },
  phuket: { code: "THB", symbol: "฿", name: "Thai Baht" },
  "new york": { code: "USD", symbol: "$", name: "US Dollar" },
  "san francisco": { code: "USD", symbol: "$", name: "US Dollar" },
};

export class CurrencyResolver {
  /**
   * Resolves the primary currency for a given destination name and/or country.
   */
  static resolve(destination: string, country?: string, countryCode?: string): CurrencyDetails {
    // 1. Match by countryCode
    if (countryCode) {
      const normalizedCode = countryCode.trim().toUpperCase();
      if (COUNTRY_CURRENCY_MAP[normalizedCode]) {
        return COUNTRY_CURRENCY_MAP[normalizedCode];
      }
    }

    // 2. Match by country name
    if (country) {
      const normalizedCountry = country.trim().toUpperCase().replace(/\s+/g, "_");
      if (COUNTRY_CURRENCY_MAP[normalizedCountry]) {
        return COUNTRY_CURRENCY_MAP[normalizedCountry];
      }
    }

    // 3. Match by destination keywords
    const lowerDest = destination.toLowerCase().trim();
    for (const [kw, curr] of Object.entries(DESTINATION_KEYWORD_MAP)) {
      if (lowerDest.includes(kw)) {
        return curr;
      }
    }

    // 4. Default fallback: USD
    return { code: "USD", symbol: "$", name: "US Dollar" };
  }
}
