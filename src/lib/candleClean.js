// Makes loaded candles look like a normal broker chart without inventing anything:
//  1. Tiny gaps: inside a continuous run of bars, a bar opens where the previous one closed (forex and metals trade
//     continuously Monday to Friday, so a "gap" between two consecutive bars is just a thin-market tick). Real
//     gaps (weekend, holiday, missing bars) are kept. Indices keep their session gaps.
//  2. Bad ticks: a wick that sticks out absurdly far (more than ~15x the typical candle range of that stretch, and
//     more than 0.4% of the price) is cut back. Normal news spikes are left alone.
// kind: "forex" | "metal" | "index"

export function polishCandles(list, tfMin, kind) {
  const n = list.length;
  if (n < 3) return list;
  const barSec = tfMin * 60;
  const out = list.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));

  if (kind === "forex" || kind === "metal") {
    for (let i = 1; i < n; i++) {
      const dt = out[i].time - out[i - 1].time;
      const continuous = tfMin >= 1440 ? dt <= 4 * 86400 : dt <= barSec * 1.5;
      if (!continuous) continue;
      const c = out[i];
      c.open = out[i - 1].close;
      if (c.open > c.high) c.high = c.open;
      if (c.open < c.low) c.low = c.open;
    }
  }

  const BLOCK = 400;
  for (let s = 0; s < n; s += BLOCK) {
    const e = Math.min(n, s + BLOCK);
    const ranges = [];
    for (let i = s; i < e; i++) ranges.push(out[i].high - out[i].low);
    ranges.sort((a, b) => a - b);
    const median = ranges[Math.floor(ranges.length / 2)];
    if (!(median > 0)) continue;
    for (let i = s; i < e; i++) {
      const c = out[i];
      const cap = Math.max(median * 15, c.close * 0.004);
      const top = Math.max(c.open, c.close);
      const bottom = Math.min(c.open, c.close);
      if (c.high - top > cap) c.high = top + cap;
      if (bottom - c.low > cap) c.low = bottom - cap;
    }
  }
  return out;
}

export function instrumentKind(symbol) {
  if (symbol === "XAUUSD" || symbol === "XAGUSD") return "metal";
  if (["US30", "NAS100", "SPX500", "GER40", "UK100", "JP225"].includes(symbol)) return "index";
  return "forex";
}
