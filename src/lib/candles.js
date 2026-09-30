// Candle helpers: CSV import, resampling, price precision.
// A candle is { time (unix seconds, UTC), open, high, low, close }.

function normHeader(h) {
  return String(h).replace(/[<>"']/g, "").trim().toLowerCase().replace(/[\s.]+/g, "_");
}

function detectDelimiter(line) {
  const counts = { "\t": 0, ";": 0, ",": 0 };
  for (const ch of line) if (ch in counts) counts[ch]++;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

function splitLine(line, delim) {
  return line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
}

// Accepts unix seconds/ms, 2024-01-31 10:00[:00], 2024.01.31 10:00 (MT5),
// 31.01.2024 10:00:00.000 (Dukascopy) and ISO strings. Times without a timezone are treated as UTC.
export function parseTimeValue(raw) {
  const s = String(raw).trim().replace(/^"|"$/g, "");
  if (!s) return null;
  if (/^\d{8}$/.test(s)) {
    return Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)) / 1000);
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n >= 1e11) return Math.floor(n / 1000);
    if (n >= 1e8) return Math.floor(n);
    return null;
  }
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  let parts = null;
  if (m) {
    parts = { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), se: +(m[6] || 0), tz: m[7] };
  } else {
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/);
    if (m) parts = { y: +m[3], mo: +m[2], d: +m[1], h: +(m[4] || 0), mi: +(m[5] || 0), se: +(m[6] || 0), tz: null };
  }
  if (parts) {
    let ms = Date.UTC(parts.y, parts.mo - 1, parts.d, parts.h, parts.mi, parts.se);
    if (parts.tz && parts.tz.toUpperCase() !== "Z") {
      const sign = parts.tz[0] === "-" ? -1 : 1;
      const digits = parts.tz.slice(1).replace(":", "");
      ms -= sign * (+digits.slice(0, 2) * 60 + +digits.slice(2, 4)) * 60000;
    }
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export function parseCandlesCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("That file looks empty.");
  const delim = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delim);

  const headerless = first.length >= 5 && [1, 2, 3, 4].every((i) => Number.isFinite(Number(first[i])));
  let cols;
  let start = 1;
  if (headerless) {
    cols = { time: 0, open: 1, high: 2, low: 3, close: 4, dateSplit: null };
    start = 0;
  } else {
    const heads = first.map(normHeader);
    const find = (names) => heads.findIndex((h) => names.includes(h));
    const dateIdx = find(["date"]);
    const timeOnlyIdx = find(["time"]);
    const stampIdx = find(["datetime", "date_time", "timestamp", "gmt_time", "local_time", "utc", "time"]);
    cols = {
      time: stampIdx >= 0 ? stampIdx : dateIdx,
      open: find(["open", "o"]),
      high: find(["high", "h"]),
      low: find(["low", "l"]),
      close: find(["close", "c", "last"]),
      dateSplit: dateIdx >= 0 && timeOnlyIdx >= 0 && dateIdx !== timeOnlyIdx ? { date: dateIdx, time: timeOnlyIdx } : null,
    };
    if (cols.time < 0 || cols.open < 0 || cols.high < 0 || cols.low < 0 || cols.close < 0) {
      throw new Error("I couldn't find time, open, high, low and close columns. Check the header row.");
    }
  }

  const byTime = new Map();
  for (let i = start; i < lines.length; i++) {
    const c = splitLine(lines[i], delim);
    let raw = c[cols.time];
    if (cols.dateSplit) {
      const d = c[cols.dateSplit.date];
      const t = c[cols.dateSplit.time];
      raw = /^\d{1,2}:\d{2}/.test(t || "") ? `${d} ${t}` : d;
    }
    const time = parseTimeValue(raw);
    const o = Number(c[cols.open]);
    const h = Number(c[cols.high]);
    const l = Number(c[cols.low]);
    const cl = Number(c[cols.close]);
    if (time == null || ![o, h, l, cl].every(Number.isFinite)) continue;
    byTime.set(time, { time, open: o, high: Math.max(h, o, cl), low: Math.min(l, o, cl), close: cl });
  }
  const list = [...byTime.values()].sort((a, b) => a.time - b.time);
  if (list.length < 30) throw new Error("I could only read " + list.length + " valid candles. Need at least 30.");
  return list.length > 100000 ? list.slice(-100000) : list;
}

export function resample(list, minutes) {
  const step = minutes * 60;
  const out = [];
  let cur = null;
  for (const c of list) {
    const bucket = Math.floor(c.time / step) * step;
    if (!cur || cur.time !== bucket) {
      if (cur) out.push(cur);
      cur = { time: bucket, open: c.open, high: c.high, low: c.low, close: c.close };
    } else {
      cur.high = Math.max(cur.high, c.high);
      cur.low = Math.min(cur.low, c.low);
      cur.close = c.close;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function inferTfLabel(list) {
  const diffs = [];
  for (let i = 1; i < Math.min(list.length, 200); i++) diffs.push(list[i].time - list[i - 1].time);
  diffs.sort((a, b) => a - b);
  const sec = diffs[Math.floor(diffs.length / 2)] || 0;
  if (sec >= 86400) return "1d";
  if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return "csv";
}

// EURUSD-style prices need 5 decimals, JPY pairs 3, gold/indices 2.
export function precisionFor(price) {
  if (!Number.isFinite(price)) return 2;
  if (price < 20) return 5;
  if (price < 1000) return 3;
  return 2;
}
