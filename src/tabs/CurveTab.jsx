import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import { Field, Readout, StatChip } from "../components/ui.jsx";
import { computeDisciplineStreak, computeRevengeIds } from "../lib/analytics.js";
import { EMOTIONS, MAX_CUSTOM_SETUPS, NOTE_TAGS, RUNTIME, SETUPS, emotionMeta } from "../lib/constants.js";
import { MONTH_NAMES, WEEKDAY_LABELS, dayKeyFromDate, dayKeyFromTs, fmt, fmtMoney, formatDayLabel, num, pad2 } from "../lib/format.js";
import { SCREENSHOT_MAX_PER_TRADE, tradeScreenshots } from "../lib/images.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { Camera, Check, ChevronLeft, ChevronRight, Copy, Download, FileText, Pencil, Plus, Search, Share2, SlidersHorizontal, Trash2, TrendingUp, Upload, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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
    tradesLoaded,
    view = "overview",
    subNav = null,
    onOpenHistory,
    onOpenOverview
  } = props;
  const HIST_PAGE = 30;
  const HIST_DEFAULT_FILTER = { outcome: "all", setup: "", mood: "", pair: "", flag: "all", from: "", to: "", sort: "new" };
  const [hq, setHq] = useState("");
  const [hFilter, setHFilter] = useState(HIST_DEFAULT_FILTER);
  const [hFilterOpen, setHFilterOpen] = useState(false);
  const [hLimit, setHLimit] = useState(HIST_PAGE);
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

    // Memoised: these loop over every trade and used to re-run on every render of the tab.
    const revengeIds = useMemo(() => computeRevengeIds(trades), [trades]);
    const { current: disciplineCurrent, best: disciplineBest, hasData: disciplineHasData } =
      useMemo(() => computeDisciplineStreak(trades), [trades]);

    const tradesByDay = useMemo(() => {
      const map = {};
      trades.forEach((t) => {
        const k = dayKeyFromTs(t.ts);
        if (!map[k]) map[k] = { total: 0, trades: [] };
        map[k].total += t.pnl;
        map[k].trades.push(t);
      });
      return map;
    }, [trades]);

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
    const histSetups = [...SETUPS, ...(customSetups || [])];
    const histMoods = [...EMOTIONS, ...(customMoods || [])];
    const histPairs = useMemo(() => [...new Set(trades.map((t) => t.pair).filter(Boolean))].sort(), [trades]);
    const histActiveCount =
      (hFilter.outcome !== "all" ? 1 : 0) + (hFilter.setup ? 1 : 0) + (hFilter.mood ? 1 : 0) + (hFilter.pair ? 1 : 0) +
      (hFilter.flag !== "all" ? 1 : 0) + (hFilter.from || hFilter.to ? 1 : 0);
    const hist = useMemo(() => {
      const q = hq.trim().toLowerCase();
      const fromTs = hFilter.from ? new Date(`${hFilter.from}T00:00:00`).getTime() : null;
      const toTs = hFilter.to ? new Date(`${hFilter.to}T23:59:59.999`).getTime() : null;
      const list = trades.filter((t) => {
        if (hFilter.outcome === "win" && !(t.pnl > 0)) return false;
        if (hFilter.outcome === "loss" && !(t.pnl < 0)) return false;
        if (hFilter.outcome === "be" && t.pnl !== 0) return false;
        if (hFilter.setup && t.setup !== hFilter.setup) return false;
        if (hFilter.mood && t.emotion !== hFilter.mood) return false;
        if (hFilter.pair && t.pair !== hFilter.pair) return false;
        if (hFilter.flag === "revenge" && !revengeIds.has(t.id)) return false;
        if (hFilter.flag === "shots" && tradeScreenshots(t).length === 0) return false;
        if (hFilter.flag === "notes" && !(t.note && String(t.note).trim())) return false;
        if (fromTs !== null && t.ts < fromTs) return false;
        if (toTs !== null && t.ts > toTs) return false;
        if (q) {
          const hay = [
            t.pair, t.note, findSetupLabel(t.setup), histMoods.find((m) => m.id === t.emotion)?.label,
            formatDayLabel(dayKeyFromTs(t.ts)), String(t.pnl), revengeIds.has(t.id) ? "revenge" : "",
          ].filter(Boolean).join(" ").toLowerCase();
          return q.split(/\s+/).every((w) => hay.includes(w));
        }
        return true;
      });
      const by = hFilter.sort;
      list.sort(by === "old" ? (a, b) => a.ts - b.ts : by === "win" ? (a, b) => b.pnl - a.pnl : by === "loss" ? (a, b) => a.pnl - b.pnl : (a, b) => b.ts - a.ts);
      const dayTotals = {};
      list.forEach((t) => { const k = dayKeyFromTs(t.ts); dayTotals[k] = (dayTotals[k] || 0) + t.pnl; });
      return { list, dayTotals, net: list.reduce((sum, t) => sum + t.pnl, 0) };
    }, [trades, hq, hFilter, revengeIds, customMoods]);

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

    const openEdit = (t) => {
      if (view === "history" && onOpenOverview) {
        onOpenOverview();
        setTimeout(() => startEditTrade(t), 80);
      } else {
        startEditTrade(t);
      }
    };

    const renderTradeCard = (t) => {
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
                              openEdit(t);
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
    };

    const chipStyle = (active) => ({
      padding: "6px 12px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600,
      background: active ? `${palette.gold}2E` : palette.field,
      border: `1px solid ${active ? palette.gold : palette.border}`,
      color: active ? palette.text : palette.textMuted,
    });
    const fieldStyle = {
      width: "100%", height: "40px", borderRadius: "10px", padding: "0 10px", fontSize: "13px", outline: "none",
      background: palette.field, border: `1px solid ${palette.border}`, color: palette.text,
    };
    const filterLabel = { fontSize: "11px", letterSpacing: "0.06em", fontWeight: 700, color: palette.textFaint, marginBottom: "6px", textTransform: "uppercase" };
    const resetHistory = () => { setHq(""); setHFilter(HIST_DEFAULT_FILTER); setHLimit(HIST_PAGE); };
    const patchFilter = (patch) => { setHFilter({ ...hFilter, ...patch }); setHLimit(HIST_PAGE); };
    const histShown = hist.list.slice(0, hLimit);
    const histGrouped = hFilter.sort === "new" || hFilter.sort === "old";
    const histGroups = [];
    if (histGrouped) {
      histShown.forEach((t) => {
        const k = dayKeyFromTs(t.ts);
        const last = histGroups[histGroups.length - 1];
        if (last && last.key === k) last.items.push(t);
        else histGroups.push({ key: k, items: [t] });
      });
    }
    const historyView = (
      <>
        <div className="flex items-center mb-3" style={{ gap: "8px" }}>
          <div className="flex items-center flex-1 min-w-0" style={{ height: "44px", borderRadius: "12px", padding: "0 12px", background: palette.field, border: `1px solid ${palette.border}`, gap: "8px" }}>
            <Search size={16} style={{ color: palette.textFaint, flexShrink: 0 }} />
            <input
              type="search"
              value={hq}
              onChange={(e) => { setHq(e.target.value); setHLimit(HIST_PAGE); }}
              placeholder="Search pair, note, setup, mood, amount"
              aria-label="Search trades"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: palette.text, fontSize: "14px" }}
            />
            {hq && (
              <button type="button" onClick={() => { setHq(""); setHLimit(HIST_PAGE); }} className={TAP} aria-label="Clear search" style={{ color: palette.textFaint, display: "flex" }}>
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHFilterOpen(!hFilterOpen)}
            aria-label="Filter trades"
            aria-expanded={hFilterOpen}
            className={`flex items-center flex-shrink-0 ${TAP}`}
            style={{
              height: "44px", minWidth: "44px", padding: isDesktop ? "0 14px" : "0 12px", borderRadius: "12px", gap: "6px", justifyContent: "center",
              background: histActiveCount || hFilterOpen ? `${palette.gold}26` : palette.field,
              border: `1px solid ${histActiveCount ? palette.gold : palette.border}`, color: palette.text, fontSize: "13px", fontWeight: 600,
            }}
          >
            <SlidersHorizontal size={16} />
            {isDesktop && <span>Filter</span>}
            {histActiveCount > 0 && (
              <span style={{ minWidth: "18px", height: "18px", borderRadius: "9px", background: palette.gold, color: palette.letterbox, fontSize: "11px", fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{histActiveCount}</span>
            )}
          </button>
        </div>

        {hFilterOpen && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}>
            <div style={filterLabel}>Outcome</div>
            <div className="flex flex-wrap mb-4" style={{ gap: "8px" }}>
              {[["all", "All"], ["win", "Wins"], ["loss", "Losses"], ["be", "Breakeven"]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => patchFilter({ outcome: id })} className={TAP} style={chipStyle(hFilter.outcome === id)}>{label}</button>
              ))}
            </div>
            <div style={filterLabel}>Show only</div>
            <div className="flex flex-wrap mb-4" style={{ gap: "8px" }}>
              {[["all", "Everything"], ["revenge", "Revenge trades"], ["shots", "With screenshot"], ["notes", "With note"]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => patchFilter({ flag: id })} className={TAP} style={chipStyle(hFilter.flag === id)}>{label}</button>
              ))}
            </div>
            <div className="mb-4" style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, minmax(0, 1fr))" : "1fr", gap: "12px" }}>
              <div>
                <div style={filterLabel}>Setup</div>
                <select value={hFilter.setup} onChange={(e) => patchFilter({ setup: e.target.value })} style={fieldStyle} aria-label="Filter by setup">
                  <option value="">Any setup</option>
                  {histSetups.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <div style={filterLabel}>Mood</div>
                <select value={hFilter.mood} onChange={(e) => patchFilter({ mood: e.target.value })} style={fieldStyle} aria-label="Filter by mood">
                  <option value="">Any mood</option>
                  {histMoods.map((o) => <option key={o.id} value={o.id}>{o.emoji ? `${o.emoji} ` : ""}{o.label}</option>)}
                </select>
              </div>
              <div>
                <div style={filterLabel}>Pair</div>
                <select value={hFilter.pair} onChange={(e) => patchFilter({ pair: e.target.value })} style={fieldStyle} aria-label="Filter by pair">
                  <option value="">Any pair</option>
                  {histPairs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
              <div>
                <div style={filterLabel}>From</div>
                <input type="date" value={hFilter.from} max={hFilter.to || undefined} onChange={(e) => patchFilter({ from: e.target.value })} style={fieldStyle} aria-label="From date" />
              </div>
              <div>
                <div style={filterLabel}>To</div>
                <input type="date" value={hFilter.to} min={hFilter.from || undefined} onChange={(e) => patchFilter({ to: e.target.value })} style={fieldStyle} aria-label="To date" />
              </div>
            </div>
            <div style={filterLabel}>Sort</div>
            <div className="flex flex-wrap mb-4" style={{ gap: "8px" }}>
              {[["new", "Newest"], ["old", "Oldest"], ["win", "Biggest win"], ["loss", "Biggest loss"]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => patchFilter({ sort: id })} className={TAP} style={chipStyle(hFilter.sort === id)}>{label}</button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={resetHistory} className={TAP} style={{ color: palette.textMuted, fontSize: "12.5px", fontWeight: 600 }}>Reset all</button>
              <button type="button" onClick={() => setHFilterOpen(false)} className={`px-4 py-2 rounded-lg ${TAP}`} style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12.5px", fontWeight: 700 }}>
                Show {hist.list.length} trade{hist.list.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

        {!tradesLoaded ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>Loading saved trades...</p>
        ) : trades.length === 0 ? (
          <div className="rounded-2xl p-6 mb-4 text-center" style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}>
            <p style={{ color: palette.textMuted, fontSize: "13px" }}>No trades logged yet.</p>
            {onOpenOverview && (
              <button type="button" onClick={onOpenOverview} className={`mt-3 px-4 py-2 rounded-lg ${TAP}`} style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}>Log your first trade</button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2" style={{ gap: "8px" }}>
              <span style={{ color: palette.textFaint, fontSize: "12px" }}>
                {hist.list.length === trades.length ? `${trades.length} trade${trades.length === 1 ? "" : "s"}` : `${hist.list.length} of ${trades.length} trades`}
              </span>
              {hist.list.length > 0 && (
                <span style={{ fontFamily: mono, fontSize: "12.5px", fontWeight: 700, color: hist.net >= 0 ? palette.green : palette.red }}>
                  {hist.net >= 0 ? "+" : "-"}${fmtMoney(hist.net)}
                </span>
              )}
            </div>
            {hist.list.length === 0 ? (
              <div className="rounded-2xl p-6 mb-4 text-center" style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}>
                <p style={{ color: palette.textMuted, fontSize: "13px" }}>No trades match your search or filters.</p>
                <button type="button" onClick={resetHistory} className={`mt-3 px-4 py-2 rounded-lg ${TAP}`} style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}>Clear search and filters</button>
              </div>
            ) : histGrouped ? (
              histGroups.map((g) => (
                <div key={g.key} className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>{formatDayLabel(g.key)}</span>
                    <span style={{ fontFamily: mono, fontSize: "12px", color: hist.dayTotals[g.key] >= 0 ? palette.green : palette.red }}>
                      {hist.dayTotals[g.key] >= 0 ? "+" : "-"}${fmtMoney(hist.dayTotals[g.key])}
                    </span>
                  </div>
                  {g.items.map(renderTradeCard)}
                </div>
              ))
            ) : (
              <div className="mb-3">{histShown.map(renderTradeCard)}</div>
            )}
            {hist.list.length > hLimit && (
              <button type="button" onClick={() => setHLimit(hLimit + HIST_PAGE)} className={`w-full rounded-lg py-2.5 mb-4 ${TAP}`} style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12px", fontWeight: 600 }}>
                Show {Math.min(HIST_PAGE, hist.list.length - hLimit)} more ({hist.list.length - hLimit} left)
              </button>
            )}
          </>
        )}
      </>
    );

    if (view === "history") {
      body = (
        <>
          {subNav}
          {historyView}
          <input ref={screenshotInputRef} type="file" accept="image/*" onChange={handleScreenshotChange} style={{ display: "none" }} />
        </>
      );
    } else
    body = (
      <>
      {subNav}

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
                const renderCell = (d, i) => {
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
                              position: "relative",
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
                            {hasTrades && (
                              <span
                                aria-hidden="true"
                                style={{
                                  position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", borderRadius: "50%",
                                  background: info.trades.some((t) => revengeIds.has(t.id)) ? palette.red : palette.green,
                                  border: "1.5px solid rgba(255,255,255,0.9)",
                                }}
                              />
                            )}
                            {isDesktop && hasTrades && (
                              <span style={{ fontFamily: mono, fontSize: "9px", marginTop: "1px", whiteSpace: "nowrap", color: strong ? "rgba(255,255,255,0.88)" : palette.textFaint }}>
                                {info.trades.length} trade{info.trades.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </button>
                        );
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

                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(7, minmax(0, 1fr)) 92px" : "repeat(7, minmax(0, 1fr))", gap: "6px", marginBottom: "6px" }}>
                      {WEEKDAY_LABELS.map((w, i) => (
                        <div key={i} className="text-center" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: palette.textFaint }}>
                          {w}
                        </div>
                      ))}
                      {isDesktop && (
                        <div className="text-center" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: palette.textFaint }}>WEEK</div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(7, minmax(0, 1fr)) 92px" : "repeat(7, minmax(0, 1fr))", gap: "6px" }}>
                      {Array.from({ length: monthCells.length / 7 }, (_, w) => {
                        const weekDays = monthCells.slice(w * 7, w * 7 + 7);
                        let wTotal = 0;
                        let wDays = 0;
                        weekDays.forEach((d) => {
                          if (d === null) return;
                          const inf = tradesByDay[`${monthPrefix}-${pad2(d)}`];
                          if (inf) { wTotal += inf.total; wDays += 1; }
                        });
                        return (
                          <Fragment key={w}>
                            {weekDays.map((d, ci) => renderCell(d, w * 7 + ci))}
                            {isDesktop && (
                              <div style={{ borderRadius: "12px", background: palette.field, border: `1px dashed ${palette.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", opacity: wDays ? 1 : 0.45, minWidth: 0 }}>
                                <span style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.06em", color: palette.textFaint }}>WK {w + 1}</span>
                                <span style={{ fontFamily: mono, fontSize: "12px", fontWeight: 700, color: wDays ? (wTotal >= 0 ? palette.green : palette.red) : palette.textFaint }}>{wDays ? calMoney(wTotal) : "-"}</span>
                                {wDays > 0 && <span style={{ fontSize: "9px", color: palette.textFaint }}>{wDays} day{wDays === 1 ? "" : "s"}</span>}
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                    <div className="flex items-center flex-wrap" style={{ gap: "6px 14px", marginTop: "12px", fontSize: "10.5px", color: palette.textFaint }}>
                      <span className="flex items-center" style={{ gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.green }} />Clean day</span>
                      <span className="flex items-center" style={{ gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.red }} />Revenge trade</span>
                      <span>Tap a day to see its trades</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {(() => {
              const periodType = settings.statementPeriodType || "month";
              const periodLabel = periodType === "quarter" ? "Quarter" : periodType === "year" ? "Year" : "Month";
              const noData = monthTradeCount === 0;
              const disabled = periodType === "month" && noData;
              const openStatement = () => {
                if (periodType === "quarter") {
                  setStatementPeriod({ year: viewYear, type: "quarter", index: Math.floor(viewMonthIdx / 3) });
                } else if (periodType === "year") {
                  setStatementPeriod({ year: viewYear, type: "year" });
                } else {
                  setStatementPeriod({ year: viewYear, type: "month", index: viewMonthIdx });
                }
              };
              const mTrades = trades.filter((t) => {
                const d = new Date(t.ts);
                return d.getFullYear() === viewYear && d.getMonth() === viewMonthIdx;
              });
              const wins = mTrades.filter((t) => t.pnl > 0);
              const losses = mTrades.filter((t) => t.pnl < 0);
              const grossWin = wins.reduce((sum, t) => sum + t.pnl, 0);
              const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
              const net = grossWin - grossLoss;
              let run = 0;
              let peak = 0;
              let maxDd = 0;
              [...mTrades].sort((x, y) => x.ts - y.ts).forEach((t) => {
                run += t.pnl;
                peak = Math.max(peak, run);
                maxDd = Math.max(maxDd, peak - run);
              });
              const dayMap = {};
              mTrades.forEach((t) => {
                const k = dayKeyFromTs(t.ts);
                const d = dayMap[k] || (dayMap[k] = { total: 0, revenge: false });
                d.total += t.pnl;
                if (revengeIds.has(t.id)) d.revenge = true;
              });
              const dayTotals = Object.values(dayMap);
              const bestDay = dayTotals.length ? Math.max(...dayTotals.map((d) => d.total)) : null;
              const worstDay = dayTotals.length ? Math.min(...dayTotals.map((d) => d.total)) : null;
              const cleanDays = dayTotals.filter((d) => !d.revenge).length;
              const bySetup = {};
              mTrades.forEach((t) => {
                if (!t.setup) return;
                const e = bySetup[t.setup] || (bySetup[t.setup] = { pnl: 0, count: 0 });
                e.pnl += t.pnl;
                e.count += 1;
              });
              const topSetupId = Object.keys(bySetup).sort((x, y) => bySetup[y].pnl - bySetup[x].pnl || bySetup[y].count - bySetup[x].count)[0];
              const signed = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
              const tone = (n) => (n === null || n === undefined ? palette.text : n >= 0 ? palette.green : palette.red);
              const pf = noData ? "N/A" : grossLoss === 0 ? (grossWin > 0 ? "\u221E" : "N/A") : (grossWin / grossLoss).toFixed(2);
              const rows = [
                ["Net P&L", noData ? "N/A" : signed(net), noData ? null : net],
                ["Win rate", noData ? "N/A" : `${((wins.length / mTrades.length) * 100).toFixed(1)}%`],
                ["Avg win / loss", noData ? "N/A" : `$${fmt(wins.length ? grossWin / wins.length : 0, 0)} / $${fmt(losses.length ? grossLoss / losses.length : 0, 0)}`],
                ["Best day", bestDay === null ? "N/A" : signed(bestDay), bestDay],
                ["Top setup", topSetupId ? findSetupLabel(topSetupId) : "N/A"],
                ["Trades", String(mTrades.length)],
                ["Profit factor", pf],
                ["Max drawdown", noData ? "N/A" : `$${fmt(maxDd, 0)}`],
                ["Worst day", worstDay === null ? "N/A" : signed(worstDay), worstDay],
                ["Clean days", dayTotals.length ? `${cleanDays} of ${dayTotals.length}` : "N/A"],
              ];
              return (
                <div className="rounded-2xl mb-4" style={{ padding: isDesktop ? "22px 24px 10px" : "18px 16px 6px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}>
                  <div className="flex items-start justify-between" style={{ gap: "12px", marginBottom: "10px" }}>
                    <div className="min-w-0">
                      <div style={{ color: palette.text, fontSize: isDesktop ? "21px" : "18px", fontWeight: 800, letterSpacing: "-0.01em" }}>Monthly statement</div>
                      <div style={{ color: palette.textFaint, fontSize: "13.5px", marginTop: "2px" }}>{MONTH_NAMES[viewMonthIdx]} {viewYear}</div>
                    </div>
                    <button
                      type="button"
                      onClick={openStatement}
                      disabled={disabled}
                      className={`flex items-center flex-shrink-0 ${TAP}`}
                      style={{ gap: "7px", padding: "10px 14px", borderRadius: "12px", background: palette.field, border: `1px solid ${palette.border}`, color: disabled ? palette.textFaint : palette.text, fontSize: "13px", fontWeight: 700, opacity: disabled ? 0.6 : 1 }}
                    >
                      <FileText size={15} />
                      {periodLabel} Statement
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gridTemplateRows: isDesktop ? "repeat(5, auto)" : "none", gridAutoFlow: isDesktop ? "column" : "row", columnGap: "32px" }}>
                    {rows.map(([label, value, signedVal]) => (
                      <div key={label} className="flex items-center justify-between" style={{ padding: "13px 0", borderBottom: `1px solid ${palette.border}`, gap: "12px" }}>
                        <span style={{ color: palette.textMuted, fontSize: "15px" }}>{label}</span>
                        <span style={{ color: signedVal === undefined ? palette.text : tone(signedVal), fontSize: "15px", fontWeight: 800, textAlign: "right" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {trades.length > 0 && onOpenHistory && (
              <button
                type="button"
                onClick={() => onOpenHistory()}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 mb-3 ${TAP}`}
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12px", fontWeight: 600 }}
              >
                <Search size={14} />
                Search all {trades.length} trades in History
              </button>
            )}

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
                {selectedInfo.trades.map(renderTradeCard)}
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
