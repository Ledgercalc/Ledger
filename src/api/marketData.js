import { COMMUNITY_API_BASE } from "./community.js";
import { resample } from "../lib/candles.js";

// Keep this list in sync with MARKET_SYMBOLS in the worker (worker-market-candles.js).
export const INSTRUMENTS = [
  { id: "EURUSD", label: "EUR/USD", group: "Forex" },
  { id: "GBPUSD", label: "GBP/USD", group: "Forex" },
  { id: "USDJPY", label: "USD/JPY", group: "Forex" },
  { id: "AUDUSD", label: "AUD/USD", group: "Forex" },
  { id: "USDCAD", label: "USD/CAD", group: "Forex" },
  { id: "USDCHF", label: "USD/CHF", group: "Forex" },
  { id: "NZDUSD", label: "NZD/USD", group: "Forex" },
  { id: "EURJPY", label: "EUR/JPY", group: "Forex" },
  { id: "GBPJPY", label: "GBP/JPY", group: "Forex" },
  { id: "EURGBP", label: "EUR/GBP", group: "Forex" },
  { id: "XAUUSD", label: "Gold (XAU/USD)", group: "Metals" },
  { id: "XAGUSD", label: "Silver (XAG/USD)", group: "Metals" },
  { id: "US30", label: "US30 (Dow)", group: "Indices" },
  { id: "NAS100", label: "NAS100 (Nasdaq)", group: "Indices" },
  { id: "SPX500", label: "SPX500 (S&P)", group: "Indices" },
  { id: "GER40", label: "GER40 (DAX)", group: "Indices" },
  { id: "UK100", label: "UK100 (FTSE)", group: "Indices" },
  { id: "JP225", label: "JP225 (Nikkei)", group: "Indices" },
];

// range = roughly how much history the free source keeps for that timeframe.
export const TIMEFRAMES = [
  { id: "1m", label: "1m", range: "~7 days" },
  { id: "5m", label: "5m", range: "~60 days" },
  { id: "15m", label: "15m", range: "~60 days" },
  { id: "30m", label: "30m", range: "~60 days" },
  { id: "1h", label: "1h", range: "~2 years" },
  { id: "4h", label: "4h", range: "~2 years" },
  { id: "1d", label: "1D", range: "~10 years" },
];

export async function fetchCandles(symbol, tf) {
  const wireTf = tf === "4h" ? "1h" : tf;
  const url = `${COMMUNITY_API_BASE}/market/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(wireTf)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch (err) {
    throw new Error(err && err.name === "AbortError" ? "The data request timed out. Try again." : "Couldn't reach the data server. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  try {
    body = await res.json();
  } catch (err) {
    // handled below
  }
  if (!res.ok || !body || !Array.isArray(body.candles)) {
    throw new Error((body && body.error) || "No candles came back for that instrument and timeframe.");
  }
  let list = body.candles.map((c) => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
  if (tf === "4h") list = resample(list, 240);
  return list;
}
