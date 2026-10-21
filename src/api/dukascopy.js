import { COMMUNITY_API_BASE } from "./community.js";
import { lzmaDecode } from "../lib/lzma.js";
import { getRange, listDays, putDay } from "../lib/candleStore.js";
import { resample } from "../lib/candles.js";

// Full history from Dukascopy's free public datafeed, served to the browser through your Worker's
// /market/duka-raw (the browser isn't allowed to read Dukascopy directly).
// Fast path: Dukascopy publishes ready-made 1-minute BID candles, one small file per UTC day (24-byte records).
// Fallback: if a day's candle file is missing, the app builds the candles from that day's 24 hourly tick files.
// Everything is kept in the browser (IndexedDB), and any timeframe is built from the 1-minute candles.
// "range" is the sane price range for the instrument over its whole history; it picks the right price scale
// (Dukascopy stores prices as integers: 1e5 for most forex, 1e3 for JPY pairs, gold, indices...).

export const DUKA = {
  EURUSD: { code: "EURUSD", min: 0.8, max: 1.7 },
  GBPUSD: { code: "GBPUSD", min: 1.0, max: 2.2 },
  USDJPY: { code: "USDJPY", min: 70, max: 180 },
  AUDUSD: { code: "AUDUSD", min: 0.45, max: 1.2 },
  USDCAD: { code: "USDCAD", min: 0.9, max: 1.7 },
  USDCHF: { code: "USDCHF", min: 0.6, max: 1.8 },
  NZDUSD: { code: "NZDUSD", min: 0.4, max: 1.0 },
  EURJPY: { code: "EURJPY", min: 90, max: 200 },
  GBPJPY: { code: "GBPJPY", min: 120, max: 260 },
  EURGBP: { code: "EURGBP", min: 0.5, max: 1.1 },
  XAUUSD: { code: "XAUUSD", min: 250, max: 8000 },
  XAGUSD: { code: "XAGUSD", min: 3, max: 120 },
  US30: { code: "USA30IDXUSD", min: 5000, max: 70000 },
  NAS100: { code: "USATECHIDXUSD", min: 700, max: 40000 },
  SPX500: { code: "USA500IDXUSD", min: 500, max: 10000 },
  GER40: { code: "DEUIDXEUR", min: 1500, max: 32000 },
  UK100: { code: "GBRIDXGBP", min: 3000, max: 12000 },
  JP225: { code: "JPNIDXJPY", min: 6000, max: 60000 },
};

const TF_MIN = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440 };
const DIVISORS = [1e5, 1e3, 1e2, 10, 1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, "0");
export const dayString = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const dayStart = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

function pickDivisor(rawMedian, info) {
  for (const d of DIVISORS) {
    const v = rawMedian / d;
    if (v >= info.min && v <= info.max) return d;
  }
  return null;
}

// Decompressed tick bytes for ONE hour -> 1-minute candles (bid price). Returns [] for an empty hour.
export function ticksToMinutes(raw, hourStartSec, info) {
  const n = Math.floor(raw.length / 20);
  if (!n) return [];
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const sample = [];
  const step = Math.max(1, Math.floor(n / 101));
  for (let i = 0; i < n; i += step) sample.push(dv.getUint32(i * 20 + 8));
  sample.sort((a, b) => a - b);
  const div = pickDivisor(sample[Math.floor(sample.length / 2)], info);
  if (!div) throw new Error("Prices from Dukascopy didn't look right for this instrument.");
  const out = [];
  let cur = null;
  for (let i = 0; i < n; i++) {
    const o = i * 20;
    const bid = dv.getUint32(o + 8) / div;
    if (!(bid > 0)) continue;
    const t = hourStartSec + Math.floor(dv.getUint32(o) / 1000);
    const m = t - (t % 60);
    if (cur && cur.time === m) {
      if (bid > cur.high) cur.high = bid;
      if (bid < cur.low) cur.low = bid;
      cur.close = bid;
    } else {
      cur = { time: m, open: bid, high: bid, low: bid, close: bid };
      out.push(cur);
    }
  }
  return out;
}

async function fetchHour(id, y, m0, d, h, signal, kind = "t") {
  const url = `${COMMUNITY_API_BASE}/market/duka-raw?s=${encodeURIComponent(id)}&y=${y}&m=${m0}&d=${d}&h=${h}&k=${kind}`;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.status === 204 || res.status === 404) return null;
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        return buf.length ? buf : null;
      }
      lastErr = new Error(`The data server answered ${res.status}.`);
      if (res.status < 500 && res.status !== 429) throw lastErr;
    } catch (err) {
      if (signal && signal.aborted) throw err;
      lastErr = err;
    }
    await sleep(700 * 2 ** attempt);
  }
  throw lastErr || new Error("Download failed.");
}

// A day's ready-made candle file (decompressed): 24-byte big-endian records
// [seconds since 00:00 UTC, open, close, low, high (integers), volume (float32)].
export function candleFileToMinutes(raw, dayStartSec, info) {
  const n = Math.floor(raw.length / 24);
  if (!n) return [];
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const sample = [];
  const step = Math.max(1, Math.floor(n / 101));
  for (let i = 0; i < n; i += step) sample.push(dv.getUint32(i * 24 + 4));
  sample.sort((a, b) => a - b);
  const div = pickDivisor(sample[Math.floor(sample.length / 2)], info);
  if (!div) throw new Error("Prices from Dukascopy didn't look right for this instrument.");
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * 24;
    const open = dv.getUint32(o + 4) / div;
    const close = dv.getUint32(o + 8) / div;
    const low = dv.getUint32(o + 12) / div;
    const high = dv.getUint32(o + 16) / div;
    const vol = dv.getFloat32(o + 20);
    if (!(open > 0) || (vol === 0 && high === low)) continue; // padding minutes without any trades
    out.push({ time: dayStartSec + dv.getUint32(o), open, high: Math.max(high, open, close), low: Math.min(low, open, close), close });
  }
  return out;
}

function toFlat(candles) {
  const flat = new Float64Array(candles.length * 5);
  candles.forEach((c, i) => {
    flat[i * 5] = c.time;
    flat[i * 5 + 1] = c.open;
    flat[i * 5 + 2] = c.high;
    flat[i * 5 + 3] = c.low;
    flat[i * 5 + 4] = c.close;
  });
  return flat;
}

async function downloadDay(id, info, day, signal, concurrency) {
  const base = dayStart(day);
  const dt0 = new Date(base);
  const fast = await fetchHour(id, dt0.getUTCFullYear(), dt0.getUTCMonth(), dt0.getUTCDate(), 0, signal, "m1");
  if (fast) {
    const candles = candleFileToMinutes(lzmaDecode(fast), base / 1000, info);
    return { flat: toFlat(candles), bytes: fast.length, count: candles.length };
  }
  return downloadDayFromTicks(id, info, day, signal, concurrency);
}

async function downloadDayFromTicks(id, info, day, signal, concurrency) {
  const base = dayStart(day);
  const dow = new Date(base).getUTCDay();
  const hours = [];
  for (let h = 0; h < 24; h++) {
    if (dow === 6) break; // Saturday: market closed
    if (dow === 0 && h < 20) continue; // Sunday: opens in the evening
    if (base + h * 3600000 > Date.now() - 30 * 60000) continue; // hours that haven't finished yet
    hours.push(h);
  }
  const results = new Array(hours.length);
  let next = 0;
  let bytes = 0;
  const lane = async () => {
    while (next < hours.length) {
      const i = next++;
      const h = hours[i];
      const dt = new Date(base);
      const buf = await fetchHour(id, dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), h, signal);
      if (buf) {
        bytes += buf.length;
        results[i] = ticksToMinutes(lzmaDecode(buf), base / 1000 + h * 3600, info);
      } else results[i] = [];
      await sleep(0); // let the page breathe between hours
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, hours.length) }, lane));
  const candles = results.flat().filter(Boolean);
  return { flat: toFlat(candles), bytes, count: candles.length };
}

export function daysBetween(fromDay, toDay) {
  const out = [];
  for (let t = dayStart(fromDay); t <= dayStart(toDay); t += 86400000) out.push(dayString(t));
  return out;
}

// Downloads (and stores) every missing day in the range. Days already stored are skipped, so you can stop and
// carry on later. Today's day is always refreshed. onProgress({ done, total, day, bytes }).
export async function downloadDukascopy({ symbol, fromDay, toDay, onProgress, signal, concurrency = 4 }) {
  const info = DUKA[symbol];
  if (!info) throw new Error("That instrument isn't available from Dukascopy.");
  const stored = new Set(await listDays(symbol));
  const today = dayString(Date.now());
  const todo = daysBetween(fromDay, toDay).filter((d) => new Date(dayStart(d)).getUTCDay() !== 6 && d <= today && (!stored.has(d) || d === today));
  let done = 0;
  let bytes = 0;
  if (onProgress) onProgress({ done, total: todo.length, day: "", bytes });
  let next = 0;
  const lane = async () => {
    while (next < todo.length) {
      if (signal && signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const day = todo[next++];
      const res = await downloadDay(info.code, info, day, signal, 2);
      await putDay(symbol, day, res.flat);
      done++;
      bytes += res.bytes;
      if (onProgress) onProgress({ done, total: todo.length, day, bytes });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, lane));
  return { downloaded: todo.length, bytes };
}

export async function storedDays(symbol) {
  return new Set(await listDays(symbol));
}

export async function storedSummary(symbol) {
  const days = await listDays(symbol);
  return { count: days.length, first: days[0] || "", last: days[days.length - 1] || "" };
}

// Build the candles for the chart from what is stored, at the timeframe you picked.
export async function loadDukascopy({ symbol, fromDay, toDay, tf }) {
  const chunks = await getRange(symbol, fromDay, toDay);
  let total = 0;
  chunks.forEach((c) => {
    total += c.length / 5;
  });
  const list = new Array(total);
  let k = 0;
  for (const f of chunks) {
    for (let i = 0; i < f.length; i += 5) list[k++] = { time: f[i], open: f[i + 1], high: f[i + 2], low: f[i + 3], close: f[i + 4] };
  }
  const minutes = TF_MIN[tf] || 1;
  return minutes === 1 ? list : resample(list, minutes);
}
