// Insight analytics that read ONLY from logged trades (no Journal sheet needed).
// Every trade can carry: pnl, pair, note, setup, emotion, session, confidence (1-10), ts.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CONFIDENCE_MIN = 1;
export const CONFIDENCE_MAX = 10;

// Meter value -> plain word. Used for chips, CSV and the legacy sheet bridge.
export const confidenceWord = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n <= 3 ? "Low" : n <= 7 ? "Medium" : "High";
};

// Confidence buckets used in Insights.
export const CONFIDENCE_BUCKETS = [
  { id: "low", label: "Low (1-3)", min: 1, max: 3 },
  { id: "mid", label: "Medium (4-7)", min: 4, max: 7 },
  { id: "high", label: "High (8-10)", min: 8, max: 10 },
];

const blank = () => ({ count: 0, wins: 0, losses: 0, pnl: 0, grossWin: 0, grossLoss: 0 });

function add(acc, t) {
  acc.count += 1;
  acc.pnl += t.pnl;
  if (t.pnl > 0) {
    acc.wins += 1;
    acc.grossWin += t.pnl;
  } else if (t.pnl < 0) {
    acc.losses += 1;
    acc.grossLoss += Math.abs(t.pnl);
  }
}

function finish(id, label, acc, extra = {}) {
  const decided = acc.wins + acc.losses;
  return {
    id,
    label,
    ...extra,
    count: acc.count,
    pnl: acc.pnl,
    wins: acc.wins,
    losses: acc.losses,
    winRate: decided > 0 ? (acc.wins / decided) * 100 : 0,
    avg: acc.count > 0 ? acc.pnl / acc.count : 0,
    profitFactor: acc.grossLoss > 0 ? acc.grossWin / acc.grossLoss : acc.grossWin > 0 ? Infinity : 0,
  };
}

// Generic "group trades by a key and score each group".
export function groupTrades(trades, keyFn, labelFn = (k) => k, extraFn = () => ({})) {
  const map = new Map();
  trades.forEach((t) => {
    const k = keyFn(t);
    if (k === null || k === undefined || k === "") return;
    if (!map.has(k)) map.set(k, blank());
    add(map.get(k), t);
  });
  return [...map.entries()]
    .map(([k, acc]) => finish(k, labelFn(k), acc, extraFn(k)))
    .sort((a, b) => b.pnl - a.pnl);
}

export const bySetup = (trades, labelOf) => groupTrades(trades, (t) => t.setup, (k) => labelOf(k) || k);

export const bySession = (trades, labelOf) => groupTrades(trades, (t) => t.session, (k) => labelOf(k) || k);

export const byMood = (trades, metaOf) =>
  groupTrades(
    trades,
    (t) => t.emotion,
    (k) => metaOf(k)?.label || k,
    (k) => ({ emoji: metaOf(k)?.emoji || "" })
  );

export const DIRECTIONS = [
  { id: "up", label: "Up (buy)" },
  { id: "down", label: "Down (sell)" },
];

export const byDirection = (trades) =>
  groupTrades(trades, (t) => t.direction, (k) => DIRECTIONS.find((d) => d.id === k)?.label || k);

export const byPair = (trades) => groupTrades(trades, (t) => (t.pair || "").trim().toUpperCase());

export const byWeekday = (trades) => {
  const rows = groupTrades(trades, (t) => new Date(t.ts).getDay(), (k) => WEEKDAYS[k]);
  // Keep Mon..Sun order so the chart reads like a week.
  return [1, 2, 3, 4, 5, 6, 0].map((d) => rows.find((r) => r.id === d)).filter(Boolean);
};

export const byConfidence = (trades) => {
  const withConf = trades.filter((t) => Number(t.confidence) > 0);
  return CONFIDENCE_BUCKETS.map((b) => {
    const acc = blank();
    withConf.forEach((t) => {
      const c = Number(t.confidence);
      if (c >= b.min && c <= b.max) add(acc, t);
    });
    return finish(b.id, b.label, acc);
  }).filter((r) => r.count > 0);
};

// Per-day totals, oldest -> newest (for the daily P&L bars).
export const dailySeries = (trades, days = 30) => {
  const map = {};
  trades.forEach((t) => {
    const d = new Date(t.ts);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map[k] = (map[k] || 0) + t.pnl;
  });
  return Object.keys(map)
    .sort()
    .slice(-days)
    .map((k) => ({ day: k.slice(5), pnl: map[k] }));
};

// How complete the logging is. Drives the "Tag more trades" prompt so the charts earn their keep.
export function tagCoverage(trades) {
  const n = trades.length || 1;
  const pct = (fn) => Math.round((trades.filter(fn).length / n) * 100);
  return {
    setup: pct((t) => !!t.setup),
    session: pct((t) => !!t.session),
    confidence: pct((t) => Number(t.confidence) > 0),
    mood: pct((t) => !!t.emotion),
    direction: pct((t) => !!t.direction),
    pair: pct((t) => !!(t.pair || "").trim()),
  };
}

const MIN_GROUP = 3; // don't call anything an "edge" or a "leak" off 1-2 trades.

// Plain-language findings, strongest first. Each: { tone: "good" | "bad", title, detail }.
export function findPatterns(trades, { setupRows, sessionRows, moodRows, pairRows, dayRows, confRows, directionRows = [] }, money) {
  const out = [];
  const pick = (rows) => rows.filter((r) => r.count >= MIN_GROUP);
  const best = (rows) => [...pick(rows)].sort((a, b) => b.avg - a.avg)[0];
  const worst = (rows) => [...pick(rows)].sort((a, b) => a.avg - b.avg)[0];
  const sign = (n) => `${n >= 0 ? "+" : "-"}$${money(Math.abs(n))}`;

  const groups = [
    ["setup", setupRows, "setup"],
    ["session", sessionRows, "session"],
    ["mood", moodRows, "mood"],
    ["pair", pairRows, "pair"],
    ["day", dayRows, "day"],
    ["direction", directionRows, "direction"],
  ];
  groups.forEach(([, rows, noun]) => {
    if (pick(rows).length < 2) return; // one group alone has nothing to be compared against
    const b = best(rows);
    const w = worst(rows);
    if (b && b.avg > 0) {
      out.push({
        tone: "good",
        score: b.avg * b.count,
        title: `${b.label} is your best ${noun}`,
        detail: `${b.count} trades, ${b.winRate.toFixed(0)}% win rate, ${sign(b.avg)} per trade.`,
      });
    }
    if (w && w.avg < 0 && (!b || w.id !== b.id)) {
      out.push({
        tone: "bad",
        score: Math.abs(w.avg) * w.count,
        title: `${w.label} is costing you`,
        detail: `${w.count} ${noun} trades lost $${money(Math.abs(w.pnl))} in total (${w.winRate.toFixed(0)}% win rate).`,
      });
    }
  });

  if (confRows.length >= 2) {
    const hi = confRows.find((r) => r.id === "high");
    const lo = confRows.find((r) => r.id === "low");
    if (hi && hi.count >= MIN_GROUP && hi.avg < 0) {
      out.push({
        tone: "bad",
        score: Math.abs(hi.avg) * hi.count,
        title: "High confidence is not paying off",
        detail: `Trades you rated 8-10 average ${sign(hi.avg)}. Being sure is not the same as being right.`,
      });
    } else if (hi && lo && hi.count >= MIN_GROUP && lo.count >= MIN_GROUP && hi.avg > lo.avg) {
      out.push({
        tone: "good",
        score: (hi.avg - lo.avg) * hi.count,
        title: "Your confidence reads the market well",
        detail: `High-confidence trades average ${sign(hi.avg)} against ${sign(lo.avg)} at low confidence.`,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Adapter: shape trades like the old journal-sheet rows, so any older analytics helper
// that still expects { date, pair, setup, session, mood, confidence, pnl, outcome }
// keeps working without the sheet.
export function tradesAsJournalRows(trades) {
  return (trades || []).map((t) => {
    const d = new Date(t.ts);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      id: t.id,
      date,
      pair: t.pair || "",
      trend: "",
      rr: "",
      pnl: String(t.pnl),
      setup: t.setup || "",
      outcome: t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "breakeven",
      session: t.session || "",
      mood: t.emotion || "",
      confidence: confidenceWord(t.confidence).toLowerCase(),
      mistake: "",
      note: t.note || "",
      sourceTradeId: t.id,
    };
  });
}
