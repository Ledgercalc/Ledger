// Multi-timeframe helpers for the multi-chart layout.
// Extra charts show the SAME replay as the main chart, just built from the candles you have already
// replayed, so a 4h chart next to a 15m chart never shows the future.

export const TF_MINUTES = [
  { id: "1m", label: "1m", min: 1 },
  { id: "5m", label: "5m", min: 5 },
  { id: "15m", label: "15m", min: 15 },
  { id: "30m", label: "30m", min: 30 },
  { id: "1h", label: "1h", min: 60 },
  { id: "4h", label: "4h", min: 240 },
  { id: "1d", label: "1D", min: 1440 },
];

// Typical spacing of the loaded candles, in minutes.
export function baseMinutes(list) {
  if (!list || list.length < 3) return 1;
  const diffs = [];
  for (let i = 1; i < Math.min(list.length, 40); i++) {
    const d = list[i].time - list[i - 1].time;
    if (d > 0) diffs.push(d);
  }
  diffs.sort((a, b) => a - b);
  const sec = diffs[Math.floor(diffs.length / 2)] || 60;
  return Math.max(1, Math.round(sec / 60));
}

export const bucketTime = (t, minutes) => {
  const size = minutes * 60;
  return Math.floor(t / size) * size;
};

// Build bigger candles out of smaller ones (UTC buckets). The last candle is the one still "forming".
export function aggregateCandles(list, minutes) {
  if (!list.length || !(minutes > 0)) return list;
  const out = [];
  let cur = null;
  for (const c of list) {
    const t = bucketTime(c.time, minutes);
    if (cur && cur.time === t) {
      if (c.high > cur.high) cur.high = c.high;
      if (c.low < cur.low) cur.low = c.low;
      cur.close = c.close;
    } else {
      cur = { time: t, open: c.open, high: c.high, low: c.low, close: c.close };
      out.push(cur);
    }
  }
  return out;
}
