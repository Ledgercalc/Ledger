// Pure backtest maths. No React, no storage - easy to test.
// A position looks like: { side: "buy" | "sell", entry, sl, tp (or null), risk }
// Results are measured in R (multiples of the initial stop distance), then scaled by the
// dollar amount you chose to risk. That keeps it instrument-agnostic: no pip values needed.

export function calcR(pos, price) {
  const dist = pos.side === "buy" ? pos.entry - pos.sl : pos.sl - pos.entry;
  if (!(dist > 0)) return 0;
  const move = pos.side === "buy" ? price - pos.entry : pos.entry - price;
  return move / dist;
}

export function validateOrder({ side, entry, sl, tp, risk }) {
  if (!Number.isFinite(sl)) return "Set a stop loss first - R and P&L are measured from it.";
  if (!(risk > 0)) return "Risk per trade must be more than 0.";
  if (tp != null && !Number.isFinite(tp)) return "Take profit isn't a valid number.";
  if (side === "buy") {
    if (sl >= entry) return "For a buy, the stop loss has to be below the entry price.";
    if (tp != null && tp <= entry) return "For a buy, take profit has to be above the entry price.";
  } else {
    if (sl <= entry) return "For a sell, the stop loss has to be above the entry price.";
    if (tp != null && tp >= entry) return "For a sell, take profit has to be below the entry price.";
  }
  return "";
}

// Walk forward through candles that arrived after the position was last checked.
// If a single candle touches both SL and TP we can't know which came first, so we assume
// the stop was hit (the pessimistic choice). Gaps past a level fill at the open.
export function scanPosition(pos, bars) {
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (pos.side === "buy") {
      if (b.low <= pos.sl) return { closed: { price: b.open <= pos.sl ? b.open : pos.sl, reason: "sl", barOffset: i } };
      if (pos.tp != null && b.high >= pos.tp) return { closed: { price: b.open >= pos.tp ? b.open : pos.tp, reason: "tp", barOffset: i } };
    } else {
      if (b.high >= pos.sl) return { closed: { price: b.open >= pos.sl ? b.open : pos.sl, reason: "sl", barOffset: i } };
      if (pos.tp != null && b.low <= pos.tp) return { closed: { price: b.open <= pos.tp ? b.open : pos.tp, reason: "tp", barOffset: i } };
    }
  }
  return { closed: null };
}

export function summarize(trades) {
  const n = trades.length;
  if (!n) {
    return { count: 0, wins: 0, losses: 0, winRate: 0, totalR: 0, avgR: 0, totalPnl: 0, profitFactor: null, maxDrawdownR: 0, equity: [] };
  }
  let wins = 0;
  let losses = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let totalR = 0;
  let totalPnl = 0;
  let peak = 0;
  let maxDd = 0;
  const equity = [];
  trades.forEach((t, i) => {
    const r = Number(t.r) || 0;
    const pnl = Number(t.pnl) || 0;
    if (r > 0) { wins++; grossWin += r; } else if (r < 0) { losses++; grossLoss += -r; }
    totalR += r;
    totalPnl += pnl;
    peak = Math.max(peak, totalR);
    maxDd = Math.max(maxDd, peak - totalR);
    equity.push({ n: i + 1, pnl: Math.round(totalPnl * 100) / 100, r: Math.round(totalR * 100) / 100 });
  });
  return {
    count: n,
    wins,
    losses,
    winRate: (wins / n) * 100,
    totalR,
    avgR: totalR / n,
    totalPnl,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
    maxDrawdownR: maxDd,
    equity,
  };
}
