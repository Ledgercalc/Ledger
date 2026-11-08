import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import { computeRevengeIds } from "../lib/analytics.js";
import { EMOTIONS, LEGACY_EMOTIONS, NOTE_TAGS, RUNTIME, SETUPS, emotionMeta } from "../lib/constants.js";
import { MARKET_SESSIONS, sessionOpenAtUTCHour } from "../lib/sessions.js";
import { CONFIDENCE_MAX, CONFIDENCE_MIN, confidenceWord } from "../lib/tradeInsights.js";
import { MONTH_NAMES, dayKeyFromDate, dayKeyFromTs, fmt, fmtMoney, formatDayLabel, num, pad2 } from "../lib/format.js";
import { SCREENSHOT_MAX_PER_TRADE, tradeScreenshots } from "../lib/images.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { ArrowDown, ArrowUp, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, Pencil, Plus, Search, Share2, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import TradePlan from "../components/TradePlan.jsx";

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

// Lets the trader tag a trade while it is still open. Saved by position id and attached to the logged trade once it closes.
function OpenTradeTags({ positionId, tags, saveOpenTag, customSetups, customSetupsLoaded, addCustomSetup, customMoods, customMoodsLoaded }) {
  const [open, setOpen] = useState(false);
  const t = tags || {};
  const [note, setNote] = useState(t.note || "");
  if (!saveOpenTag || !positionId) return null;
  const setupLabel = t.setup ? [...SETUPS, ...(customSetups || [])].find((s) => s.id === t.setup)?.label || "" : "";
  const mood = t.emotion ? emotionMeta(t.emotion) || (customMoods || []).find((m) => m.id === t.emotion) || null : null;
  const summary = [
    setupLabel,
    Number(t.confidence) > 0 ? `${t.confidence}/${CONFIDENCE_MAX}` : "",
    mood ? mood.label : "",
    String(t.note || "").trim() ? "Note" : "",
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  const chipStyle = (active, dashed) => ({
    background: active ? palette.gold : palette.field,
    color: active ? palette.letterbox : palette.textMuted,
    border: `1px ${dashed ? "dashed" : "solid"} ${active ? palette.gold : palette.border}`,
    fontSize: "13px",
  });
  const moods = EMOTIONS;
  return (
    <div style={{ marginTop: "10px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={TAP}
        style={{ color: palette.gold, fontSize: "13px", fontWeight: 600 }}
      >
        {open ? "Hide details" : summary ? "Edit details" : "Add setup, mood, confidence"}
      </button>
      {!open && summary && <div style={{ color: palette.textMuted, fontSize: "12px", marginTop: "4px" }}>{summary}</div>}
      {open && (
        <div style={{ marginTop: "10px" }}>
          <SetupSelect
            idKey={`open-setup-${positionId}`}
            value={t.setup || null}
            onChange={(v) => saveOpenTag(positionId, { setup: v || null })}
            customSetups={customSetups || []}
            customSetupsLoaded={customSetupsLoaded}
            addCustomSetup={addCustomSetup}
          />
          <ConfidenceMeter value={t.confidence || null} onChange={(v) => saveOpenTag(positionId, { confidence: v || null })} />
          <span style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>Mood</span>
          <div className="flex gap-2 flex-wrap items-center" style={{ marginBottom: "12px" }}>
            {moods.map((e) => {
              const active = t.emotion === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => saveOpenTag(positionId, { emotion: active ? null : e.id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={chipStyle(active, false)}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          <span style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>Note</span>
          <textarea
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => {
              setNote(e.target.value);
              saveOpenTag(positionId, { note: e.target.value });
            }}
            placeholder="Why did you take this trade?"
            className="w-full rounded-lg px-3 py-2 outline-none"
            style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "14px", resize: "vertical" }}
          />
          <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "6px" }}>
            Saved automatically and added to this trade when it closes.
          </div>
        </div>
      )}
    </div>
  );
}

// Pop-up card listing every trade that is open right now, with the same details on phone and PC.
function OpenTradesSheet({ positions, isDesktop, onClose, tagProps, accountLabel }) {
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
              {positions.length} open right now{accountLabel ? ` \u00b7 ${accountLabel}` : ""}
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
              <OpenTradeTags
                positionId={p.positionId}
                tags={tagProps && tagProps.openTags ? tagProps.openTags[p.positionId] : null}
                saveOpenTag={tagProps && tagProps.saveOpenTag}
                customSetups={tagProps && tagProps.customSetups}
                customSetupsLoaded={tagProps && tagProps.customSetupsLoaded}
                addCustomSetup={tagProps && tagProps.addCustomSetup}
                customMoods={tagProps && tagProps.customMoods}
                customMoodsLoaded={tagProps && tagProps.customMoodsLoaded}
              />
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// The card on the Journal: tap it (when a trade is open) to see every open trade.
function ActiveTradePanel({ cardStyle, tagProps, ...props }) {
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
      {open && tappable && <OpenTradesSheet positions={props.positions} isDesktop={props.isDesktop} onClose={() => setOpen(false)} tagProps={tagProps} accountLabel={props.accountLabel} />}
    </>
  );
}

// The trade that is open right now, straight from the connected broker.
function ActiveTradeContent({ connected, positions, pnlAvailable, error, isDesktop, accountLabel }) {
  const [now, setNow] = useState(() => Date.now());
  const hasLive = connected && positions.length > 0;
  useEffect(() => {
    if (!hasLive) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasLive]);

  const titleText = (
    <div style={{ color: palette.textMuted, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
      {positions.length > 1 ? `${positions.length} Active trades` : "Active trade"}
      {hasLive && (
        <span
          aria-label="Live"
          style={{ width: 7, height: 7, borderRadius: 999, background: palette.green, boxShadow: `0 0 0 3px ${palette.green}26` }}
        />
      )}
    </div>
  );
  // Top row: "Active trade" on the left, the Tredzi account the broker saves into on the right (same on phone and PC).
  const title = (
    <div className="flex items-center justify-between" style={{ gap: "10px", minWidth: 0 }}>
      {titleText}
      {accountLabel ? (
        <span className="truncate" title={accountLabel} style={{ color: palette.textFaint, fontSize: "12px", fontWeight: 600, minWidth: 0, textAlign: "right" }}>
          {accountLabel}
        </span>
      ) : null}
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
  // Several trades open: show only the combined picture (total P&L, total lots, sessions). Details are in the pop-up.
  if (positions.length > 1) {
    const known = positions.filter((x) => x.pnl !== null);
    const total = known.length ? known.reduce((s, x) => s + x.pnl, 0) : null;
    const lots = positions.reduce((s, x) => s + (Number(x.qty) || 0), 0);
    const sessions = [...new Set(positions.flatMap((x) => (x.openTs ? sessionLabelAt(x.openTs).split(" / ").filter(Boolean) : [])))];
    const line = [lots > 0 ? `${fmtLot(lots)} lot` : "", sessions.join(" / ")].filter(Boolean).join(" \u00b7 ");
    const totalColor = total === null ? palette.textMuted : total >= 0 ? palette.green : palette.red;
    return (
      <div>
        {title}
        <div style={{ color: palette.textMuted, fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>Total floating P&amp;L</div>
        <div
          style={{
            fontFamily: display,
            fontSize: isDesktop ? "34px" : "24px",
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: "2px",
            color: totalColor,
          }}
        >
          {total === null ? "P&L n/a" : `${total >= 0 ? "+" : "-"}$${fmtMoney(total)}`}
        </div>
        {line && <div style={{ ...quiet, fontFamily: mono }}>{line}</div>}
        {total === null && !pnlAvailable && (
          <div style={{ ...quiet, marginTop: "2px" }}>Your broker doesn\u2019t send live P&amp;L.</div>
        )}
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
    <div>
    {title}
    <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
    <div style={{ minWidth: 0, flex: 1 }}>
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
function SetupSelect({ value, onChange, customSetups, customSetupsLoaded, addCustomSetup, idKey = "trade-setup-select" }) {
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
      <label htmlFor={idKey} style={{ color: palette.textFaint, fontSize: "11px", display: "block", marginBottom: "6px" }}>
        Setup
      </label>
      <div className="relative">
        <select
          id={idKey}
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

// ===================== Calendar + Journal screens =====================
// Calendar: month grid, week totals, day card, cumulative chart (matches the Ledger prototype).
// Journal: day strip, per-trade journals, day journal form, weekly recap, past entries.
// Day journals live in settings.dayJournals ({ "YYYY-MM-DD": entry }); per-trade journal fields
// (note, rate, mist, rulesOk) are saved on the trade itself.

const JOURNAL_MOODS = ["Calm", "Focused", "Anxious", "Rushed", "Tilted"];
const JOURNAL_BIAS = ["Bullish", "Bearish", "Range"];
const TRADE_MISTAKES = ["Early entry", "Moved stop", "Oversized", "Revenge trade"];
const JOURNAL_PROMPTS = [
  "What would you tell yourself ten trades ago?",
  "Which rule was hardest to follow today?",
  "What did you almost do, but didn\u2019t?",
  "Where did you feel rushed, and why?",
];
const JOURNAL_DEFAULT = { mood: "Focused", bias: "Range", energy: 3, levels: "", plan: "", good: "", fix: "", lesson: "", score: 80 };
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const keyToDate = (k) => {
  const [y, m, d] = String(k).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const dateLabel = (k) => {
  const d = keyToDate(k);
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
};
const hhmm = (ts) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const isLongDir = (d) => /^(buy|long|up)/i.test(String(d || ""));
const tradeJournaled = (t) => !!((t.note && String(t.note).trim()) || t.rate || (t.mist && t.mist.length));
const tradeVerdict = (t, rules) => {
  const checked = t.rulesOk || {};
  const rulesOk = !rules.length || rules.every((r) => checked[r.id]);
  const ok = rulesOk && !(t.mist && t.mist.length);
  return t.pnl > 0 ? (ok ? "Earned it" : "Lucky win") : ok ? "Unlucky loss" : "Process leak";
};
const VERDICT_TONE = { "Earned it": "green", "Lucky win": "gold", "Unlucky loss": "textMuted", "Process leak": "red" };

const compactMoney = (n) => {
  const a = Math.abs(n);
  if (a >= 10000) return `${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${(a / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(a));
};
// Currency / R multiple / Percent. 1R = your average losing trade, because trades only store P/L.
const makeUnitFmt = (unit, trades, startBal) => {
  const losses = trades.filter((t) => t.pnl < 0);
  const oneR = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0)) / losses.length : 0;
  const sg = (v, body) => `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${body}`;
  return {
    full: (v) => {
      if (unit === "r") return oneR > 0 ? sg(v, `${(Math.abs(v) / oneR).toFixed(1)}R`) : "n/a";
      if (unit === "p") return startBal > 0 ? sg(v, `${((Math.abs(v) / startBal) * 100).toFixed(1)}%`) : "n/a";
      return sg(v, `$${fmtMoney(Math.abs(v))}`);
    },
    short: (v) => {
      if (unit === "r") return oneR > 0 ? sg(v, (Math.abs(v) / oneR).toFixed(1)) : "";
      if (unit === "p") return startBal > 0 ? sg(v, `${((Math.abs(v) / startBal) * 100).toFixed(1)}`) : "";
      return sg(v, compactMoney(v));
    },
  };
};
const tone = (v) => (v > 0 ? palette.green : v < 0 ? palette.red : palette.text);

const cardSt = { background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "16px", boxShadow: palette.shadow };
const SecLabel = ({ left, right, rightColor, first }) => (
  <div className="flex items-center justify-between" style={{ margin: first ? "0 0 8px" : "24px 0 8px", fontSize: "12.5px", color: palette.textMuted }}>
    <span>{left}</span>
    <span style={{ color: rightColor || palette.textMuted }}>{right}</span>
  </div>
);
const primaryBtn = { width: "100%", height: "48px", borderRadius: "12px", border: "none", background: palette.gold, color: palette.letterbox, fontSize: "14.5px", fontWeight: 700 };
const outlineBtn = { width: "100%", height: "48px", borderRadius: "12px", border: `1px solid ${palette.border}`, background: "transparent", color: palette.text, fontSize: "14.5px", fontWeight: 600 };
const chipSt = (on) => ({
  minHeight: "38px", padding: "0 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, margin: "0 8px 8px 0",
  border: `1px solid ${on ? palette.gold : palette.border}`, background: on ? palette.gold : palette.surface, color: on ? palette.letterbox : palette.textMuted,
});
const fieldSt = { width: "100%", boxSizing: "border-box", border: `1px solid ${palette.border}`, background: palette.field, color: palette.text, borderRadius: "12px", padding: "11px 12px", fontSize: "14px", marginTop: "6px", display: "block" };

// ---------- Calendar ----------
function CalendarSection({ trades, tradesByDay, calMonth, setCalMonth, selectedDay, setSelectedDay, startingBalance, isDesktop, dayJournals, findSetupLabel, onOpenJournal, onLogTrade, onOpenTrade }) {
  const [unit, setUnit] = useState("d");
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  const startBal = num(startingBalance);
  const fu = useMemo(() => makeUnitFmt(unit, trades, startBal), [unit, trades, startBal]);
  const prefix = `${y}-${pad2(m + 1)}`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const keys = Object.keys(tradesByDay).filter((k) => k.startsWith(prefix)).sort();
  const vals = keys.map((k) => tradesByDay[k].total);
  const total = vals.reduce((s, v) => s + v, 0);
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const sel = selectedDay && selectedDay.startsWith(prefix) && tradesByDay[selectedDay] ? selectedDay : keys[keys.length - 1] || null;
  const selInfo = sel ? tradesByDay[sel] : null;
  const dayJournaled = (k) => !!dayJournals[k] || (tradesByDay[k] && tradesByDay[k].trades.length > 0 && tradesByDay[k].trades.every(tradeJournaled));
  const todayKey = dayKeyFromDate(new Date());
  const alpha = (v) => Math.round(26 + 90 * (Math.abs(v) / maxAbs)).toString(16).padStart(2, "0");
  const goMonth = (delta) => { setCalMonth(new Date(y, m + delta, 1)); setSelectedDay(null); };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    const ds = row.filter(Boolean);
    const dv = ds.map((d) => tradesByDay[`${prefix}-${pad2(d)}`]).filter(Boolean);
    if (dv.length) weeks.push({ n: weeks.length + 1, from: ds[0], to: ds[ds.length - 1], days: dv.length, total: dv.reduce((s, x) => s + x.total, 0) });
  }

  const wins = vals.filter((v) => v > 0);
  const lossV = vals.filter((v) => v < 0);
  const gp = wins.reduce((s, v) => s + v, 0);
  const gl = -lossV.reduce((s, v) => s + v, 0);
  const glance = vals.length
    ? [
        ["Win days", `${wins.length} of ${vals.length}, ${Math.round((wins.length / vals.length) * 100)}%`],
        ["Best day", fu.full(Math.max(...vals))],
        ["Worst day", fu.full(Math.min(...vals))],
        ["Average win", fu.full(wins.length ? gp / wins.length : 0)],
        ["Average loss", fu.full(lossV.length ? -gl / lossV.length : 0)],
        ["Profit factor", gl ? (gp / gl).toFixed(2) : "n/a"],
      ]
    : [];

  // Cumulative P/L line for the month
  let run = 0;
  const pts = vals.map((v) => (run += v));
  const hi = Math.max(1, ...pts, 0);
  const lo = Math.min(...pts, 0);
  const yy = (v) => Math.round(100 - ((v - lo) / (hi - lo || 1)) * 90);
  const line = pts.length ? (pts.length === 1 ? [`0,${yy(pts[0])}`, `330,${yy(pts[0])}`] : pts.map((v, i) => `${Math.round((i / (pts.length - 1)) * 330)},${yy(v)}`)).join(" ") : "";

  const navBtn = { width: "40px", height: "40px", borderRadius: "12px", border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, display: "flex", alignItems: "center", justifyContent: "center" };
  const cellH = isDesktop ? "78px" : "56px";

  const left = (
    <>
      <div className="flex items-center justify-between">
        <button type="button" className={TAP} style={navBtn} aria-label="Previous month" onClick={() => goMonth(-1)}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "19px", fontWeight: 600, color: palette.text }}>{MONTH_NAMES[m]} {y}</div>
          <div style={{ fontSize: "12px", color: palette.textMuted }}>{keys.length} trading {keys.length === 1 ? "day" : "days"}, weekends included</div>
        </div>
        <button type="button" className={TAP} style={navBtn} aria-label="Next month" onClick={() => goMonth(1)}><ChevronRight size={18} /></button>
      </div>

      <div style={{ marginTop: "20px", fontSize: "12.5px", color: palette.textMuted }}>Net P/L</div>
      <div style={{ fontFamily: display, fontSize: isDesktop ? "40px" : "34px", fontWeight: 700, lineHeight: 1.15, color: tone(total) }}>{keys.length ? fu.full(total) : "$0"}</div>

      <div className="flex" role="tablist" aria-label="Unit" style={{ margin: "16px 0", padding: "3px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", maxWidth: isDesktop ? "420px" : "none" }}>
        {[["d", "Currency"], ["r", "R multiple"], ["p", "Percent"]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={unit === id} onClick={() => setUnit(id)} className={TAP}
            style={{ flex: 1, minHeight: "38px", borderRadius: "9px", border: "none", fontSize: "13px", fontWeight: 600, background: unit === id ? palette.gold : "transparent", color: unit === id ? palette.letterbox : palette.textMuted }}>
            {label}
          </button>
        ))}
      </div>
      {unit === "r" && <div style={{ fontSize: "11.5px", color: palette.textFaint, margin: "-6px 0 12px" }}>1R is your average losing trade.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px", marginBottom: "6px" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
          <span key={d} style={{ textAlign: "center", fontSize: "11.5px", color: i > 4 ? palette.textFaint : palette.textMuted }}>{d}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = `${prefix}-${pad2(d)}`;
          const info = tradesByDay[key];
          const isSel = key === sel;
          const base = { minHeight: cellH, borderRadius: "10px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px" };
          if (!info) {
            return (
              <div key={i} style={{ ...base, background: palette.field, opacity: 0.55, border: key === todayKey ? `1px dashed ${palette.textFaint}` : "1px solid transparent" }}>
                <b style={{ fontSize: "13px", fontWeight: 500, color: palette.textFaint }}>{d}</b>
              </div>
            );
          }
          const v = info.total;
          return (
            <button key={i} type="button" onClick={() => setSelectedDay(key)} className={TAP} aria-label={`${dateLabel(key)}, ${fu.full(v)}`}
              style={{ ...base, background: v === 0 ? palette.field : `${v > 0 ? palette.green : palette.red}${alpha(v)}`, border: `${isSel ? 2 : 1}px solid ${isSel ? palette.text : "transparent"}` }}>
              <i style={{ position: "absolute", top: "6px", right: "6px", width: "6px", height: "6px", borderRadius: "50%", background: dayJournaled(key) ? palette.green : palette.gold }} />
              <b style={{ fontSize: "13px", fontWeight: 600, color: palette.text }}>{d}</b>
              <small style={{ fontSize: isDesktop ? "12px" : "10.5px", color: palette.text, opacity: 0.85 }}>{fu.short(v)}</small>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: "10px", fontSize: "11.5px", color: palette.textFaint }}>
        <span>Darker means a bigger day</span>
        <span className="flex items-center" style={{ gap: "12px" }}>
          <span className="flex items-center" style={{ gap: "5px" }}><i style={{ width: "6px", height: "6px", borderRadius: "50%", background: palette.green, display: "inline-block" }} />Journaled</span>
          <span className="flex items-center" style={{ gap: "5px" }}><i style={{ width: "6px", height: "6px", borderRadius: "50%", background: palette.gold, display: "inline-block" }} />Missing</span>
        </span>
      </div>

      <SecLabel left="Weeks" />
      <div style={{ ...cardSt, padding: "2px 16px" }}>
        {weeks.length ? weeks.map((w, i) => (
          <div key={w.n} className="flex items-center justify-between" style={{ padding: "12px 0", borderTop: i ? `1px solid ${palette.border}` : "none" }}>
            <span>
              <b style={{ fontSize: "14px", color: palette.text }}>Week {w.n}</b>
              <div style={{ fontSize: "12px", color: palette.textMuted }}>{MON_SHORT[m]} {w.from}{w.to !== w.from ? ` to ${w.to}` : ""}, {w.days} {w.days === 1 ? "trading day" : "trading days"}</div>
            </span>
            <b style={{ color: tone(w.total) }}>{fu.full(w.total)}</b>
          </div>
        )) : <div style={{ padding: "18px 0", textAlign: "center", fontSize: "13px", color: palette.textMuted }}>No trades this month.</div>}
      </div>
    </>
  );

  const right = (
    <>
      <div style={{ ...cardSt, padding: "18px", marginTop: isDesktop ? 0 : "22px" }}>
        {selInfo ? (
          <>
            <div className="flex items-start justify-between" style={{ gap: "12px" }}>
              <span>
                <div style={{ fontSize: "17px", fontWeight: 600, color: palette.text }}>{dateLabel(sel)}</div>
                <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "2px" }}>
                  {dayJournaled(sel) ? "Journal written" : "Journal missing"}, {selInfo.trades.length} {selInfo.trades.length === 1 ? "trade" : "trades"}
                </div>
              </span>
              <b style={{ fontSize: "17px", color: tone(selInfo.total) }}>{fu.full(selInfo.total)}</b>
            </div>
            <div style={{ marginTop: "8px" }}>
              {selInfo.trades.slice().sort((a, b) => a.ts - b.ts).map((t, i) => (
                <button key={t.id} type="button" onClick={() => onOpenTrade(t.id)} className={`flex items-center justify-between w-full text-left ${TAP}`}
                  style={{ padding: "11px 0", background: "none", border: "none", borderTop: i ? `1px solid ${palette.border}` : "none", gap: "10px" }}>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ fontSize: "14px", color: palette.text }}>{t.pair || "Trade"}</b>
                    <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "6px", background: palette.field, fontSize: "11px", color: palette.textMuted }}>{isLongDir(t.direction) ? "Long" : t.direction ? "Short" : "n/a"}</span>
                    <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "2px" }}>{[t.setup ? findSetupLabel(t.setup) : "", hhmm(t.ts)].filter(Boolean).join(", ")}</div>
                  </span>
                  <b style={{ color: tone(t.pnl), flex: "none" }}>{fu.full(t.pnl)}</b>
                </button>
              ))}
            </div>
            <button type="button" className={TAP} style={{ ...primaryBtn, marginTop: "14px" }} onClick={() => onOpenJournal(sel)}>Open day journal</button>
            <button type="button" className={TAP} style={{ ...outlineBtn, marginTop: "10px" }} onClick={onLogTrade}>Log a trade</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "15px", color: palette.textMuted, textAlign: "center", padding: "10px 0 4px" }}>No trades in {MONTH_NAMES[m]} yet.</div>
            <button type="button" className={TAP} style={{ ...primaryBtn, marginTop: "14px" }} onClick={onLogTrade}>Log a trade</button>
          </>
        )}
      </div>

      <SecLabel left="Cumulative P/L this month" right={keys.length ? fu.full(total) : ""} rightColor={tone(total)} />
      <div style={{ ...cardSt, padding: "12px" }}>
        {pts.length ? (
          <svg viewBox="0 0 330 110" preserveAspectRatio="none" role="img" aria-label="Cumulative profit and loss for the month" style={{ width: "100%", height: isDesktop ? "150px" : "110px", display: "block" }}>
            <line x1="0" x2="330" y1={yy(0)} y2={yy(0)} stroke={palette.border} strokeDasharray="4 4" />
            <polygon points={`0,${yy(0)} ${line} 330,${yy(0)}`} fill={palette.green} fillOpacity=".12" />
            <polyline points={line} fill="none" stroke={palette.green} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <div style={{ padding: "26px 0", textAlign: "center", fontSize: "13px", color: palette.textMuted }}>Nothing to chart yet.</div>}
      </div>

      <SecLabel left="Month at a glance" />
      <div style={{ ...cardSt, padding: "2px 16px" }}>
        {glance.length ? glance.map(([k, v], i) => (
          <div key={k} className="flex items-center justify-between" style={{ padding: "12px 0", borderTop: i ? `1px solid ${palette.border}` : "none" }}>
            <span style={{ fontSize: "13.5px", color: palette.textMuted }}>{k}</span>
            <b style={{ fontSize: "14px", color: palette.text }}>{v}</b>
          </div>
        )) : <div style={{ padding: "18px 0", textAlign: "center", fontSize: "13px", color: palette.textMuted }}>No trades this month.</div>}
      </div>
    </>
  );

  return isDesktop ? (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)", gap: "32px", alignItems: "start", marginBottom: "28px" }}>
      <div style={{ minWidth: 0 }}>{left}</div>
      <div style={{ minWidth: 0 }}>{right}</div>
    </div>
  ) : (
    <div style={{ marginBottom: "24px" }}>{left}{right}</div>
  );
}

// ---------- Per-trade journal (the "Review" step of the prototype's trade sheet) ----------
function TradeJournalSheet({ trade, trades, persistTrades, playbookRules, onClose, startEditTrade, deleteTrade, openScreenshotPicker, setViewingScreenshot, setPendingScreenshotDelete, screenshotSaving, screenshotTargetId, screenshotError, findSetupLabel, isDesktop }) {
  const [note, setNote] = useState(trade.note || "");
  const [rate, setRate] = useState(trade.rate || 0);
  const [mist, setMist] = useState(Array.isArray(trade.mist) ? trade.mist : []);
  const [rulesOk, setRulesOk] = useState(trade.rulesOk || {});
  const [confirmDel, setConfirmDel] = useState(false);
  const live = trades.find((x) => x.id === trade.id) || trade;
  const shots = tradeScreenshots(live);
  const draft = { ...live, note, rate, mist, rulesOk };
  const verdict = tradeVerdict(draft, playbookRules);
  const checkedCount = playbookRules.filter((r) => rulesOk[r.id]).length;
  const saving = screenshotSaving && screenshotTargetId === live.id;

  const save = () => {
    persistTrades(trades.map((x) => (x.id === live.id ? { ...x, note: note.trim(), rate: rate || null, mist, rulesOk } : x)));
    pokeCrab("edit");
    onClose();
  };
  const toggleMist = (x) => setMist((a) => (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]));

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: isDesktop ? "center" : "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: isDesktop ? "560px" : "480px", maxHeight: isDesktop ? "88vh" : "94vh", display: "flex", flexDirection: "column", background: palette.bg, borderRadius: isDesktop ? "22px" : "22px 22px 0 0", overflow: "hidden" }}>
        <div className="flex items-center" style={{ gap: "10px", padding: "16px 16px 12px", borderBottom: `1px solid ${palette.border}` }}>
          <button type="button" onClick={onClose} aria-label="Close" className={TAP} style={{ width: "40px", height: "40px", borderRadius: "12px", border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          <div style={{ flex: 1, fontSize: "17px", fontWeight: 600, color: palette.text }}>Trade journal</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          <div className="flex items-center justify-between" style={{ ...cardSt, padding: "14px 16px" }}>
            <span>
              <b style={{ fontSize: "16px", color: palette.text }}>{live.pair || "Trade"}</b>
              <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "6px", background: palette.field, fontSize: "11px", color: palette.textMuted }}>{isLongDir(live.direction) ? "Long" : live.direction ? "Short" : "n/a"}</span>
              <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "2px" }}>{[live.setup ? findSetupLabel(live.setup) : "", `${dateLabel(dayKeyFromTs(live.ts))}, ${hhmm(live.ts)}`].filter(Boolean).join(", ")}</div>
            </span>
            <b style={{ fontSize: "18px", color: tone(live.pnl) }}>{live.pnl >= 0 ? "+" : "\u2212"}${fmtMoney(Math.abs(live.pnl))}</b>
          </div>

          <SecLabel left="Notes" />
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 400))} rows={4} placeholder="What did you see? What would you change?" style={{ ...fieldSt, marginTop: 0, resize: "none", lineHeight: 1.5 }} />

          <SecLabel left="Mistakes" right="Tap any that apply" />
          <div className="flex flex-wrap">{TRADE_MISTAKES.map((x) => <button key={x} type="button" onClick={() => toggleMist(x)} className={TAP} style={chipSt(mist.includes(x))}>{x}</button>)}</div>

          <SecLabel left="Execution rating, 1 to 5" />
          <div className="flex flex-wrap">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" onClick={() => setRate(rate === i ? 0 : i)} className={TAP} style={chipSt(rate === i)}>{i}</button>)}</div>

          {playbookRules.length > 0 && (
            <>
              <SecLabel left="Rules check" right={`${checkedCount} of ${playbookRules.length}`} />
              {playbookRules.map((r) => (
                <button key={r.id} type="button" onClick={() => setRulesOk((o) => ({ ...o, [r.id]: !o[r.id] }))} className={`flex items-center justify-between w-full text-left ${TAP}`} style={{ padding: "12px 0", background: "none", border: "none", borderTop: `1px solid ${palette.border}`, gap: "12px", color: palette.text, fontSize: "14px" }}>
                  <span>{r.text}</span>
                  <span className="flex items-center justify-center flex-shrink-0" style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1.5px solid ${rulesOk[r.id] ? palette.green : palette.border}`, background: rulesOk[r.id] ? palette.green : "transparent", color: palette.letterbox }}>{rulesOk[r.id] && <Check size={14} strokeWidth={3} />}</span>
                </button>
              ))}
            </>
          )}

          <div style={{ ...cardSt, padding: "14px", marginTop: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: palette.textMuted }}>Process vs outcome</div>
            <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px", color: palette[VERDICT_TONE[verdict]] }}>{verdict}</div>
          </div>

          <SecLabel left="Screenshots" right={`${shots.length} of ${SCREENSHOT_MAX_PER_TRADE}`} />
          <div className="flex flex-wrap" style={{ gap: "10px" }}>
            {shots.map((src, idx) => (
              <div key={idx} className="relative inline-block">
                <img src={src} alt={`Trade screenshot ${idx + 1}`} onClick={() => setViewingScreenshot({ src, trade: live })} className={TAP} style={{ width: "84px", height: "84px", objectFit: "cover", borderRadius: "10px", border: `1px solid ${palette.border}`, cursor: "pointer" }} />
                <button type="button" onClick={() => setPendingScreenshotDelete({ tradeId: live.id, index: idx })} aria-label="Remove screenshot" className={`absolute flex items-center justify-center rounded-full ${TAP}`} style={{ top: "-6px", right: "-6px", width: "20px", height: "20px", background: palette.red, color: "#fff" }}><X size={11} /></button>
              </div>
            ))}
            {shots.length < SCREENSHOT_MAX_PER_TRADE && (
              <button type="button" onClick={() => openScreenshotPicker(live.id)} disabled={saving} className={`flex items-center justify-center ${TAP}`} style={{ width: "84px", height: "84px", borderRadius: "10px", border: `1px dashed ${palette.border}`, background: palette.field, color: palette.textMuted, fontSize: "12px", gap: "4px", flexDirection: "column" }}>
                <Camera size={18} />{saving ? "Saving\u2026" : "Add photo"}
              </button>
            )}
          </div>
          {screenshotError && <p style={{ fontSize: "12px", color: palette.red, margin: "8px 0 0" }}>{screenshotError}</p>}

          <button type="button" className={`${TAP} flex items-center justify-center w-full`} onClick={() => { onClose(); startEditTrade(live); }} style={{ marginTop: "22px", minHeight: "44px", background: "none", border: "none", color: palette.textMuted, fontSize: "13.5px", gap: "6px" }}>
            <Pencil size={14} /> Edit numbers, setup or mood
          </button>
          <button type="button" className={`${TAP} w-full`} onClick={() => { if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; } deleteTrade(live.id); onClose(); }} style={{ minHeight: "44px", background: "none", border: "none", color: palette.red, fontSize: "13.5px" }}>
            {confirmDel ? "Tap again to delete" : "Delete this trade"}
          </button>
        </div>
        <div style={{ padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${palette.border}` }}>
          <button type="button" className={TAP} style={primaryBtn} onClick={save}>Save journal</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------- Journal ----------
function JournalSection({ trades, tradesByDay, settings, persistSettings, journalDay, setJournalDay, isDesktop, findSetupLabel, onOpenTrade }) {
  const dayJournals = settings.dayJournals || {};
  const todayKey = dayKeyFromDate(new Date());
  const [draft, setDraft] = useState(() => dayJournals[journalDay] || JOURNAL_DEFAULT);
  const [pn, setPn] = useState(0);
  const [recap, setRecap] = useState(false);
  const [msg, setMsg] = useState("");
  const drafts = useRef({});
  const stripRef = useRef(null);
  const msgTimer = useRef(null);

  useEffect(() => { setDraft(drafts.current[journalDay] || dayJournals[journalDay] || JOURNAL_DEFAULT); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [journalDay]);
  useEffect(() => () => clearTimeout(msgTimer.current), []);
  const set = (k, v) => setDraft((d) => { const n = { ...d, [k]: v }; drafts.current[journalDay] = n; return n; });

  // Day strip: the last 14 days, longer if an older day was opened from the calendar.
  const dayDiff = Math.round((keyToDate(todayKey) - keyToDate(journalDay)) / 86400000);
  const span = Math.min(60, Math.max(13, dayDiff));
  const strip = [];
  for (let i = span; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); strip.push(dayKeyFromDate(d)); }
  useEffect(() => {
    const el = stripRef.current;
    const on = el && el.querySelector('[data-on="1"]');
    if (el && on) el.scrollLeft = on.offsetLeft - el.clientWidth / 2 + on.clientWidth / 2;
  }, [journalDay]);

  const dayDone = (k) => !!dayJournals[k] || (tradesByDay[k] && tradesByDay[k].trades.length > 0 && tradesByDay[k].trades.every(tradeJournaled));
  let streak = 0;
  { const d = new Date(); if (!dayJournals[todayKey]) d.setDate(d.getDate() - 1); while (dayJournals[dayKeyFromDate(d)] && streak < 3650) { streak++; d.setDate(d.getDate() - 1); } }
  let last10 = 0;
  for (let i = 0; i < 10; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (dayJournals[dayKeyFromDate(d)]) last10++; }

  const dayTrades = ((tradesByDay[journalDay] && tradesByDay[journalDay].trades) || []).slice().sort((a, b) => a.ts - b.ts);
  const jn = dayTrades.filter(tradeJournaled).length;
  const dayName = journalDay === todayKey ? "today" : dateLabel(journalDay);

  const save = () => {
    const entry = { ...draft, lesson: draft.lesson, savedAt: Date.now() };
    persistSettings({ ...settings, dayJournals: { ...dayJournals, [journalDay]: entry } });
    drafts.current[journalDay] = entry;
    setRecap(false);
    setMsg("Journal entry saved");
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(""), 2200);
  };

  const weekAgo = Date.now() - 7 * 86400000;
  const wk = trades.filter((t) => t.ts >= weekAgo);
  const wkWins = wk.filter((t) => t.pnl > 0).length;
  const wkJ = wk.filter(tradeJournaled).length;
  const bad = {};
  wk.forEach((t) => (t.mist || []).forEach((x) => { bad[x] = (bad[x] || 0) + 1; }));
  const topMist = Object.keys(bad).sort((a, b) => bad[b] - bad[a])[0] || "none";

  const entries = Object.entries(dayJournals).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 20);

  const StatusPill = ({ t }) => {
    const j = tradeJournaled(t);
    return (
      <span className="flex items-center" style={{ gap: "4px", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", background: j ? `${palette.green}22` : `${palette.gold}22`, color: j ? palette.green : palette.gold }}>
        {j && <Check size={12} />}{j ? "Journaled" : "Add journal"}
      </span>
    );
  };

  const stripEl = (
    <div ref={stripRef} className="flex" style={{ gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "thin" }}>
      {strip.map((k) => {
        const d = keyToDate(k), on = k === journalDay;
        return (
          <button key={k} type="button" data-on={on ? "1" : "0"} onClick={() => setJournalDay(k)} className={TAP}
            style={{ flex: "none", width: "52px", padding: "8px 0", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", border: `1px solid ${on ? palette.gold : palette.border}`, background: on ? palette.gold : palette.surface, color: on ? palette.letterbox : palette.text }}>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>{DOW_SHORT[d.getDay()]}</span>
            <b style={{ fontSize: "16px" }}>{d.getDate()}</b>
            {dayDone(k) ? <i style={{ width: "6px", height: "6px", borderRadius: "50%", background: on ? palette.letterbox : palette.green }} /> : <span style={{ height: "6px" }} />}
          </button>
        );
      })}
    </div>
  );
  const streakEl = (
    <div className="flex items-center" style={{ ...cardSt, padding: "14px 16px", gap: "12px" }}>
      <span style={{ color: palette.gold, display: "flex" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" /></svg></span>
      <span>
        <b style={{ color: palette.gold, fontSize: "15px" }}>{streak ? `${streak}-day streak` : "No streak yet"}</b>
        <div style={{ fontSize: "12px", color: palette.textMuted }}>Journaled {last10} of your last 10 days</div>
      </span>
    </div>
  );
  const tradesEl = (
    <>
      <SecLabel left={`Trades on ${dayName}`} right={dayTrades.length ? `${jn} of ${dayTrades.length} journaled` : ""} />
      {dayTrades.length ? (
        <>
          <div style={{ fontSize: "12px", color: palette.textMuted, marginBottom: "4px" }}>Each trade gets its own journal. Tap one to rate it, tag mistakes and write what you learned.</div>
          {dayTrades.map((t) => (
            <button key={t.id} type="button" onClick={() => onOpenTrade(t.id)} className={`w-full text-left ${TAP}`} style={{ ...cardSt, padding: "14px 16px", marginTop: "10px", display: "block" }}>
              <div className="flex items-start justify-between" style={{ gap: "10px" }}>
                <span>
                  <b style={{ fontSize: "15px", color: palette.text }}>{t.pair || "Trade"}</b>
                  <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "6px", background: palette.field, fontSize: "11px", color: palette.textMuted }}>{isLongDir(t.direction) ? "Long" : t.direction ? "Short" : "n/a"}</span>
                  <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "2px" }}>{[t.setup ? findSetupLabel(t.setup) : "", hhmm(t.ts)].filter(Boolean).join(", ")}</div>
                </span>
                <b style={{ color: tone(t.pnl) }}>{t.pnl >= 0 ? "+" : "\u2212"}${fmtMoney(Math.abs(t.pnl))}</b>
              </div>
              {tradeJournaled(t) && t.note ? <div style={{ marginTop: "8px", fontSize: "13px", color: palette.textMuted, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.note}</div> : null}
              <div className="flex items-center justify-between" style={{ marginTop: "12px" }}>
                <StatusPill t={t} />
                <span style={{ fontSize: "12px", color: palette.textMuted }}>{t.rate ? `Execution ${t.rate} of 5` : ""}</span>
              </div>
            </button>
          ))}
        </>
      ) : <div style={{ ...cardSt, padding: "22px 16px", textAlign: "center", fontSize: "13.5px", color: palette.textMuted }}>No trades logged this day.</div>}
    </>
  );
  const formEl = (
    <>
      <SecLabel left="Day journal" />
      <div style={{ fontSize: "12px", color: palette.textMuted, marginBottom: "10px" }}>One entry for the whole day, whether you took one trade or ten.</div>
      <div style={{ ...cardSt, padding: "16px" }}>
        <div className="flex items-center justify-between"><span style={{ fontSize: "12px", color: palette.textMuted }}>Prompt</span><button type="button" onClick={() => setPn((x) => x + 1)} className={TAP} style={{ minHeight: "36px", background: "none", border: "none", color: palette.gold, fontSize: "13px", fontWeight: 600 }}>New prompt</button></div>
        <div style={{ fontFamily: display, fontStyle: "italic", fontSize: "18px", lineHeight: 1.4, marginTop: "4px", color: palette.text }}>{JOURNAL_PROMPTS[pn % JOURNAL_PROMPTS.length]}</div>
      </div>
      <div style={{ ...cardSt, padding: "16px", marginTop: "12px" }}>
        <b style={{ fontSize: "14px", color: palette.text }}>Before the session</b>
        <div style={{ fontSize: "12px", color: palette.textMuted, margin: "10px 0 6px" }}>Mood</div>
        <div className="flex flex-wrap">{JOURNAL_MOODS.map((x) => <button key={x} type="button" onClick={() => set("mood", x)} className={TAP} style={chipSt(draft.mood === x)}>{x}</button>)}</div>
        <div style={{ fontSize: "12px", color: palette.textMuted, margin: "2px 0 6px" }}>Market bias</div>
        <div className="flex flex-wrap">{JOURNAL_BIAS.map((x) => <button key={x} type="button" onClick={() => set("bias", x)} className={TAP} style={chipSt(draft.bias === x)}>{x}</button>)}</div>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "8px" }}>Energy, 1 to 5
          <input type="range" min="1" max="5" step="1" value={draft.energy} onChange={(e) => set("energy", Number(e.target.value))} style={{ width: "100%", accentColor: palette.gold, display: "block", marginTop: "8px" }} />
        </label>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "14px" }}>Key levels
          <input value={draft.levels} onChange={(e) => set("levels", e.target.value)} placeholder="1.0850, 1.0930" style={fieldSt} />
        </label>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "14px" }}>If this, then that plan
          <textarea rows={3} value={draft.plan} onChange={(e) => set("plan", e.target.value)} placeholder="If price closes above 1.0890, then I look for a long entry." style={{ ...fieldSt, resize: "none" }} />
        </label>
      </div>
      <div style={{ ...cardSt, padding: "16px", marginTop: "12px" }}>
        <b style={{ fontSize: "14px", color: palette.text }}>After the session</b>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>What went well
          <textarea rows={2} value={draft.good} onChange={(e) => set("good", e.target.value)} style={{ ...fieldSt, resize: "none" }} />
        </label>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "14px" }}>What to fix
          <textarea rows={2} value={draft.fix} onChange={(e) => set("fix", e.target.value)} style={{ ...fieldSt, resize: "none" }} />
        </label>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "14px" }}>One-line lesson
          <input value={draft.lesson} onChange={(e) => set("lesson", e.target.value)} style={fieldSt} />
        </label>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "14px" }}>Discipline score: <b style={{ color: palette.text }}>{draft.score}</b>
          <input type="range" min="0" max="100" step="5" value={draft.score} onChange={(e) => set("score", Number(e.target.value))} style={{ width: "100%", accentColor: palette.gold, display: "block", marginTop: "8px" }} />
        </label>
      </div>
      <button type="button" className={TAP} style={{ ...primaryBtn, marginTop: "16px" }} onClick={save}>Save entry for {dayName}</button>
      <button type="button" className={TAP} style={{ ...outlineBtn, marginTop: "10px" }} onClick={() => setRecap((v) => !v)}>{recap ? "Hide weekly recap" : "Build my weekly recap"}</button>
      {recap && (
        <div style={{ ...cardSt, padding: "16px", marginTop: "14px" }}>
          <div style={{ fontSize: "12px", color: palette.gold }}>Your week</div>
          <div style={{ fontFamily: display, fontSize: "17px", lineHeight: 1.5, marginTop: "6px", color: palette.text }}>
            {wk.length
              ? `You closed ${wk.length} ${wk.length === 1 ? "trade" : "trades"} and won ${wkWins}. You journaled ${wkJ} of them. Most repeated mistake: ${topMist}. Next week, pick one rule and protect it.`
              : "No trades in the last 7 days yet. Log a few and your recap will build itself."}
          </div>
        </div>
      )}
    </>
  );
  const pastEl = (
    <>
      <SecLabel left="Past entries" first={isDesktop} />
      {entries.length ? entries.map(([k, e]) => (
        <button key={k} type="button" onClick={() => setJournalDay(k)} className={`w-full text-left ${TAP}`} style={{ ...cardSt, padding: "14px 16px", marginBottom: "8px", display: "block" }}>
          <div className="flex items-center justify-between"><b style={{ fontSize: "14px", color: palette.text }}>{dateLabel(k)}</b><span style={{ padding: "2px 8px", borderRadius: "6px", background: palette.field, fontSize: "11px", color: palette.textMuted }}>{e.mood}</span></div>
          <div style={{ fontFamily: display, fontStyle: "italic", fontSize: "15px", marginTop: "6px", color: palette.text }}>{`\u201c${e.lesson || "Entry saved without a lesson"}\u201d`}</div>
        </button>
      )) : <div style={{ ...cardSt, padding: "22px 16px", textAlign: "center", fontSize: "13.5px", color: palette.textMuted }}>No entries yet. Save your first one.</div>}
    </>
  );

  return (
    <>
      {isDesktop ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: "32px", alignItems: "start", marginBottom: "28px" }}>
          <div style={{ minWidth: 0 }}>{stripEl}{tradesEl}{formEl}</div>
          <div style={{ minWidth: 0 }}>{streakEl}{pastEl}</div>
        </div>
      ) : (
        <div style={{ marginBottom: "24px" }}>{stripEl}<div style={{ marginTop: "14px" }}>{streakEl}</div>{tradesEl}{formEl}{pastEl}</div>
      )}
      {msg && <div role="status" style={{ position: "fixed", left: "50%", bottom: isDesktop ? "76px" : "150px", transform: "translateX(-50%)", background: palette.text, color: palette.bg, padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, zIndex: 1100 }}>{msg}</div>}
    </>
  );
}

// ===================== Log trade sheet: Numbers, Context, Review =====================
// Same flow as the prototype's trade sheet. Extra numbers and review fields live in tradeExtra
// ({ e, s, tp, x, z, mist, rate, rulesOk }) and are saved on the trade by App.jsx.
const numOrNull = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const showPx = (v) => (v == null || v === "" ? "n/a" : String(parseFloat(Number(v).toFixed(5))));

function calcTrade(extra, dir, manualPnl, riskAmount) {
  const e = numOrNull(extra.e), sl = numOrNull(extra.s), tp = numOrNull(extra.tp), x = numOrNull(extra.x), z = numOrNull(extra.z);
  const d = dir === "down" ? -1 : 1;
  const dist = e != null && sl != null ? Math.abs(e - sl) : 0;
  let risk = null, calcPnl = null;
  if (z != null && dist) {
    // older trades that were logged with a size
    risk = dist * z;
    if (x != null) calcPnl = (x - e) * d * z;
  } else if (dist && riskAmount > 0) {
    // no size: one R is the risk amount (your risk % of your account)
    risk = riskAmount;
    if (x != null) calcPnl = (((x - e) * d) / dist) * riskAmount;
  }
  const pnl = calcPnl != null ? calcPnl : manualPnl;
  return { e, s: sl, tp, x, z, d, risk, pnl, calcPnl, r: risk && pnl != null ? pnl / risk : null, rr: dist && tp != null ? Math.abs(tp - e) / dist : null };
}

function PriceRail({ c }) {
  if (c.e == null || c.s == null || c.tp == null || c.s === c.tp) return null;
  const w = c.tp - c.s;
  const cl = (v) => Math.max(0, Math.min(1, v));
  const fe = cl((c.e - c.s) / w);
  const cur = c.x != null ? c.x : c.e;
  const fc = cl((cur - c.s) / w);
  const col = (c.pnl == null ? 0 : c.pnl) >= 0 ? palette.green : palette.red;
  return (
    <>
      <div style={{ position: "relative", height: "8px", background: palette.field, borderRadius: "99px", margin: "20px 4px 12px" }}>
        <i style={{ position: "absolute", top: 0, height: "8px", borderRadius: "99px", left: `${Math.min(fe, fc) * 100}%`, width: `${Math.abs(fc - fe) * 100}%`, background: col }} />
        <i style={{ position: "absolute", top: "-4px", width: "2px", height: "16px", marginLeft: "-1px", background: palette.text, left: `${fe * 100}%` }} />
        <i style={{ position: "absolute", top: "-2px", width: "12px", height: "12px", borderRadius: "50%", border: `2px solid ${palette.bg}`, marginLeft: "-6px", background: col, left: `${fc * 100}%` }} />
      </div>
      <div className="flex justify-between" style={{ fontSize: "11.5px", color: palette.textMuted }}>
        <span>Stop {showPx(c.s)}</span><span>Entry {showPx(c.e)}</span><span>Target {showPx(c.tp)}</span>
      </div>
    </>
  );
}

function LogTradeSheet(props) {
  const {
    isDesktop, editingTradeId, cancelEditTrade, submitTrade, deleteTrade, logFormRef, tradesLoadError,
    tradePair, setTradePair, tradeDirection, setTradeDirection, tradeInput, setTradeInput,
    tradeNote, setTradeNote, tradeSetup, setTradeSetup, tradeSession, setTradeSession,
    tradeConfidence, setTradeConfidence, tradeEmotion, setTradeEmotion, tradeExtra, setTradeExtra,
    customSetups, customSetupsLoaded, addCustomSetup, playbookRules, startingBalance, trades, settings,
  } = props;
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const setX = (k, v) => setTradeExtra((o) => ({ ...o, [k]: v }));
  const decimals = (v) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  // New trades start as Long, like the prototype.
  useEffect(() => { if (!editingTradeId && !tradeDirection) setTradeDirection("up"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const account = num(startingBalance) + netPnl;
  const riskPct = Number(settings.riskPercent) > 0 ? Number(settings.riskPercent) : 1;
  const riskAmount = account > 0 ? (account * riskPct) / 100 : 0;
  const c = calcTrade(tradeExtra, tradeDirection, numOrNull(tradeInput), riskAmount);
  // P/L follows the numbers whenever entry, exit and size are all filled in.
  useEffect(() => {
    if (c.calcPnl != null) setTradeInput(String(Math.round(c.calcPnl * 100) / 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeExtra.e, tradeExtra.s, tradeExtra.x, tradeExtra.z, tradeDirection, riskAmount]);

  const draft = { pnl: c.pnl == null ? 0 : c.pnl, mist: tradeExtra.mist, rulesOk: tradeExtra.rulesOk };
  const verdict = tradeVerdict(draft, playbookRules);
  const checked = playbookRules.filter((r) => tradeExtra.rulesOk[r.id]).length;
  const closeSheet = () => (editingTradeId ? cancelEditTrade() : props.setLogSheetOpen(false));

  const save = () => {
    if (!tradeInput || !numOrNull(tradeInput) || numOrNull(tradeInput) === 0) {
      setErr(account > 0 ? "Add your entry, stop loss and exit so I can work out the result." : "Set your starting balance in the Equity tab first, so I can work out your result.");
      setStep(0);
      return;
    }
    setErr("");
    submitTrade();
  };
  const toggleMist = (x) => setX("mist", tradeExtra.mist.includes(x) ? tradeExtra.mist.filter((y) => y !== x) : [...tradeExtra.mist, x]);

  const field = (label, k, ph) => (
    <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>{label}
      <input value={tradeExtra[k]} onChange={(e) => setX(k, decimals(e.target.value))} inputMode="decimal" placeholder={ph} style={fieldSt} />
    </label>
  );

  const live = (
    <div style={{ ...cardSt, margin: "0 16px", padding: "14px 16px" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "12.5px", color: palette.textMuted }}>{c.x != null || c.calcPnl == null ? "Closed result" : "Add an exit to see the result"}</span>
        <span style={{ fontFamily: display, fontSize: "22px", fontWeight: 700, color: c.r == null ? palette.textMuted : tone(c.r) }}>
          {c.r == null ? "n/a" : `${c.r >= 0 ? "+" : "\u2212"}${Math.abs(c.r).toFixed(1)}R`}
        </span>
      </div>
      <div className="flex items-center justify-between" style={{ fontSize: "12px", color: palette.textMuted, marginTop: "2px" }}>
        <span>P/L {c.pnl == null ? "n/a" : `${c.pnl >= 0 ? "+" : "\u2212"}$${fmtMoney(Math.abs(c.pnl))}`}</span>
        <span>{c.risk != null ? `Risk $${Math.round(c.risk)}${c.rr != null ? `, reward 1:${c.rr.toFixed(1)}` : ""}` : c.rr != null ? `Reward 1:${c.rr.toFixed(1)}` : "Risk n/a"}</span>
      </div>
      <PriceRail c={c} />
    </div>
  );

  const stepBtn = (i, label) => (
    <button key={label} type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={TAP}
      style={{ flex: 1, height: "40px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
        border: `1px solid ${i === step ? palette.gold : palette.border}`, background: i === step ? palette.gold : palette.surface,
        color: i === step ? palette.letterbox : palette.textMuted }}>
      {label}
    </button>
  );

  return (
    <div onClick={closeSheet} style={{ position: "fixed", inset: 0, zIndex: 45, background: "rgba(5,7,12,0.55)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", padding: isDesktop ? "16px" : 0 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "540px", height: isDesktop ? "min(86vh, 760px)" : "94vh", display: "flex", flexDirection: "column", background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: isDesktop ? "22px" : "22px 22px 0 0", overflow: "hidden", boxShadow: palette.shadow }}>
        <div ref={logFormRef} className="flex items-center" style={{ gap: "10px", padding: "16px 16px 4px" }}>
          <button type="button" onClick={closeSheet} aria-label="Close" className={TAP} style={{ width: "40px", height: "40px", borderRadius: "12px", border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          <div style={{ flex: 1, fontSize: "17px", fontWeight: 600, color: palette.text }}>{editingTradeId ? "Edit trade" : "New trade"}</div>
          <span style={{ fontSize: "12px", color: palette.textMuted }}>Step {step + 1} of 3</span>
        </div>
        <div className="flex" style={{ gap: "6px", padding: "12px 16px 12px" }}>{["Numbers", "Context", "Review"].map((l, i) => stepBtn(i, l))}</div>
        {live}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 16px" }}>
          {step === 0 && (
            <>
              <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>Symbol
                <input value={tradePair} onChange={(e) => setTradePair(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="EUR/USD" style={fieldSt} />
              </label>
              <SecLabel left="Direction" />
              <div className="flex" style={{ padding: "3px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px" }}>
                {[["up", "Long"], ["down", "Short"]].map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={tradeDirection === id} onClick={() => setTradeDirection(id)} className={TAP}
                    style={{ flex: 1, minHeight: "40px", borderRadius: "9px", border: "none", fontSize: "13.5px", fontWeight: 600, background: tradeDirection === id ? palette.gold : "transparent", color: tradeDirection === id ? palette.letterbox : palette.textMuted }}>{label}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                {field("Entry", "e", "1.0850")}{field("Stop loss", "s", "1.0812")}
                {field("Target", "tp", "1.0930")}{field("Exit", "x", "Blank if open")}
              </div>
              <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "12px", lineHeight: 1.45 }}>
                Your result is worked out from your R and your {riskPct}% risk{account > 0 ? ` on a $${Math.round(account).toLocaleString()} account` : ""}.
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <SecLabel left="Setup" first />
              <SetupSelect value={tradeSetup} onChange={setTradeSetup} customSetups={customSetups} customSetupsLoaded={customSetupsLoaded} addCustomSetup={addCustomSetup} />
              <SecLabel left="Session" />
              <div className="flex flex-wrap" role="group" aria-label="Session">
                {MARKET_SESSIONS.map((s) => <button key={s.id} type="button" aria-pressed={tradeSession === s.id} onClick={() => setTradeSession(tradeSession === s.id ? null : s.id)} className={TAP} style={chipSt(tradeSession === s.id)}>{s.label}</button>)}
              </div>
              <SecLabel left="How I felt going in" />
              <div className="flex flex-wrap">
                {EMOTIONS.map((e) => <button key={e.id} type="button" onClick={() => setTradeEmotion(tradeEmotion === e.id ? null : e.id)} className={TAP} style={chipSt(tradeEmotion === e.id)}>{e.label}</button>)}
              </div>
              <div style={{ marginTop: "8px" }}><ConfidenceMeter value={tradeConfidence} onChange={setTradeConfidence} /></div>
              {playbookRules.length > 0 && (
                <>
                  <SecLabel left="Rules check" right={`${checked} of ${playbookRules.length}`} />
                  {playbookRules.map((r) => (
                    <button key={r.id} type="button" onClick={() => setX("rulesOk", { ...tradeExtra.rulesOk, [r.id]: !tradeExtra.rulesOk[r.id] })} className={`flex items-center justify-between w-full text-left ${TAP}`} style={{ padding: "12px 0", background: "none", border: "none", borderTop: `1px solid ${palette.border}`, gap: "12px", color: palette.text, fontSize: "14px" }}>
                      <span>{r.text}</span>
                      <span className="flex items-center justify-center flex-shrink-0" style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1.5px solid ${tradeExtra.rulesOk[r.id] ? palette.green : palette.border}`, background: tradeExtra.rulesOk[r.id] ? palette.green : "transparent", color: palette.letterbox }}>{tradeExtra.rulesOk[r.id] && <Check size={14} strokeWidth={3} />}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <SecLabel left="Notes" first />
              <textarea value={tradeNote} onChange={(e) => setTradeNote(e.target.value.slice(0, 400))} rows={4} placeholder="What did you see? What would you change?" style={{ ...fieldSt, marginTop: 0, resize: "none", lineHeight: 1.5 }} />
              <div className="flex flex-wrap" style={{ marginTop: "8px" }}>
                {NOTE_TAGS.map((tag) => <button key={tag} type="button" onClick={() => setTradeNote(tradeNote === tag ? "" : tag)} className={TAP} style={{ ...chipSt(false), border: `1px dashed ${tradeNote === tag ? palette.textMuted : palette.border}`, fontSize: "12px", minHeight: "32px" }}>{tag}</button>)}
              </div>
              <SecLabel left="Mistakes" right="Tap any that apply" />
              <div className="flex flex-wrap">{TRADE_MISTAKES.map((x) => <button key={x} type="button" onClick={() => toggleMist(x)} className={TAP} style={chipSt(tradeExtra.mist.includes(x))}>{x}</button>)}</div>
              <SecLabel left="Execution rating, 1 to 5" />
              <div className="flex flex-wrap">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" onClick={() => setX("rate", tradeExtra.rate === i ? 0 : i)} className={TAP} style={chipSt(tradeExtra.rate === i)}>{i}</button>)}</div>
              <div style={{ ...cardSt, padding: "14px", marginTop: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: palette.textMuted }}>Process vs outcome</div>
                <div style={{ fontFamily: display, fontSize: "22px", fontWeight: 700, marginTop: "2px", color: palette[VERDICT_TONE[verdict]] }}>{verdict}</div>
              </div>
              {editingTradeId && (
                <button type="button" className={`${TAP} w-full`} onClick={() => { if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; } deleteTrade(editingTradeId); }} style={{ minHeight: "44px", marginTop: "8px", background: "none", border: "none", color: palette.red, fontSize: "13.5px" }}>
                  {confirmDel ? "Tap again to delete" : "Delete this trade"}
                </button>
              )}
              {tradesLoadError && <p style={{ fontSize: "12px", color: palette.red, margin: "10px 0 0" }}>{tradesLoadError}</p>}
            </>
          )}
          {err && <p role="alert" style={{ fontSize: "13px", color: palette.red, margin: "12px 0 0" }}>{err}</p>}
        </div>
        <div className="flex" style={{ gap: "10px", padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${palette.border}` }}>
          {step > 0 && <button type="button" className={TAP} style={{ ...outlineBtn, width: "36%" }} onClick={() => { setErr(""); setStep(step - 1); }}>Back</button>}
          <button type="button" className={TAP} style={primaryBtn} onClick={() => (step < 2 ? (setErr(""), setStep(step + 1)) : save())}>{step < 2 ? "Next" : "Save trade"}</button>
        </div>
      </div>
    </div>
  );
}

// ===================== Equity =====================
// Real account equity: starting balance + trading P/L + deposits and withdrawals.
// Cash movements live in settings.equityMoves ([{ id, ts, amount, note }], deposits positive).
// Drawdown is measured on trading only, so taking money out never counts as a drawdown.
const EQ_RANGES = [["1w", "1W", 7], ["1m", "1M", 30], ["3m", "3M", 90], ["ytd", "YTD", -1], ["all", "All", 0]];
const money0 = (v) => `${v < 0 ? "\u2212" : ""}$${fmt(Math.abs(v), 0)}`;
const smoney0 = (v) => `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}$${fmt(Math.abs(v), 0)}`;
const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const axisDate = (ts) => { const d = new Date(ts); return `${MON_SHORT[d.getMonth()]} ${d.getDate()}`; };

function EquitySection({ trades, startingBalance, persistStartingBalance, settings, persistSettings, isDesktop }) {
  const [range, setRange] = useState("all");
  const [kind, setKind] = useState("dep");
  const [amt, setAmt] = useState("");
  const [when, setWhen] = useState(() => dayKeyFromDate(new Date()));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [editBal, setEditBal] = useState(false);
  const [balDraft, setBalDraft] = useState("");
  const moves = Array.isArray(settings.equityMoves) ? settings.equityMoves : [];
  const start = num(startingBalance);

  const model = useMemo(() => {
    const ev = [
      ...trades.map((t) => ({ ts: t.ts, trade: t.pnl, flow: 0 })),
      ...moves.map((m) => ({ ts: m.ts, trade: 0, flow: m.amount })),
    ].sort((a, b) => a.ts - b.ts);
    // one point per day (end of day), plus the starting point
    const pts = [];
    let eq = start, tr = start;
    ev.forEach((e) => {
      eq += e.trade + e.flow;
      tr += e.trade;
      const day = dayStart(e.ts);
      const last = pts[pts.length - 1];
      if (last && last.day === day) { last.eq = eq; last.tr = tr; last.ts = e.ts; } else pts.push({ day, ts: e.ts, eq, tr });
    });
    const firstTs = ev.length ? dayStart(ev[0].ts) : Date.now();
    const all = [{ day: firstTs, ts: firstTs, eq: start, tr: start }, ...pts];
    const now = Date.now();
    const cfg = EQ_RANGES.find((r) => r[0] === range) || EQ_RANGES[4];
    const from = cfg[2] === 0 ? 0 : cfg[2] === -1 ? new Date(new Date().getFullYear(), 0, 1).getTime() : now - cfg[2] * 86400000;
    const before = from ? all.filter((p) => p.ts < from) : [];
    const ref = before.length ? before[before.length - 1] : all[0];
    const inRange = all.filter((p) => p.ts >= from);
    const series = (from && before.length ? [{ ts: from, eq: ref.eq, tr: ref.tr }, ...inRange] : inRange.length ? inRange : [{ ts: from || firstTs, eq: ref.eq, tr: ref.tr }]).map((p) => ({ ts: p.ts, eq: p.eq, tr: p.tr }));
    const lastPt = series[series.length - 1];
    if (lastPt.ts < now - 3600000) series.push({ ts: now, eq: lastPt.eq, tr: lastPt.tr });
    const current = lastPt.eq;
    const flows = moves.filter((m) => m.ts >= from).reduce((s, m) => s + m.amount, 0);
    const change = current - ref.eq;
    const plRange = change - flows;
    let peak = -Infinity, maxDd = 0;
    series.forEach((p) => { peak = Math.max(peak, p.tr); if (peak > 0) maxDd = Math.max(maxDd, (peak - p.tr) / peak); });
    const curDd = peak > 0 ? (peak - lastPt.tr) / peak : 0;
    const allEq = all.map((p) => p.eq);
    return {
      series, current, change, plRange, flows, peakTr: peak, maxDd, curDd,
      returnPct: ref.eq > 0 ? (plRange / ref.eq) * 100 : null,
      peakEq: Math.max(...allEq, current),
      dep: moves.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0),
      wd: -moves.filter((m) => m.amount < 0).reduce((s, m) => s + m.amount, 0),
      empty: !trades.length && !moves.length,
    };
  }, [trades, moves, start, range]);

  const up = model.change >= 0;
  const lo = Math.min(...model.series.map((p) => p.eq), start || Infinity);
  const hi = Math.max(...model.series.map((p) => p.eq), start || -Infinity);
  const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.002, 1);

  const addMove = () => {
    const a = parseFloat(amt);
    if (!Number.isFinite(a) || a <= 0) { setErr("Enter an amount above zero."); return; }
    if (moves.length >= 500) { setErr("That's the limit of 500 entries."); return; }
    const d = keyToDate(when);
    d.setHours(12, 0, 0, 0);
    const m = { id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, ts: d.getTime(), amount: kind === "dep" ? a : -a, note: note.trim().slice(0, 60) };
    persistSettings({ ...settings, equityMoves: [...moves, m].sort((x, y) => x.ts - y.ts) });
    setAmt(""); setNote(""); setErr("");
    pokeCrab("add");
  };
  const delMove = (id) => persistSettings({ ...settings, equityMoves: moves.filter((m) => m.id !== id) });
  const saveBal = () => {
    const v = parseFloat(balDraft);
    if (!Number.isFinite(v) || v < 0) { setErr("Enter your starting balance as a number."); return; }
    persistStartingBalance(String(v));
    setEditBal(false); setErr("");
  };

  const stat = (label, value, color, sub) => (
    <div style={{ ...cardSt, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: "12px", color: palette.textMuted }}>{label}</div>
      <div style={{ fontFamily: display, fontSize: "21px", fontWeight: 700, marginTop: "3px", color: color || palette.text }}>{value}</div>
      {sub ? <div style={{ fontSize: "11.5px", color: palette.textFaint, marginTop: "2px" }}>{sub}</div> : null}
    </div>
  );

  const left = (
    <>
      <div style={{ fontSize: "12.5px", color: palette.textMuted }}>Current equity</div>
      <div style={{ fontFamily: display, fontSize: isDesktop ? "42px" : "36px", fontWeight: 700, lineHeight: 1.15, color: palette.text }}>{start > 0 || !model.empty ? money0(model.current) : "$0"}</div>
      <div style={{ fontSize: "13px", color: tone(model.change), marginTop: "2px" }}>
        {smoney0(model.change)}{model.returnPct != null ? ` (${model.returnPct >= 0 ? "+" : "\u2212"}${Math.abs(model.returnPct).toFixed(1)}% from trading)` : ""}
        <span style={{ color: palette.textFaint }}> in this range</span>
      </div>

      <div className="flex" role="tablist" aria-label="Range" style={{ margin: "16px 0 12px", padding: "3px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", maxWidth: isDesktop ? "380px" : "none" }}>
        {EQ_RANGES.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={range === id} onClick={() => setRange(id)} className={TAP}
            style={{ flex: 1, minHeight: "36px", borderRadius: "9px", border: "none", fontSize: "13px", fontWeight: 600, background: range === id ? palette.gold : "transparent", color: range === id ? palette.letterbox : palette.textMuted }}>{label}</button>
        ))}
      </div>

      <div style={{ ...cardSt, padding: "12px 8px 6px 0" }}>
        {model.empty ? (
          <div style={{ padding: "48px 16px", textAlign: "center", fontSize: "13.5px", color: palette.textMuted }}>Log your first trade and your equity curve starts here.</div>
        ) : (
          <div style={{ width: "100%", height: isDesktop ? 320 : 210 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={model.series} margin={isDesktop ? CHART_MARGIN : CHART_MARGIN_MOBILE}>
                <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={axisDate} stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} minTickGap={36} />
                <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(Math.round(v)))} stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={isDesktop ? 54 : 44} />
                {start > 0 && <ReferenceLine y={start} stroke={palette.textFaint} strokeDasharray="4 4" />}
                <Tooltip contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "12px" }} labelStyle={{ color: palette.textMuted }} itemStyle={{ color: up ? palette.green : palette.red }} formatter={(v) => [money0(v), "Equity"]} labelFormatter={(l) => axisDate(l)} />
                <Line type="monotone" dataKey="eq" stroke={up ? palette.green : palette.red} strokeWidth={2} dot={false} activeDot={ACTIVE_DOT} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "14px" }}>
        {stat("Trading P/L", smoney0(model.plRange), tone(model.plRange), "Before deposits and withdrawals")}
        {stat("Max drawdown", model.maxDd ? `\u2212${(model.maxDd * 100).toFixed(1)}%` : "0%", model.maxDd ? palette.red : palette.text, "Trading only")}
        {stat("Current drawdown", model.curDd ? `\u2212${(model.curDd * 100).toFixed(1)}%` : "0%", model.curDd ? palette.red : palette.green, model.curDd ? "Below your best" : "At your best")}
        {stat("Peak equity", money0(model.peakEq))}
      </div>
    </>
  );

  const right = (
    <>
      <div style={{ ...cardSt, padding: "16px 18px", marginTop: isDesktop ? 0 : "22px" }}>
        <div className="flex items-center justify-between">
          <b style={{ fontSize: "14px", color: palette.text }}>Starting balance</b>
          {!editBal && <button type="button" className={TAP} onClick={() => { setBalDraft(start ? String(start) : ""); setEditBal(true); setErr(""); }} style={{ minHeight: "36px", background: "none", border: "none", color: palette.gold, fontSize: "13px", fontWeight: 600 }}>{start > 0 ? "Edit" : "Set"}</button>}
        </div>
        {editBal ? (
          <div className="flex" style={{ gap: "8px", marginTop: "8px" }}>
            <input value={balDraft} onChange={(e) => setBalDraft(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="10000" autoFocus style={{ ...fieldSt, marginTop: 0 }} />
            <button type="button" className={TAP} onClick={saveBal} style={{ ...primaryBtn, width: "auto", padding: "0 18px", height: "44px" }}>Save</button>
          </div>
        ) : (
          <div style={{ fontFamily: display, fontSize: "20px", fontWeight: 700, marginTop: "2px", color: palette.text }}>{start > 0 ? money0(start) : "Not set"}</div>
        )}
        <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "6px", lineHeight: 1.45 }}>Equity is your starting balance, plus every trade, plus deposits, minus withdrawals.</div>
      </div>

      <SecLabel left="Deposits and withdrawals" right={`${money0(model.dep)} in, ${money0(model.wd)} out`} />
      <div style={{ ...cardSt, padding: "16px 18px" }}>
        <div className="flex" style={{ padding: "3px", background: palette.field, borderRadius: "12px" }}>
          {[["dep", "Deposit"], ["wd", "Withdrawal"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={TAP}
              style={{ flex: 1, minHeight: "38px", borderRadius: "9px", border: "none", fontSize: "13px", fontWeight: 600, background: kind === id ? palette.gold : "transparent", color: kind === id ? palette.letterbox : palette.textMuted }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>Amount ($)
            <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="1000" style={fieldSt} />
          </label>
          <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>Date
            <input type="date" value={when} max={dayKeyFromDate(new Date())} onChange={(e) => setWhen(e.target.value || dayKeyFromDate(new Date()))} style={fieldSt} />
          </label>
        </div>
        <label style={{ display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "12px" }}>Note, optional
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="Top up, payout, fee" style={fieldSt} />
        </label>
        <button type="button" className={TAP} style={{ ...primaryBtn, marginTop: "14px" }} onClick={addMove}>{kind === "dep" ? "Add deposit" : "Add withdrawal"}</button>
        {err && <p role="alert" style={{ fontSize: "13px", color: palette.red, margin: "10px 0 0" }}>{err}</p>}
      </div>

      <SecLabel left="History" right={moves.length ? `${moves.length} ${moves.length === 1 ? "entry" : "entries"}` : ""} />
      <div style={{ ...cardSt, padding: "2px 16px" }}>
        {moves.length ? moves.slice().reverse().slice(0, 30).map((m, i) => (
          <div key={m.id} className="flex items-center justify-between" style={{ padding: "12px 0", borderTop: i ? `1px solid ${palette.border}` : "none", gap: "10px" }}>
            <span style={{ minWidth: 0 }}>
              <b style={{ fontSize: "14px", color: palette.text }}>{m.amount > 0 ? "Deposit" : "Withdrawal"}</b>
              <div style={{ fontSize: "12px", color: palette.textMuted }}>{dateLabel(dayKeyFromTs(m.ts))}{m.note ? `, ${m.note}` : ""}</div>
            </span>
            <span className="flex items-center" style={{ gap: "6px" }}>
              <b style={{ color: tone(m.amount) }}>{smoney0(m.amount)}</b>
              <button type="button" onClick={() => delMove(m.id)} aria-label="Delete entry" className={TAP} style={{ width: "32px", height: "32px", background: "none", border: "none", color: palette.textFaint }}><Trash2 size={15} /></button>
            </span>
          </div>
        )) : <div style={{ padding: "20px 0", textAlign: "center", fontSize: "13px", color: palette.textMuted }}>No deposits or withdrawals yet. Add one when you move money so your equity stays accurate.</div>}
      </div>
    </>
  );

  return isDesktop ? (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: "32px", alignItems: "start", marginBottom: "28px" }}>
      <div style={{ minWidth: 0 }}>{left}</div>
      <div style={{ minWidth: 0 }}>{right}</div>
    </div>
  ) : (
    <div style={{ marginBottom: "24px" }}>{left}{right}</div>
  );
}

function CurveView(props) {
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
    setLogSheetOpen,
    persistTrades,
    tradeExtra,
    setTradeExtra,
    playbookRules = [],
    journalDay,
    setJournalDay,
    openDayJournal,
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
  const [journalTradeId, setJournalTradeId] = useState(null);
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

    // Memoised: these loop over every trade and used to re-run on every render of the tab.
    const revengeIds = useMemo(() => computeRevengeIds(trades), [trades]);

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
                              {t.pair || "Trade"}
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
                                {mood.label}
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

        {view !== "history" && view !== "equity" && (
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
            <div style={{ marginTop: isDesktop ? "14px" : "10px", paddingTop: isDesktop ? "14px" : "10px", borderTop: `1px solid ${palette.border}` }}>
              <div className="flex items-baseline justify-between" style={{ gap: "8px" }}>
                <span style={{ color: palette.textMuted, fontSize: "12px" }}>Win rate</span>
                <span style={{ fontFamily: mono, fontSize: isDesktop ? "16px" : "14px", fontWeight: 700, color: palette.text }}>
                  {trades.length ? `${winRate.toFixed(1)}%` : "N/A"}
                </span>
              </div>
              <div style={{ height: "4px", borderRadius: "999px", background: palette.field, margin: "7px 0 5px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${trades.length ? winRate : 0}%`, background: palette.green, borderRadius: "999px", transition: "width 0.3s ease" }} />
              </div>
              <div style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "11px" }}>
                {trades.length ? `${wins.length} win${wins.length === 1 ? "" : "s"} \u00b7 ${losses.length} loss${losses.length === 1 ? "" : "es"}` : "No trades yet"}
              </div>
            </div>
          </div>
          <ActiveTradePanel
            cardStyle={{ ...topCard(), padding: isDesktop ? "24px" : "16px" }}
            accountLabel={brokerConn && brokerConn.connected ? props.brokerAccountName : ""}
            tagProps={{ openTags: props.openTags, saveOpenTag: props.saveOpenTag, customSetups, customSetupsLoaded, addCustomSetup, customMoods, customMoodsLoaded }}
            connected={!!(brokerConn && brokerConn.connected)}
            positions={livePositions || []}
            pnlAvailable={livePnlAvailable !== false}
            error={liveError}
            isDesktop={isDesktop}
          />
        </div>

        <CalendarSection
          {...{ trades, tradesByDay, calMonth, setCalMonth, selectedDay, setSelectedDay, startingBalance, isDesktop, findSetupLabel }}
          dayJournals={settings.dayJournals || {}}
          onOpenJournal={openDayJournal}
          onLogTrade={() => setLogSheetOpen(true)}
          onOpenTrade={(id) => setJournalTradeId(id)}
        />
        {trades.length > 0 && (
          <div className="flex justify-end" style={{ margin: "-12px 0 14px" }}>
            <button type="button" onClick={() => { clearTrades(); setSelectedDay(null); }} className={TAP} style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>Clear all trades</button>
          </div>
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

        {view === "equity" && (
          <EquitySection {...{ trades, startingBalance, settings, persistSettings, isDesktop }} persistStartingBalance={props.persistStartingBalance} />
        )}

        {view === "history" && (
          <JournalSection
            {...{ trades, tradesByDay, settings, persistSettings, journalDay, setJournalDay, isDesktop, findSetupLabel }}
            onOpenTrade={(id) => setJournalTradeId(id)}
          />
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
          <LogTradeSheet
            key={editingTradeId || "new"}
            {...{ isDesktop, editingTradeId, cancelEditTrade, submitTrade, deleteTrade, logFormRef, tradesLoadError, tradePair, setTradePair, tradeDirection, setTradeDirection, tradeInput, setTradeInput, tradeNote, setTradeNote, tradeSetup, setTradeSetup, tradeSession, setTradeSession, tradeConfidence, setTradeConfidence, tradeEmotion, setTradeEmotion, tradeExtra, setTradeExtra, customSetups, customSetupsLoaded, addCustomSetup, playbookRules, startingBalance, trades, settings, setLogSheetOpen }}
          />
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

        {journalTradeId && trades.find((x) => x.id === journalTradeId) && (
          <TradeJournalSheet
            key={journalTradeId}
            trade={trades.find((x) => x.id === journalTradeId)}
            {...{ trades, persistTrades, playbookRules, startEditTrade, deleteTrade, openScreenshotPicker, setViewingScreenshot, setPendingScreenshotDelete, screenshotSaving, screenshotTargetId, screenshotError, findSetupLabel, isDesktop }}
            onClose={() => setJournalTradeId(null)}
          />
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

// ===================== Calendar tab (formerly JournalTab) =====================
// Calendar tab (tab id "journal"): Journal (log + calendar), History, and Trade plan.
// The journal / history screens are CurveView below; CalendarTab is what App.jsx loads.
export default function CalendarTab(props) {
  const {
    goals,
    persistGoals,
    startingBalance,
    trades,
    addPlaybookRule: addPlaybookRuleProp,
    deletePlaybookCheckin: deletePlaybookCheckinProp,
    isDesktop,
    journalSubTab,
    curveProps,
    newRuleText,
    persistSettings,
    playbookCheckins,
    playbookMsg,
    playbookRuleError,
    playbookRules,
    playbookRulesLoaded,
    removePlaybookRule: removePlaybookRuleProp,
    renderSubNav,
    setJournalSubTab: setJournalSubTabProp,
    setNewRuleText,
    setPlaybookRuleError,
    settings,
    submitCheckin: submitCheckinProp,
    todayResults,
    toggleTodayResult: toggleTodayResultProp,
  } = props;

  // Mascot reactions: wrap the handlers so every action pokes the crab.
  const withCrab = (fn, mood, detail) => (...args) => {
    pokeCrab(mood, detail);
    return fn(...args);
  };
  const addPlaybookRule = withCrab(addPlaybookRuleProp, "add");
  const deletePlaybookCheckin = withCrab(deletePlaybookCheckinProp, "poof");
  const removePlaybookRule = withCrab(removePlaybookRuleProp, "poof");
  const setJournalSubTab = withCrab(setJournalSubTabProp, "look");
  const submitCheckin = (...args) => {
    const clean = playbookRules.length > 0 && playbookRules.every((r) => todayResults[r.id]);
    pokeCrab(clean ? "party" : "check", { say: clean ? "Clean day!" : "Checked in" });
    return submitCheckinProp(...args);
  };
  const toggleTodayResult = (id, ...rest) => {
    pokeCrab(todayResults[id] ? "look" : "check", { say: "" });
    return toggleTodayResultProp(id, ...rest);
  };

  const [journalDay, setJournalDay] = useState(() => dayKeyFromDate(new Date()));
  const openDayJournal = (key) => {
    setJournalDay(key);
    setJournalSubTab("history");
  };

  const JOURNAL_SUB_TABS = [
    { id: "log", label: "Calendar" },
    { id: "history", label: "Journal" },
    { id: "equity", label: "Equity" },
    { id: "playbook", label: "Trade plan" },
  ];
  const journalSubNav = renderSubNav(JOURNAL_SUB_TABS, journalSubTab, setJournalSubTab);

  if (journalSubTab === "log" || journalSubTab === "history" || journalSubTab === "equity") {
    return (
      <>
        {journalSubNav}
        <CurveView {...curveProps} view={journalSubTab === "history" ? "history" : journalSubTab === "equity" ? "equity" : "overview"} playbookRules={playbookRules || []} journalDay={journalDay} setJournalDay={setJournalDay} openDayJournal={openDayJournal} />
      </>
    );
  }

  // Anything else (including an old saved "sheet" tab) lands on the Trade plan.
  return (
    <>
      {journalSubNav}

      <OnboardingTip
        id="playbook-intro"
        text="Write your plan once: goals, risk limits, setups and your daily check in. Tap the pencil on a card to edit it, and check off your rules each day to build a discipline streak."
        settings={settings}
        persistSettings={persistSettings}
      />

      <TradePlan
        {...{
          isDesktop,
          settings,
          persistSettings,
          trades,
          startingBalance,
          goals,
          persistGoals,
          playbookRules,
          playbookRulesLoaded,
          playbookCheckins,
          playbookMsg,
          playbookRuleError,
          newRuleText,
          setNewRuleText,
          setPlaybookRuleError,
          addPlaybookRule,
          removePlaybookRule,
          todayResults,
          toggleTodayResult,
          submitCheckin,
          deletePlaybookCheckin,
        }}
      />
    </>
  );
}
