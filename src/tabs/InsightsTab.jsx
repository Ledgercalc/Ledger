import { pokeCrab } from "../lib/mascot.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingTip } from "../components/onboarding.jsx";
import { PlanLockCard } from "../components/PlansModal.jsx";
import { hasFeature } from "../data/plans.js";
import { useMyPlan } from "../lib/planStore.js";
import { Readout, StatChip } from "../components/ui.jsx";
import { METRIC_INFO, MIN_TRADES_FOR_TIERS, computeConsistencyScore, computeDisciplineGrade, computeDisciplineStreakTrend, computeHeadlineInsight, computeHeatmapWeeks, computeInsights, computeJournalCompleteness, computeMonthComparison, computeNoteTagAnalysis, computeOverconfidenceCheck, computePerformanceMetrics, computeRevengeCostSplit, tierColor } from "../lib/analytics.js";
import { EMOTIONS, SETUPS } from "../lib/constants.js";
import { MARKET_SESSIONS } from "../lib/sessions.js";
import { CONFIDENCE_MAX, bySession, bySetup, byConfidence, byMood, byPair, byWeekday, dailySeries, findPatterns, tagCoverage } from "../lib/tradeInsights.js";
import { WEEKDAY_LABELS, fmtMoney, formatDayLabel } from "../lib/format.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Lightbulb, Plus, Send, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


// ───────────────────────── Patterns tab building blocks ─────────────────────────
// Everything on the Patterns tab is computed from logged trades. Nothing here needs the Journal sheet.

const FEW_TRADES = 3; // groups smaller than this are shown, but flagged as too thin to trust

function PatternHeading({ children, hint }) {
  return (
    <div className="mt-8 mb-3">
      <h3 style={{ color: palette.text, fontFamily: display, fontSize: "15px", fontWeight: 700, margin: 0 }}>{children}</h3>
      {hint && (
        <p className="text-xs" style={{ color: palette.textFaint, marginTop: "2px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// One row per group: label, net P&L, a bar that grows left-to-right with the size of the result, then the vital stats.
function EdgeRows({ rows, signed, emptyText }) {
  if (!rows.length) {
    return (
      <p className="text-xs" style={{ color: palette.textFaint }}>
        {emptyText}
      </p>
    );
  }
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div>
      {rows.map((r, i) => {
        const win = r.pnl >= 0;
        const color = win ? palette.green : palette.red;
        return (
          <div key={r.id} style={{ marginBottom: i === rows.length - 1 ? 0 : "14px" }}>
            <div className="flex items-baseline justify-between" style={{ gap: "8px" }}>
              <span style={{ color: palette.text, fontSize: "14px", minWidth: 0 }} className="truncate">
                {r.emoji ? `${r.emoji} ` : ""}
                {r.label}
              </span>
              <span style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, color, flexShrink: 0 }}>{signed(r.pnl)}</span>
            </div>
            <div style={{ height: "6px", borderRadius: "999px", background: palette.field, margin: "6px 0 4px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(3, (Math.abs(r.pnl) / maxAbs) * 100)}%`,
                  background: color,
                  borderRadius: "999px",
                }}
              />
            </div>
            <div style={{ color: palette.textFaint, fontSize: "12px" }}>
              {r.count} trade{r.count === 1 ? "" : "s"}, {r.winRate.toFixed(0)}% win rate, {signed(r.avg)} per trade
              {r.count < FEW_TRADES && <span style={{ color: palette.textMuted }}> (too few to judge)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatternCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
    >
      {children}
    </div>
  );
}

// How much of the log carries each tag. Low coverage means the charts below are guessing.
function CoverageMeter({ label, pct }) {
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: "5px" }}>
        <span style={{ color: palette.textMuted, fontSize: "12px" }}>{label}</span>
        <span style={{ fontFamily: mono, fontSize: "12px", color: pct >= 70 ? palette.green : pct >= 30 ? palette.text : palette.textFaint }}>{pct}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: palette.gold, borderRadius: "999px", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

export default function InsightsTab(props) {
  const myPlan = useMyPlan();
  const [heatMonthOffset, setHeatMonthOffset] = useState(0); // 0 = latest month, 1 = the month before, ...
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
    insightsSubTab: insightsSubTabProp,
    isDesktop,
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
    settings,
    trades
  } = props;
  // "journal" was this tab's old name. People who saved it as their default land on Patterns.
  const insightsSubTab = insightsSubTabProp === "journal" ? "patterns" : insightsSubTabProp;
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
    const heatmapWeeksBack = Number(settings.heatmapWeeksBack) || 26;
    // All of these loop over every trade / journal row. They used to re-run on EVERY render (each keystroke in
    // the coach box, each App update), which is what made opening Insights hang. Now they only re-run when
    // the underlying data actually changes.
    const {
      insights, heatmap, headline, perf, monthCmp, completeness, grade, revengeCost, overconfidence,
      disciplineTrend, noteTags, consistency, patterns,
    } = useMemo(() => {
      const setupLabel = (id) => [...SETUPS, ...(customSetups || [])].find((x) => x.id === id)?.label;
      const sessionLabel = (id) => MARKET_SESSIONS.find((x) => x.id === id)?.label;
      const moodMeta = (id) => [...EMOTIONS, ...(customMoods || [])].find((x) => x.id === id);
      const setupRows = bySetup(trades, setupLabel);
      const sessionRows = bySession(trades, sessionLabel);
      const moodRows = byMood(trades, moodMeta);
      const pairRows = byPair(trades);
      const dayRows = byWeekday(trades);
      const confRows = byConfidence(trades);
      return {
        insights: computeInsights(trades, customSetups, customMoods),
        heatmap: computeHeatmapWeeks(trades, heatmapWeeksBack),
        headline: computeHeadlineInsight(trades, customSetups, customMoods),
        perf: computePerformanceMetrics(trades),
        monthCmp: computeMonthComparison(trades),
        completeness: computeJournalCompleteness(trades),
        grade: computeDisciplineGrade(trades),
        revengeCost: computeRevengeCostSplit(trades),
        overconfidence: computeOverconfidenceCheck(trades),
        disciplineTrend: computeDisciplineStreakTrend(trades),
        noteTags: computeNoteTagAnalysis(trades),
        consistency: computeConsistencyScore(trades),
        patterns: {
          setupRows, sessionRows, moodRows, confRows, dayRows,
          pairRows: pairRows.slice(0, 6),
          coverage: tagCoverage(trades),
          daily: dailySeries(trades, 30),
          findings: findPatterns(trades, { setupRows, sessionRows, moodRows, pairRows, dayRows, confRows }, fmtMoney),
        },
      };
    }, [trades, customSetups, customMoods, heatmapWeeksBack]);
    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const barTooltipProps = {
      cursor: false,
      contentStyle: {
        background: palette.field,
        border: `1px solid ${palette.border}`,
        borderRadius: "8px",
        fontFamily: mono,
        fontSize: "12px",
      },
      labelStyle: { color: palette.textMuted },
      itemStyle: { color: palette.text },
    };
    const THIN_BAR_SIZE = 14;
    const PIE_COLORS = [palette.gold, palette.green, palette.red, palette.textMuted, palette.goldBright];

    const INSIGHTS_SUB_TABS = [
      { id: "overview", label: "Overview" },
      { id: "behavior", label: "Behavior" },
      { id: "patterns", label: "Patterns" },
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
          paddingTop: "14px",
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
                fontSize: "14.5px",
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
          paddingBottom: "8px",
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
                  padding: "8px 4px",
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
          <span className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}>
            {label}
          </span>
          <span
            style={{
              fontSize: "9px",
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
        No trades yet. Insights appear once you start logging trades in the Journal tab.
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
          {(() => {
            // Month calendar heatmap: big rounded day tiles with the date and that day's P/L.
            const HEAT_GREEN = "#22b85c";
            const HEAT_RED = "#e5483f";
            const keyParts = (day) => {
              const k = String(day?.key || "");
              const m = k.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
              const dt = new Date(day?.key);
              return Number.isNaN(dt.getTime()) ? null : { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
            };
            const ymOf = (pt) => pt.y * 12 + pt.m;
            const heatMoney = (n) => {
              const a = Math.abs(n);
              const body = a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(Math.round(a));
              return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${body}`;
            };
            let minYm = Infinity;
            let maxYm = -Infinity;
            heatmap.weeks.forEach((w) => w.forEach((d) => {
              if (d.future) return;
              const pt = keyParts(d);
              if (!pt) return;
              minYm = Math.min(minYm, ymOf(pt));
              maxYm = Math.max(maxYm, ymOf(pt));
            }));
            if (!Number.isFinite(maxYm)) { const now = new Date(); minYm = maxYm = now.getFullYear() * 12 + now.getMonth(); }
            const offset = Math.min(Math.max(heatMonthOffset, 0), maxYm - minYm);
            const selYm = maxYm - offset;
            const monthWeeks = heatmap.weeks.filter((w) => w.some((d) => { const pt = keyParts(d); return pt && ymOf(pt) === selYm; }));
            const monthLabel = new Date(Math.floor(selYm / 12), selYm % 12, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
            let monthTotal = 0;
            let monthTradedDays = 0;
            monthWeeks.forEach((w) => w.forEach((d) => {
              const pt = keyParts(d);
              if (pt && ymOf(pt) === selYm && !d.future && d.pnl !== null) { monthTotal += d.pnl; monthTradedDays += 1; }
            }));
            const navBtn = (enabled) => ({
              width: "30px", height: "30px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
              background: palette.field, border: `1px solid ${palette.border}`, color: enabled ? palette.text : palette.textFaint,
              opacity: enabled ? 1 : 0.4, cursor: enabled ? "pointer" : "default",
            });
            const gap = isDesktop ? "8px" : "5px";
            return (
              <div style={{ maxWidth: isDesktop ? "520px" : "100%", margin: "0 auto" }}>
                <div className="flex items-center justify-between mb-3" style={{ gap: "8px" }}>
                  <button type="button" aria-label="Previous month" disabled={offset >= maxYm - minYm} onClick={() => setHeatMonthOffset(offset + 1)} style={navBtn(offset < maxYm - minYm)}>
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-center" style={{ minWidth: 0 }}>
                    <div style={{ color: palette.text, fontFamily: display, fontSize: isDesktop ? "18px" : "16px", fontWeight: 800 }}>{monthLabel}</div>
                    <div style={{ color: monthTradedDays ? (monthTotal >= 0 ? palette.green : palette.red) : palette.textFaint, fontFamily: mono, fontSize: "11px", fontWeight: 700 }}>
                      {monthTradedDays ? `${heatMoney(monthTotal)} · ${monthTradedDays} trading day${monthTradedDays === 1 ? "" : "s"}` : "No trades this month"}
                    </div>
                  </div>
                  <button type="button" aria-label="Next month" disabled={offset <= 0} onClick={() => setHeatMonthOffset(offset - 1)} style={navBtn(offset > 0)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap, marginBottom: gap }}>
                  {WEEKDAY_LABELS.map((w, i) => (
                    <div key={i} className="text-center" style={{ color: palette.textFaint, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}>{w}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap }}>
                  {monthWeeks.map((week) => week.map((day, di) => {
                    const pt = keyParts(day);
                    if (!pt) return <div key={`${day.key}-${di}`} style={{ aspectRatio: "1 / 1" }} />;
                    const inMonth = ymOf(pt) === selYm;
                    const hasPnl = inMonth && !day.future && day.pnl !== null;
                    const win = hasPnl && day.pnl > 0;
                    const loss = hasPnl && day.pnl < 0;
                    const intensity = hasPnl && heatmap.maxAbs > 0 ? Math.min(1, Math.abs(day.pnl) / heatmap.maxAbs) : 0;
                    const strong = (win || loss) && intensity >= 0.5;
                    const bg = win ? (strong ? HEAT_GREEN : `${HEAT_GREEN}59`) : loss ? (strong ? HEAT_RED : `${HEAT_RED}59`) : palette.field;
                    const numColor = strong ? "#FFFFFF" : inMonth ? palette.text : palette.textFaint;
                    const pnlColor = strong ? "#FFFFFF" : win ? palette.green : palette.red;
                    const selected = expandedHeatmapDay?.key === day.key;
                    return (
                      <div
                        key={day.key || `${pt.y}-${pt.m}-${pt.d}`}
                        role={hasPnl ? "button" : undefined}
                        onClick={() => hasPnl && setExpandedHeatmapDay(selected ? null : day)}
                        style={{
                          aspectRatio: "1 / 1",
                          borderRadius: isDesktop ? "14px" : "10px",
                          background: bg,
                          opacity: inMonth ? (day.future ? 0.55 : 1) : 0.35,
                          boxShadow: selected ? `0 0 0 2px ${palette.gold}` : "none",
                          cursor: hasPnl ? "pointer" : "default",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1.15,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ color: numColor, fontFamily: display, fontSize: isDesktop ? "18px" : "15px", fontWeight: 800 }}>{pt.d}</span>
                        {hasPnl && day.pnl !== 0 && (
                          <span style={{ color: pnlColor, fontFamily: mono, fontSize: isDesktop ? "11px" : "9.5px", fontWeight: 700, marginTop: "1px", maxWidth: "100%", whiteSpace: "nowrap" }}>
                            {heatMoney(day.pnl)}
                          </span>
                        )}
                      </div>
                    );
                  }))}
                </div>
              </div>
            );
          })()}
        </div>
        {expandedHeatmapDay ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            {formatDayLabel(expandedHeatmapDay.key)}: {expandedHeatmapDay.pnl >= 0 ? "+" : "-"}$
            {fmtMoney(expandedHeatmapDay.pnl)}
          </p>
        ) : (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap a day for its total. Use the arrows to browse months.
          </p>
        )}

        {headline && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: palette.surface, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={14} style={{ color: palette.gold }} />
              <span className="uppercase" style={{ color: palette.gold, letterSpacing: "0.08em", fontSize: "10px" }}>
                Headline Insight
              </span>
            </div>
            <div style={{ color: palette.text, fontSize: "13px" }}>{headline}</div>
          </div>
        )}

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
                <span style={{ color: palette.textMuted, fontSize: "12px" }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text }}>{row.fmt(row.thisV)}</span>
                  <span style={{ fontSize: "11px", color: flat || monthCmp.lastMonth.count === 0 ? palette.textFaint : up ? palette.green : palette.red }}>
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Journal Completeness
        </span>
        <div
          className="rounded-2xl p-4 mb-2"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: mono, fontSize: "1.3rem", color: palette.text }}>{completeness}%</span>
            <span style={{ fontSize: "11px", color: palette.textFaint }}>note + setup + screenshot</span>
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
        No trades yet. Behavior stats appear once you start logging trades in the Journal tab.
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
              <div style={{ color: palette.text, fontSize: "13px", marginBottom: "4px" }}>
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
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
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
                        fontSize: "12px",
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
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
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
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
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
                  <div style={{ color: palette.text, fontSize: "14px" }}>{r.label}</div>
                  <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                    {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                  </div>
                </div>
                <span style={{ fontFamily: mono, fontSize: "13px", color: r.pnl >= 0 ? palette.green : palette.red }}>
                  {fmtSigned(r.pnl)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Pick a Setup when you log a trade to see setup performance here.
          </p>
        )}
        </div>

        <div>
        {insights.moodRows.length > 0 && (
          <>
            <span
              className="block mt-4 mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
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
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
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
                  <div style={{ color: palette.text, fontSize: "14px" }}>
                    {r.emoji} {r.label}
                  </div>
                  <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                    {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                  </div>
                </div>
                <span style={{ fontFamily: mono, fontSize: "13px", color: r.pnl >= 0 ? palette.green : palette.red }}>
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

    const patternsSection = !hasData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet. Log a trade with its setup, session and confidence and your patterns show up here.
      </p>
    ) : (
      <>
        <OnboardingTip
          id="insights-patterns-intro"
          text="Patterns are built from the trades you log. Tag a trade with its setup, session, confidence and mood and this tab shows where you win and where you leak."
          settings={settings}
          persistSettings={persistSettings}
        />

        <PatternHeading hint="The clearest things your own trades are telling you right now.">What your trades say</PatternHeading>
        {patterns.findings.length > 0 ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: isDesktop ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
            {patterns.findings.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  borderLeft: `4px solid ${f.tone === "good" ? palette.green : palette.red}`,
                  boxShadow: palette.shadow,
                }}
              >
                <div style={{ color: palette.text, fontSize: "14px", fontWeight: 700, marginBottom: "3px" }}>{f.title}</div>
                <div style={{ color: palette.textMuted, fontSize: "13px" }}>{f.detail}</div>
              </div>
            ))}
          </div>
        ) : (
          <PatternCard>
            <p className="text-xs" style={{ color: palette.textFaint }}>
              Nothing stands out yet. Findings need at least {FEW_TRADES} trades in a group and two groups to compare, so keep tagging setup, session and mood on each trade.
            </p>
          </PatternCard>
        )}

        <PatternHeading hint="Tags are optional, but charts only see the trades that carry them.">How much of your log is tagged</PatternHeading>
        <PatternCard>
          <div className="grid gap-4" style={{ gridTemplateColumns: isDesktop ? "repeat(4, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))" }}>
            <CoverageMeter label="Setup" pct={patterns.coverage.setup} />
            <CoverageMeter label="Session" pct={patterns.coverage.session} />
            <CoverageMeter label="Confidence" pct={patterns.coverage.confidence} />
            <CoverageMeter label="Mood" pct={patterns.coverage.mood} />
          </div>
        </PatternCard>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : ""}>
          <div>
            <PatternHeading hint="Net result for each kind of trade you take.">Setups</PatternHeading>
            <PatternCard>
              <EdgeRows rows={patterns.setupRows} signed={fmtSigned} emptyText="Pick a setup when you log a trade to compare them here." />
            </PatternCard>
          </div>
          <div>
            <PatternHeading hint="Which part of the market day pays you.">Sessions</PatternHeading>
            <PatternCard>
              <EdgeRows rows={patterns.sessionRows} signed={fmtSigned} emptyText="Pick a session when you log a trade to compare them here." />
            </PatternCard>
          </div>
        </div>

        <PatternHeading hint={`Rate each trade from 1 to ${CONFIDENCE_MAX} before you take it, then see if feeling sure ever matched being right.`}>
          Confidence against results
        </PatternHeading>
        <PatternCard>
          <EdgeRows rows={patterns.confRows} signed={fmtSigned} emptyText="Set the confidence meter when you log a trade to see this." />
        </PatternCard>

        <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : ""}>
          <div>
            <PatternHeading>Mood</PatternHeading>
            <PatternCard>
              <EdgeRows rows={patterns.moodRows} signed={fmtSigned} emptyText="Tag how you felt on a trade to see its effect here." />
            </PatternCard>
          </div>
          <div>
            <PatternHeading>Day of the week</PatternHeading>
            <PatternCard>
              <EdgeRows rows={patterns.dayRows} signed={fmtSigned} emptyText="Log a few trades to see your weekdays." />
            </PatternCard>
          </div>
        </div>

        {patterns.pairRows.length > 0 && (
          <>
            <PatternHeading hint="Your six biggest movers by net result.">Pairs</PatternHeading>
            <PatternCard>
              <EdgeRows rows={patterns.pairRows} signed={fmtSigned} emptyText="" />
            </PatternCard>
          </>
        )}

        {patterns.daily.length > 1 && (
          <>
            <PatternHeading hint="Net result per trading day, most recent 30 days you traded.">Daily results</PatternHeading>
            <PatternCard>
              <div style={{ width: "100%", height: isDesktop ? 220 : 150 }}>
                <ResponsiveContainer>
                  <BarChart data={patterns.daily} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} interval="preserveStartEnd" />
                    <YAxis stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={36} />
                    <ReferenceLine y={0} stroke={palette.border} />
                    <Tooltip {...barTooltipProps} formatter={(v) => [fmtSigned(v), "Net"]} />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]} activeBar={false}>
                      {patterns.daily.map((d, i) => (
                        <Cell key={i} fill={d.pnl >= 0 ? palette.green : palette.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PatternCard>
          </>
        )}
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
      <div className="flex flex-col" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <div className="flex items-center justify-between gap-2 mb-3" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setCoachHistoryOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 min-w-0 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "12.5px",
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
              fontSize: "12.5px",
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
                    style={{ color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
                  >
                    <span className="block" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </span>
                    <span className="block" style={{ color: palette.textFaint, fontSize: "10.5px" }}>
                      {new Date(c.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </button>
                  {coachDeleteConfirmId === c.id ? (
                    <button
                      type="button"
                      onClick={() => deleteCoachChat(c.id)}
                      className={`rounded-md px-2 py-1 ${TAP}`}
                      style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "11px", fontWeight: 600 }}
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
            minHeight: 0,
            maxHeight: isDesktop ? undefined : "max(170px, calc(100dvh - 390px - env(safe-area-inset-bottom, 0px)))",
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
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
                  fontSize: "13.5px",
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
              style={{ alignSelf: "flex-start", background: palette.field, color: palette.textFaint, fontSize: "13px" }}
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
              fontSize: "13.5px",
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

    // Coach is a fixed, non-scrolling screen: the page itself never scrolls, only the message list does.
    const coachFixed = insightsSubTab === "coach";
    body = (
      <div
        className={isDesktop ? "insights-desktop-redesign" : ""}
        style={coachFixed ? { display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, width: "100%" } : undefined}
      >
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
        {insightsSubTab === "behavior" && (hasFeature(myPlan.plan, "behaviorInsights") ? behaviorSection : <PlanLockCard title="Behaviour insights" plan="pro" blurb="See how emotions, setups and habits shape your results." />)}
        {insightsSubTab === "patterns" && (hasFeature(myPlan.plan, "journalInsights") ? patternsSection : <PlanLockCard title="Pattern insights" plan="pro" blurb="See which setups, sessions and confidence levels make or lose you money." />)}
        {insightsSubTab === "coach" && coachSection}

        {insightsSubTab !== "coach" && hasData && (
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
                fontSize: "13px",
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
