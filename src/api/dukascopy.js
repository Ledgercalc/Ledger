import { COMMUNITY_API_BASE } from "./community.js";
import { lzmaDecode } from "../lib/lzma.js";
import { clearSymbol, getRange, listDays, listVolumeDays, putDay } from "../lib/candleStore.js";
import { instrumentKind, polishCandles } from "../lib/candleClean.js";
import { buildFlow, getFlowRange, listFlowDays, putFlowDay } from "../lib/flowStore.js";

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
    const vol = (dv.getFloat32(o + 12) || 0) + (dv.getFloat32(o + 16) || 0);
    if (cur && cur.time === m) {
      if (bid > cur.high) cur.high = bid;
      if (bid < cur.low) cur.low = bid;
      cur.close = bid;
      cur.volume += vol;
    } else {
      cur = { time: m, open: bid, high: bid, low: bid, close: bid, volume: vol };
      out.push(cur);
    }
  }
  return out;
}

// ---- polite, patient downloading (long ranges mean thousands of requests) ----
export const tuning = { baseDelay: 50, maxDelay: 1500, backoff: 700, maxAttempts: 6, retryPause: 3000, cooldown: 45000, maxPauses: 6 };
const jitter = () => Math.random() * 400;

function makeLimiter() {
  let nextAt = 0;
  let delay = tuning.baseDelay;
  return {
    async wait() {
      const now = Date.now();
      const at = Math.max(now, nextAt);
      nextAt = at + delay;
      if (at > now) await sleep(at - now);
    },
    slower() {
      delay = Math.min(tuning.maxDelay, delay * 1.6);
    },
    faster() {
      delay = Math.max(tuning.baseDelay, delay * 0.7); // recover quickly after a hiccup
    },
  };
}

// kind "m1" = the day's ready-made 1-minute candle file, "t" = one hour of ticks.
async function fetchHour(id, y, m0, d, h, signal, kind, ctx) {
  const url = `${COMMUNITY_API_BASE}/market/duka-raw?s=${encodeURIComponent(id)}&y=${y}&m=${m0}&d=${d}&h=${h}&k=${kind}`;
  let lastErr = null;
  for (let attempt = 0; attempt < tuning.maxAttempts; attempt++) {
    if (ctx.halted()) throw Object.assign(new Error("Stopped."), { halted: true });
    try {
      await ctx.limiter.wait();
      const res = await fetch(url, { signal });
      if (res.status === 204) {
        ctx.limiter.faster();
        return null; // no data for that day/hour
      }
      if (res.status === 404) {
        throw Object.assign(new Error("Your Worker doesn't have the Dukascopy route yet. Replace worker.js with the new one, deploy it, then try again."), { fatal: true });
      }
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        ctx.limiter.faster();
        return buf.length ? buf : null;
      }
      let detail = "";
      try {
        const j = await res.json();
        detail = (j && j.error) || "";
      } catch (e) {
        // no readable body
      }
      const refused = /answered (401|403|451|429)/.test(detail) || res.status === 429;
      lastErr = Object.assign(
        new Error(refused ? `Dukascopy is refusing requests right now (${(detail.match(/\d{3}/) || [res.status])[0]}).` : detail || `The data server answered ${res.status}.`),
        { refused }
      );
      if (res.status < 500 && res.status !== 429 && !refused) throw Object.assign(lastErr, { fatal: true });
    } catch (err) {
      if (signal && signal.aborted) throw err;
      if (err && (err.fatal || err.halted)) throw err;
      lastErr = err instanceof TypeError ? new Error("Couldn't reach your data server. Check that your Worker is deployed and that you're online.") : err;
    }
    ctx.limiter.slower();
    const wait = Math.min(30000, tuning.backoff * 2 ** attempt) + jitter();
    ctx.note(`Dukascopy is slow to answer, waiting ${Math.round(wait / 1000)}s and trying again...`);
    await sleep(wait);
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
    out.push({ time: dayStartSec + dv.getUint32(o), open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, volume: vol > 0 ? vol : 0 });
  }
  return out;
}

function toFlat(candles) {
  const flat = new Float64Array(candles.length * 6);
  candles.forEach((c, i) => {
    flat[i * 6] = c.time;
    flat[i * 6 + 1] = c.open;
    flat[i * 6 + 2] = c.high;
    flat[i * 6 + 3] = c.low;
    flat[i * 6 + 4] = c.close;
    flat[i * 6 + 5] = c.volume || 0;
  });
  return flat;
}

async function downloadDay(id, info, day, signal, ctx) {
  const base = dayStart(day);
  const dt0 = new Date(base);
  const fast = await fetchHour(id, dt0.getUTCFullYear(), dt0.getUTCMonth(), dt0.getUTCDate(), 0, signal, "m1", ctx);
  if (fast) {
    const candles = candleFileToMinutes(lzmaDecode(fast), base / 1000, info);
    return { flat: toFlat(candles), bytes: fast.length, count: candles.length, viaTicks: false };
  }
  // No ready-made file for this day. A holiday or two is normal; a long run of weekdays means Dukascopy
  // doesn't publish minute files for that period, and rebuilding every hour from ticks would be far too slow.
  const dow = dt0.getUTCDay();
  if (dow !== 0 && dow !== 6 && ctx.noFileStreak() >= 2) {
    throw Object.assign(new Error(`Dukascopy has no ready-made 1-minute files around ${day}. Try dates after that, or import a CSV for older history.`), { fatal: true });
  }
  const res = await downloadDayFromTicks(id, info, day, signal, ctx);
  return { ...res, viaTicks: true };
}

async function downloadDayFromTicks(id, info, day, signal, ctx) {
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
      const buf = await fetchHour(id, dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), h, signal, "t", ctx);
      if (buf) {
        bytes += buf.length;
        results[i] = ticksToMinutes(lzmaDecode(buf), base / 1000 + h * 3600, info);
      } else results[i] = [];
      await sleep(0); // let the page breathe between hours
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, hours.length) }, lane));
  const candles = results.flat().filter(Boolean);
  return { flat: toFlat(candles), bytes, count: candles.length };
}

export function daysBetween(fromDay, toDay) {
  const out = [];
  for (let t = dayStart(fromDay); t <= dayStart(toDay); t += 86400000) out.push(dayString(t));
  return out;
}

// Downloads (and stores) every missing day in the range. Days already stored are skipped, so you can stop and
// carry on later. Today's day is always refreshed.
// Long ranges are paced and retried patiently. If Dukascopy starts limiting requests, the download pauses, waits and
// carries on by itself (several times) instead of giving up. Days that still fail are listed in the result.
// onProgress({ done, total, day, bytes, note }). Returns { downloaded, bytes, failed: [{ day, message }], stoppedEarly }.
export async function downloadDukascopy({ symbol, fromDay, toDay, onProgress, signal, concurrency = 6 }) {
  const info = DUKA[symbol];
  if (!info) throw new Error("That instrument isn't available from Dukascopy.");
  const stored = new Set(await listVolumeDays(symbol));
  const today = dayString(Date.now());
  const todo = daysBetween(fromDay, toDay).filter((d) => new Date(dayStart(d)).getUTCDay() !== 6 && d <= today && (!stored.has(d) || d === today));
  const state = { done: 0, total: todo.length, day: "", bytes: 0, note: "" };
  const emit = () => onProgress && onProgress({ ...state });
  let halt = false;
  let noFile = 0;
  let consecutiveFails = 0;
  let fatalErr = null;
  let failed = [];
  let pending = todo.slice();
  const ctx = {
    limiter: makeLimiter(),
    halted: () => halt,
    noFileStreak: () => noFile,
    note: (t) => {
      state.note = t;
      emit();
    },
  };
  emit();

  const lane = async () => {
    while (!halt) {
      if (signal && signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const day = pending.shift();
      if (!day) return;
      try {
        const res = await downloadDay(info.code, info, day, signal, ctx);
        await putDay(symbol, day, res.flat);
        noFile = res.viaTicks ? noFile + 1 : 0;
        consecutiveFails = 0;
        state.done++;
        state.bytes += res.bytes;
        state.day = day;
        state.note = "";
        emit();
      } catch (err) {
        if (signal && signal.aborted) throw err;
        if (err && err.halted) {
          pending.unshift(day);
          return;
        }
        if (err && err.fatal) {
          fatalErr = fatalErr || err;
          halt = true;
          return;
        }
        failed.push({ day, message: (err && err.message) || "Failed" });
        consecutiveFails++;
        if (consecutiveFails >= 6) halt = true; // looks like Dukascopy is limiting us: pause below
      }
    }
  };

  let pauses = 0;
  for (;;) {
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, pending.length)) }, lane));
    if (signal && signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (fatalErr) throw fatalErr;
    if (!halt) break;
    // Nothing has ever worked -> they are blocking us, don't wait around. Otherwise it's rate limiting: wait and go on.
    if (state.done === 0 || pauses >= tuning.maxPauses) break;
    pauses++;
    const secs = Math.round(tuning.cooldown / 1000);
    ctx.note(`Dukascopy is limiting requests. Pausing ${secs}s, then carrying on (${pauses}/${tuning.maxPauses})...`);
    await sleep(tuning.cooldown);
    pending = [...failed.splice(0).map((f) => f.day), ...pending];
    halt = false;
    consecutiveFails = 0;
    state.note = "";
  }
  const stoppedEarly = halt;
  // one more patient pass over a few stragglers
  if (!stoppedEarly && failed.length && failed.length < 6) {
    ctx.note("Retrying a few days that failed...");
    await sleep(tuning.retryPause);
    const again = failed.splice(0);
    for (const f of again) {
      try {
        const res = await downloadDay(info.code, info, f.day, signal, ctx);
        await putDay(symbol, f.day, res.flat);
        state.done++;
        state.bytes += res.bytes;
        emit();
      } catch (err) {
        if (signal && signal.aborted) throw err;
        failed.push({ day: f.day, message: (err && err.message) || "Failed" });
      }
    }
  }
  if (stoppedEarly) failed = [...failed, ...pending.map((d) => ({ day: d, message: "Not fetched yet" }))];
  return { downloaded: state.done, bytes: state.bytes, failed, stoppedEarly };
}

export async function clearSaved(symbol) {
  await clearSymbol(symbol);
}

// Days saved with volume data (complete). Days saved by an older version (no volume) are refreshed on the next Load.
export async function storedDays(symbol) {
  return new Set(await listVolumeDays(symbol));
}

export async function storedDayCounts(symbol) {
  const [all, vol] = await Promise.all([listDays(symbol), listVolumeDays(symbol)]);
  return { all: all.length, withVolume: vol.length, needRefresh: all.length - vol.length };
}

export async function storedSummary(symbol) {
  const days = await listDays(symbol);
  return { count: days.length, first: days[0] || "", last: days[days.length - 1] || "" };
}

// Build the candles for the chart from what is stored, at the timeframe you picked. Bigger timeframes are built
// straight from the stored minutes (no huge intermediate list), so multi-year ranges stay light on memory.
export async function loadDukascopy({ symbol, fromDay, toDay, tf, clean = true }) {
  const chunks = await getRange(symbol, fromDay, toDay);
  const minutes = TF_MIN[tf] || 1;
  const size = minutes * 60;
  const list = [];
  let cur = null;
  for (const { flat: f, stride } of chunks) {
    for (let i = 0; i < f.length; i += stride) {
      const t = f[i];
      const vol = stride > 5 ? f[i + 5] : 0;
      if (minutes === 1) {
        list.push({ time: t, open: f[i + 1], high: f[i + 2], low: f[i + 3], close: f[i + 4], volume: vol });
        continue;
      }
      const bucket = Math.floor(t / size) * size;
      if (cur && cur.time === bucket) {
        if (f[i + 2] > cur.high) cur.high = f[i + 2];
        if (f[i + 3] < cur.low) cur.low = f[i + 3];
        cur.close = f[i + 4];
        cur.volume += vol;
      } else {
        cur = { time: bucket, open: f[i + 1], high: f[i + 2], low: f[i + 3], close: f[i + 4], volume: vol };
        list.push(cur);
      }
    }
  }
  const out = clean ? polishCandles(list, minutes, instrumentKind(symbol), true) : list;
  // Keep the raw minutes next to a bigger-timeframe chart: the volume profile is calculated from them (far more
  // accurate than spreading one 1h or 4h candle over its whole range). Compact typed arrays keep memory small.
  if (minutes > 1) {
    let total = 0;
    for (const { flat, stride } of chunks) total += Math.floor(flat.length / stride);
    const m1 = { n: total, time: new Uint32Array(total), low: new Float32Array(total), high: new Float32Array(total), vol: new Float32Array(total), up: new Uint8Array(total), hasVol: false };
    let k = 0;
    for (const { flat: f, stride } of chunks) {
      for (let i = 0; i < f.length; i += stride) {
        const v = stride > 5 ? f[i + 5] : 0;
        m1.time[k] = f[i];
        m1.low[k] = f[i + 3];
        m1.high[k] = f[i + 2];
        m1.vol[k] = v;
        m1.up[k] = f[i + 4] >= f[i + 1] ? 1 : 0;
        if (v > 0) m1.hasVol = true;
        k++;
      }
    }
    out.m1 = m1;
  }
  return out;
}

// ======================================================================================================
// ORDER FLOW from Dukascopy's tick files (volume + delta)
// ======================================================================================================
// Spot forex and gold have no public trade tape, and Dukascopy's bid/ask "volume" is the size quoted, not traded.
// So the footprint is built from the ticks themselves:
//   volume = number of ticks at each price level (what ATAS / TradingView show for spot gold and forex)
//   delta  = buy ticks - sell ticks, decided from the quote move: ask rising = buyers lifting (counted at the ask),
//            bid falling = sellers hitting (counted at the bid). Quote changes that say neither count half and half.
// Cleaning: crossed quotes, repeated identical quotes and lone price spikes are dropped.

// Size of one price level (1 pip on most forex pairs). The chart can merge levels into bigger rows, never smaller.
export const FLOW_STEP = {
  EURUSD: 0.0001, GBPUSD: 0.0001, USDJPY: 0.01, AUDUSD: 0.0001, USDCAD: 0.0001, USDCHF: 0.0001, NZDUSD: 0.0001,
  EURJPY: 0.01, GBPJPY: 0.01, EURGBP: 0.0001, XAUUSD: 0.1, XAGUSD: 0.01,
  US30: 1, NAS100: 1, SPX500: 0.5, GER40: 1, UK100: 1, JP225: 5,
};

export const hasOrderFlow = (symbol) => !!(DUKA[symbol] && FLOW_STEP[symbol]);

function newFlowState() {
  return { minute: -1, cur: new Map(), out: [], pa: 0, pb: 0, bad: 0 };
}

function flushMinute(st) {
  for (const [lvl, v] of st.cur) st.out.push(st.minute, lvl, v[0], v[1]);
  st.cur.clear();
}

const SPIKE = 0.005; // a jump bigger than 0.5% between two ticks is held back unless it sticks for 3 ticks

// One hour of decompressed ticks -> adds to st.out. Hours must be fed in time order.
function ticksToFlow(raw, hourStartSec, info, step, st) {
  const n = Math.floor(raw.length / 20);
  if (!n) return;
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const sample = [];
  const sstep = Math.max(1, Math.floor(n / 101));
  for (let i = 0; i < n; i += sstep) sample.push(dv.getUint32(i * 20 + 8));
  sample.sort((a, b) => a - b);
  const div = pickDivisor(sample[Math.floor(sample.length / 2)], info);
  if (!div) throw new Error("Prices from Dukascopy didn't look right for this instrument.");
  const add = (lvl, b, s) => {
    const v = st.cur.get(lvl);
    if (v) {
      v[0] += b;
      v[1] += s;
    } else st.cur.set(lvl, [b, s]);
  };
  for (let i = 0; i < n; i++) {
    const o = i * 20;
    const ask = dv.getUint32(o + 4);
    const bid = dv.getUint32(o + 8);
    if (!(bid > 0) || ask < bid) continue; // empty or crossed quote
    if (st.pa && ask === st.pa && bid === st.pb) continue; // same quote repeated (volume-only update)
    if (st.pa) {
      const jump = Math.abs(bid - st.pb) / st.pb;
      if (jump > SPIKE && ++st.bad < 3) continue; // lone spike: skip it (a real gap sticks and is accepted)
    }
    st.bad = 0;
    const t = hourStartSec + Math.floor(dv.getUint32(o) / 1000);
    const m = t - (t % 60);
    if (m !== st.minute) {
      flushMinute(st);
      st.minute = m;
    }
    const dA = st.pa ? ask - st.pa : 0;
    const dB = st.pa ? bid - st.pb : 0;
    st.pa = ask;
    st.pb = bid;
    const askLvl = Math.round(ask / div / step);
    const bidLvl = Math.round(bid / div / step);
    if (dA > 0 && dB >= 0) add(askLvl, 1, 0); // buyers lifting the offer
    else if (dB < 0 && dA <= 0) add(bidLvl, 0, 1); // sellers hitting the bid
    else if (dA > 0 && dB > 0) add(askLvl, 1, 0);
    else add(bidLvl, 0.5, 0.5); // spread change / quote improved: busy, but no side
  }
}

async function downloadFlowDay(symbol, info, day, signal, ctx) {
  const base = dayStart(day);
  const dow = new Date(base).getUTCDay();
  const hours = [];
  for (let h = 0; h < 24; h++) {
    if (dow === 6) break; // Saturday: market closed
    if (dow === 0 && h < 20) continue; // Sunday: opens in the evening
    if (base + h * 3600000 > Date.now() - 30 * 60000) continue; // hours that haven't finished yet
    hours.push(h);
  }
  const raws = new Array(hours.length);
  let next = 0;
  let bytes = 0;
  const lane = async () => {
    while (next < hours.length) {
      const i = next++;
      const dt = new Date(base);
      const buf = await fetchHour(info.code, dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), hours[i], signal, "t", ctx);
      if (buf) {
        bytes += buf.length;
        raws[i] = lzmaDecode(buf);
      }
      await sleep(0);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, hours.length) }, lane));
  const st = newFlowState();
  const step = FLOW_STEP[symbol];
  hours.forEach((h, i) => {
    if (raws[i]) ticksToFlow(raws[i], base / 1000 + h * 3600, info, step, st);
  });
  flushMinute(st);
  return { flat: Float64Array.from(st.out), bytes };
}

// Downloads the ticks of the given UTC days (e.g. ["2024-03-04", ...]) and stores the volume footprint. Days already
// stored are skipped. Same patience as the candle download. onProgress({ done, total, day, note }).
// Returns { downloaded, failed: [{ day, message }], stoppedEarly }.
export async function downloadOrderFlow({ symbol, days, onProgress, signal }) {
  const info = DUKA[symbol];
  if (!info || !FLOW_STEP[symbol]) throw new Error("The volume footprint isn't available for that instrument.");
  const have = new Set(await listFlowDays(symbol));
  const today = dayString(Date.now());
  const todo = days.filter((d) => d <= today && (!have.has(d) || d === today));
  const state = { done: 0, total: todo.length, day: "", note: "" };
  const emit = () => onProgress && onProgress({ ...state });
  const ctx = {
    limiter: makeLimiter(),
    halted: () => false,
    note: (t) => {
      state.note = t;
      emit();
    },
  };
  const failed = [];
  let consecutive = 0;
  let stoppedEarly = false;
  emit();
  for (const day of todo) {
    if (signal && signal.aborted) throw new DOMException("Cancelled", "AbortError");
    try {
      const res = await downloadFlowDay(symbol, info, day, signal, ctx);
      await putFlowDay(symbol, day, FLOW_STEP[symbol], res.flat);
      consecutive = 0;
      state.done++;
      state.day = day;
      state.note = "";
      emit();
    } catch (err) {
      if (signal && signal.aborted) throw err;
      if (err && err.fatal) throw err;
      failed.push({ day, message: (err && err.message) || "Failed" });
      if (++consecutive >= 3) {
        stoppedEarly = true;
        break;
      }
    }
  }
  return { downloaded: state.done, failed, stoppedEarly };
}

// Stored footprint data for a symbol and date range, joined into one object for the chart (or null when nothing is stored).
export async function loadOrderFlow({ symbol, fromDay, toDay }) {
  if (!hasOrderFlow(symbol)) return null;
  const rows = await getFlowRange(symbol, fromDay, toDay);
  return buildFlow(rows.filter((r) => r.flat && r.flat.length));
}

export async function storedFlowDays(symbol) {
  return new Set(await listFlowDays(symbol));
}
