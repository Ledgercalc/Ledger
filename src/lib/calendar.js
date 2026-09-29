export const CALENDAR_PROXY_URL = "https://ledger-calendar-proxy.ledgercalc.workers.dev/calendar";

export const FMP_STORAGE_KEY = "fmp:econ-calendar:v1";

export const FMP_CACHE_MS = 12 * 60 * 60 * 1000;

// 12 hours — new estimates/actuals can post mid-month

export const ECON_KEYWORDS = /CPI|PPI|FOMC|NFP|GDP|non.?farm|interest rate|federal funds|unemployment|payroll|retail sales|PCE|core inflation|jobless/i;

export function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  return { from: fmtDate(from), to: fmtDate(to) };
}

export async function fetchEconomicCalendar() {
  if (!CALENDAR_PROXY_URL || CALENDAR_PROXY_URL.includes("yourname")) {
    throw new Error("Set CALENDAR_PROXY_URL to your deployed Worker URL first.");
  }

  const res = await fetch(CALENDAR_PROXY_URL);
  if (!res.ok) throw new Error(`Calendar request failed (${res.status})`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Unexpected response from the calendar proxy.");

  return json
    .filter((item) => item.country === "USD" && ECON_KEYWORDS.test(item.title || ""))
    .map((item) => ({
      id: `${item.title}-${item.date}`,
      name: item.title,
      date: item.date,
      impact: (item.impact || "").toLowerCase() || "medium",
      previous: item.previous,
      estimate: item.forecast,
      actual: item.actual,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export const SW_SCRIPT = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, event.data.options);
  }
});
`;

export async function registerAlarmServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const blob = new Blob([SW_SCRIPT], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const registration = await navigator.serviceWorker.register(url);
    return registration;
  } catch (err) {
    return null;
  }
}
