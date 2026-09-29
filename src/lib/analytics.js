import { EDGE_CHART_MAX_POINTS, EDGE_CURVE_MAX_TRADES, NOTE_TAGS, RUNTIME, TREND_OPTIONS, emotionMeta, setupMeta } from "./constants.js";
import { MONTH_NAMES, MONTH_SHORT, dayKeyFromDate, dayKeyFromTs, fmtMoney, formatShortDate, num, pad2 } from "./format.js";
import { tradeScreenshots } from "./images.js";
import { isCleanCheckin } from "./playbook.js";
import { MARKET_SESSIONS } from "./sessions.js";
import { palette } from "./theme.js";

export function computeStatementData(trades, journalEntries, customSetups, playbookCheckins, startingBalance, period, customMoods = []) {
  let rangeStart, rangeEnd, seriesBuckets, periodLabel, checkinMatch;

  if (period.type === "month") {
    const monthPrefix = `${period.year}-${pad2(period.index + 1)}`;
    rangeStart = new Date(period.year, period.index, 1).getTime();
    rangeEnd = new Date(period.year, period.index + 1, 1).getTime();
    const daysInMonth = new Date(period.year, period.index + 1, 0).getDate();
    seriesBuckets = Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      matches: (t) => new Date(t.ts).getDate() === i + 1,
    }));
    periodLabel = `${MONTH_NAMES[period.index]} ${period.year}`;
    checkinMatch = (key) => key.startsWith(monthPrefix);
  } else if (period.type === "quarter") {
    const startMonth = period.index * 3;
    rangeStart = new Date(period.year, startMonth, 1).getTime();
    rangeEnd = new Date(period.year, startMonth + 3, 1).getTime();
    seriesBuckets = [0, 1, 2].map((i) => ({
      label: MONTH_SHORT[startMonth + i],
      matches: (t) => new Date(t.ts).getMonth() === startMonth + i,
    }));
    periodLabel = `Q${period.index + 1} ${period.year}`;
    checkinMatch = (key) => {
      if (!key.startsWith(`${period.year}-`)) return false;
      const m = Number(key.slice(5, 7));
      return m >= startMonth + 1 && m <= startMonth + 3;
    };
  } else {
    rangeStart = new Date(period.year, 0, 1).getTime();
    rangeEnd = new Date(period.year + 1, 0, 1).getTime();
    seriesBuckets = MONTH_SHORT.map((label, i) => ({
      label,
      matches: (t) => new Date(t.ts).getMonth() === i,
    }));
    periodLabel = `${period.year} Annual`;
    checkinMatch = (key) => key.startsWith(`${period.year}-`);
  }

  const rangeTrades = trades.filter((t) => t.ts >= rangeStart && t.ts < rangeEnd);
  const series = seriesBuckets.map((b) => ({
    label: b.label,
    pnl: rangeTrades.filter(b.matches).reduce((s, t) => s + t.pnl, 0),
  }));
  const maxAbs = Math.max(1, ...series.map((d) => Math.abs(d.pnl)));

  const netPnl = rangeTrades.reduce((s, t) => s + t.pnl, 0);
  const wins = rangeTrades.filter((t) => t.pnl > 0);
  const winRate = rangeTrades.length ? (wins.length / rangeTrades.length) * 100 : 0;
  const startBal = num(startingBalance);

  const bucketsWithTrades = series.filter((d) => d.pnl !== 0);
  const bestBucket = bucketsWithTrades.length ? bucketsWithTrades.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worstBucket = bucketsWithTrades.length ? bucketsWithTrades.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;

  const perf = computePerformanceMetrics(rangeTrades);
  const revengeCost = computeRevengeCostSplit(rangeTrades);
  const discipline = computeDisciplineStreak(rangeTrades);
  const completeness = computeJournalCompleteness(rangeTrades);
  const insights = computeInsights(rangeTrades, customSetups, customMoods);

  const periodCheckins = playbookCheckins.filter((c) => checkinMatch(c.date));
  const cleanCheckins = periodCheckins.filter(isCleanCheckin).length;
  const cleanPct = periodCheckins.length ? Math.round((cleanCheckins / periodCheckins.length) * 100) : null;

  const topPairs = tradePairFrequency(rangeTrades, 1);
  const mostTradedPair = topPairs.length ? topPairs[0] : null;

  return {
    periodLabel,
    tradeCount: rangeTrades.length,
    netPnl,
    netPct: startBal > 0 ? (netPnl / startBal) * 100 : null,
    winRate,
    series,
    maxAbs,
    bestBucket,
    worstBucket,
    perf,
    revengeCost,
    discipline,
    completeness,
    bestSetup: insights.bestSetup,
    bestMood: insights.bestMood,
    cleanPct,
    checkinCount: periodCheckins.length,
    mostTradedPair,
  };
}

export function computeGoalProgress(trades, startBal, period) {
  if (!(startBal > 0)) return null;
  const now = new Date();
  let periodStart;
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - diffToMonday);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const periodTrades = trades.filter((t) => t.ts >= periodStart.getTime());
  const netPnl = periodTrades.reduce((s, t) => s + t.pnl, 0);
  const pct = (netPnl / startBal) * 100;
  return { count: periodTrades.length, netPnl, pct, periodStart };
}

export function computeRevengeIds(trades) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  const ids = new Set();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.pnl < 0 && cur.ts - prev.ts <= RUNTIME.REVENGE_WINDOW_MS) {
      ids.add(cur.id);
    }
  }
  return ids;
}

export function computeDisciplineStreak(trades) {
  const revengeIds = computeRevengeIds(trades);
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(t);
  });
  const dayKeys = Object.keys(byDay).sort();

  let best = 0;
  let run = 0;
  dayKeys.forEach((k) => {
    const dayHasRevenge = byDay[k].some((t) => revengeIds.has(t.id));
    if (dayHasRevenge) {
      run = 0;
    } else {
      run += 1;
      best = Math.max(best, run);
    }
  });

  let current = 0;
  for (let i = dayKeys.length - 1; i >= 0; i--) {
    const dayHasRevenge = byDay[dayKeys[i]].some((t) => revengeIds.has(t.id));
    if (dayHasRevenge) break;
    current += 1;
  }

  return { current, best, hasData: dayKeys.length > 0 };
}

export function computeInsights(trades, customSetups, customMoods = []) {
  const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const moodMetaLocal = (id) => emotionMeta(id) || customMoods.find((m) => m.id === id);
  const bySetup = {};
  const byMood = {};
  const byWeekday = {};

  trades.forEach((t) => {
    if (t.setup) {
      if (!bySetup[t.setup]) bySetup[t.setup] = { count: 0, wins: 0, pnl: 0 };
      bySetup[t.setup].count += 1;
      bySetup[t.setup].pnl += t.pnl;
      if (t.pnl > 0) bySetup[t.setup].wins += 1;
    }
    if (t.emotion) {
      if (!byMood[t.emotion]) byMood[t.emotion] = { count: 0, wins: 0, pnl: 0 };
      byMood[t.emotion].count += 1;
      byMood[t.emotion].pnl += t.pnl;
      if (t.pnl > 0) byMood[t.emotion].wins += 1;
    }
    const wd = new Date(t.ts).getDay();
    if (!byWeekday[wd]) byWeekday[wd] = { count: 0, wins: 0, pnl: 0 };
    byWeekday[wd].count += 1;
    byWeekday[wd].pnl += t.pnl;
    if (t.pnl > 0) byWeekday[wd].wins += 1;
  });

  const setupRows = Object.keys(bySetup)
    .map((id) => ({
      id,
      label: setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id,
      ...bySetup[id],
      winRate: (bySetup[id].wins / bySetup[id].count) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const moodRows = Object.keys(byMood)
    .map((id) => ({
      id,
      label: moodMetaLocal(id)?.label || id,
      emoji: moodMetaLocal(id)?.emoji || "",
      ...byMood[id],
      winRate: (byMood[id].wins / byMood[id].count) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const weekdayRows = Object.keys(byWeekday)
    .map((k) => ({
      id: k,
      label: WEEKDAY_FULL[Number(k)],
      ...byWeekday[k],
      winRate: (byWeekday[k].wins / byWeekday[k].count) * 100,
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const revengeIds = computeRevengeIds(trades);
  const revengeTrades = trades.filter((t) => revengeIds.has(t.id));
  const revengePnl = revengeTrades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    setupRows,
    moodRows,
    weekdayRows,
    bestSetup: setupRows.length ? setupRows[0] : null,
    worstSetup: setupRows.length ? setupRows[setupRows.length - 1] : null,
    bestMood: moodRows.length ? moodRows[0] : null,
    worstMood: moodRows.length ? moodRows[moodRows.length - 1] : null,
    revengeCount: revengeTrades.length,
    revengePnl,
  };
}

export function computeHeatmapWeeks(trades, weeksBack = 26) {
  const dayTotals = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    dayTotals[k] = (dayTotals[k] || 0) + t.pnl;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  const totalDays = weeksBack * 7;
  const startDate = new Date(endOfWeek);
  startDate.setDate(endOfWeek.getDate() - totalDays + 1);

  const weeks = [];
  let cursor = new Date(startDate);
  let maxAbs = 0;
  for (let w = 0; w < weeksBack; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKeyFromDate(cursor);
      const pnl = key in dayTotals ? dayTotals[key] : null;
      if (pnl !== null) maxAbs = Math.max(maxAbs, Math.abs(pnl));
      week.push({ key, date: new Date(cursor), pnl, future: cursor.getTime() > today.getTime() });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, maxAbs };
}

export function computeHeadlineInsight(trades, customSetups, customMoods = []) {
  if (trades.length < 5) return null;
  const insights = computeInsights(trades, customSetups, customMoods);
  const candidates = [];

  if (insights.setupRows.length >= 2) {
    const best = insights.setupRows[0];
    const worst = insights.setupRows[insights.setupRows.length - 1];
    const diff = best.winRate - worst.winRate;
    if (best.id !== worst.id && diff >= 15) {
      candidates.push({
        priority: diff,
        text: `Your ${best.label} setups are outperforming ${worst.label} by ${diff.toFixed(0)}% win rate \u2014 consider focusing there.`,
      });
    }
  }

  if (insights.bestMood && insights.worstMood && insights.bestMood.id !== insights.worstMood.id) {
    const diff = insights.bestMood.winRate - insights.worstMood.winRate;
    if (diff >= 15) {
      candidates.push({
        priority: diff,
        text: `You win ${diff.toFixed(0)}% more often trading ${insights.bestMood.label.toLowerCase()} than ${insights.worstMood.label.toLowerCase()}.`,
      });
    }
  }

  if (insights.revengeCount > 0) {
    candidates.push({
      priority: Math.abs(insights.revengePnl) / 5,
      text: `Revenge trades have cost you $${fmtMoney(insights.revengePnl)} across ${insights.revengeCount} trade${
        insights.revengeCount === 1 ? "" : "s"
      } \u2014 watch that ${RUNTIME.REVENGE_WINDOW_MINUTES}-minute window after a loss.`,
    });
  }

  if (candidates.length === 0) {
    return "Keep logging trades \u2014 clear patterns will show up here as your journal grows.";
  }
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0].text;
}

export function tierFor(value, thresholds) {
  if (!Number.isFinite(value)) return "Excellent";
  if (value <= thresholds[0]) return "Poor";
  if (value <= thresholds[1]) return "Average";
  if (value <= thresholds[2]) return "Good";
  return "Excellent";
}

export const MIN_TRADES_FOR_TIERS = 20;

export function tierColor(tier) {
  if (tier === "Early") return palette.textFaint;
  if (tier === "Poor") return palette.red;
  if (tier === "Average") return palette.gold;
  return palette.green;
}

export function computePerformanceMetrics(trades) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let running = 0;
  let peak = 0;
  let maxDD = 0;
  sorted.forEach((t) => {
    running += t.pnl;
    peak = Math.max(peak, running);
    maxDD = Math.max(maxDD, peak - running);
  });
  const netProfit = running;

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = trades.length ? wins.length / trades.length : 0;

  const metrics = {
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    recoveryFactor: maxDD > 0 ? netProfit / maxDD : netProfit > 0 ? Infinity : 0,
    winLossRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0,
    expectancy: winRate * avgWin - (1 - winRate) * avgLoss,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0,
    winRate,
    avgWin,
    avgLoss,
  };

  // Below this many trades, ratings like "Excellent" aren't statistically meaningful.
  const smallSample = trades.length < MIN_TRADES_FOR_TIERS;
  const tiers = smallSample
    ? { profitFactor: "Early", recoveryFactor: "Early", winLossRatio: "Early", expectancy: "Early" }
    : {
        profitFactor: tierFor(metrics.profitFactor, [1, 1.5, 2.5]),
        recoveryFactor: tierFor(metrics.recoveryFactor, [1, 2, 4]),
        winLossRatio: tierFor(metrics.winLossRatio, [0.8, 1.2, 2]),
        expectancy: tierFor(metrics.expectancy, [0, 5, 20]),
      };

  return { ...metrics, tiers, netProfit, maxDD, smallSample };
}

export const METRIC_INFO = {
  "Profit Factor": "Gross profit divided by gross loss. Above 1 means your wins outweigh your losses overall; above 1.5 is generally considered solid.",
  "Recovery Factor": "Net profit divided by your worst drawdown. Higher means you make back more than you ever gave up at your lowest point.",
  "Win/Loss Ratio": "Your average win size divided by your average loss size \u2014 independent of how often you win.",
  Expectancy: "The average dollar result you can expect per trade, blending your win rate with your average win and loss size.",
};

export function computeMonthComparison(trades) {
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastDate.getFullYear()}-${pad2(lastDate.getMonth() + 1)}`;

  const agg = (key) => {
    const monthTrades = trades.filter((t) => dayKeyFromTs(t.ts).startsWith(key));
    const wins = monthTrades.filter((t) => t.pnl > 0).length;
    return {
      count: monthTrades.length,
      winRate: monthTrades.length ? (wins / monthTrades.length) * 100 : 0,
      net: monthTrades.reduce((s, t) => s + t.pnl, 0),
    };
  };

  return { thisMonth: agg(thisKey), lastMonth: agg(lastKey) };
}

export function computeJournalCompleteness(trades) {
  if (trades.length === 0) return 0;
  const total = trades.reduce((sum, t) => {
    let score = 0;
    if (t.note && t.note.trim()) score += 1;
    if (t.setup) score += 1;
    if (tradeScreenshots(t).length > 0) score += 1;
    return sum + score / 3;
  }, 0);
  return Math.round((total / trades.length) * 100);
}

export function computeDisciplineGrade(trades) {
  const { current, hasData } = computeDisciplineStreak(trades);
  if (!hasData) return { grade: "N/A", score: 0 };
  const revengeIds = computeRevengeIds(trades);
  const revengeRate = trades.length ? (revengeIds.size / trades.length) * 100 : 0;
  const completeness = computeJournalCompleteness(trades);

  const streakScore = Math.min(100, (current / 30) * 100);
  const revengeScore = Math.max(0, 100 - revengeRate * 5);
  const score = Math.round(streakScore * 0.4 + revengeScore * 0.4 + completeness * 0.2);

  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 65) grade = "C";
  else if (score >= 50) grade = "D";
  return { grade, score };
}

export function computeRevengeCostSplit(trades) {
  const revengeIds = computeRevengeIds(trades);
  const revenge = trades.filter((t) => revengeIds.has(t.id));
  const clean = trades.filter((t) => !revengeIds.has(t.id));
  return {
    revengeTotal: revenge.reduce((s, t) => s + t.pnl, 0),
    revengeCount: revenge.length,
    cleanTotal: clean.reduce((s, t) => s + t.pnl, 0),
    cleanCount: clean.length,
  };
}

export function computeOverconfidenceCheck(trades) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let streak = 0;
  const afterStreak = [];
  const normal = [];
  sorted.forEach((t) => {
    const size = Math.abs(t.pnl);
    if (streak >= 3) afterStreak.push(size);
    else normal.push(size);
    streak = t.pnl > 0 ? streak + 1 : 0;
  });
  if (afterStreak.length < 3 || normal.length < 3) return null;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgAfter = avg(afterStreak);
  const avgNormal = avg(normal);
  const pctChange = avgNormal > 0 ? ((avgAfter - avgNormal) / avgNormal) * 100 : 0;
  return { avgAfter, avgNormal, pctChange, detected: pctChange >= 20 };
}

export function computeDisciplineStreakTrend(trades) {
  const revengeIds = computeRevengeIds(trades);
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(t);
  });
  const dayKeys = Object.keys(byDay).sort();
  let streak = 0;
  return dayKeys.map((k, i) => {
    const hasRevenge = byDay[k].some((t) => revengeIds.has(t.id));
    streak = hasRevenge ? 0 : streak + 1;
    return { day: i + 1, streak, key: k };
  });
}

// Evenly distributes wins across trades to hit the target win rate exactly
// (same idea as a line-drawing algorithm) — deterministic and reproducible,
// but since R:R usually isn't 1, every win/loss still moves the curve by a
// different amount than the last, so it naturally zigzags like a real curve.
export function generateEquityCurve({ winRatePct, rr, numTrades, riskDollarPerTrade }) {
  if (!(numTrades > 0) || !(rr > 0)) return null;
  const winProb = Math.min(1, Math.max(0, winRatePct / 100));
  const trades = Math.max(1, Math.min(Math.round(numTrades), EDGE_CURVE_MAX_TRADES));

  let acc = 0;
  let cumR = 0;
  const points = [{ trade: 0, r: 0, pnl: riskDollarPerTrade > 0 ? 0 : null }];
  for (let t = 1; t <= trades; t++) {
    acc += winProb;
    let isWin = false;
    if (acc >= 1) {
      isWin = true;
      acc -= 1;
    }
    cumR += isWin ? rr : -1;
    points.push({
      trade: t,
      r: cumR,
      pnl: riskDollarPerTrade > 0 ? cumR * riskDollarPerTrade : null,
    });
  }
  return { points, finalR: cumR, trades };
}

export function generateThreeCurveProjection({ winRatePct, rr, spreadPct, numTrades, riskDollarPerTrade }) {
  if (!(numTrades > 0) || !(rr > 0) || !(winRatePct >= 0)) return null;

  const normalWinRate = winRatePct;
  const bestWinRate = Math.min(100, winRatePct + spreadPct);
  const worstWinRate = Math.max(0, winRatePct - spreadPct);

  const normal = generateEquityCurve({ winRatePct: normalWinRate, rr, numTrades, riskDollarPerTrade });
  const best = generateEquityCurve({ winRatePct: bestWinRate, rr, numTrades, riskDollarPerTrade });
  const worst = generateEquityCurve({ winRatePct: worstWinRate, rr, numTrades, riskDollarPerTrade });
  if (!normal || !best || !worst) return null;

  const trades = normal.trades;
  // Thin the chart to ~EDGE_CHART_MAX_POINTS points (always keeping the first and last trade).
  const step = Math.max(1, Math.ceil(trades / EDGE_CHART_MAX_POINTS));
  const chartData = [];
  for (let i = 0; i <= trades; i += step) {
    chartData.push({
      trade: i,
      normal: normal.points[i] ? normal.points[i].r : null,
      best: best.points[i] ? best.points[i].r : null,
      worst: worst.points[i] ? worst.points[i].r : null,
      normalPnl: normal.points[i] ? normal.points[i].pnl : null,
      bestPnl: best.points[i] ? best.points[i].pnl : null,
      worstPnl: worst.points[i] ? worst.points[i].pnl : null,
    });
  }
  if (chartData[chartData.length - 1].trade !== trades) {
    chartData.push({
      trade: trades,
      normal: normal.points[trades].r,
      best: best.points[trades].r,
      worst: worst.points[trades].r,
      normalPnl: normal.points[trades].pnl,
      bestPnl: best.points[trades].pnl,
      worstPnl: worst.points[trades].pnl,
    });
  }

  return {
    chartData,
    trades,
    normalWinRate,
    bestWinRate,
    worstWinRate,
    normalFinalR: normal.finalR,
    bestFinalR: best.finalR,
    worstFinalR: worst.finalR,
    normalFinalPnl: normal.points[trades].pnl,
    bestFinalPnl: best.points[trades].pnl,
    worstFinalPnl: worst.points[trades].pnl,
  };
}

export function computeQualifyingTradingDays(trades, startBal, minDayGainPct) {
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    byDay[k] = (byDay[k] || 0) + t.pnl;
  });
  const threshold = num(minDayGainPct);
  const dayKeys = Object.keys(byDay);
  const qualifyingDayKeys = startBal > 0
    ? dayKeys.filter((k) => (byDay[k] / startBal) * 100 >= threshold).sort()
    : [];
  return {
    totalDaysTraded: dayKeys.length,
    qualifyingDays: qualifyingDayKeys.length,
    qualifyingDayKeys,
  };
}

export function computeNoteTagAnalysis(trades) {
  return NOTE_TAGS.map((tag) => {
    const tagged = trades.filter((t) => t.note === tag);
    const wins = tagged.filter((t) => t.pnl > 0).length;
    return {
      tag,
      count: tagged.length,
      winRate: tagged.length ? (wins / tagged.length) * 100 : 0,
      pnl: tagged.reduce((s, t) => s + t.pnl, 0),
    };
  }).filter((r) => r.count > 0);
}

export function computeConsistencyScore(trades) {
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    byDay[k] = (byDay[k] || 0) + t.pnl;
  });
  const values = Object.values(byDay);
  if (values.length < 3) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdev = Math.sqrt(variance);
  const meanAbs = values.reduce((s, v) => s + Math.abs(v), 0) / values.length || 1;
  const cv = stdev / meanAbs;
  let label = "Low";
  if (cv > 2.5) label = "High";
  else if (cv > 1.2) label = "Medium";
  return { label, cv };
}

// ---- Journal tab data -> Insights "Journal" sub-tab helpers ----
export function filledJournalRows(journalEntries) {
  return journalEntries.filter((r) =>
    [r.pair, r.trend, r.rr, r.setup, r.outcome, r.session, r.mood, r.confidence, r.mistake, r.note].some(
      (v) => v && String(v).trim()
    )
  );
}

export function journalTrendBreakdown(rows) {
  const counts = { uptrend: 0, downtrend: 0, range: 0, untagged: 0 };
  rows.forEach((r) => {
    if (r.trend && counts[r.trend] !== undefined) counts[r.trend] += 1;
    else counts.untagged += 1;
  });
  return TREND_OPTIONS.map((t) => ({ id: t.id, name: t.label, value: counts[t.id] }))
    .concat(counts.untagged > 0 ? [{ id: "untagged", name: "Untagged", value: counts.untagged }] : [])
    .filter((d) => d.value > 0);
}

export function journalRRSeries(rows) {
  return rows
    .filter((r) => r.date && r.rr !== "" && Number.isFinite(parseFloat(r.rr)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => ({ date: r.date, label: formatShortDate(new Date(`${r.date}T00:00:00`).getTime()), rr: num(r.rr) }));
}

export function journalMistakeFrequency(rows, max = 6) {
  const counts = {};
  rows.forEach((r) => {
    const m = (r.mistake || "").trim();
    if (!m) return;
    const key = m.toLowerCase();
    if (!counts[key]) counts[key] = { label: m, count: 0 };
    counts[key].count += 1;
  });
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export function journalSetupRadar(rows, customSetups) {
  const bySetup = {};
  rows.forEach((r) => {
    if (!r.setup) return;
    if (!bySetup[r.setup]) bySetup[r.setup] = { count: 0, rrTotal: 0, rrCount: 0, cleanCount: 0 };
    const b = bySetup[r.setup];
    b.count += 1;
    if (r.rr !== "" && Number.isFinite(num(r.rr))) {
      b.rrTotal += num(r.rr);
      b.rrCount += 1;
    }
    if (!r.mistake || !r.mistake.trim()) b.cleanCount += 1;
  });
  const ids = Object.keys(bySetup);
  if (ids.length === 0) return { rows: [], maxCount: 0, maxRR: 0 };
  const maxCount = Math.max(...ids.map((id) => bySetup[id].count));
  const maxRR = Math.max(...ids.map((id) => (bySetup[id].rrCount ? bySetup[id].rrTotal / bySetup[id].rrCount : 0)), 1);
  const setupRows = ids.map((id) => {
    const b = bySetup[id];
    const avgRR = b.rrCount ? b.rrTotal / b.rrCount : 0;
    return {
      id,
      label: setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id,
      Frequency: maxCount ? Math.round((b.count / maxCount) * 100) : 0,
      "Avg R:R": maxRR ? Math.round((avgRR / maxRR) * 100) : 0,
      "Clean Rate": b.count ? Math.round((b.cleanCount / b.count) * 100) : 0,
      count: b.count,
      avgRR,
    };
  });
  return { rows: setupRows, maxCount, maxRR };
}

export function journalMistakePatterns(rows) {
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const byTrend = {};
  TREND_OPTIONS.forEach((t) => (byTrend[t.id] = { count: 0, mistakeCount: 0 }));
  const byWeekday = {};
  for (let i = 0; i < 7; i++) byWeekday[i] = { count: 0, mistakeCount: 0 };

  rows.forEach((r) => {
    const hasMistake = !!(r.mistake && r.mistake.trim());
    if (r.trend && byTrend[r.trend]) {
      byTrend[r.trend].count += 1;
      if (hasMistake) byTrend[r.trend].mistakeCount += 1;
    }
    if (r.date) {
      const wd = new Date(`${r.date}T00:00:00`).getDay();
      byWeekday[wd].count += 1;
      if (hasMistake) byWeekday[wd].mistakeCount += 1;
    }
  });

  const trendRows = TREND_OPTIONS.map((t) => {
    const b = byTrend[t.id];
    return {
      id: t.id,
      label: t.label,
      count: b.count,
      mistakeRate: b.count ? Math.round((b.mistakeCount / b.count) * 100) : 0,
    };
  }).filter((r) => r.count > 0);

  const WEEKDAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const weekdayRows = Object.keys(byWeekday)
    .map((k) => {
      const b = byWeekday[k];
      return {
        id: k,
        label: WEEKDAY_SHORT[Number(k)],
        fullLabel: WEEKDAY_FULL_NAMES[Number(k)],
        count: b.count,
        mistakeRate: b.count ? Math.round((b.mistakeCount / b.count) * 100) : 0,
      };
    })
    .filter((r) => r.count > 0);

  const maxTrendRate = trendRows.length ? Math.max(...trendRows.map((r) => r.mistakeRate)) : 0;
  const worstTrends = trendRows.filter((r) => r.mistakeRate === maxTrendRate && maxTrendRate > 0);

  const maxWeekdayRate = weekdayRows.length ? Math.max(...weekdayRows.map((r) => r.mistakeRate)) : 0;
  const worstWeekdays = weekdayRows.filter((r) => r.mistakeRate === maxWeekdayRate && maxWeekdayRate > 0);

  return { trendRows, weekdayRows, worstTrends, worstWeekdays };
}

export function journalPairFrequency(rows, max = 8) {
  const counts = {};
  rows.forEach((r) => {
    const p = (r.pair || "").trim().toUpperCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  return Object.keys(counts)
    .map((pair) => ({ pair, count: counts[pair] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export function tradePairFrequency(trades, max = 8) {
  const counts = {};
  trades.forEach((t) => {
    const p = (t.pair || "").trim().toUpperCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  return Object.keys(counts)
    .map((pair) => ({ pair, count: counts[pair] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export function journalWeekdayFrequency(rows) {
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = {};
  rows.forEach((r) => {
    if (!r.date) return;
    const wd = new Date(`${r.date}T00:00:00`).getDay();
    counts[wd] = (counts[wd] || 0) + 1;
  });
  return WEEKDAY_SHORT.map((label, i) => ({ id: i, label, count: counts[i] || 0 }));
}

export function journalSessionFrequency(rows) {
  return MARKET_SESSIONS.map((s) => {
    const count = rows.filter((r) => r.session === s.id).length;
    return { id: s.id, label: s.label, count, color: s.color };
  }).filter((r) => r.count > 0);
}

export function computeSessionWinRates(journalRows) {
  const bySession = {};
  journalRows.forEach((r) => {
    if (!r.session) return;
    const pnl = parseFloat(r.pnl);
    const hasOutcome = r.outcome === "win" || r.outcome === "loss";
    const isWin = hasOutcome ? r.outcome === "win" : Number.isFinite(pnl) ? pnl > 0 : null;
    if (isWin === null) return;
    if (!bySession[r.session]) bySession[r.session] = { wins: 0, total: 0 };
    bySession[r.session].total += 1;
    if (isWin) bySession[r.session].wins += 1;
  });
  return MARKET_SESSIONS.map((s) => {
    const b = bySession[s.id];
    return {
      id: s.id,
      label: s.label,
      total: b ? b.total : 0,
      winRate: b && b.total ? (b.wins / b.total) * 100 : null,
    };
  });
}

export function journalRRDistribution(rows) {
  const buckets = [
    { label: "<1", min: -Infinity, max: 1 },
    { label: "1-2", min: 1, max: 2 },
    { label: "2-3", min: 2, max: 3 },
    { label: "3-4", min: 3, max: 4 },
    { label: "4+", min: 4, max: Infinity },
  ];
  const counts = buckets.map(() => 0);
  rows.forEach((r) => {
    if (r.rr === "" || !Number.isFinite(parseFloat(r.rr))) return;
    const v = num(r.rr);
    const idx = buckets.findIndex((b) => v >= b.min && v < b.max);
    if (idx !== -1) counts[idx] += 1;
  });
  return buckets.map((b, i) => ({ label: b.label, count: counts[i] })).filter((d) => d.count > 0);
}

export function journalMonthlyVolume(rows, monthsBack = 6) {
  const now = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, label: MONTH_SHORT[d.getMonth()] });
  }
  const counts = {};
  rows.forEach((r) => {
    if (!r.date) return;
    const k = r.date.slice(0, 7);
    counts[k] = (counts[k] || 0) + 1;
  });
  return months.map((m) => ({ label: m.label, count: counts[m.key] || 0 }));
}

export function journalPnLByMonth(rows, year) {
  const byMonth = {};
  rows.forEach((r) => {
    if (!r.date || r.pnl === undefined || r.pnl === "") return;
    const [y, m] = r.date.split("-").map(Number);
    if (y !== year) return;
    const pnl = parseFloat(r.pnl);
    if (!Number.isFinite(pnl)) return;
    byMonth[m] = (byMonth[m] || 0) + pnl;
  });
  return byMonth;
}

export function journalPnLByDay(rows, year, month) {
  const byDay = {};
  rows.forEach((r) => {
    if (!r.date || r.pnl === undefined || r.pnl === "") return;
    const [y, m, d] = r.date.split("-").map(Number);
    if (y !== year || m !== month) return;
    const pnl = parseFloat(r.pnl);
    if (!Number.isFinite(pnl)) return;
    byDay[d] = (byDay[d] || 0) + pnl;
  });
  return byDay;
}

export function journalMonthlyPnLSeries(pnlByMonth) {
  return MONTH_SHORT.map((label, i) => ({ label, pnl: pnlByMonth[i + 1] || 0 }));
}

export function journalDailyPnLSeries(pnlByDay, daysInMonth) {
  return Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), pnl: pnlByDay[i + 1] || 0 }));
}

export function joinWithAnd(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

export function journalSessionByDay(rows, maxDays = 30) {
  const bySession = {};
  rows.forEach((r) => {
    if (!r.date || !r.session) return;
    if (!bySession[r.date]) bySession[r.date] = {};
    bySession[r.date][r.session] = (bySession[r.date][r.session] || 0) + 1;
  });
  const dates = Object.keys(bySession).sort().slice(-maxDays);
  return dates.map((d) => {
    const entry = { date: d, label: formatShortDate(new Date(`${d}T00:00:00`).getTime()) };
    MARKET_SESSIONS.forEach((s) => {
      entry[s.label] = bySession[d][s.id] || 0;
    });
    return entry;
  });
}

export const CONFIDENCE_VALUE = { low: 1, medium: 2, high: 3 };

export function journalConfidenceByDay(rows, maxDays = 30) {
  const byDate = {};
  rows.forEach((r) => {
    if (!r.date || !r.confidence) return;
    if (!byDate[r.date]) byDate[r.date] = { total: 0, count: 0 };
    byDate[r.date].total += CONFIDENCE_VALUE[r.confidence] || 0;
    byDate[r.date].count += 1;
  });
  const dates = Object.keys(byDate).sort().slice(-maxDays);
  return dates.map((d) => ({
    date: d,
    label: formatShortDate(new Date(`${d}T00:00:00`).getTime()),
    avgConfidence: byDate[d].count ? byDate[d].total / byDate[d].count : 0,
  }));
}

export function buildWeekRecap(weekTrades, startBal, weekJournalRows = [], customSetups = []) {
  let running = 0;
  const curve = [{ pct: 0 }];
  weekTrades.forEach((t) => {
    running += (t.pnl / startBal) * 100;
    curve.push({ pct: running });
  });
  const netPct = running;

  const wins = weekTrades.filter((t) => t.pnl > 0).length;
  const winRate = (wins / weekTrades.length) * 100;

  let bestStreak = 0;
  let worstStreak = 0;
  let curStreak = 0;
  weekTrades.forEach((t) => {
    if (t.pnl > 0) curStreak = curStreak > 0 ? curStreak + 1 : 1;
    else if (t.pnl < 0) curStreak = curStreak < 0 ? curStreak - 1 : -1;
    else curStreak = 0;
    bestStreak = Math.max(bestStreak, curStreak);
    worstStreak = Math.min(worstStreak, curStreak);
  });

  const setupCounts = {};
  weekTrades.forEach((t) => {
    if (t.setup) setupCounts[t.setup] = (setupCounts[t.setup] || 0) + 1;
  });
const topSetupId = Object.keys(setupCounts).sort((a, b) => setupCounts[b] - setupCounts[a])[0] || null;
const topSetup = topSetupId
  ? {
      id: topSetupId,
      count: setupCounts[topSetupId],
      label: setupMeta(topSetupId)?.label || customSetups.find((s) => s.id === topSetupId)?.label || topSetupId,
    }
  : null;

  const revengeCount = computeRevengeIds(weekTrades).size;

  const rangeLabel = `${formatShortDate(weekTrades[0].ts)} \u2013 ${formatShortDate(weekTrades[weekTrades.length - 1].ts)}`;

  const perf = computePerformanceMetrics(weekTrades);
  const grade = computeDisciplineGrade(weekTrades);

  // Top pair now comes from the Curve-tab trade log, not the Journal tab
  const topPairs = tradePairFrequency(weekTrades, 1);
  const topPair = topPairs.length ? topPairs[0] : null;

  const rrValues = weekJournalRows.map((r) => parseFloat(r.rr)).filter((v) => Number.isFinite(v));
  const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : null;

  // Trade Pace Trend — front-loaded vs back-loaded vs even, based on trade timestamps
  let paceTrend = "Even";
  if (weekTrades.length >= 2) {
    const sortedTs = weekTrades.map((t) => t.ts).sort((a, b) => a - b);
    const rangeStartTs = sortedTs[0];
    const rangeEndTs = sortedTs[sortedTs.length - 1];
    const midTs = (rangeStartTs + rangeEndTs) / 2;
    const firstHalfCount = weekTrades.filter((t) => t.ts <= midTs).length;
    const secondHalfCount = weekTrades.length - firstHalfCount;
    const diff = firstHalfCount - secondHalfCount;
    const threshold = Math.max(1, Math.ceil(weekTrades.length * 0.2));
    if (diff >= threshold) paceTrend = "Front-loaded";
    else if (-diff >= threshold) paceTrend = "Back-loaded";
  }

  return {
    curve,
    netPct,
    winRate,
    bestStreak,
    worstStreak,
    topSetup,
    revengeCount,
    rangeLabel,
    tradeCount: weekTrades.length,
    profitFactor: perf.profitFactor,
    grade: grade.grade,
    topPair,
    avgRR,
    paceTrend,
  };
}
