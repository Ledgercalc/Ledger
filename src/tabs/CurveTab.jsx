import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import { StatChip } from "../components/ui.jsx";
import { computeDisciplineStreak, computeRevengeIds } from "../lib/analytics.js";
import { EMOTIONS, NOTE_TAGS, RUNTIME, SETUPS, emotionMeta } from "../lib/constants.js";
import { MARKET_SESSIONS, sessionOpenAtUTCHour } from "../lib/sessions.js";
import { CONFIDENCE_MAX, CONFIDENCE_MIN, confidenceWord } from "../lib/tradeInsights.js";
import { MONTH_NAMES, dayKeyFromDate, dayKeyFromTs, fmt, fmtMoney, formatDayLabel, num, pad2 } from "../lib/format.js";
import { SCREENSHOT_MAX_PER_TRADE, tradeScreenshots } from "../lib/images.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { ArrowDown, ArrowUp, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, Pencil, Plus, Search, Share2, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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


// "3h 12m", "14m 05s", "2d 4h". Used for how long a trade has been (or was) open.
function fmtHold(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
const fmtClock = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDay = (ts) => new Date(ts).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
// Market session(s) open at a moment, e.g. "London" or "London / New York" during an overlap. Empty when none is open.
const sessionLabelAt = (ts) => {
  const d = new Date(ts);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  return MARKET_SESSIONS.filter((s) => sessionOpenAtUTCHour(s, hour)).map((s) => s.label).join(" / ");
};
// 0.1, 0.25, 1, 2.5 (no trailing zeros)
const fmtLot = (q) => String(Number(Number(q).toFixed(3)));

// Shared look for the two top panels (Net P&L and Active trade): each is its own rounded card.
const topCard = () => ({
  minWidth: 0,
  background: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: "20px",
  boxShadow: palette.shadow,
  transition: THEME_TRANSITION,
});

// Pop-up card listing every trade that is open right now, with the same details on phone and PC.
function OpenTradesSheet({ positions, isDesktop, onClose }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const px = (v) => String(Number(Number(v).toFixed(5)));
  const money = (v) => `${v >= 0 ? "+" : "-"}$${fmtMoney(v)}`;
  const known = positions.filter((p) => p.pnl !== null);
  const total = known.length ? known.reduce((s, p) => s + p.pnl, 0) : null;
  const label = { color: palette.textFaint, fontSize: "11px", lineHeight: 1.3 };
  const value = { color: palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 600, marginTop: "2px", overflowWrap: "anywhere" };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        role="dialog"
        aria-label="Open trades"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: isDesktop ? "460px" : "420px",
          maxHeight: "85vh",
          overflowY: "auto",
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: "20px",
          boxShadow: palette.shadow,
          padding: isDesktop ? "22px" : "16px",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
          <div>
            <div style={{ color: palette.text, fontFamily: display, fontSize: "18px", fontWeight: 700 }}>Open trades</div>
            <div style={{ color: palette.textFaint, fontSize: "12px", marginTop: "2px" }}>
              {positions.length} open right now
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={TAP}
            style={{ color: palette.textMuted }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {positions.length > 1 && total !== null && (
          <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
            <span style={{ color: palette.textMuted, fontSize: "13px" }}>Total floating P&amp;L</span>
            <span style={{ color: total >= 0 ? palette.green : palette.red, fontFamily: display, fontSize: "20px", fontWeight: 700 }}>
              {money(total)}
            </span>
          </div>
        )}

        {positions.map((p, i) => {
          const isBuy = p.direction === "up";
          const hasSL = Number(p.stopLoss) > 0;
          const hasTP = Number(p.takeProfit) > 0;
          const sess = p.openTs ? sessionLabelAt(p.openTs) : "";
          return (
            <div
              key={p.positionId || i}
              style={{ border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "12px", marginTop: i ? "8px" : 0 }}
            >
              <div className="flex items-center justify-between" style={{ gap: "8px" }}>
                <div className="flex items-baseline" style={{ gap: "8px", minWidth: 0 }}>
                  <span className="truncate" style={{ color: palette.text, fontFamily: mono, fontSize: "14px", fontWeight: 700 }}>
                    {p.pair}
                  </span>
                  <span style={{ color: isBuy ? palette.green : palette.red, fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
                    {isBuy ? "Buy" : "Sell"}
                  </span>
                </div>
                <span
                  style={{
                    color: p.pnl === null ? palette.textMuted : p.pnl >= 0 ? palette.green : palette.red,
                    fontFamily: display,
                    fontSize: "18px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {p.pnl === null ? "n/a" : money(p.pnl)}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px 8px", marginTop: "10px" }}>
                <div>
                  <div style={label}>Lot</div>
                  <div style={value}>{Number(p.qty) > 0 ? fmtLot(p.qty) : "\u2014"}</div>
                </div>
                <div>
                  <div style={label}>Held</div>
                  <div style={value}>{p.openTs ? fmtHold(now - p.openTs) : "\u2014"}</div>
                </div>
                <div>
                  <div style={label}>Session</div>
                  <div style={{ ...value, fontFamily: undefined }}>{sess || "\u2014"}</div>
                </div>
                <div>
                  <div style={label}>Entry</div>
                  <div style={value}>{Number(p.entryPrice) > 0 ? px(p.entryPrice) : "\u2014"}</div>
                </div>
                <div>
                  <div style={label}>Stop loss</div>
                  <div style={{ ...value, color: hasSL ? palette.red : palette.textFaint }}>{hasSL ? px(p.stopLoss) : "\u2014"}</div>
                </div>
                <div>
                  <div style={label}>Take profit</div>
                  <div style={{ ...value, color: hasTP ? palette.green : palette.textFaint }}>{hasTP ? px(p.takeProfit) : "\u2014"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// The card on the Journal: tap it (when a trade is open) to see every open trade.
function ActiveTradePanel({ cardStyle, ...props }) {
  const [open, setOpen] = useState(false);
  const tappable = !!(props.connected && props.positions.length > 0);
  useEffect(() => {
    if (!tappable) setOpen(false);
  }, [tappable]);
  return (
    <>
      <div
        style={{ ...cardStyle, cursor: tappable ? "pointer" : "default" }}
        role={tappable ? "button" : undefined}
        tabIndex={tappable ? 0 : undefined}
        aria-label={tappable ? "Show open trades" : undefined}
        onClick={tappable ? () => setOpen(true) : undefined}
        onKeyDown={
          tappable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(true);
                }
              }
            : undefined
        }
      >
        <ActiveTradeContent {...props} />
      </div>
      {open && tappable && <OpenTradesSheet positions={props.positions} isDesktop={props.isDesktop} onClose={() => setOpen(false)} />}
    </>
  );
}

// The trade that is open right now, straight from the connected broker.
function ActiveTradeContent({ connected, positions, pnlAvailable, error, isDesktop }) {
  const [now, setNow] = useState(() => Date.now());
  const hasLive = connected && positions.length > 0;
  useEffect(() => {
    if (!hasLive) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasLive]);

  const title = (
    <div style={{ color: palette.textMuted, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
      Active trade
      {hasLive && (
        <span
          aria-label="Live"
          style={{ width: 7, height: 7, borderRadius: 999, background: palette.green, boxShadow: `0 0 0 3px ${palette.green}26` }}
        />
      )}
    </div>
  );
  const quiet = { color: palette.textFaint, fontSize: "12px", marginTop: "6px", lineHeight: 1.4 };

  if (!connected) {
    return (
      <div>
        {title}
        <div style={{ color: palette.textMuted, fontFamily: display, fontSize: isDesktop ? "22px" : "17px", fontWeight: 700, marginTop: "4px" }}>
          No broker
        </div>
        <div style={quiet}>Connect one in the Broker tab to see your open trade here.</div>
      </div>
    );
  }
  if (!positions.length) {
    return (
      <div>
        {title}
        <div style={{ color: palette.text, fontFamily: display, fontSize: isDesktop ? "22px" : "17px", fontWeight: 700, marginTop: "4px" }}>
          No open trade
        </div>
        <div style={quiet}>{error ? "Couldn\u2019t reach your broker just now." : "You\u2019re flat."}</div>
      </div>
    );
  }
  const p = positions[0];
  const isBuy = p.direction === "up";
  const dirColor = isBuy ? palette.green : palette.red;
  const pnlColor = p.pnl === null ? palette.textMuted : p.pnl >= 0 ? palette.green : palette.red;
  const px = (v) => String(Number(Number(v).toFixed(5)));
  const hasSL = Number(p.stopLoss) > 0;
  const hasTP = Number(p.takeProfit) > 0;
  const levelRow = { fontFamily: mono, fontSize: "12px", lineHeight: 1.5, whiteSpace: "nowrap" };
  // PC only: entry, stop loss and take profit sit in the top right corner of the card.
  const levels = isDesktop ? (
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      {Number(p.entryPrice) > 0 && (
        <div style={{ ...levelRow, color: palette.textMuted }}>
          <span style={{ color: palette.textFaint }}>Entry </span>
          {px(p.entryPrice)}
        </div>
      )}
      <div style={{ ...levelRow, color: hasSL ? palette.red : palette.textFaint }}>
        <span style={{ color: palette.textFaint }}>SL </span>
        {hasSL ? px(p.stopLoss) : "\u2014"}
      </div>
      <div style={{ ...levelRow, color: hasTP ? palette.green : palette.textFaint }}>
        <span style={{ color: palette.textFaint }}>TP </span>
        {hasTP ? px(p.takeProfit) : "\u2014"}
      </div>
    </div>
  ) : null;
  return (
    <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      {title}
      <div className="flex items-baseline" style={{ gap: "8px", marginTop: "4px", minWidth: 0 }}>
        <span className="truncate" style={{ color: palette.text, fontFamily: mono, fontSize: "14px", fontWeight: 700 }}>
          {p.pair}
        </span>
        <span style={{ color: dirColor, fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>{isBuy ? "Buy" : "Sell"}</span>
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: isDesktop ? "34px" : "24px",
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: "2px",
          color: pnlColor,
        }}
      >
        {p.pnl === null ? "P&L n/a" : `${p.pnl >= 0 ? "+" : "-"}$${fmtMoney(p.pnl)}`}
      </div>
      <div style={{ ...quiet, fontFamily: mono }}>
        {p.openTs ? `Held ${fmtHold(now - p.openTs)}` : "Open"}
        {positions.length > 1 ? ` \u00b7 +${positions.length - 1} more` : ""}
      </div>
      {(() => {
        const lot = Number(p.qty) > 0 ? `${fmtLot(p.qty)} lot` : "";
        const sess = p.openTs ? sessionLabelAt(p.openTs) : "";
        const line = [lot, sess].filter(Boolean).join(" \u00b7 ");
        return line ? <div style={{ ...quiet, marginTop: "2px", fontFamily: mono }}>{line}</div> : null;
      })()}
      {p.pnl === null && !pnlAvailable && (
        <div style={{ ...quiet, marginTop: "2px" }}>Your broker doesn\u2019t send live P&amp;L.</div>
      )}
    </div>
    {levels}
    </div>
  );
}

// Horizontal confidence meter: ten rising bars. Tap or drag across it to set 1-10, arrow keys also work.
function ConfidenceMeter({ value, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const v = Number(value) || 0;
  const fromX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const ratio = (clientX - r.left) / r.width;
    return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, Math.ceil(ratio * CONFIDENCE_MAX)));
  };
  const onPointerDown = (e) => {
    dragging.current = true;
    try { trackRef.current.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    onChange(fromX(e.clientX));
  };
  const onPointerMove = (e) => {
    if (dragging.current) onChange(fromX(e.clientX));
  };
  const stopDrag = () => {
    dragging.current = false;
  };
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(CONFIDENCE_MAX, v + 1 || CONFIDENCE_MIN));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(CONFIDENCE_MIN, (v || CONFIDENCE_MIN + 1) - 1));
    } else if (e.key === "Backspace" || e.key === "Delete") {
      onChange(null);
    }
  };
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span style={{ color: palette.textFaint, fontSize: "11px" }}>Confidence</span>
        <span className="flex items-center gap-2">
          <span style={{ color: v ? palette.text : palette.textFaint, fontFamily: mono, fontSize: "12px" }}>
            {v ? `${v}/${CONFIDENCE_MAX} \u00b7 ${confidenceWord(v)}` : "Not set"}
          </span>
          {v > 0 && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={TAP}
              style={{ color: palette.textFaint, fontSize: "11px" }}
            >
              Clear
            </button>
          )}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Confidence"
        aria-valuemin={CONFIDENCE_MIN}
        aria-valuemax={CONFIDENCE_MAX}
        aria-valuenow={v || undefined}
        aria-valuetext={v ? `${v} of ${CONFIDENCE_MAX}, ${confidenceWord(v)}` : "Not set"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={onKeyDown}
        className="flex items-end"
        style={{ gap: "4px", height: "30px", cursor: "pointer", touchAction: "pan-y", userSelect: "none" }}
      >
        {Array.from({ length: CONFIDENCE_MAX }, (_, i) => {
          const on = i < v;
          return (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${34 + i * 7}%`,
                borderRadius: "4px",
                background: on ? palette.gold : palette.field,
                border: `1px solid ${on ? palette.gold : palette.border}`,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between" style={{ marginTop: "4px", color: palette.textFaint, fontSize: "10px" }}>
        <span>Unsure</span>
        <span>Certain</span>
      </div>
    </div>
  );
}

// Dropdown for the trade's setup, with an inline "add your own" so nobody has to leave the log sheet.
function SetupSelect({ value, onChange, customSetups, customSetupsLoaded, addCustomSetup }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const fieldStyle = {
    background: palette.field,
    border: `1px solid ${palette.border}`,
    color: palette.text,
    fontSize: "14px",
  };
  const save = () => {
    const res = addCustomSetup ? addCustomSetup(name) : { error: "Adding setups isn\u2019t available here." };
    if (res && res.error) {
      setErr(res.error);
      return;
    }
    if (res && res.id) onChange(res.id);
    setAdding(false);
    setName("");
    setErr("");
  };
  return (
    <div className="mb-3">
      <label htmlFor="trade-setup-select" style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>
        Setup
      </label>
      <div className="relative">
        <select
          id="trade-setup-select"
          value={adding ? "__new__" : value || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__new__") {
              setAdding(true);
              return;
            }
            setAdding(false);
            setErr("");
            onChange(v || null);
          }}
          className="w-full rounded-lg px-3 py-2.5 outline-none"
          style={{ ...fieldStyle, appearance: "none", WebkitAppearance: "none", paddingRight: "36px" }}
        >
          <option value="">No setup</option>
          <optgroup label="Standard">
            {SETUPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </optgroup>
          {customSetupsLoaded && customSetups.length > 0 && (
            <optgroup label="Yours">
              {customSetups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__new__">+ Add a new setup</option>
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: palette.textMuted, pointerEvents: "none" }}
        />
      </div>
      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            autoFocus
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            placeholder="Setup name"
            className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none"
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={save}
            className={`rounded-lg px-3 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontSize: "13px", fontWeight: 700 }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
              setErr("");
            }}
            className={`rounded-lg px-3 ${TAP}`}
            style={{ color: palette.textMuted, border: `1px solid ${palette.border}`, fontSize: "13px" }}
          >
            Cancel
          </button>
        </div>
      )}
      {err && (
        <p className="text-xs mt-1.5" style={{ color: palette.red }}>
          {err}
        </p>
      )}
    </div>
  );
}

export default function CurveTab(props) {
  const {
    calMonth,
    cancelEditTrade,
    clearTrades,
    copyFallbackText,
    copyMsg,
    copyWeekSummary,
    customMoods,
    customMoodsLoaded,
    addCustomSetup,
    brokerConn,
    liveError,
    livePnlAvailable,
    livePositions,
    customSetups,
    customSetupsLoaded,
    deleteTrade,
    editingTradeId,
    expandedTradeId,
    findSetupLabel,
    generateWeeklyShare,
    handleScreenshotChange,
    isDesktop,
    logFormRef,
    openScreenshotPicker,
    persistSettings,
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
    setTradeConfidence,
    setTradeDirection,
    setTradeEmotion,
    setTradeInput,
    setTradeNote,
    setTradePair,
    setTradeSession,
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
    tradeConfidence,
    tradeDirection,
    tradeEmotion,
    tradeInput,
    tradeNote,
    tradePair,
    tradeSession,
    tradeSetup,
    trades,
    tradesLoadError,
    tradesLoaded,
    view = "overview",
    logSheetOpen,
    setLogSheetOpen
  } = props;
  // When the log sheet opens for a NEW trade, preselect the session if exactly one market is open right now.
  // Overlaps are ambiguous, so those are left for the trader to pick.
  useEffect(() => {
    if (!logSheetOpen || editingTradeId || tradeSession) return;
    const now = new Date();
    const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const open = MARKET_SESSIONS.filter((s) => sessionOpenAtUTCHour(s, hour));
    if (open.length === 1) setTradeSession(open[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSheetOpen, editingTradeId]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [historyExtra, setHistoryExtra] = useState({ direction: "", setup: "", session: "", mood: "" });
  const [historyVisible, setHistoryVisible] = useState(30);
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

    const startBal = num(startingBalance);
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;

    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;
    const expectancy = trades.length > 0 ? netPnl / trades.length : 0;

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
    const firstWeekday = (new Date(viewYear, viewMonthIdx, 1).getDay() + 6) % 7;
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

    const monthDayKeys = Object.keys(tradesByDay).filter((k) => k.startsWith(monthPrefix));
    const monthTradingDays = monthDayKeys.length;
    const monthGreenDays = monthDayKeys.filter((k) => tradesByDay[k].total > 0).length;
    const monthMaxAbs = Math.max(1, ...monthDayKeys.map((k) => Math.abs(tradesByDay[k].total)));
    const WEEK_LABELS_MON = ["M", "T", "W", "T", "F", "S", "S"];
    const WEEK_GRID = isDesktop ? "repeat(7, minmax(0, 1fr)) minmax(58px, 1.15fr)" : "repeat(7, minmax(0, 1fr))";
    // Short money for small calendar tiles: 950, 1.2k, 12k.
    const fmtCompactMoney = (n) => {
      const a = Math.abs(n);
      if (a >= 10000) return `${Math.round(a / 1000)}k`;
      if (a >= 1000) return `${(a / 1000).toFixed(1).replace(/\.0$/, "")}k`;
      return String(Math.round(a));
    };
    const weekRows = [];
    for (let i = 0; i < monthCells.length; i += 7) weekRows.push(monthCells.slice(i, i + 7));
    const isoWeekOf = (date) => {
      const dt = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = dt.getUTCDay() || 7;
      dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
      return Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
    };
    const tradeNumberById = {};
    [...trades]
      .sort((x, y) => x.ts - y.ts)
      .forEach((t, i) => {
        tradeNumberById[t.id] = i + 1;
      });

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

    const renderTradeCard = (t) => {
                  const isExpanded = expandedTradeId === t.id;
                  const isBeingEdited = editingTradeId === t.id;
                  const shots = tradeScreenshots(t);
                  const savingThisTrade = screenshotSaving && screenshotTargetId === t.id;
                  const sessionLabel = t.session ? MARKET_SESSIONS.find((x) => x.id === t.session)?.label : "";
                  const conf = Number(t.confidence) > 0 ? Number(t.confidence) : 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setExpandedTradeId(isExpanded ? null : t.id)}
                      className="rounded-2xl p-3.5 mb-2"
                      style={{
                        background: palette.surface,
                        border: `${isExpanded && !isBeingEdited ? 1.5 : 1}px solid ${
                          isBeingEdited ? palette.gold : isExpanded ? palette.text : palette.border
                        }`,
                        boxShadow: palette.shadow,
                        cursor: "pointer",
                        transition: THEME_TRANSITION,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2" style={{ color: palette.text, fontSize: "15px", fontWeight: 700 }}>
                            <span className="truncate">
                              #{tradeNumberById[t.id]} {t.pair || "Trade"}
                            </span>
                            {(t.direction === "up" || t.direction === "down") && (
                              <span
                                className="flex-shrink-0"
                                style={{ fontSize: "13px", fontWeight: 700, color: t.direction === "up" ? palette.green : palette.red }}
                              >
                                {t.direction === "up" ? "Buy" : "Sell"}
                              </span>
                            )}
                            {sessionLabel && (
                              <span className="flex-shrink-0" style={{ fontSize: "12px", fontWeight: 500, color: palette.textMuted }}>
                                {sessionLabel}
                              </span>
                            )}
                            {conf > 0 && (
                              <span className="flex-shrink-0" style={{ fontSize: "12px", fontWeight: 500, color: palette.textMuted, fontFamily: mono }}>
                                {conf}/{CONFIDENCE_MAX}
                              </span>
                            )}
                          </div>
                          {t.openTs ? (
                            <div style={{ color: palette.textFaint, fontSize: "12px", lineHeight: 1.5 }}>
                              <div>{fmtDay(t.openTs)}</div>
                              <div style={{ fontFamily: mono }}>
                                In {fmtClock(t.openTs)}
                                {fmtDay(t.ts) !== fmtDay(t.openTs) ? ` (${fmtDay(t.openTs)})` : ""} {"\u00b7"} Out {fmtClock(t.ts)}
                                {fmtDay(t.ts) !== fmtDay(t.openTs) ? ` (${fmtDay(t.ts)})` : ""}
                              </div>
                              <div style={{ color: palette.textMuted, fontFamily: mono }}>Held {fmtHold(Math.max(0, t.ts - t.openTs))}</div>
                            </div>
                          ) : (
                            <div style={{ color: palette.textFaint, fontSize: "13px" }}>{fmtClock(t.ts)}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0" style={{ marginLeft: "8px", gap: "6px" }}>
                          <span
                            style={{
                              fontFamily: mono,
                              fontSize: "15px",
                              fontWeight: 700,
                              color: t.pnl >= 0 ? palette.green : palette.red,
                            }}
                          >
                            {t.pnl >= 0 ? "+" : "-"}${fmtMoney(t.pnl)}
                            {t.pnlEstimated && (
                              <span style={{ fontSize: "10px", fontWeight: 500, color: palette.textFaint, marginLeft: "4px" }}>est.</span>
                            )}
                          </span>
                          <div className="flex items-center" style={{ gap: "10px" }}>
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
                      </div>

                      {t.note && (
                        <div style={{ color: palette.text, fontSize: "14px", marginTop: "8px" }}>{t.note}</div>
                      )}

                      {(() => {
                        const showRevenge = settings.showRevengeTag !== false && revengeIds.has(t.id);
                        const mood = t.emotion ? emotionMeta(t.emotion) : null;
                        if (!t.setup && !mood && !showRevenge && !isBeingEdited && shots.length === 0 && !savingThisTrade) return null;
                        const chip = (color) => ({
                          fontSize: "12px",
                          color,
                          border: `1px solid ${color === palette.textMuted ? palette.border : color}`,
                          borderRadius: "999px",
                          padding: "2px 10px",
                        });
                        return (
                          <div className="flex gap-1.5 flex-wrap items-center" style={{ marginTop: "10px" }}>
                            {t.setup && <span style={chip(palette.textMuted)}>{findSetupLabel(t.setup)}</span>}
                            {mood && (
                              <span style={chip(palette.textMuted)}>
                                {mood.emoji} {mood.label}
                              </span>
                            )}
                            {showRevenge && <span style={chip(palette.red)}>Revenge trade</span>}
                            {isBeingEdited && <span style={chip(palette.gold)}>Editing</span>}
                            {shots.length > 0 && (
                              <Camera size={13} style={{ color: palette.textFaint }} aria-label="Has screenshot" />
                            )}
                            {savingThisTrade && (
                              <span style={{ fontSize: "11px", color: palette.textFaint, fontFamily: mono }}>
                                {"saving\u2026"}
                              </span>
                            )}
                          </div>
                        );
                      })()}

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

    return (
      <>

      <OnboardingTip
  	id="curve-setup-mood"
  	text="Tag each trade with its direction, setup, session, confidence and mood. It unlocks the breakdowns in Insights."
  	settings={settings}
  	persistSettings={persistSettings}
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

        {view !== "history" && (
          <>
        <div
          className="mb-4"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: isDesktop ? "16px" : "12px",
          }}
        >
          <div style={{ ...topCard(), padding: isDesktop ? "24px" : "16px" }}>
            <div style={{ color: palette.textMuted, fontSize: "12px" }}>Net P&amp;L</div>
            <div
              style={{
                fontFamily: display,
                fontSize: isDesktop ? "40px" : "24px",
                fontWeight: 700,
                lineHeight: 1.1,
                marginTop: "4px",
                overflowWrap: "anywhere",
                color: trades.length === 0 || netPnl === 0 ? palette.text : netPnl > 0 ? palette.green : palette.red,
              }}
            >
              {trades.length === 0 ? "$0" : `${netPnl >= 0 ? "+" : "-"}$${fmtMoney(netPnl)}`}
            </div>
            <div style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "11px", marginTop: "6px", lineHeight: 1.4 }}>
              {trades.length} trade{trades.length === 1 ? "" : "s"}
              {startBal > 0 ? ` \u00b7 Balance $${fmt(startBal + netPnl, 0)}` : ""}
            </div>
          </div>
          <ActiveTradePanel
            cardStyle={{ ...topCard(), padding: isDesktop ? "24px" : "16px" }}
            connected={!!(brokerConn && brokerConn.connected)}
            positions={livePositions || []}
            pnlAvailable={livePnlAvailable !== false}
            error={liveError}
            isDesktop={isDesktop}
          />
        </div>

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
            <StatChip
              label="Discipline Streak"
              value={disciplineHasData ? `${disciplineCurrent} day${disciplineCurrent === 1 ? "" : "s"}` : "N/A"}
              onClick={() => setShowDisciplineInfo((v) => !v)}
            />
            <StatChip
              label="Best Discipline Streak"
              value={disciplineHasData ? `${disciplineBest} day${disciplineBest === 1 ? "" : "s"}` : "N/A"}
            />
            <StatChip
              label="Profit Factor"
              value={
                trades.length === 0 || grossWin + grossLoss === 0
                  ? "N/A"
                  : profitFactor === null
                  ? "\u221e"
                  : profitFactor.toFixed(2)
              }
            />
            <StatChip
              label="Expectancy"
              value={trades.length ? `${expectancy >= 0 ? "+" : "-"}$${fmtMoney(expectancy)} / trade` : "N/A"}
            />
          </div>
          {showStreakInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Streaks count consecutive wins (positive) or losses (negative).
            </p>
          )}
          {showDisciplineInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Consecutive trading days with no revenge trade (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a
              loss) tracks behavior, not P&amp;L. Profit factor is gross wins divided by gross losses; expectancy is your
              average result per trade.
            </p>
          )}
        </div>

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

        {!tradesLoaded ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Loading saved trades\u2026
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ color: palette.text, fontFamily: display, fontSize: "15px", fontWeight: 700 }}>Calendar</span>
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
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div style={{ color: palette.text, fontFamily: display, fontSize: "20px", fontWeight: 700 }}>
                    {MONTH_NAMES[viewMonthIdx]} {viewYear}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: palette.textFaint }}>
                    Tap a day to filter the entries
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    aria-label="Previous month"
                    className={`flex items-center justify-center ${TAP}`}
                    style={{ width: 36, height: 36, borderRadius: "999px", border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    aria-label="Next month"
                    className={`flex items-center justify-center ${TAP}`}
                    style={{ width: 36, height: 36, borderRadius: "999px", border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className={`grid ${isDesktop ? "gap-1.5 mb-1.5" : "gap-1 mb-1"}`} style={{ gridTemplateColumns: WEEK_GRID }}>
                {WEEK_LABELS_MON.map((w, i) => (
                  <div key={i} className="text-center" style={{ fontSize: "11px", fontWeight: 600, color: palette.textMuted }}>
                    {w}
                  </div>
                ))}
                {isDesktop && (
                  <div className="text-center" style={{ fontSize: "11px", fontWeight: 600, color: palette.textMuted }}>
                    Week
                  </div>
                )}
              </div>

              <div>
                {weekRows.map((row, wi) => {
                  const wKeys = row
                    .filter((d) => d !== null)
                    .map((d) => `${monthPrefix}-${pad2(d)}`)
                    .filter((k) => tradesByDay[k]);
                  const wTotal = wKeys.reduce((x, k) => x + tradesByDay[k].total, 0);
                  const wNum = isoWeekOf(new Date(viewYear, viewMonthIdx, 1 - firstWeekday + wi * 7));
                  return (
                    <div key={wi} className={`grid ${isDesktop ? "gap-1.5 mb-1.5" : "gap-1 mb-1"}`} style={{ gridTemplateColumns: WEEK_GRID }}>
                {row.map((d, i) => {
                  if (d === null) return <div key={i} />;
                  const key = `${monthPrefix}-${pad2(d)}`;
                  const info = tradesByDay[key];
                  const hasTrades = !!info;
                  const isFuture = key > todayKey;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;
                  const total = hasTrades ? info.total : 0;
                  const posDay = total >= 0;
                  const ruleBreak = hasTrades && info.trades.some((t) => revengeIds.has(t.id));
                  const alpha = hasTrades ? 0.22 + 0.4 * Math.min(1, Math.abs(total) / monthMaxAbs) : 0;
                  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, "0");
                  const bg = hasTrades
                    ? `${posDay ? palette.green : palette.red}${alphaHex}`
                    : isFuture
                    ? "transparent"
                    : palette.field;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => hasTrades && setSelectedDay(isSelected ? null : key)}
                      className={`relative flex flex-col items-start justify-between ${isDesktop ? "rounded-xl" : "rounded-lg"} ${hasTrades ? TAP : ""}`}
                      style={{
                        aspectRatio: "1",
                        minWidth: 0,
                        overflow: "hidden",
                        padding: isDesktop ? "6px 7px" : "4px 4px 4px 5px",
                        background: bg,
                        border: `${isSelected ? 2 : 1}px solid ${
                          isSelected ? palette.text : isToday ? palette.textMuted : "transparent"
                        }`,
                        cursor: hasTrades ? "pointer" : "default",
                        transition: THEME_TRANSITION,
                      }}
                    >
                      <span
                        style={{
                          fontSize: isDesktop ? "12px" : "11px",
                          lineHeight: 1,
                          fontWeight: hasTrades ? 700 : 500,
                          color: hasTrades ? palette.text : isFuture ? palette.textFaint : palette.textMuted,
                          opacity: !hasTrades && isFuture ? 0.6 : 1,
                        }}
                      >
                        {d}
                      </span>
                      {hasTrades && (
                        <>
                          <span
                            style={{
                              position: "absolute",
                              top: isDesktop ? 7 : 5,
                              right: isDesktop ? 7 : 5,
                              width: isDesktop ? 6 : 5,
                              height: isDesktop ? 6 : 5,
                              borderRadius: "999px",
                              background: ruleBreak ? palette.red : palette.green,
                            }}
                          />
                          <span
                            style={{
                              fontSize: isDesktop ? "11px" : "9.5px",
                              lineHeight: 1,
                              fontWeight: 700,
                              fontFamily: mono,
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                              color: posDay ? palette.green : palette.red,
                            }}
                          >
                            {posDay ? "+" : "-"}
                            {isDesktop ? fmtMoney(total) : fmtCompactMoney(total)}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
                      {!isDesktop ? null : wKeys.length > 0 ? (
                        <div
                          className="flex flex-col justify-between rounded-xl"
                          style={{ padding: "5px 6px", background: palette.field, border: `1px solid ${palette.border}` }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 700, color: palette.textMuted }}>W{wNum}</span>
                          <div>
                            <div
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                fontFamily: mono,
                                color: wTotal >= 0 ? palette.green : palette.red,
                              }}
                            >
                              {wTotal >= 0 ? "+" : "-"}${fmtMoney(wTotal)}
                            </div>
                            <div style={{ fontSize: "9px", color: palette.textFaint }}>
                              {wKeys.length} day{wKeys.length === 1 ? "" : "s"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-xl"
                          style={{ padding: "5px 6px", border: `1px dashed ${palette.border}` }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 700, color: palette.textFaint }}>W{wNum}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isDesktop && (
                <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
                  {weekRows.map((row, wi) => {
                    const keys = row
                      .filter((d) => d !== null)
                      .map((d) => `${monthPrefix}-${pad2(d)}`)
                      .filter((k) => tradesByDay[k]);
                    if (keys.length === 0) return null;
                    const total = keys.reduce((x, k) => x + tradesByDay[k].total, 0);
                    const wn = isoWeekOf(new Date(viewYear, viewMonthIdx, 1 - firstWeekday + wi * 7));
                    return (
                      <div
                        key={wi}
                        className="rounded-lg"
                        style={{ padding: "7px 9px", background: palette.field, border: `1px solid ${palette.border}` }}
                      >
                        <div className="flex items-baseline justify-between" style={{ gap: 6 }}>
                          <span style={{ fontSize: "10.5px", fontWeight: 700, color: palette.textMuted }}>Week {wn}</span>
                          <span style={{ fontSize: "10px", color: palette.textFaint }}>{keys.length}d</span>
                        </div>
                        <div style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, color: total >= 0 ? palette.green : palette.red }}>
                          {total >= 0 ? "+" : "-"}${fmtMoney(total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                className="grid grid-cols-3 gap-3 mt-4 pt-4"
                style={{ borderTop: `1px solid ${palette.border}` }}
              >
                {[
                  {
                    label: "Month P&L",
                    value: `${monthTotal >= 0 ? "+" : "-"}$${fmtMoney(monthTotal)}`,
                    color: monthTotal > 0 ? palette.green : monthTotal < 0 ? palette.red : palette.text,
                  },
                  { label: "Trading days", value: String(monthTradingDays), color: palette.text },
                  { label: "Green days", value: `${monthGreenDays} of ${monthTradingDays}`, color: palette.text },
                ].map((m) => (
                  <div key={m.label}>
                    <div style={{ fontSize: "11px", color: palette.textMuted }}>{m.label}</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3" style={{ fontSize: "11px", color: palette.textMuted }}>
                {[
                  { label: "Profit", swatch: `${palette.green}66`, round: false },
                  { label: "Loss", swatch: `${palette.red}66`, round: false },
                  { label: "No trades", swatch: palette.field, round: false },
                  { label: "Clean day", swatch: palette.green, round: true },
                  { label: "Rule break", swatch: palette.red, round: true },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span
                      style={{
                        width: l.round ? 8 : 12,
                        height: l.round ? 8 : 12,
                        borderRadius: l.round ? "999px" : "4px",
                        background: l.swatch,
                        display: "inline-block",
                      }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>


            {selectedInfo && (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span style={{ color: palette.text, fontSize: "14px" }}>
                    <span style={{ fontWeight: 700 }}>{formatDayLabel(selectedDay)}</span>
                    <span style={{ color: palette.textMuted }}>
                      {" \u00b7 "}
                      {selectedInfo.trades.some((t) => revengeIds.has(t.id)) ? "rule break" : "clean day"}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: "13px",
                      fontWeight: 700,
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
                No trades logged yet. Tap Log trade and it'll land on today's date.
              </p>
            )}
            {trades.length > 0 && !selectedInfo && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                Tap a highlighted day to see its trades.
              </p>
            )}
          </>
        )}

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
              const mTrades = trades.filter((t) => dayKeyFromTs(t.ts).startsWith(monthPrefix));
              const mWins = mTrades.filter((t) => t.pnl > 0);
              const mLosses = mTrades.filter((t) => t.pnl < 0);
              const mGrossWin = mWins.reduce((x, t) => x + t.pnl, 0);
              const mGrossLoss = Math.abs(mLosses.reduce((x, t) => x + t.pnl, 0));
              const mAvgWin = mWins.length ? mGrossWin / mWins.length : 0;
              const mAvgLoss = mLosses.length ? mGrossLoss / mLosses.length : 0;
              let mRun = 0;
              let mPeak = 0;
              let mDd = 0;
              [...mTrades]
                .sort((x, y) => x.ts - y.ts)
                .forEach((t) => {
                  mRun += t.pnl;
                  mPeak = Math.max(mPeak, mRun);
                  mDd = Math.max(mDd, mPeak - mRun);
                });
              const dayTotals = monthDayKeys.map((k) => tradesByDay[k].total);
              const bestDayTotal = dayTotals.length ? Math.max(...dayTotals) : null;
              const worstDayTotal = dayTotals.length ? Math.min(...dayTotals) : null;
              const cleanDays = monthDayKeys.filter((k) => !tradesByDay[k].trades.some((t) => revengeIds.has(t.id))).length;
              const setupCount = {};
              mTrades.forEach((t) => {
                if (t.setup) setupCount[t.setup] = (setupCount[t.setup] || 0) + 1;
              });
              const topSetupId = Object.keys(setupCount).sort((x, y) => setupCount[y] - setupCount[x])[0];
              const signed = (v) => `${v >= 0 ? "+" : "-"}$${fmtMoney(v)}`;
              const tone = (v) => (v > 0 ? palette.green : v < 0 ? palette.red : palette.text);
              const rows = [
                ["Net P&L", signed(monthTotal), tone(monthTotal)],
                ["Trades", String(mTrades.length)],
                ["Win rate", mTrades.length ? `${((mWins.length / mTrades.length) * 100).toFixed(1)}%` : "N/A"],
                ["Profit factor", mGrossLoss > 0 ? (mGrossWin / mGrossLoss).toFixed(2) : mGrossWin > 0 ? "\u221e" : "N/A"],
                ["Avg win / loss", mTrades.length ? `$${fmt(mAvgWin, 0)} / $${fmt(mAvgLoss, 0)}` : "N/A"],
                ["Max drawdown", mTrades.length ? `$${fmt(mDd, 0)}` : "N/A"],
                ["Best day", bestDayTotal === null ? "N/A" : signed(bestDayTotal), bestDayTotal === null ? undefined : tone(bestDayTotal)],
                ["Worst day", worstDayTotal === null ? "N/A" : signed(worstDayTotal), worstDayTotal === null ? undefined : tone(worstDayTotal)],
                ["Top setup", topSetupId ? findSetupLabel(topSetupId) : "N/A"],
                ["Clean days", monthTradingDays ? `${cleanDays} of ${monthTradingDays}` : "N/A"],
              ];
              return (
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div>
                      <div style={{ color: palette.text, fontFamily: display, fontSize: "17px", fontWeight: 700 }}>
                        Monthly statement
                      </div>
                      <div className="text-xs" style={{ color: palette.textFaint }}>
                        {MONTH_NAMES[viewMonthIdx]} {viewYear}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openStatement}
                      disabled={disabled}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 ${TAP}`}
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
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    {rows.map(([label, value, color]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: `1px solid ${palette.border}`, fontSize: "14px" }}
                      >
                        <span style={{ color: palette.textMuted }}>{label}</span>
                        <span style={{ color: color || palette.text, fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {view === "history" && (
          <>
            {(() => {
              const activeCount = Object.values(historyExtra).filter(Boolean).length + (historyFilter !== "all" ? 1 : 0);
              const setExtra = (k, v) => {
                setHistoryExtra((p) => ({ ...p, [k]: p[k] === v ? "" : v }));
                setHistoryVisible(30);
              };
              const pill = (active, color) => ({
                background: active ? `${color || palette.gold}22` : palette.field,
                color: active ? color || palette.gold : palette.textMuted,
                border: `1px solid ${active ? color || palette.gold : palette.border}`,
                fontSize: "13px",
                fontWeight: active ? 700 : 500,
              });
              const selectStyle = {
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontSize: "13.5px",
                appearance: "none",
                WebkitAppearance: "none",
                paddingRight: "30px",
              };
              const labelStyle = { color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" };
              return (
                <>
                  <div className="flex gap-2 mb-3">
                    <div
                      className="flex items-center flex-1 min-w-0 rounded-lg px-3"
                      style={{ background: palette.field, border: `1px solid ${palette.border}` }}
                    >
                      <Search size={16} style={{ color: palette.textFaint, flexShrink: 0 }} aria-hidden="true" />
                      <input
                        type="search"
                        value={historySearch}
                        onChange={(e) => {
                          setHistorySearch(e.target.value);
                          setHistoryVisible(30);
                        }}
                        placeholder="Search pair, note, setup"
                        aria-label="Search trades"
                        className="w-full bg-transparent py-2.5 pl-2 outline-none"
                        style={{ color: palette.text, fontSize: "14px" }}
                      />
                      {historySearch && (
                        <button
                          type="button"
                          onClick={() => setHistorySearch("")}
                          aria-label="Clear search"
                          className={TAP}
                          style={{ color: palette.textFaint, flexShrink: 0 }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryFilterOpen((v) => !v)}
                      aria-expanded={historyFilterOpen}
                      aria-label="Filter trades"
                      className={`relative flex items-center justify-center gap-1.5 rounded-lg px-3 flex-shrink-0 ${TAP}`}
                      style={{
                        background: historyFilterOpen || activeCount > 0 ? `${palette.gold}22` : palette.field,
                        color: historyFilterOpen || activeCount > 0 ? palette.gold : palette.textMuted,
                        border: `1px solid ${historyFilterOpen || activeCount > 0 ? palette.gold : palette.border}`,
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      <SlidersHorizontal size={16} />
                      {isDesktop && "Filter"}
                      {activeCount > 0 && (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            borderRadius: 999,
                            background: palette.gold,
                            color: palette.letterbox,
                            fontSize: "11px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                          }}
                        >
                          {activeCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {historyFilterOpen && (
                    <div
                      className="rounded-2xl p-4 mb-3"
                      style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                    >
                      <span style={labelStyle}>Result</span>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {[
                          ["all", "All", undefined],
                          ["wins", "Wins", palette.green],
                          ["losses", "Losses", palette.red],
                          ["rules", "Rule breaks", palette.gold],
                        ].map(([id, label, color]) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={historyFilter === id}
                            onClick={() => {
                              setHistoryFilter(id);
                              setHistoryVisible(30);
                            }}
                            className={`px-3 py-1.5 rounded-full ${TAP}`}
                            style={pill(historyFilter === id, color)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <span style={labelStyle}>Direction</span>
                      <div className="flex gap-2 mb-4">
                        {[
                          { id: "up", label: "Buy", color: palette.green },
                          { id: "down", label: "Sell", color: palette.red },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            aria-pressed={historyExtra.direction === d.id}
                            onClick={() => setExtra("direction", d.id)}
                            className={`px-4 py-1.5 rounded-full ${TAP}`}
                            style={pill(historyExtra.direction === d.id, d.color)}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <span style={labelStyle}>Session</span>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {MARKET_SESSIONS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={historyExtra.session === m.id}
                            onClick={() => setExtra("session", m.id)}
                            className={`px-3 py-1.5 rounded-full ${TAP}`}
                            style={pill(historyExtra.session === m.id)}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="hist-setup" style={labelStyle}>
                            Setup
                          </label>
                          <div className="relative">
                            <select
                              id="hist-setup"
                              value={historyExtra.setup}
                              onChange={(e) => {
                                setHistoryExtra((p) => ({ ...p, setup: e.target.value }));
                                setHistoryVisible(30);
                              }}
                              className="w-full rounded-lg px-3 py-2.5 outline-none"
                              style={selectStyle}
                            >
                              <option value="">Any setup</option>
                              {[...SETUPS, ...(customSetupsLoaded ? customSetups : [])].map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: palette.textMuted, pointerEvents: "none" }} />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="hist-mood" style={labelStyle}>
                            Mood
                          </label>
                          <div className="relative">
                            <select
                              id="hist-mood"
                              value={historyExtra.mood}
                              onChange={(e) => {
                                setHistoryExtra((p) => ({ ...p, mood: e.target.value }));
                                setHistoryVisible(30);
                              }}
                              className="w-full rounded-lg px-3 py-2.5 outline-none"
                              style={selectStyle}
                            >
                              <option value="">Any mood</option>
                              {[...EMOTIONS, ...(customMoodsLoaded ? customMoods : [])].map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: palette.textMuted, pointerEvents: "none" }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryExtra({ direction: "", setup: "", session: "", mood: "" });
                            setHistoryFilter("all");
                            setHistoryVisible(30);
                          }}
                          disabled={activeCount === 0}
                          className={TAP}
                          style={{ color: activeCount ? palette.textMuted : palette.textFaint, fontSize: "13px", opacity: activeCount ? 1 : 0.6 }}
                        >
                          Clear filters
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryFilterOpen(false)}
                          className={`rounded-lg px-4 py-2 ${TAP}`}
                          style={{ background: palette.gold, color: palette.letterbox, fontSize: "13px", fontWeight: 700 }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {(() => {
              const q = historySearch.trim().toLowerCase();
              const haystack = (t) => {
                const mood = t.emotion
                  ? emotionMeta(t.emotion)?.label || (customMoods || []).find((m) => m.id === t.emotion)?.label || ""
                  : "";
                const sess = t.session ? MARKET_SESSIONS.find((m) => m.id === t.session)?.label || "" : "";
                const dir = t.direction === "up" ? "buy" : t.direction === "down" ? "sell" : "";
                return [t.pair, t.note, t.setup ? findSetupLabel(t.setup) : "", mood, sess, dir, formatDayLabel(dayKeyFromTs(t.ts))]
                  .join(" ")
                  .toLowerCase();
              };
              const passes = (t) => {
                const byResult =
                  historyFilter === "wins"
                    ? t.pnl > 0
                    : historyFilter === "losses"
                    ? t.pnl < 0
                    : historyFilter === "rules"
                    ? revengeIds.has(t.id)
                    : true;
                if (!byResult) return false;
                if (historyExtra.direction && t.direction !== historyExtra.direction) return false;
                if (historyExtra.setup && t.setup !== historyExtra.setup) return false;
                if (historyExtra.session && t.session !== historyExtra.session) return false;
                if (historyExtra.mood && t.emotion !== historyExtra.mood) return false;
                if (q && !q.split(/\s+/).every((w) => haystack(t).includes(w))) return false;
                return true;
              };
              const allGroups = Object.keys(tradesByDay)
                .sort()
                .reverse()
                .map((k) => ({ key: k, trades: tradesByDay[k].trades.filter(passes), all: tradesByDay[k].trades }))
                .filter((g) => g.trades.length > 0);
              const shown = allGroups.slice(0, historyVisible);
              return (
                <>
                  {trades.length === 0 && (
                    <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                      No trades logged yet. Tap Log trade and it'll land on today's date.
                    </p>
                  )}
                  {trades.length > 0 && allGroups.length === 0 && (
                    <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                      No trades match your search or filters.
                    </p>
                  )}
                  {shown.map((g) => {
                    const groupTotal = g.trades.reduce((x, t) => x + t.pnl, 0);
                    return (
                      <div key={g.key} className="mb-2">
                        <div className="flex items-baseline justify-between mb-2 mt-3">
                          <span style={{ color: palette.text, fontSize: "14px" }}>
                            <span style={{ fontWeight: 700 }}>{formatDayLabel(g.key)}</span>
                            <span style={{ color: palette.textMuted }}>
                              {" \u00b7 "}
                              {g.all.some((t) => revengeIds.has(t.id)) ? "rule break" : "clean day"}
                            </span>
                          </span>
                          <span
                            style={{
                              fontFamily: mono,
                              fontSize: "13px",
                              fontWeight: 700,
                              color: groupTotal >= 0 ? palette.green : palette.red,
                            }}
                          >
                            {groupTotal >= 0 ? "+" : "-"}${fmtMoney(groupTotal)}
                          </span>
                        </div>
                        {g.trades.map(renderTradeCard)}
                      </div>
                    );
                  })}
                  {allGroups.length > shown.length && (
                    <button
                      type="button"
                      onClick={() => setHistoryVisible((v) => v + 30)}
                      className={`w-full rounded-lg py-3 mb-4 ${TAP}`}
                      style={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        color: palette.text,
                        fontFamily: mono,
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Show more days
                    </button>
                  )}
                </>
              );
            })()}
          </>
        )}

        {tradesLoadError && !logSheetOpen && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {tradesLoadError}
          </p>
        )}
        {screenshotError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {screenshotError}
          </p>
        )}

        {logSheetOpen && (
          <div
            onClick={() => (editingTradeId ? cancelEditTrade() : setLogSheetOpen(false))}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 45,
              background: "rgba(5,7,12,0.55)",
              display: "flex",
              alignItems: isDesktop ? "center" : "flex-end",
              justifyContent: "center",
              padding: isDesktop ? "16px" : 0,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: "90vh",
                overflowY: "auto",
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: isDesktop ? "20px" : "20px 20px 0 0",
                padding: "14px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
                boxShadow: palette.shadow,
              }}
            >
              <div className="flex justify-end" style={{ marginBottom: "4px" }}>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => (editingTradeId ? cancelEditTrade() : setLogSheetOpen(false))}
                  className={TAP}
                  style={{ color: palette.textMuted, padding: "2px" }}
                >
                  <X size={18} />
                </button>
              </div>
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
        <div className="flex gap-2 mb-2" role="group" aria-label="Direction">
          {[
            { id: "up", label: "Buy", Icon: ArrowUp, color: palette.green },
            { id: "down", label: "Sell", Icon: ArrowDown, color: palette.red },
          ].map(({ id, label, Icon, color }) => {
            const active = tradeDirection === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setTradeDirection(active ? null : id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 transition-colors ${TAP}`}
                style={{
                  background: active ? `${color}22` : palette.field,
                  color: active ? color : palette.textMuted,
                  border: `1px solid ${active ? color : palette.border}`,
                  fontSize: "13.5px",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <Icon size={15} strokeWidth={2.4} />
                {label}
              </button>
            );
          })}
        </div>
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

        <SetupSelect
          value={tradeSetup}
          onChange={setTradeSetup}
          customSetups={customSetups}
          customSetupsLoaded={customSetupsLoaded}
          addCustomSetup={addCustomSetup}
        />

        <span style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>Session</span>
        <div className="flex gap-2 flex-wrap mb-3 items-center" role="group" aria-label="Session">
          {MARKET_SESSIONS.map((s) => {
            const active = tradeSession === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTradeSession(active ? null : s.id)}
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
        </div>

        <ConfidenceMeter value={tradeConfidence} onChange={setTradeConfidence} />

        <span style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>Mood</span>
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
          Enter net P&amp;L for the trade. Positive logs a win, negative logs a loss. Setup, session, confidence
          and mood are optional, but every one you fill in sharpens your Insights. Tap the pencil on any logged
          trade to edit it. A "revenge" flag (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a loss)
          shows up per trade in the calendar below.
        </p>

        {tradesLoadError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {tradesLoadError}
          </p>
        )}
            </div>
          </div>
        )}
        {!logSheetOpen && (
          <>
          {/* Phones: sits above the dock, and drops into the dock's spot when the dock slides away on scroll.
              Desktop: sits a little lower so it no longer covers the monthly statement table. */}
          <style>{`.log-fab{transition:bottom .25s ease}.log-fab-m{bottom:88px}body[data-nav-hidden="1"] .log-fab-m{bottom:calc(20px + env(safe-area-inset-bottom, 0px))}`}</style>
          <button
            type="button"
            onClick={() => setLogSheetOpen(true)}
            aria-label="Log trade"
            className={`log-fab ${isDesktop ? "" : "log-fab-m"} flex items-center gap-2 ${TAP}`}
            style={{
              position: "fixed",
              right: isDesktop ? 28 : 16,
              ...(isDesktop ? { bottom: 12 } : {}),
              zIndex: 40,
              background: palette.gold,
              color: palette.letterbox,
              border: "none",
              borderRadius: "999px",
              padding: "13px 20px",
              fontSize: "14px",
              fontWeight: 700,
              boxShadow: palette.shadow,
            }}
          >
            <Plus size={16} strokeWidth={2.6} />
            Log trade
          </button>
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
}
