import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import { Field, Readout, StatChip } from "../components/ui.jsx";
import { computeDisciplineStreak, computeRevengeIds } from "../lib/analytics.js";
import { EMOTIONS, MAX_CUSTOM_SETUPS, NOTE_TAGS, RUNTIME, SETUPS, emotionMeta } from "../lib/constants.js";
import { MONTH_NAMES, WEEKDAY_LABELS, dayKeyFromDate, dayKeyFromTs, fmt, fmtMoney, formatDayLabel, num, pad2 } from "../lib/format.js";
import { SCREENSHOT_MAX_PER_TRADE, tradeScreenshots } from "../lib/images.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { Camera, Check, ChevronLeft, ChevronRight, Copy, Download, FileText, Pencil, Plus, Share2, Trash2, TrendingUp, Upload, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Stable references so recharts never sees new prop identities on re-render.
const CHART_MARGIN = { top: 6, right: 8, bottom: 0, left: 0 };
// Phones: the Y-axis label column is narrower and nudged left so the plot lines up with the card padding.
const CHART_MARGIN_MOBILE = { top: 6, right: 6, bottom: 0, left: -8 };
const ACTIVE_DOT = { r: 4 };
const DRAW_MS = 1400;

// The draw-on effect is a plain CSS left-to-right reveal on the chart wrapper. It does not
// depend on recharts' internal animation (which skips to the finished line whenever the
// container is measured late or props change). fill-mode "backwards" means the clip is gone
// once it finishes, so tooltips are never cut off afterwards.
const CURVE_REVEAL_CSS = `
@keyframes curveReveal {
  from { clip-path: inset(-12px 100% -12px -12px); }
  to   { clip-path: inset(-12px -12px -12px -12px); }
}
.curve-reveal { animation: curveReveal ${DRAW_MS}ms cubic-bezier(0.4, 0, 0.2, 1) 120ms backwards; }
@media (prefers-reduced-motion: reduce) { .curve-reveal { animation: none; } }
`;

export default function CurveTab(props) {
  const {
    backupMsg,
    calMonth,
    cancelEditTrade,
    cancelImport,
    clearTrades,
    confirmImport,
    copyFallbackText,
    copyMsg,
    copyWeekSummary,
    customMoods,
    customMoodsLoaded,
    customSetups,
    customSetupsLoaded,
    deleteTrade,
    editingTradeId,
    expandedTradeId,
    exportBackup,
    fileInputRef,
    findSetupLabel,
    generateWeeklyShare,
    handleScreenshotChange,
    importBackup,
    isDesktop,
    logFormRef,
    openScreenshotPicker,
    pendingImport,
    persistSettings,
    persistStartingBalance,
    screenshotError,
    screenshotInputRef,
    screenshotSaving,
    screenshotTargetId,
    selectedDay,
    setCalMonth,
    setCopyFallbackText,
    setExpandedTradeId,
    setPendingScreenshotDelete,
    setSelectedDay,
    setShowDisciplineInfo,
    setShowStreakInfo,
    setStatementPeriod,
    setTradeEmotion,
    setTradeInput,
    setTradeNote,
    setTradePair,
    setTradeSetup,
    setViewingScreenshot,
    settings,
    shareError,
    shareImageFile,
    showDisciplineInfo,
    showStreakInfo,
    startEditTrade,
    startingBalance,
    submitTrade,
    tradeEmotion,
    tradeInput,
    tradeNote,
    tradePair,
    tradeSetup,
    trades,
    tradesLoadError,
    tradesLoaded
  } = props;
  const chartData = useMemo(() => {
    const start = num(startingBalance);
    let run = start;
    const out = [{ trade: 0, equity: start }];
    trades.forEach((t, i) => {
      run += t.pnl;
      out.push({ trade: i + 1, equity: run });
    });
    return out;
  }, [trades, startingBalance]);

  // Memoised so the axis domain keeps the same identity between renders.
  const yDomain = useMemo(() => {
    const start = num(startingBalance);
    let run = start;
    let peakBal = start;
    let dd = 0;
    trades.forEach((t) => {
      run += t.pnl;
      peakBal = Math.max(peakBal, run);
      dd = Math.max(dd, peakBal - run);
    });
    const pad = Math.max(10, Math.abs(peakBal - (run - dd)) * 0.1) || 10;
    return [(dataMin) => Math.floor(dataMin - pad), (dataMax) => Math.ceil(dataMax + pad)];
  }, [trades, startingBalance]);

  let body = null;
    const startBal = num(startingBalance);
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;

    let running = startBal;
    let peak = startBal;
    let maxDrawdown = 0;
    trades.forEach((t, i) => {
      running += t.pnl;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
    });

    let bestStreak = 0;
    let worstStreak = 0;
    let curStreak = 0;
    trades.forEach((t) => {
      if (t.pnl > 0) {
        curStreak = curStreak > 0 ? curStreak + 1 : 1;
      } else if (t.pnl < 0) {
        curStreak = curStreak < 0 ? curStreak - 1 : -1;
      } else {
        curStreak = 0;
      }
      bestStreak = Math.max(bestStreak, curStreak);
      worstStreak = Math.min(worstStreak, curStreak);
    });

    const revengeIds = computeRevengeIds(trades);
    const { current: disciplineCurrent, best: disciplineBest, hasData: disciplineHasData } =
      computeDisciplineStreak(trades);

    const tradesByDay = {};
    trades.forEach((t) => {
      const k = dayKeyFromTs(t.ts);
      if (!tradesByDay[k]) tradesByDay[k] = { total: 0, trades: [] };
      tradesByDay[k].total += t.pnl;
      tradesByDay[k].trades.push(t);
    });

    const viewYear = calMonth.getFullYear();
    const viewMonthIdx = calMonth.getMonth();
    const firstWeekday = new Date(viewYear, viewMonthIdx, 1).getDay();
    const totalDaysInMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate();
    const monthCells = [];
    for (let i = 0; i < firstWeekday; i++) monthCells.push(null);
    for (let d = 1; d <= totalDaysInMonth; d++) monthCells.push(d);
    while (monthCells.length % 7 !== 0) monthCells.push(null);

    const monthPrefix = `${viewYear}-${pad2(viewMonthIdx + 1)}`;
    const monthTotal = Object.keys(tradesByDay).reduce(
      (sum, k) => (k.startsWith(monthPrefix) ? sum + tradesByDay[k].total : sum),
      0
    );
    const monthTradeCount = Object.keys(tradesByDay).reduce(
      (sum, k) => (k.startsWith(monthPrefix) ? sum + tradesByDay[k].trades.length : sum),
      0
    );

    const todayKey = dayKeyFromDate(new Date());
    const selectedInfo = selectedDay ? tradesByDay[selectedDay] : null;

    const todayInfo = tradesByDay[todayKey];
    const todayTradeCount = todayInfo ? todayInfo.trades.length : 0;
    const todayLossTotal = todayInfo ? todayInfo.trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0) : 0;
    const dailyLossLimitNum = num(settings.dailyLossLimit);
    const hitDailyLossLimit = dailyLossLimitNum > 0 && Math.abs(todayLossTotal) >= dailyLossLimitNum;
    const maxTradesNum = num(settings.maxTradesPerDay);
    const hitMaxTrades = maxTradesNum > 0 && todayTradeCount >= maxTradesNum;
    useEffect(() => {
      pokeCrab("rest", { pose: hitDailyLossLimit || hitMaxTrades ? "worry" : "" });
      return () => pokeCrab("rest", { pose: "" });
    }, [hitDailyLossLimit, hitMaxTrades]);

    const goPrevMonth = () => {
      setCalMonth(new Date(viewYear, viewMonthIdx - 1, 1));
      setSelectedDay(null);
    };
    const goNextMonth = () => {
      setCalMonth(new Date(viewYear, viewMonthIdx + 1, 1));
      setSelectedDay(null);
    };

    body = (
      <>

      <OnboardingTip
  	id="curve-setup-mood"
  	text="Tag each trade with a Setup and Mood below — it unlocks the Insights tab's breakdowns by strategy and emotional state."
  	settings={settings}
  	persistSettings={persistSettings}
       />

        <Readout
          icon={TrendingUp}
          eyebrow="Equity"
          value={`${netPnl >= 0 ? "+" : "-"}$${fmtMoney(netPnl)}`}
          sub={
            trades.length > 0
              ? `${trades.length} trade${trades.length === 1 ? "" : "s"} logged, ${winRate.toFixed(1)}% win rate`
              : "Log your first trade below to start the curve"
          }
          tone={netPnl > 0 ? "good" : netPnl < 0 ? "bad" : undefined}
        />

        {trades.length > 0 && (
          <div
            className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
          >
            <style>{CURVE_REVEAL_CSS}</style>
            <div key={tradesLoaded ? "loaded" : "loading"} className="curve-reveal" style={{ width: "100%", height: isDesktop ? 340 : 180 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={chartData} margin={isDesktop ? CHART_MARGIN : CHART_MARGIN_MOBILE}>
                  <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="trade"
                    stroke={palette.textFaint}
                    tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                    tickLine={false}
                    axisLine={{ stroke: palette.border }}
                  />
                  <YAxis
                    stroke={palette.textFaint}
                    tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                    tickLine={false}
                    axisLine={{ stroke: palette.border }}
                    width={isDesktop ? 54 : 44}
                    domain={yDomain}
                  />
                  <ReferenceLine y={startBal} stroke={palette.textFaint} strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{
                      background: palette.field,
                      border: `1px solid ${palette.border}`,
                      borderRadius: "8px",
                      fontFamily: mono,
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: palette.textMuted }}
                    itemStyle={{ color: netPnl >= 0 ? palette.green : palette.red }}
                    formatter={(v) => [`$${fmt(v)}`, "Equity"]}
                    labelFormatter={(l) => `Trade ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke={netPnl >= 0 ? palette.green : palette.red}
                    strokeWidth={2}
                    dot={false}
                    activeDot={ACTIVE_DOT}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <StatChip label="Win Rate" value={trades.length ? `${winRate.toFixed(1)}%` : "N/A"} />
            <StatChip label="Avg Win / Loss" value={trades.length ? `$${fmt(avgWin, 0)} / $${fmt(avgLoss, 0)}` : "N/A"} />
            <StatChip label="Max Drawdown" value={trades.length ? `$${fmt(maxDrawdown, 0)}` : "N/A"} />
            <StatChip
              label="Best / Worst Streak"
              value={trades.length ? `+${bestStreak} / ${worstStreak}` : "N/A"}
              onClick={() => setShowStreakInfo((v) => !v)}
            />
          </div>
          {showStreakInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Streaks count consecutive wins (positive) or losses (negative).
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <StatChip
              label="Discipline Streak"
              value={disciplineHasData ? `${disciplineCurrent} day${disciplineCurrent === 1 ? "" : "s"}` : "N/A"}
              onClick={() => setShowDisciplineInfo((v) => !v)}
            />
            <StatChip
              label="Best Discipline Streak"
              value={disciplineHasData ? `${disciplineBest} day${disciplineBest === 1 ? "" : "s"}` : "N/A"}
            />
          </div>
          {showDisciplineInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Consecutive trading days with no revenge trade (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a
              loss) tracks behavior, not P&amp;L.
            </p>
          )}
        </div>

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={generateWeeklyShare}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
            style={{
              background: palette.gold,
              border: `1px solid ${palette.gold}`,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: palette.shadow,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Share2 size={16} />
            Share My Week
          </button>
          <button
            type="button"
            onClick={copyWeekSummary}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
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
            <Copy size={16} />
            Copy Summary
          </button>
        </div>
        {shareError && (
          <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
            {shareError}
          </p>
        )}
        {copyMsg && (
          <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
            {copyMsg}
          </p>
        )}
        {copyFallbackText && (
          <div
            className="rounded-lg p-3 mb-2"
            style={{ background: palette.field, border: `1px solid ${palette.border}` }}
          >
            <textarea
              readOnly
              value={copyFallbackText}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "12px", height: "132px", resize: "none" }}
            />
            <button
              type="button"
              onClick={() => setCopyFallbackText("")}
              className={`mt-2 ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              Dismiss
            </button>
          </div>
        )}
        {!shareError && !copyMsg && !copyFallbackText && <div className="mb-6" />}
        {(shareError || copyMsg) && !copyFallbackText && <div className="mb-4" />}

        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
        >
          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Backup &amp; Restore
          </span>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Your data only lives in this browser. Export a backup file occasionally, or right before switching
            phones.
          </p>
          <div className={isDesktop ? "flex gap-3" : "flex gap-2"}>
            <button
              type="button"
              onClick={exportBackup}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg ${isDesktop ? "py-3.5" : "py-2.5"} ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Download size={15} />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Upload size={15} />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importBackup}
              style={{ display: "none" }}
            />
          </div>
          {backupMsg && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              {backupMsg}
            </p>
          )}
          {pendingImport && (
            <div
              className="rounded-lg p-3 mt-3"
              style={{ background: palette.field, border: `1px solid ${palette.gold}` }}
            >
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This will replace your current trades, starting balance, news events, custom setups, journal
                entries, playbook rules, notepad notes, and theme on this device with the backup file (
                {pendingImport.trades.length} trade{pendingImport.trades.length === 1 ? "" : "s"}). This can't be
                undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px" }}
                >
                  Replace Data
                </button>
                <button
                  type="button"
                  onClick={cancelImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{
                    background: "transparent",
                    border: `1px solid ${palette.border}`,
                    color: palette.textMuted,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <Field 
          label="Starting Balance"
          value={startingBalance}
          suffix="$"
          placeholder="10000"
          onChange={(e) => persistStartingBalance(e.target.value)}
        />

        {hitDailyLossLimit && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: `${palette.red}14`, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
          >
            <div style={{ color: palette.red, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>
              Daily loss limit reached
            </div>
            <div className="text-xs" style={{ color: palette.textMuted }}>
              You've hit your ${fmt(dailyLossLimitNum, 0)} daily loss limit for today (${fmtMoney(todayLossTotal)}{" "}
              so far). Consider stepping away for the rest of the day.
            </div>
          </div>
        )}
        {hitMaxTrades && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
          >
            <div style={{ color: palette.gold, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>
              Trade limit reached
            </div>
            <div className="text-xs" style={{ color: palette.textMuted }}>
              You've hit your limit of {maxTradesNum} trade{maxTradesNum === 1 ? "" : "s"} for today Consider stepping away for the rest of the day.
          </div>
         </div>
        )}

        <div ref={logFormRef} className="flex items-center justify-between mb-1.5">
          <span
            className="uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            {editingTradeId ? "Edit Trade" : "Log a Trade"}
          </span>
          {editingTradeId && (
            <button
              type="button"
              onClick={cancelEditTrade}
              className={TAP}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              Cancel
            </button>
          )}
        </div>
        {editingTradeId && (
          <p className="text-xs -mt-1 mb-2" style={{ color: palette.gold }}>
            Editing a logged trade.
          </p>
        )}
        <input
          type="text"
          value={tradePair}
          onChange={(e) => setTradePair(e.target.value.toUpperCase())}
          placeholder="Pair"
          className="w-full rounded-lg px-3 py-2.5 mb-2 bg-transparent outline-none"
          style={{
            background: palette.field,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            fontFamily: mono,
            fontSize: "14px",
          }}
        />
        <div className="flex gap-2 mb-2">
          <div
            className="flex items-center rounded-lg px-3 flex-1"
            style={{
              background: palette.field,
              border: `1px solid ${editingTradeId ? palette.gold : palette.border}`,
            }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={tradeInput}
              onChange={(e) => {
                setTradeInput(e.target.value);
                pokeCrab("type");
              }}
              placeholder="+120 or -60"
              className="w-full bg-transparent py-3 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "16px" }}
            />
          </div>
          <button
            type="button"
            onClick={submitTrade}
            className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
            style={{
              width: "46px",
              background: palette.gold,
              color: palette.letterbox,
            }}
            aria-label={editingTradeId ? "Save changes" : "Add trade"}
          >
            {editingTradeId ? <Check size={20} strokeWidth={2.4} /> : <Plus size={20} strokeWidth={2.4} />}
          </button>
        </div>
        <input
          type="text"
          value={tradeNote}
          onChange={(e) => setTradeNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-lg px-3 py-2.5 mb-2 bg-transparent outline-none"
          style={{
            background: palette.field,
            border: `1px solid ${palette.border}`,
            color: palette.textMuted,
            fontSize: "13px",
          }}
        />

        <div className="flex gap-2 flex-wrap mb-2">
          {NOTE_TAGS.map((tag) => {
            const active = tradeNote === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTradeNote(active ? "" : tag)}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.field : "transparent",
                  color: active ? palette.text : palette.textFaint,
                  border: `1px dashed ${active ? palette.textMuted : palette.border}`,
                  fontSize: "12px",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
        >
          Setup
        </span>
        <div className="flex gap-2 flex-wrap mb-2 items-center">
          {SETUPS.map((s) => {
            const active = tradeSetup === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTradeSetup(active ? null : s.id)}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontSize: "13px",
                }}
              >
                {s.label}
              </button>
            );
          })}

          {customSetupsLoaded &&
            customSetups.map((s) => {
              const active = tradeSetup === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTradeSetup(active ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.field,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px dashed ${active ? palette.gold : palette.border}`,
                    fontSize: "13px",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
        >
          Mood
        </span>
        <div className="flex gap-2 flex-wrap mb-2 items-center">
          {EMOTIONS.map((e) => {
            const active = tradeEmotion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setTradeEmotion(active ? null : e.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontSize: "13px",
                }}
              >
                <span>{e.emoji}</span>
                {e.label}
              </button>
            );
          })}

          {customMoodsLoaded &&
            customMoods.map((m) => {
              const active = tradeEmotion === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTradeEmotion(active ? null : m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.field,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px dashed ${active ? palette.gold : palette.border}`,
                    fontSize: "13px",
                  }}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
        </div>

        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Enter net P&amp;L for the trade. Positive logs a win, negative logs a loss. The dashed chips quick-fill
          the note; Setup tags what kind of trade it was (tap the + to add up to {MAX_CUSTOM_SETUPS} of your own);
          Mood tags how you felt. Tap the pencil on any logged trade below to edit it in place. Tags and a
          "revenge" flag (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a loss) show up per trade in the
          calendar below.
        </p>

        {tradesLoadError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {tradesLoadError}
          </p>
        )}
        {screenshotError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {screenshotError}
          </p>
        )}

        {!tradesLoaded ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Loading saved trades…
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Calendar
              </span>
              {trades.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearTrades();
                    setSelectedDay(null);
                  }}
                  className={TAP}
                  style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
            >
              {(() => {
                // Heatmap-style month calendar: big rounded day tiles, date + P/L, bright/soft green & red.
                const CAL_GREEN = "#22b85c";
                const CAL_RED = "#e5483f";
                const calMoney = (n) => {
                  const a = Math.abs(n);
                  const body = a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(Math.round(a));
                  return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${body}`;
                };
                let maxAbsDay = 0;
                for (let d = 1; d <= totalDaysInMonth; d++) {
                  const inf = tradesByDay[`${monthPrefix}-${pad2(d)}`];
                  if (inf) maxAbsDay = Math.max(maxAbsDay, Math.abs(inf.total));
                }
                const prevMonthDays = new Date(viewYear, viewMonthIdx, 0).getDate();
                const trailingStart = firstWeekday + totalDaysInMonth;
                const navBtn = {
                  width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted,
                };
                return (
                  <>
                    <div className="flex items-center justify-between mb-3" style={{ gap: "8px" }}>
                      <button type="button" onClick={goPrevMonth} aria-label="Previous month" className={TAP} style={navBtn}>
                        <ChevronLeft size={16} />
                      </button>
                      <div className="text-center" style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: display, fontSize: "17px", fontWeight: 800, color: palette.text }}>
                          {MONTH_NAMES[viewMonthIdx]} {viewYear}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: "11px", fontWeight: 700, color: monthTradeCount ? (monthTotal >= 0 ? palette.green : palette.red) : palette.textFaint }}>
                          {monthTradeCount ? `${calMoney(monthTotal)} · ${monthTradeCount} trade${monthTradeCount === 1 ? "" : "s"}` : "No trades this month"}
                        </div>
                      </div>
                      <button type="button" onClick={goNextMonth} aria-label="Next month" className={TAP} style={navBtn}>
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1.5" style={{ gap: "6px" }}>
                      {WEEKDAY_LABELS.map((w, i) => (
                        <div key={i} className="text-center" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: palette.textFaint }}>
                          {w}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7" style={{ gap: "6px" }}>
                      {monthCells.map((d, i) => {
                        const baseTile = {
                          aspectRatio: "1",
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1.15,
                          minWidth: 0,
                        };
                        if (d === null) {
                          // Days from the neighbouring months: dimmed, no P/L.
                          const n = i < firstWeekday ? prevMonthDays - (firstWeekday - 1 - i) : i - trailingStart + 1;
                          return (
                            <div key={i} style={{ ...baseTile, background: palette.field, opacity: 0.35 }}>
                              <span style={{ fontFamily: display, fontSize: "14px", fontWeight: 800, color: palette.textFaint }}>{n}</span>
                            </div>
                          );
                        }
                        const key = `${monthPrefix}-${pad2(d)}`;
                        const info = tradesByDay[key];
                        const hasTrades = !!info;
                        const isToday = key === todayKey;
                        const isSelected = key === selectedDay;
                        const total = hasTrades ? info.total : 0;
                        const win = hasTrades && total > 0;
                        const loss = hasTrades && total < 0;
                        const intensity = hasTrades && maxAbsDay > 0 ? Math.min(1, Math.abs(total) / maxAbsDay) : 0;
                        const strong = (win || loss) && intensity >= 0.5;
                        const bg = win ? (strong ? CAL_GREEN : `${CAL_GREEN}59`) : loss ? (strong ? CAL_RED : `${CAL_RED}59`) : palette.field;
                        const numColor = strong ? "#FFFFFF" : palette.text;
                        const pnlColor = strong ? "#FFFFFF" : win ? palette.green : palette.red;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => hasTrades && setSelectedDay(isSelected ? null : key)}
                            className={hasTrades ? TAP : ""}
                            style={{
                              ...baseTile,
                              background: bg,
                              border: "none",
                              boxShadow: isSelected ? `0 0 0 2px ${palette.gold}` : isToday ? `inset 0 0 0 1.5px ${palette.textMuted}` : "none",
                              cursor: hasTrades ? "pointer" : "default",
                              transition: THEME_TRANSITION,
                            }}
                          >
                            <span style={{ fontFamily: display, fontSize: "15px", fontWeight: 800, color: numColor }}>{d}</span>
                            {hasTrades && total !== 0 && (
                              <span style={{ fontFamily: mono, fontSize: "9.5px", fontWeight: 700, marginTop: "1px", whiteSpace: "nowrap", color: pnlColor }}>
                                {calMoney(total)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <StatChip
                label={`${MONTH_NAMES[viewMonthIdx]} Total`}
                value={`${monthTotal >= 0 ? "+" : "-"}$${fmtMoney(monthTotal)}`}
              />
              <StatChip label={`${MONTH_NAMES[viewMonthIdx]} Trades`} value={String(monthTradeCount)} />
            </div>

            {(() => {
              const periodType = settings.statementPeriodType || "month";
              const periodLabel = periodType === "quarter" ? "Quarter" : periodType === "year" ? "Year" : "Month";
              const disabled = periodType === "month" && monthTradeCount === 0;
              const openStatement = () => {
                if (periodType === "quarter") {
                  setStatementPeriod({ year: viewYear, type: "quarter", index: Math.floor(viewMonthIdx / 3) });
                } else if (periodType === "year") {
                  setStatementPeriod({ year: viewYear, type: "year" });
                } else {
                  setStatementPeriod({ year: viewYear, type: "month", index: viewMonthIdx });
                }
              };
              return (
                <button
                  type="button"
                  onClick={openStatement}
                  disabled={disabled}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 mb-4 ${TAP}`}
                  style={{
                    background: palette.field,
                    border: `1px solid ${palette.border}`,
                    color: disabled ? palette.textFaint : palette.text,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <FileText size={14} />
                  {periodLabel} Statement
                </button>
              );
            })()}

            {selectedInfo && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="uppercase"
                    style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                  >
                    {formatDayLabel(selectedDay)}
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: "12px",
                      color: selectedInfo.total >= 0 ? palette.green : palette.red,
                    }}
                  >
                    {selectedInfo.total >= 0 ? "+" : "-"}${fmtMoney(selectedInfo.total)}
                  </span>
                </div>
                {selectedInfo.trades.map((t) => {
                  const isExpanded = expandedTradeId === t.id;
                  const isBeingEdited = editingTradeId === t.id;
                  const shots = tradeScreenshots(t);
                  const savingThisTrade = screenshotSaving && screenshotTargetId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setExpandedTradeId(isExpanded ? null : t.id)}
                      className="rounded-lg px-3 py-2.5 mb-2"
                      style={{
                        background: palette.surface,
                        border: `1px solid ${isBeingEdited ? palette.gold : palette.border}`,
                        boxShadow: palette.shadow,
                        cursor: "pointer",
                        transition: THEME_TRANSITION,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              style={{
                                fontFamily: mono,
                                fontSize: "14px",
                                color: t.pnl >= 0 ? palette.green : palette.red,
                              }}
                            >
                              {t.pnl >= 0 ? "+" : "-"}${fmtMoney(t.pnl)}
                            </span>
                            {t.emotion && emotionMeta(t.emotion) && (
                              <span style={{ fontSize: "13px" }}>{emotionMeta(t.emotion).emoji}</span>
                            )}
                            {t.pair && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.gold,
                                  border: `1px solid ${palette.gold}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                {t.pair}
                              </span>
                            )}
                            {t.setup && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.textMuted,
                                  border: `1px solid ${palette.border}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                {findSetupLabel(t.setup)}
                              </span>
                            )}
                           {settings.showRevengeTag !== false && revengeIds.has(t.id) && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.red,
                                  border: `1px solid ${palette.red}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                revenge
                              </span>
                            )}
                            {isBeingEdited && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.gold,
                                  border: `1px solid ${palette.gold}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                editing
                              </span>
                            )}
                            {shots.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Camera size={11} style={{ color: palette.textFaint }} aria-label="Has screenshot" />
                              </span>
                            )}
                            {savingThisTrade && (
                              <span style={{ fontSize: "10px", color: palette.textFaint, fontFamily: mono }}>
                                saving…
                              </span>
                            )}
                          </div>
                          {t.note && (
                            <div style={{ color: palette.textMuted, fontSize: "12px" }}>{t.note}</div>
                          )}
                        </div>
                        <div className="flex items-center flex-shrink-0" style={{ marginLeft: "8px", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTrade(t);
                            }}
                            className={TAP}
                            style={{ color: palette.textFaint }}
                            aria-label="Edit trade"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTrade(t.id);
                            }}
                            className={TAP}
                            style={{ color: palette.textFaint }}
                            aria-label="Delete trade"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {shots.map((src, idx) => (
                            <div key={idx} className="relative inline-block">
                              <img
                                src={src}
                                alt={`Trade screenshot ${idx + 1}`}
                                onClick={() => setViewingScreenshot({ src, trade: t })}
                                className={`rounded-lg ${TAP}`}
                                style={{
                                  width: "96px",
                                  height: "96px",
                                  objectFit: "cover",
                                  border: `1px solid ${palette.border}`,
                                  cursor: "pointer",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setPendingScreenshotDelete({ tradeId: t.id, index: idx })}
                                className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                style={{
                                  top: "-6px",
                                  right: "-6px",
                                  width: "18px",
                                  height: "18px",
                                  background: palette.red,
                                  color: "#FFFFFF",
                                }}
                                aria-label="Remove screenshot"
                              >
                                <X size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => shareImageFile(src, t)}
                                className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                style={{
                                  bottom: "-6px",
                                  right: "-6px",
                                  width: "22px",
                                  height: "22px",
                                  background: palette.gold,
                                  color: palette.letterbox,
                                  border: `2px solid ${palette.surface}`,
                                }}
                                aria-label="Share screenshot"
                              >
                                <Share2 size={11} />
                              </button>
                            </div>
                          ))}
                          {shots.length < SCREENSHOT_MAX_PER_TRADE && (
                            <button
                              type="button"
                              onClick={() => openScreenshotPicker(t.id)}
                              disabled={savingThisTrade}
                              className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                              style={{
                                width: "96px",
                                height: "96px",
                                background: "transparent",
                                border: `1px dashed ${palette.border}`,
                                color: palette.textFaint,
                                opacity: savingThisTrade ? 0.5 : 1,
                              }}
                            >
                              <Camera size={16} />
                              <span style={{ fontSize: "10px", fontFamily: mono }}>
                                {savingThisTrade
                                  ? "Saving\u2026"
                                  : shots.length === 0
                                  ? "Add photo"
                                  : "Add another"}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {trades.length === 0 && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                No trades logged yet. Log one below and it'll land on today's date.
              </p>
            )}
            {trades.length > 0 && !selectedInfo && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                Tap a highlighted day to see its trades.
              </p>
            )}
          </>
        )}

        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          onChange={handleScreenshotChange}
          style={{ display: "none" }}
        />
      </>
    );
  
  return body;
}
