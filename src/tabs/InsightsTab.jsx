import { pokeCrab } from "../lib/mascot.js";
import { useEffect, useRef } from "react";
import { OnboardingTip } from "../components/onboarding.jsx";
import { Readout, StatChip } from "../components/ui.jsx";
import { METRIC_INFO, MIN_TRADES_FOR_TIERS, computeConsistencyScore, computeDisciplineGrade, computeDisciplineStreakTrend, computeHeadlineInsight, computeHeatmapWeeks, computeInsights, computeJournalCompleteness, computeMonthComparison, computeNoteTagAnalysis, computeOverconfidenceCheck, computePerformanceMetrics, computeRevengeCostSplit, filledJournalRows, joinWithAnd, journalConfidenceByDay, journalDailyPnLSeries, journalMistakeFrequency, journalMistakePatterns, journalMonthlyPnLSeries, journalMonthlyVolume, journalPairFrequency, journalPnLByDay, journalPnLByMonth, journalRRDistribution, journalRRSeries, journalSessionByDay, journalSessionFrequency, journalSetupRadar, journalTrendBreakdown, journalWeekdayFrequency, tierColor } from "../lib/analytics.js";
import { MONTH_NAMES, MONTH_SHORT, WEEKDAY_LABELS, fmtMoney, formatDayLabel } from "../lib/format.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Lightbulb, Plus, Send, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function InsightsTab(props) {
  const {
    coachChatId,
    coachChats,
    coachChatsMax,
    coachDeleteConfirmId,
    coachError,
    coachHistoryOpen,
    coachInput,
    coachLoading,
    coachMessages,
    coachRemaining,
    coachScrollRef,
    customMoods,
    customSetups,
    deleteCoachChat,
    expandedHeatmapDay,
    expandedMetric,
    exportInsightsReport,
    insightReportMsg,
    insightsSubTab,
    isDesktop,
    journalEntries,
    journalInsightMonth,
    journalInsightYear,
    journalLoaded,
    newCoachChat,
    openCoachChat,
    persistSettings,
    selectInsightsSubTab,
    sendCoachMessage,
    session,
    setCoachDeleteConfirmId,
    setCoachHistoryOpen,
    setCoachInput,
    setExpandedHeatmapDay,
    setExpandedMetric,
    setJournalInsightMonth,
    setJournalInsightYear,
    settings,
    trades
  } = props;
  // ── Mascot reactions ───────────────────────────────────────────────
  const crabReady = useRef(false);
  const prevCoachLoading = useRef(false);
  useEffect(() => {
    if (crabReady.current) pokeCrab("look");
  }, [insightsSubTab]);
  useEffect(() => {
    if (crabReady.current && expandedMetric) pokeCrab("look", { say: "" });
  }, [expandedMetric]);
  useEffect(() => {
    if (crabReady.current && expandedHeatmapDay) pokeCrab("look", { say: "" });
  }, [expandedHeatmapDay]);
  useEffect(() => {
    if (prevCoachLoading.current && !coachLoading && crabReady.current) {
      if (coachError) pokeCrab("alert", { say: "Coach hit a snag" });
      else pokeCrab("check", { say: "Coach replied" });
    }
    prevCoachLoading.current = !!coachLoading;
  }, [coachLoading, coachError]);
  useEffect(() => {
    pokeCrab("rest", { pose: coachLoading ? "think" : "" });
    return () => pokeCrab("rest", { pose: "" });
  }, [coachLoading]);
  useEffect(() => {
    crabReady.current = true;
  }, []);
  let body = null;
    const hasData = trades.length > 0;
    const insights = computeInsights(trades, customSetups, customMoods);
    const heatmapWeeksBack = Number(settings.heatmapWeeksBack) || 26;
    const heatmap = computeHeatmapWeeks(trades, heatmapWeeksBack);
    const headline = computeHeadlineInsight(trades, customSetups, customMoods);
    const perf = computePerformanceMetrics(trades);
    const monthCmp = computeMonthComparison(trades);
    const completeness = computeJournalCompleteness(trades);
    const grade = computeDisciplineGrade(trades);
    const revengeCost = computeRevengeCostSplit(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    const disciplineTrend = computeDisciplineStreakTrend(trades);
    const noteTags = computeNoteTagAnalysis(trades);
    const consistency = computeConsistencyScore(trades);

    const journalRows = filledJournalRows(journalEntries);
    const hasJournalData = journalRows.length > 0;
    const trendBreakdown = journalTrendBreakdown(journalRows);
    const rrSeries = journalRRSeries(journalRows);
    const mistakeFreq = journalMistakeFrequency(journalRows);
    const setupRadarData = journalSetupRadar(journalRows, customSetups);
    const mistakePatterns = journalMistakePatterns(journalRows);
    const patternDetected =
  (mistakePatterns.worstTrends[0]?.mistakeRate ?? 0) >= 30 ||
  (mistakePatterns.worstWeekdays[0]?.mistakeRate ?? 0) >= 30;
const closestWeekday = [...mistakePatterns.weekdayRows].sort(
  (a, b) => b.mistakeRate - a.mistakeRate
)[0];
    const combinedMistakeRows = [
      ...mistakePatterns.trendRows.map((r) => ({ ...r, group: "Trend" })),
      ...mistakePatterns.weekdayRows.map((r) => ({ ...r, group: "Day" })),
    ];
    const pairFreq = journalPairFrequency(journalRows);
    const weekdayFreq = journalWeekdayFrequency(journalRows);
    const rrDist = journalRRDistribution(journalRows);
    const monthlyVolume = journalMonthlyVolume(journalRows);
    const sessionByDay = journalSessionByDay(journalRows);
    const confidenceByDay = journalConfidenceByDay(journalRows);

    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const barTooltipProps = {
      cursor: false,
      contentStyle: {
        background: palette.field,
        border: `1px solid ${palette.border}`,
        borderRadius: "8px",
        fontFamily: mono,
        fontSize: "13px",
      },
      labelStyle: { color: palette.textMuted },
      itemStyle: { color: palette.text },
    };
    const THIN_BAR_SIZE = 14;
    const PIE_COLORS = [palette.gold, palette.green, palette.red, palette.textMuted, palette.goldBright];

    const INSIGHTS_SUB_TABS = [
      { id: "overview", label: "Overview" },
      { id: "behavior", label: "Behavior" },
      { id: "journal", label: "Journal" },
      { id: "coach", label: "Coach" },
    ];

    const insightsSubNav = isDesktop ? (
      <div
        className="flex items-center gap-7 mb-8"
        style={{
          borderBottom: `1px solid ${palette.border}`,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "6px",
        }}
      >
        {INSIGHTS_SUB_TABS.map((s) => {
          const active = insightsSubTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectInsightsSubTab(s.id)}
              className={TAP}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${active ? palette.gold : "transparent"}`,
                color: active ? palette.text : palette.textFaint,
                fontFamily: display,
                fontSize: "15px",
                fontWeight: active ? 700 : 500,
                padding: "0 2px 14px 2px",
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "8px",
          paddingBottom: "12px",
        }}
      >
        <div
          role="tablist"
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${INSIGHTS_SUB_TABS.length}, minmax(0, 1fr))`,
            padding: "4px",
            borderRadius: "14px",
            background: palette.field,
            border: `1px solid ${palette.border}`,
          }}
        >
          <span
            aria-hidden="true"
            className="ledger-seg-thumb"
            style={{
              position: "absolute",
              top: "4px",
              bottom: "4px",
              left: "4px",
              width: `calc((100% - 8px) / ${INSIGHTS_SUB_TABS.length})`,
              transform: `translateX(${Math.max(0, INSIGHTS_SUB_TABS.findIndex((t) => t.id === insightsSubTab)) * 100}%)`,
              borderRadius: "10px",
              background: palette.gold,
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
          />
          {INSIGHTS_SUB_TABS.map((s) => {
            const active = insightsSubTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectInsightsSubTab(s.id)}
                className={`relative ${TAP}`}
                style={{
                  zIndex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "10px 4px",
                  minWidth: 0,
                  textAlign: "center",
                  color: active ? palette.letterbox : palette.textMuted,
                  fontFamily: display,
                  fontSize: INSIGHTS_SUB_TABS.length > 3 ? "12.5px" : "13.5px",
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 0.2s ease",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );


    const metricCard = (key, label, valueText, tier) => (
      <div
        key={key}
        onClick={() => setExpandedMetric(expandedMetric === key ? null : key)}
        className={`rounded-lg p-3 ${TAP}`}
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadow,
          cursor: "pointer",
          transition: THEME_TRANSITION,
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "12px" }}>
            {label}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontFamily: mono,
              color: tierColor(tier),
              border: `1px solid ${tierColor(tier)}`,
              borderRadius: "999px",
              padding: "1px 6px",
              flexShrink: 0,
            }}
          >
            {tier}
          </span>
        </div>
        <div style={{ fontFamily: mono, fontSize: "1rem", color: palette.text }}>{valueText}</div>
        {expandedMetric === key && METRIC_INFO[label] && (
          <div className="text-xs mt-2" style={{ color: palette.textFaint }}>
            {METRIC_INFO[label]}
            {tier === "Early" && ` Based on fewer than ${MIN_TRADES_FOR_TIERS} trades, so treat this as a first look, not a verdict.`}
          </div>
        )}
      </div>
    );

    const overviewSection = !hasData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet, insights will appear once you start logging on the Curve tab.
      </p>
    ) : (
      <>
        <OnboardingTip
          id="insights-overview-intro"
          text="This heatmap and the metrics below update automatically from your logged trades — nothing to fill in here."
          settings={settings}
          persistSettings={persistSettings}
        />
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Performance Heatmap
        </span>
        <div
          className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-3 mb-2"}
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.shadow,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="flex" style={{ gap: isDesktop ? "5px" : "3px", justifyContent: isDesktop ? "center" : "normal" }}>
            <div className="flex flex-col justify-between" style={{ gap: isDesktop ? "5px" : "3px", paddingRight: isDesktop ? "8px" : "4px" }}>
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: isDesktop ? "16px" : "10px",
                    height: isDesktop ? "16px" : "10px",
                    fontSize: isDesktop ? "10px" : "7px",
                    color: palette.textFaint,
                    lineHeight: isDesktop ? "16px" : "10px",
                  }}
                >
                  {i % 2 === 1 ? w : ""}
                </div>
              ))}
            </div>
            {heatmap.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: isDesktop ? "5px" : "3px" }}>
                {week.map((day, di) => {
                  const intensity = day.pnl !== null && heatmap.maxAbs > 0 ? Math.min(1, Math.abs(day.pnl) / heatmap.maxAbs) : 0;
                  const alphaHex = Math.round(30 + intensity * 190)
                    .toString(16)
                    .padStart(2, "0");
                  const bg = day.future
                    ? "transparent"
                    : day.pnl === null
                    ? palette.field
                    : `${day.pnl > 0 ? palette.green : palette.red}${alphaHex}`;
                  return (
                    <div
                      key={di}
                      onClick={() =>
                        !day.future &&
                        day.pnl !== null &&
                        setExpandedHeatmapDay(expandedHeatmapDay?.key === day.key ? null : day)
                      }
                      style={{
                        width: isDesktop ? "16px" : "10px",
                        height: isDesktop ? "16px" : "10px",
                        borderRadius: isDesktop ? "3px" : "2px",
                        background: bg,
                        cursor: day.pnl !== null ? "pointer" : "default",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {expandedHeatmapDay ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            {formatDayLabel(expandedHeatmapDay.key)}: {expandedHeatmapDay.pnl >= 0 ? "+" : "-"}$
            {fmtMoney(expandedHeatmapDay.pnl)}
          </p>
        ) : (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Last {heatmapWeeksBack} weeks – tap a square for that day's total.
          </p>
        )}

        {headline && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: palette.surface, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={14} style={{ color: palette.gold }} />
              <span className="uppercase" style={{ color: palette.gold, letterSpacing: "0.08em", fontSize: "12px" }}>
                Headline Insight
              </span>
            </div>
            <div style={{ color: palette.text, fontSize: "14px" }}>{headline}</div>
          </div>
        )}

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Performance Overview
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatChip label="Win Rate" value={`${(perf.winRate * 100).toFixed(0)}%`} />
          {metricCard("pf", "Profit Factor", fmtRatio(perf.profitFactor), perf.tiers.profitFactor)}
          {metricCard("rf", "Recovery Factor", fmtRatio(perf.recoveryFactor), perf.tiers.recoveryFactor)}
          {metricCard("wl", "Win/Loss Ratio", fmtRatio(perf.winLossRatio), perf.tiers.winLossRatio)}
          {metricCard("exp", "Expectancy", fmtSigned(perf.expectancy), perf.tiers.expectancy)}
          <StatChip label="Net Profit" value={fmtSigned(perf.netProfit)} />
          <StatChip label="Max Drawdown" value={`-$${fmtMoney(perf.maxDD)}`} />
          <StatChip label="Avg Win" value={fmtSigned(perf.avgWin)} />
          <StatChip label="Avg Loss" value={fmtSigned(-perf.avgLoss)} />
          <StatChip label="Largest Win" value={fmtSigned(perf.largestWin)} />
          <StatChip label="Largest Loss" value={fmtSigned(perf.largestLoss)} />
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        <div>
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          This Month vs Last Month
        </span>
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          {[
            { label: "Win Rate", thisV: monthCmp.thisMonth.winRate, lastV: monthCmp.lastMonth.winRate, fmt: (v) => `${v.toFixed(0)}%` },
            { label: "Net P&L", thisV: monthCmp.thisMonth.net, lastV: monthCmp.lastMonth.net, fmt: fmtSigned },
            { label: "Trade Count", thisV: monthCmp.thisMonth.count, lastV: monthCmp.lastMonth.count, fmt: (v) => `${v}` },
          ].map((row, i) => {
            const delta = row.thisV - row.lastV;
            const up = delta > 0;
            const flat = delta === 0;
            return (
              <div
                key={row.label}
                className="flex items-center justify-between"
                style={{ marginBottom: i < 2 ? "8px" : 0 }}
              >
                <span style={{ color: palette.textMuted, fontSize: "13px" }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: mono, fontSize: "14px", color: palette.text }}>{row.fmt(row.thisV)}</span>
                  <span style={{ fontSize: "12px", color: flat || monthCmp.lastMonth.count === 0 ? palette.textFaint : up ? palette.green : palette.red }}>
                    {monthCmp.lastMonth.count === 0
                      ? "no trades last month"
                      : `${flat ? "\u2014" : up ? "\u2191" : "\u2193"} vs ${row.fmt(row.lastV)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div>
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Journal Completeness
        </span>
        <div
          className="rounded-2xl p-4 mb-2"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: mono, fontSize: "1.3rem", color: palette.text }}>{completeness}%</span>
            <span style={{ fontSize: "12px", color: palette.textFaint }}>note + setup + screenshot</span>
          </div>
          <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${completeness}%`,
                background: palette.gold,
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        </div>
        </div>
      </>
    );

    const behaviorSection = !hasData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet, behavior stats will appear once you start logging on the Curve tab.
      </p>
    ) : (
      <>
        <Readout
          icon={ShieldAlert}
          eyebrow="Discipline Grade"
          value={grade.grade}
          unit={grade.grade !== "N/A" ? `${grade.score}/100` : undefined}
          sub="Combines discipline streak, revenge-trade rate, and journal completeness"
          tone={grade.grade === "A" || grade.grade === "B" ? "good" : grade.grade === "D" || grade.grade === "F" ? "bad" : undefined}
        />

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Cost of Revenge Trading
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatChip
            label={`Revenge (${revengeCost.revengeCount})`}
            value={revengeCost.revengeCount ? fmtSigned(revengeCost.revengeTotal) : "N/A"}
          />
          <StatChip label={`Everything Else (${revengeCost.cleanCount})`} value={fmtSigned(revengeCost.cleanTotal)} />
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Win-Streak Sizing Check
        </span>
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: palette.surface,
            border: `1px solid ${overconfidence?.detected ? palette.red : palette.border}`,
            boxShadow: palette.shadow,
          }}
        >
          {!overconfidence ? (
            <p className="text-xs" style={{ color: palette.textFaint }}>
              Not enough trades yet to check this, needs a few 3+ win streaks in your history.
            </p>
          ) : (
            <>
              <div style={{ color: palette.text, fontSize: "14px", marginBottom: "4px" }}>
                {overconfidence.detected
                  ? `Trade size runs ${overconfidence.pctChange.toFixed(0)}% bigger after 3+ wins in a row.`
                  : "Trade size stays steady after win streaks \u2014 no overconfidence pattern detected."}
              </div>
              {overconfidence.detected && (
                <div className="text-xs" style={{ color: palette.textFaint }}>
                  Consider sticking to your normal position size after a win streak.
                </div>
              )}
            </>
          )}
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        {disciplineTrend.length > 1 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Discipline Streak Trend
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
                <ResponsiveContainer>
                  <LineChart data={disciplineTrend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" hide />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.goldBright }}
                      formatter={(v) => [`${v} day${v === 1 ? "" : "s"}`, "Streak"]}
                      labelFormatter={() => ""}
                    />
                    <Line type="monotone" dataKey="streak" stroke={palette.gold} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {noteTags.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Note Tag Win Rate
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 220 : 140 }}>
                <ResponsiveContainer>
                  <BarChart data={noteTags} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="tag"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
                      unit="%"
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                      {noteTags.map((r, i) => (
                        <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Consistency
        </span>
        <div className="mb-6">
          <StatChip label="Day-to-Day Volatility" value={consistency ? consistency.label : "N/A"} />
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        <div>
        {insights.setupRows.length > 0 ? (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Setup Performance
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
                <ResponsiveContainer>
                  <BarChart data={insights.setupRows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
                      unit="%"
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                      {insights.setupRows.map((r, i) => (
                        <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {insights.setupRows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
              >
                <div>
                  <div style={{ color: palette.text, fontSize: "15px" }}>{r.label}</div>
                  <div style={{ color: palette.textMuted, fontSize: "13px" }}>
                    {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                  </div>
                </div>
                <span style={{ fontFamily: mono, fontSize: "14px", color: r.pnl >= 0 ? palette.green : palette.red }}>
                  {fmtSigned(r.pnl)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tag trades with a Setup on the Curve tab to see setup performance here.
          </p>
        )}
        </div>

        <div>
        {insights.moodRows.length > 0 && (
          <>
            <span
              className="block mt-4 mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Mood Impact
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
                <ResponsiveContainer>
                  <BarChart data={insights.moodRows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
                      unit="%"
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                      {insights.moodRows.map((r, i) => (
                        <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {insights.moodRows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
              >
                <div>
                  <div style={{ color: palette.text, fontSize: "15px" }}>
                    {r.emoji} {r.label}
                  </div>
                  <div style={{ color: palette.textMuted, fontSize: "13px" }}>
                    {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                  </div>
                </div>
                <span style={{ fontFamily: mono, fontSize: "14px", color: r.pnl >= 0 ? palette.green : palette.red }}>
                  {fmtSigned(r.pnl)}
                </span>
              </div>
            ))}
          </>
        )}
        </div>
        </div>
      </>
    );

    const journalSection = !journalLoaded ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        Loading journal data\u2026
      </p>
    ) : !hasJournalData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No journal entries yet. Fill in some rows on the Journal tab (pair, trend, R:R, setup, mistakes) to see
        analytics here.
      </p>
    ) : (
      <>
        <Readout
          icon={ClipboardCheck}
          eyebrow="Journal Entries"
          value={String(journalRows.length)}
          unit={journalRows.length === 1 ? "row" : "rows"}
          sub="Sourced from the Journal tab's spreadsheet, not your logged trades"
        />

        {/* Yearly PnL Calendar */}
        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}>
          Yearly PnL Calendar
        </span>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => { setJournalInsightYear((y) => y - 1); setJournalInsightMonth(null); }} className={TAP} style={{ color: palette.textMuted, padding: "4px" }} aria-label="Previous year"><ChevronLeft size={20} /></button>
          <span style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text, letterSpacing: "0.04em" }}>{journalInsightYear}</span>
          <button type="button" onClick={() => { setJournalInsightYear((y) => y + 1); setJournalInsightMonth(null); }} className={TAP} style={{ color: palette.textMuted, padding: "4px" }} aria-label="Next year"><ChevronRight size={20} /></button>
        </div>
        {(() => {
          const pnlByMonth = journalPnLByMonth(journalRows, journalInsightYear);
          const pnlByDay = journalInsightMonth ? journalPnLByDay(journalRows, journalInsightYear, journalInsightMonth) : {};
          const yearHasData = Object.keys(pnlByMonth).length > 0;
          if (journalInsightMonth === null) {
            return (
              <>
                {!yearHasData && (
                  <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                    No PnL data for {journalInsightYear}. Fill in the PnL column in your journal rows to see this calendar.
                  </p>
                )}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {MONTH_SHORT.map((mLabel, mIdx) => {
                    const monthPnl = pnlByMonth[mIdx + 1];
                    const hasPnl = monthPnl !== undefined;
                    return (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() => hasPnl && setJournalInsightMonth(mIdx + 1)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-2xl ${hasPnl ? TAP : ""}`}
                        style={{
                          aspectRatio: "1",
                          background: hasPnl ? (monthPnl >= 0 ? `${palette.green}1A` : `${palette.red}1A`) : palette.surface,
                          border: `1px solid ${hasPnl ? (monthPnl >= 0 ? palette.green : palette.red) + "55" : palette.border}`,
                          cursor: hasPnl ? "pointer" : "default",
                          transition: THEME_TRANSITION,
                        }}
                      >
              <span style={{ fontFamily: mono, fontSize: "14px", fontWeight: 600, color: hasPnl ? palette.text : palette.textFaint }}>{mLabel}</span>
                        {hasPnl && (
                          <span style={{ fontFamily: mono, fontSize: "12px", color: monthPnl >= 0 ? palette.green : palette.red }}>
                            {monthPnl >= 0 ? "+" : ""}{fmtMoney(monthPnl)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mb-4" style={{ color: palette.textFaint }}>Tap a coloured month to see its daily breakdown.</p>

                <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}>
                  PnL by Month
                </span>
                <div className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                  <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                    <ResponsiveContainer>
                      <BarChart data={journalMonthlyPnLSeries(pnlByMonth)} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} />
                        <YAxis stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={48} />
                        <ReferenceLine y={0} stroke={palette.textFaint} />
                        <Tooltip
                          cursor={false}
                          contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "13px" }}
                          labelStyle={{ color: palette.textMuted }}
                          itemStyle={{ color: palette.text }}
                          formatter={(v) => [`${v >= 0 ? "+" : ""}$${fmtMoney(v)}`, "PnL"]}
                        />
                        <Bar dataKey="pnl" radius={[5, 5, 5, 5]} barSize={16} activeBar={false}>
                          {journalMonthlyPnLSeries(pnlByMonth).map((d, i) => (
                            <Cell key={i} fill={d.pnl >= 0 ? palette.green : palette.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            );
          }
          const daysInMonth = new Date(journalInsightYear, journalInsightMonth, 0).getDate();
          const monthTotal = pnlByMonth[journalInsightMonth] || 0;
          return (
            <>
              <button type="button" onClick={() => setJournalInsightMonth(null)} className={`flex items-center gap-1 mb-3 ${TAP}`} style={{ color: palette.textMuted, fontSize: "13px", fontFamily: mono }}>
                <ChevronLeft size={16} />{journalInsightYear}
              </button>
              <div className="rounded-2xl p-4 mb-6" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <div className="flex items-baseline justify-between mb-3">
                  <span style={{ fontFamily: mono, fontSize: "14px", fontWeight: 600, color: palette.text }}>{MONTH_NAMES[journalInsightMonth - 1]} {journalInsightYear}</span>
                  <span style={{ fontFamily: mono, fontSize: "14px", color: monthTotal >= 0 ? palette.green : palette.red }}>
                    {monthTotal >= 0 ? "+" : ""}{fmtMoney(monthTotal)} total
                  </span>
                </div>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayPnl = pnlByDay[day];
                  if (dayPnl === undefined) return null;
                  return (
                    <div key={day} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${palette.border}` }}>
                      <span style={{ color: palette.textMuted, fontSize: "13px", fontFamily: mono }}>
                        {MONTH_SHORT[journalInsightMonth - 1]} {day}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: "14px", color: dayPnl >= 0 ? palette.green : palette.red }}>
                        {dayPnl >= 0 ? "+" : ""}{fmtMoney(dayPnl)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}>
                PnL by Day — {MONTH_NAMES[journalInsightMonth - 1]}
              </span>
              <div className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                  <ResponsiveContainer>
                    <BarChart data={journalDailyPnLSeries(pnlByDay, daysInMonth)} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
                      <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={palette.textFaint}
                        tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                        tickLine={false}
                        axisLine={{ stroke: palette.border }}
                        interval={Math.ceil(daysInMonth / 10)}
                      />
                      <YAxis stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={48} />
                      <ReferenceLine y={0} stroke={palette.textFaint} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "13px" }}
                        labelStyle={{ color: palette.textMuted }}
                        itemStyle={{ color: palette.text }}
                        formatter={(v) => [`${v >= 0 ? "+" : ""}$${fmtMoney(v)}`, "PnL"]}
                        labelFormatter={(l) => `${MONTH_SHORT[journalInsightMonth - 1]} ${l}`}
                      />
                      <Bar dataKey="pnl" radius={[3, 3, 3, 3]} barSize={8} activeBar={false}>
                        {journalDailyPnLSeries(pnlByDay, daysInMonth).map((d, i) => (
                          <Cell key={i} fill={d.pnl >= 0 ? palette.green : palette.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          );
        })()}
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
        >
          Journaling Activity (6 mo)
        </span>
        <div
          className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyVolume} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="35%">
                <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={palette.textFaint}
                  tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                  tickLine={false}
                  axisLine={{ stroke: palette.border }}
                />
                <YAxis
                  stroke={palette.textFaint}
                  tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                  tickLine={false}
                  axisLine={{ stroke: palette.border }}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Entries"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} fill={palette.gold} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        {weekdayFreq.some((d) => d.count > 0) && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Entries by Weekday
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[...weekdayFreq].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ top: 6, right: 16, bottom: 0, left: 0 }}
                    barCategoryGap="26%"
                  >
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 12, fontFamily: mono }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Entries"]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={isDesktop ? 16 : 12} fill={palette.goldBright} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

{sessionByDay.length > 0 && (() => {
  const sessionFreq = journalSessionFrequency(journalRows);
  const totalEntries = sessionFreq.reduce((sum, s) => sum + s.count, 0);
  return (
    <div>
      <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}>
        Session Breakdown
      </span>
      <div className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
        <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={sessionFreq}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={isDesktop ? 52 : 34}
                outerRadius={isDesktop ? 86 : 56}
                paddingAngle={2}
              >
                {sessionFreq.map((s) => (
                  <Cell key={s.id} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "13px" }}
                labelStyle={{ color: palette.textMuted }}
                itemStyle={{ color: palette.text }}
                formatter={(v, n) => [`${v} entr${v === 1 ? "y" : "ies"}`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {sessionFreq.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="uppercase" style={{ color: palette.textFaint, fontSize: "12px", letterSpacing: "0.07em" }}>Session</span>
              <span className="uppercase" style={{ color: palette.textFaint, fontSize: "12px", letterSpacing: "0.07em" }}>Total</span>
            </div>
            {sessionFreq.map((s) => (
              <div key={s.id} className="flex items-center gap-2 mb-1.5">
                <span style={{ width: "64px", fontSize: "12px", fontFamily: mono, color: s.color, fontWeight: 600, flexShrink: 0 }}>
                  {s.label}
                </span>
                <div className="flex-1" style={{ height: "5px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${totalEntries ? (s.count / totalEntries) * 100 : 0}%`,
                      background: s.color,
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span style={{ fontFamily: mono, fontSize: "12px", color: palette.textMuted, flexShrink: 0, minWidth: "28px", textAlign: "right" }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
        Share of all logged entries by session — hover a slice for the count, progress strips below break down the same totals.
      </p>
    </div>
  );
})()}
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        {confidenceByDay.length > 1 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Confidence by Day
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
                <ResponsiveContainer>
                  <LineChart data={confidenceByDay} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={54}
                      domain={[1, 3]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(v) => (v === 1 ? "Low" : v === 2 ? "Medium" : "High")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.goldBright }}
                      formatter={(v) => [
                        v === 1 ? "Low" : v === 2 ? "Medium" : v === 3 ? "High" : v.toFixed(2),
                        "Confidence",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgConfidence"
                      stroke={palette.gold}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Average confidence level logged per day (Low / Medium / High) \u2014 a dip here alongside a losing
              streak can be worth a closer look.
            </p>
          </div>
        )}

        {trendBreakdown.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Trend Breakdown
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={trendBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {trendBreakdown.map((d, i) => (
                        <Cell key={d.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.text }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: mono, fontSize: "12px", color: palette.textMuted }}
                      formatter={(v) => <span style={{ color: palette.textMuted }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        {rrSeries.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              R-Multiple Over Time
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
                <ResponsiveContainer>
                  <LineChart data={rrSeries} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" hide />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={32}
                    />
                    <ReferenceLine y={0} stroke={palette.textFaint} />
                    <Tooltip
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.goldBright }}
                      formatter={(v) => [`${v.toFixed(2)}R`, "R-Multiple"]}
                      labelFormatter={() => ""}
                    />
                    <Line
                      type="monotone"
                      dataKey="rr"
                      stroke={palette.gold}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Each logged trade's R-multiple, in order \u2014 climbing above the zero line more often than not
              is what a positive edge looks like over time.
            </p>
          </div>
        )}

        {rrDist.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              R-Multiple Distribution
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
                <ResponsiveContainer>
                  <BarChart data={rrDist} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Trades"]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} fill={palette.goldBright} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              How many trades landed in each R-multiple range \u2014 a healthy edge usually skews toward the
              right side of this chart.
            </p>
          </div>
        )}
        </div>

        {setupRadarData.rows.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Setup Breakdown
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: Math.max(isDesktop ? 220 : 140, setupRadarData.rows.length * (isDesktop ? 44 : 34)) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[...setupRadarData.rows].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={92}
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textMuted, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.text }}
                      formatter={(v) => [`${v}`, "Entries"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} fill={palette.gold} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

{combinedMistakeRows.length > 0 && (
  <>
    {patternDetected ? (
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: palette.surface, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} style={{ color: palette.red }} />
          <span className="uppercase" style={{ color: palette.red, letterSpacing: "0.08em", fontSize: "12px" }}>
            Pattern Detected
          </span>
        </div>
        <div style={{ color: palette.text, fontSize: "14px" }}>
          {mistakePatterns.worstTrends.length > 0 && mistakePatterns.worstTrends[0].mistakeRate >= 30 && (
            <>
              You log a mistake {mistakePatterns.worstTrends[0].mistakeRate}% of the time in{" "}
              {joinWithAnd(mistakePatterns.worstTrends.map((t) => t.label.toLowerCase()))} conditions.{" "}
            </>
          )}
          {mistakePatterns.worstWeekdays.length > 0 && mistakePatterns.worstWeekdays[0].mistakeRate >= 30 && (
            <>
              {joinWithAnd(mistakePatterns.worstWeekdays.map((w) => `${w.fullLabel}s`))}{" "}
              {mistakePatterns.worstWeekdays.length > 1 ? "are" : "is"} your worst day
              {mistakePatterns.worstWeekdays.length > 1 ? "s" : ""}.
            </>
          )}
        </div>
      </div>
    ) : (
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} style={{ color: palette.textFaint }} />
          <span className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "12px" }}>
            No Strong Pattern Yet
          </span>
        </div>
        <div style={{ color: palette.textMuted, fontSize: "14px" }}>
          {closestWeekday
            ? `${closestWeekday.fullLabel} currently has your highest mistake rate at ${closestWeekday.mistakeRate}%${
                closestWeekday.count < 3
                  ? `, but it only has ${closestWeekday.count} entr${closestWeekday.count === 1 ? "y" : "ies"} so far — a weekday needs at least 3 journaled entries before a pattern counts`
                  : ", which is under the 30% threshold that flags a real pattern"
              }.`
            : "Fill in the Mistake field on a few more journal rows — once a weekday or market condition has at least 3 entries, patterns will start surfacing here."}
        </div>
      </div>
    )}

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Mistake Rate by Trend & Weekday
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                <ResponsiveContainer>
                  <BarChart data={combinedMistakeRows} margin={{ top: 6, right: 8, bottom: 8, left: 0 }} barCategoryGap="25%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={46}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={30}
                      unit="%"
                    />
                    <Tooltip
                      {...barTooltipProps}
                      formatter={(v, name, props) => [`${v}%`, props.payload.group]}
                    />
                    <Bar dataKey="mistakeRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                      {combinedMistakeRows.map((r, i) => (
                        <Cell key={i} fill={r.mistakeRate >= 50 ? palette.red : r.mistakeRate >= 25 ? palette.gold : palette.green} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Percent of entries with a mistake logged, grouped by market condition and by day of week – this is
              where to look for a habit to fix, not just a setup to favor.
            </p>
          </>
        )}

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "contents"}>
        {mistakeFreq.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Recurring Mistakes
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: Math.max(isDesktop ? 220 : 140, mistakeFreq.length * (isDesktop ? 44 : 34)) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={mistakeFreq}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textMuted, fontSize: 11, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Count"]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} fill={palette.red} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {pairFreq.length > 0 && (
          <div>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "12px" }}
            >
              Most Journaled Pairs
            </span>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {pairFreq.map((p) => (
                <StatChip key={p.pair} label={p.pair} value={`${p.count} entr${p.count === 1 ? "y" : "ies"}`} />
              ))}
            </div>
          </div>
        )}
        </div>

        <p className="text-xs mt-4" style={{ color: palette.textFaint }}>
          These charts read straight from your Journal tab rows, add or fill in more rows there to sharpen the
          picture here.
        </p>
      </>
    );

    const coachSection = !session?.token ? (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
      >
        <Sparkles size={28} style={{ color: palette.gold, margin: "0 auto 10px" }} />
        <p className="text-sm mb-1" style={{ color: palette.text, fontWeight: 600 }}>
          Sign in to use the AI Coach
        </p>
        <p className="text-xs" style={{ color: palette.textFaint }}>
          The Coach reads your own trade stats and answers questions about them \u2014 sign in from the Community tab
          first.
        </p>
      </div>
    ) : (
      <div className="flex flex-col" style={{ minHeight: "420px" }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => setCoachHistoryOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 min-w-0 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "13px",
              maxWidth: "70%",
            }}
            aria-label="Saved chats"
          >
            <Clock size={14} style={{ flexShrink: 0, color: palette.textMuted }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {coachChats.find((c) => c.id === coachChatId)?.title || "New chat"}
            </span>
            <ChevronDown size={14} style={{ flexShrink: 0, color: palette.textMuted }} />
          </button>
          <button
            type="button"
            onClick={newCoachChat}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              opacity: coachChats.length >= coachChatsMax ? 0.6 : 1,
            }}
          >
            <Plus size={14} />
            New chat
          </button>
        </div>

        {coachHistoryOpen && (
          <div
            className="rounded-2xl p-2 mb-3"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            {coachChats.length === 0 ? (
              <p className="text-xs px-2 py-3" style={{ color: palette.textFaint }}>
                No saved chats yet — your conversations are saved automatically.
              </p>
            ) : (
              coachChats.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2"
                  style={{ background: c.id === coachChatId ? palette.field : "transparent" }}
                >
                  <button
                    type="button"
                    onClick={() => openCoachChat(c.id)}
                    className={`flex-1 min-w-0 text-left ${TAP}`}
                    style={{ color: palette.text, fontFamily: mono, fontSize: "13px" }}
                  >
                    <span className="block" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </span>
                    <span className="block" style={{ color: palette.textFaint, fontSize: "12px" }}>
                      {new Date(c.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </button>
                  {coachDeleteConfirmId === c.id ? (
                    <button
                      type="button"
                      onClick={() => deleteCoachChat(c.id)}
                      className={`rounded-md px-2 py-1 ${TAP}`}
                      style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "12px", fontWeight: 600 }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoachDeleteConfirmId(c.id)}
                      className={TAP}
                      style={{ color: palette.textFaint, padding: "4px" }}
                      aria-label="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
            <p className="text-xs px-2 pt-2" style={{ color: palette.textFaint }}>
              {coachChats.length}/{coachChatsMax} saved chats
            </p>
          </div>
        )}

        <div
          ref={coachScrollRef}
          className="rounded-2xl p-4 mb-3 flex-1 flex flex-col gap-3"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            minHeight: "320px",
            maxHeight: "520px",
            overflowY: "auto",
          }}
        >
          {coachMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <Sparkles size={24} style={{ color: palette.textFaint, marginBottom: "8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "260px" }}>
                Chat about anything, or ask about your setups, moods, and patterns - e.g. "What's my best setup?"
                or "Explain risk of ruin".
              </p>
            </div>
          ) : (
            coachMessages.map((m) => (
              <div
                key={m.id}
                className="rounded-xl px-3 py-2"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.role === "user" ? palette.gold : palette.field,
                  color: m.role === "user" ? palette.letterbox : palette.text,
                  fontSize: "14px",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))
          )}
          {coachLoading && (
            <div
              className="rounded-xl px-3 py-2"
              style={{ alignSelf: "flex-start", background: palette.field, color: palette.textFaint, fontSize: "14px" }}
            >
              Thinking...
            </div>
          )}
        </div>

        {coachError && (
          <p className="text-xs mb-2" style={{ color: palette.red }}>
            {coachError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={coachInput}
            onChange={(e) => {
              setCoachInput(e.target.value);
              pokeCrab("type");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendCoachMessage();
              }
            }}
            placeholder="Message the Coach..."
            disabled={coachLoading}
            className="flex-1 rounded-lg px-3 py-2.5"
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              pokeCrab("tap", { say: "" });
              sendCoachMessage(e);
            }}
            disabled={coachLoading || !coachInput.trim()}
            className={`rounded-lg px-4 py-2.5 flex items-center justify-center ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              opacity: coachLoading || !coachInput.trim() ? 0.6 : 1,
            }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>

        {coachRemaining !== null && (
          <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
            {coachRemaining > 0
              ? `${coachRemaining} message${coachRemaining === 1 ? "" : "s"} left today.`
              : "Daily limit reached \u2014 resets at midnight UTC."}
          </p>
        )}
      </div>
    );

    body = (
      <div className={isDesktop ? "insights-desktop-redesign" : ""}>
        {isDesktop && (
          <style>{`
            .insights-desktop-redesign {
              max-width: 1180px;
              margin: 0 auto;
            }
            .insights-desktop-redesign span.block.uppercase {
              font-family: ${display} !important;
              font-size: 13.5px !important;
              text-transform: none !important;
              letter-spacing: 0 !important;
              font-weight: 700 !important;
              color: ${palette.text} !important;
              margin-top: 32px !important;
              margin-bottom: 14px !important;
              display: block !important;
            }
            .insights-desktop-redesign > span.block.uppercase:first-child,
            .insights-desktop-redesign > *:first-child span.block.uppercase:first-child {
              margin-top: 0 !important;
            }
            .insights-desktop-redesign .rounded-2xl {
              border-radius: 20px !important;
              transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease !important;
            }
            .insights-desktop-redesign .rounded-2xl:hover {
              border-color: ${palette.gold}55 !important;
              box-shadow: 0 16px 36px rgba(0,0,0,0.16) !important;
              transform: translateY(-1px);
            }
          `}</style>
        )}
        {insightsSubNav}
        {insightsSubTab === "overview" && overviewSection}
        {insightsSubTab === "behavior" && behaviorSection}
        {insightsSubTab === "journal" && journalSection}
        {insightsSubTab === "coach" && coachSection}

        {insightsSubTab !== "journal" && insightsSubTab !== "coach" && hasData && (
          <>
            <button
              type="button"
              onClick={(e) => {
                pokeCrab("save");
                exportInsightsReport(e);
              }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mt-2 mb-2 ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "14px",
                fontWeight: 600,
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Download size={16} />
              Download Report
            </button>
            {insightReportMsg && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                {insightReportMsg}
              </p>
            )}
          </>
        )}
      </div>
    );
  
  return body;
}
