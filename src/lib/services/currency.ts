// Real live exchange rates from Frankfurter (European Central Bank data),
// no API key required. Rates are yen-per-unit... no — rates are units-per-JPY
// (base=JPY), refreshed hourly via Next.js fetch caching.

export const CURRENCY_LIST = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "KRW",
  "INR",
  "PHP",
  "THB",
  "IDR",
  "AUD",
  "CAD",
  "SGD",
  "HKD",
] as const;

export type CurrencyCode = (typeof CURRENCY_LIST)[number] | "JPY";

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  JPY: "Japanese Yen",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  CNY: "Chinese Yuan",
  KRW: "South Korean Won",
  INR: "Indian Rupee",
  PHP: "Philippine Peso",
  THB: "Thai Baht",
  IDR: "Indonesian Rupiah",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
};

export interface JpyRates {
  base: "JPY";
  date: string;
  rates: Record<CurrencyCode, number>;
}

export async function getJpyRates(): Promise<JpyRates> {
  const symbols = CURRENCY_LIST.join(",");
  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=JPY&symbols=${symbols}`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) {
    throw new Error(`Frankfurter API responded with ${res.status}`);
  }

  const data = (await res.json()) as {
    date: string;
    rates: Record<string, number>;
  };

  return {
    base: "JPY",
    date: data.date,
    rates: { JPY: 1, ...data.rates } as Record<CurrencyCode, number>,
  };
}
