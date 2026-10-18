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

const TF_SECONDS = { "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "1d": 86400 };

// Yahoo's free forex feed often reports each candle's open a few pips away from the previous close,
// which draws fake gap-up / gap-down candles. Real forex trades continuously Monday to Friday, so inside
// a continuous run of candles we set open = previous close. Genuine gaps (weekend, market closed, missing
// data) are left alone, and indices/metals are only sanity-checked because they do have real gaps.
export function cleanCandles(list, tfSec, isForex) {
  const sorted = list
    .filter((c) => [c.time, c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.close > 0)
    .sort((a, b) => a.time - b.time);
  const out = [];
  for (const c of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.time === c.time) continue;
    let { open, high, low, close } = c;
    if (isForex && prev) {
      const dt = c.time - prev.time;
      const continuous = tfSec >= 86400 ? dt <= 4 * 86400 : dt <= tfSec * 1.5;
      if (continuous) open = prev.close;
    }
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);
    out.push({ time: c.time, open, high, low, close });
  }
  // Tame bad-tick spikes: a wick far longer than the typical candle range is clipped.
  const ranges = out.map((c) => c.high - c.low).sort((a, b) => a - b);
  const median = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
  if (median > 0) {
    const cap = median * 8;
    for (const c of out) {
      const top = Math.max(c.open, c.close);
      const bottom = Math.min(c.open, c.close);
      if (c.high - top > cap) c.high = top + cap;
      if (bottom - c.low > cap) c.low = bottom - cap;
    }
  }
  return out;
}

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
  const inst = INSTRUMENTS.find((i) => i.id === symbol);
  list = cleanCandles(list, TF_SECONDS[wireTf] || 3600, !!inst && inst.group === "Forex");
  if (tf === "4h") list = resample(list, 240);
  return list;
}
