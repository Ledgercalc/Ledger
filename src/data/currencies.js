export const FX_RATES_PER_USD = {
  USD: 1,
  EUR: 0.8668,
  GBP: 0.7404,
  JPY: 159.45,
  INR: 95.42,
  BDT: 123.5,
  AUD: 1.4167,
  CAD: 1.3928,
  CHF: 0.8119,
  CNY: 6.7463,
  SGD: 1.2807,
  HKD: 7.8469,
  NZD: 1.7042,
  MYR: 4.0931,
  THB: 33.12,
  AED: 3.6725,
  SAR: 3.75,
  PKR: 277.48,
  PHP: 61.33,
  IDR: 16250,
  ZAR: 16.19,
  MXN: 17.06,
  ETB: 161,
  NGN: 1530,
};

export const FX_SNAPSHOT_LABEL = "Aug 2026";

export const FX_LIVE_STORAGE_KEY = "fx:live-rates:v1";

export const FX_CACHE_MS = 12 * 60 * 60 * 1000;

export const FX_API_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
];

export async function fetchLiveFxRates() {
  for (const url of FX_API_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !data.usd) continue;
      const rates = { USD: 1 };
      CURRENCY_CODES.forEach((code) => {
        const v = data.usd[code.toLowerCase()];
        if (typeof v === "number") rates[code] = v;
      });
      return { rates, date: data.date };
    } catch (err) {
      // try next mirror
    }
  }
  return null;
}

export const CURRENCY_NAMES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  INR: "Indian Rupee",
  BDT: "Bangladeshi Taka",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  NZD: "New Zealand Dollar",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  PKR: "Pakistani Rupee",
  PHP: "Philippine Peso",
  IDR: "Indonesian Rupiah",
  ZAR: "South African Rand",
  MXN: "Mexican Peso",
  ETB: "Ethiopian Birr",
  NGN: "Nigerian Naira",
};

export const CURRENCY_CODES = Object.keys(FX_RATES_PER_USD);
