// lib/store-links.ts

export type StoreKind = "amazon" | "ebay" | "other";

export type CountryCode =
  | "US"
  | "IN"
  | "DE"
  | "DK"
  | "GB"
  | "CA"
  | "AU"
  | "JP"
  | "AE"
  | string;

const AMAZON_DOMAINS: Record<string, string> = {
  US: "amazon.com",
  IN: "amazon.in",
  DE: "amazon.de",
  GB: "amazon.co.uk",
  CA: "amazon.ca",
  AU: "amazon.com.au",
  JP: "amazon.co.jp",
  AE: "amazon.ae"
};

const EBAY_DOMAINS: Record<string, string> = {
  US: "ebay.com",
  IN: "ebay.in",
  DE: "ebay.de",
  GB: "ebay.co.uk",
  CA: "ebay.ca",
  AU: "ebay.com.au"
};

/**
 * Some countries don't have their own Amazon and use a neighbor marketplace.
 * Example: Denmark (DK) typically uses amazon.de
 */
export function normalizeCountryForAmazon(country: CountryCode | undefined): CountryCode {
  if (!country) return "US";
  const upper = country.toUpperCase();

  // Special routing
  if (upper === "DK" || upper === "SE" || upper === "FI" || upper === "NO") {
    return "DE"; // route to Amazon Germany
  }

  return upper as CountryCode;
}

/**
 * Try to infer the user's country from the browser locale (client-side only).
 * Falls back to "US" if unknown.
 */
export function guessBrowserCountry(): CountryCode {
  if (typeof navigator === "undefined") return "US";

  const locale = navigator.language || (navigator as any).userLanguage || "en-US";
  const parts = locale.split("-");
  if (parts.length > 1) {
    return (parts[1] || "US").toUpperCase();
  }
  return "US";
}

/**
 * Get the best Amazon domain for a given country.
 */
export function getAmazonDomain(country: CountryCode | undefined): string {
  const normalized = normalizeCountryForAmazon(country);
  return AMAZON_DOMAINS[normalized] || AMAZON_DOMAINS["US"];
}

/**
 * Get the best eBay domain for a given country.
 */
export function getEbayDomain(country: CountryCode | undefined): string {
  const upper = (country || "US").toUpperCase();
  return EBAY_DOMAINS[upper] || EBAY_DOMAINS["US"];
}

/**
 * Build a region-aware product search URL for a given store.
 * - productName: name coming from Gemini (e.g. "LEGO Creator 3-in-1 Rocket")
 * - age: used to slightly bias search (optional)
 * - store: "amazon" | "ebay" | "other"
 * - country: ISO country code ("US", "IN", "DE", "DK", ...)
 */
export function buildStoreLink(params: {
  productName: string;
  age?: number;
  store: StoreKind;
  country?: CountryCode;
}): string {
  const { productName, age, store, country } = params;

  const queryParts = [productName.trim()];
  if (age) {
    queryParts.push(`gift for ${age} year old`);
  }

  const query = encodeURIComponent(queryParts.join(" "));

  if (store === "amazon") {
    const domain = getAmazonDomain(country);
    return `https://${domain}/s?k=${query}`;
  }

  if (store === "ebay") {
    const domain = getEbayDomain(country);
    return `https://${domain}/sch/i.html?_nkw=${query}`;
  }

  // "other" → fallback to Google Shopping search
  return `https://www.google.com/search?tbm=shop&q=${query}`;
}
