import BacktestChart from "../components/BacktestChart.jsx";
import { INSTRUMENTS, TIMEFRAMES, fetchCandles } from "../api/marketData.js";
import { calcR, scanPosition, summarize, validateOrder } from "../lib/backtestEngine.js";
import { inferTfLabel, parseCandlesCsv, precisionFor } from "../lib/candles.js";
import { scopedKey } from "../lib/constants.js";
import { TAP, display, mono, palette } from "../lib/theme.js";
import { Crosshair, Download, Loader2, Pause, Play, RotateCcw, Shuffle, StepForward, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BACKTEST_STORAGE_KEY = "tredzi-backtest-v1";
const SPEEDS = [1, 2, 5, 10, 25];

const uid = () => `bt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const round = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const fmtTime = (sec) => new Date(sec * 1000).toISOString().slice(0, 16).replace("T", " ");
const money = (v) => `${v < 0 ? "-" : v > 0 ? "+" : ""}$${Math.abs(v).toFixed(2)}`;
const signed = (v, d = 2) => `${v > 0 ? "+" : ""}${v.toFixed(d)}`;

const defaultStart = (n) => Math.min(n - 1, Math.max(60, Math.floor(n * 0.3)));
const randomStart = (n) => {
  const lo = Math.min(120, Math.floor(n * 0.2));
  const hi = Math.max(lo + 1, n - 60);
  return Math.min(n - 1, lo + Math.floor(Math.random() * (hi - lo)));
};

export default function BacktestTab({ activeAccountId, isDesktop }) {
  const [symbol, setSymbol] = useState("EURUSD");
  const [tf, setTf] = useState("15m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candles, setCandles] = useState([]);
  const [meta, setMeta] = useState({ symbol: "", tf: "", source: "" });
  const [idx, setIdx] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const [side, setSide] = useState("buy");
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [note, setNote] = useState("");
  const [pickMode, setPickMode] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [pos, setPos] = useState(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const [trades, setTrades] = useState([]);
  const [risk, setRisk] = useState("100");
  const [loadedFor, setLoadedFor] = useState(null);
  const [filterSymbol, setFilterSymbol] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const fileRef = useRef(null);

  // ---- persistence (per account, same window.storage the rest of the app uses) ----
  useEffect(() => {
    let dead = false;
    if (!activeAccountId) {
      setTrades([]);
      setLoadedFor(null);
      return undefined;
    }
    (async () => {
      let data = null;
      try {
        const res = await window.storage.get(scopedKey(BACKTEST_STORAGE_KEY, activeAccountId), false);
        data = res && res.value ? JSON.parse(res.value) : null;
      } catch (err) {
        data = null;
      }
      if (dead) return;
      setTrades(data && Array.isArray(data.trades) ? data.trades : []);
      if (data && data.risk) setRisk(String(data.risk));
      setLoadedFor(activeAccountId);
    })();
    return () => {
      dead = true;
    };
  }, [activeAccountId]);

  useEffect(() => {
    if (!activeAccountId || loadedFor !== activeAccountId) return;
    window.storage
      .set(scopedKey(BACKTEST_STORAGE_KEY, activeAccountId), JSON.stringify({ trades, risk }), false)
      .catch(() => {});
  }, [trades, risk, loadedFor, activeAccountId]);

  // ---- derived ----
  const last = candles.length - 1;
  const visible = useMemo(() => candles.slice(0, idx + 1), [candles, idx]);
  const bar = candles[idx] || null;
  const precision = useMemo(() => (bar ? precisionFor(bar.close) : 5), [bar]);
  const timeIndex = useMemo(() => {
    const m = new Map();
    candles.forEach((c, i) => m.set(c.time, i));
    return m;
  }, [candles]);

  const riskNum = parseFloat(risk);
  const openR = pos && bar ? calcR(pos, bar.close) : null;

  const shownTrades = useMemo(
    () => (filterSymbol === "all" ? trades : trades.filter((t) => t.symbol === filterSymbol)),
    [trades, filterSymbol]
  );
  const stats = useMemo(() => summarize(shownTrades), [shownTrades]);
  const symbolsInLog = useMemo(() => [...new Set(trades.map((t) => t.symbol))], [trades]);

  const lines = useMemo(() => {
    if (pos) return { entry: pos.entry, sl: pos.sl, tp: pos.tp == null ? NaN : pos.tp };
    const sl = parseFloat(slInput);
    const tp = parseFloat(tpInput);
    return { entry: bar && (slInput || tpInput) ? bar.close : NaN, sl, tp };
  }, [pos, slInput, tpInput, bar]);

  const markers = useMemo(() => {
    if (!candles.length) return [];
    const out = [];
    const add = (time, position, color, shape, text) => {
      const i = timeIndex.get(time);
      if (i != null && i <= idx) out.push({ time, position, color, shape, text });
    };
    trades.forEach((t) => {
      if (t.symbol !== meta.symbol) return;
      add(t.openTime, t.side === "buy" ? "belowBar" : "aboveBar", t.side === "buy" ? palette.green : palette.red, t.side === "buy" ? "arrowUp" : "arrowDown", "");
      add(t.closeTime, t.side === "buy" ? "aboveBar" : "belowBar", t.r >= 0 ? palette.green : palette.red, "circle", signed(t.r) + "R");
    });
    if (pos) add(pos.openTime, pos.side === "buy" ? "belowBar" : "aboveBar", pos.side === "buy" ? palette.green : palette.red, pos.side === "buy" ? "arrowUp" : "arrowDown", "");
    out.sort((a, b) => a.time - b.time);
    return out;
  }, [trades, pos, candles, timeIndex, idx, meta.symbol]);

  const chartColors = {
    text: palette.textMuted,
    grid: palette.border,
    border: palette.border,
    up: palette.green,
    down: palette.red,
    entry: palette.gold,
    font: mono,
  };

  // ---- loading data ----
  const resetTrading = () => {
    setPos(null);
    setSlInput("");
    setTpInput("");
    setPickMode(null);
    setPlaying(false);
    setOrderError("");
  };

  const applyDataset = (list, nextMeta, startAt) => {
    resetTrading();
    setCandles(list);
    setMeta(nextMeta);
    setIdx(startAt(list.length));
    setSessionKey((k) => k + 1);
    setError("");
  };

  const loadMarket = async () => {
    setLoading(true);
    setError("");
    setPlaying(false);
    try {
      const list = await fetchCandles(symbol, tf);
      if (list.length < 30) throw new Error("Not enough candles came back for that timeframe.");
      applyDataset(list, { symbol, tf, source: "" }, defaultStart);
    } catch (err) {
      setError(err.message || "Couldn't load candles.");
    } finally {
      setLoading(false);
    }
  };

  const onCsv = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const list = parseCandlesCsv(await file.text());
      applyDataset(list, { symbol: file.name.replace(/\.[^.]+$/, ""), tf: inferTfLabel(list), source: "CSV" }, defaultStart);
    } catch (err) {
      setError(err.message || "Couldn't read that CSV.");
    }
  };

  const jumpRandom = () => {
    if (pos || !candles.length) return;
    setPlaying(false);
    setIdx(randomStart(candles.length));
    setSessionKey((k) => k + 1);
  };

  const jumpToDate = (value) => {
    if (pos || !candles.length || !value) return;
    const target = Date.parse(`${value}T00:00:00Z`) / 1000;
    let i = candles.findIndex((c) => c.time >= target);
    if (i < 0) i = candles.length - 1;
    setPlaying(false);
    setIdx(Math.min(last, Math.max(i, 30)));
    setSessionKey((k) => k + 1);
  };

  // ---- replay ----
  const step = useCallback(() => setIdx((i) => Math.min(i + 1, candles.length - 1)), [candles.length]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setIdx((i) => (i >= candles.length - 1 ? i : i + 1)), Math.round(700 / speed));
    return () => clearInterval(id);
  }, [playing, speed, candles.length]);

  useEffect(() => {
    if (playing && candles.length && idx >= candles.length - 1) setPlaying(false);
  }, [idx, playing, candles.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (!candles.length || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlaying(false);
        step();
      } else if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [candles.length, step]);

  // ---- trading ----
  const finishTrade = (p, price, reason, closeIdx) => {
    const r = calcR(p, price);
    const trade = {
      id: uid(),
      symbol: p.symbol,
      pair: p.symbol,
      tf: p.tf,
      side: p.side,
      entry: p.entry,
      sl: p.sl,
      tp: p.tp,
      exit: price,
      reason,
      r: round(r, 2),
      pnl: round(r * p.risk, 2),
      risk: p.risk,
      openTime: p.openTime,
      closeTime: candles[closeIdx].time,
      note: p.note || "",
      ts: Date.now(),
      source: "backtest",
    };
    setTrades((prev) => [...prev, trade]);
    setPos(null);
    setSlInput("");
    setTpInput("");
    setIdx(closeIdx);
    setPlaying(false);
  };

  // Check the position against every candle that arrived since it was last checked.
  useEffect(() => {
    if (!pos || idx <= pos.evalIdx) return;
    const res = scanPosition(pos, candles.slice(pos.evalIdx + 1, idx + 1));
    if (res.closed) {
      finishTrade(pos, res.closed.price, res.closed.reason, pos.evalIdx + 1 + res.closed.barOffset);
    } else if (idx >= candles.length - 1) {
      finishTrade(pos, candles[idx].close, "end", idx);
    } else {
      setPos((p) => (p ? { ...p, evalIdx: idx } : p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, pos, candles]);

  const enterTrade = () => {
    if (pos || !bar) return;
    const sl = parseFloat(slInput);
    const tp = tpInput.trim() === "" ? null : parseFloat(tpInput);
    const err = validateOrder({ side, entry: bar.close, sl, tp, risk: riskNum });
    if (err) {
      setOrderError(err);
      return;
    }
    setOrderError("");
    setPickMode(null);
    setPos({
      side,
      entry: bar.close,
      sl,
      tp,
      risk: riskNum,
      openIdx: idx,
      evalIdx: idx,
      openTime: bar.time,
      symbol: meta.symbol,
      tf: meta.tf,
      note: note.trim(),
    });
    setNote("");
  };

  const closeNow = () => {
    if (pos && bar) finishTrade(pos, bar.close, "manual", idx);
  };

  const onPickPrice = (price) => {
    const v = price.toFixed(precision);
    if (pickMode === "sl") setSlInput(v);
    else if (pickMode === "tp") setTpInput(v);
    setPickMode(null);
  };

  const deleteTrade = (id) => setTrades((prev) => prev.filter((t) => t.id !== id));

  const clearAll = () => {
    setTrades([]);
    setConfirmClear(false);
  };

  const exportCsv = () => {
    const head = ["date_closed_utc", "symbol", "tf", "side", "entry", "sl", "tp", "exit", "reason", "r", "pnl", "risk", "note"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = shownTrades.map((t) =>
      [fmtTime(t.closeTime), t.symbol, t.tf, t.side, t.entry, t.sl, t.tp ?? "", t.exit, t.reason, t.r, t.pnl, t.risk, t.note].map(esc).join(",")
    );
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tredzi-backtest-trades.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---- styles (read palette at render so theme switches apply) ----
  const card = { background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 16 };
  const field = {
    background: palette.field,
    border: `1px solid ${palette.border}`,
    color: palette.text,
    borderRadius: 10,
    padding: "9px 10px",
    fontFamily: mono,
    fontSize: 13,
    width: "100%",
    minWidth: 0,
    outline: "none",
  };
  const label = { color: palette.textFaint, fontFamily: mono, fontSize: 11.5, marginBottom: 5, display: "block" };
  const ghostBtn = (active) => ({
    background: active ? palette.gold : palette.field,
    color: active ? palette.letterbox : palette.textMuted,
    border: `1px solid ${active ? palette.gold : palette.border}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  });
  const disabledBtn = { opacity: 0.45, cursor: "not-allowed" };
  const sideBtn = (s) => {
    const on = side === s;
    const c = s === "buy" ? palette.green : palette.red;
    return {
      flex: 1,
      background: on ? c : palette.field,
      color: on ? "#fff" : palette.textMuted,
      border: `1px solid ${on ? c : palette.border}`,
      borderRadius: 10,
      padding: "10px 0",
      fontFamily: display,
      fontWeight: 700,
      fontSize: 14,
      cursor: pos ? "not-allowed" : "pointer",
      opacity: pos ? 0.5 : 1,
    };
  };

  const hasData = candles.length > 0;
  const statTile = (title, value, color) => (
    <div key={title} style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "9px 10px" }}>
      <div style={{ color: palette.textFaint, fontFamily: mono, fontSize: 11 }}>{title}</div>
      <div style={{ color: color || palette.text, fontFamily: display, fontWeight: 700, fontSize: 16, marginTop: 2 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Data source */}
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1.4fr 0.8fr auto auto" : "1fr 1fr", gap: 10, alignItems: "end" }}>
          <div style={isDesktop ? undefined : { gridColumn: "1 / -1" }}>
            <label style={label} htmlFor="bt-symbol">Instrument</label>
            <select id="bt-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} style={field}>
              {["Forex", "Metals", "Indices"].map((g) => (
                <optgroup key={g} label={g}>
                  {INSTRUMENTS.filter((i) => i.group === g).map((i) => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="bt-tf">Timeframe</label>
            <select id="bt-tf" value={tf} onChange={(e) => setTf(e.target.value)} style={field}>
              {TIMEFRAMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label} ({t.range})</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={loadMarket} disabled={loading} className={TAP} style={{ ...ghostBtn(true), justifyContent: "center", ...(loading ? disabledBtn : null) }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {loading ? "Loading" : "Load candles"}
          </button>
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className={TAP} style={{ ...ghostBtn(false), justifyContent: "center" }}>
            <Upload size={15} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" onChange={onCsv} style={{ display: "none" }} />
        </div>
        {error && (
          <p role="alert" style={{ color: palette.red, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{error}</p>
        )}
        {!hasData && !error && (
          <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, lineHeight: 1.6, margin: "12px 0 0" }}>
            Load free candles for forex, gold or indices, or import your own CSV (MT4/MT5, Dukascopy and TradingView exports work). Then step through the chart one candle at a time and place trades with no hindsight.
          </p>
        )}
      </div>

      {hasData && (
        <div style={{ display: isDesktop ? "grid" : "flex", flexDirection: "column", gridTemplateColumns: isDesktop ? "minmax(0,1fr) 330px" : undefined, gap: 16, alignItems: "start" }}>
          {/* Chart + replay controls */}
          <div style={{ ...card, padding: isDesktop ? 16 : 12, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontFamily: display, fontWeight: 700, color: palette.text, fontSize: 16 }}>
                {meta.symbol} <span style={{ color: palette.textFaint, fontWeight: 500, fontSize: 13 }}>{meta.tf}{meta.source ? ` - ${meta.source}` : ""}</span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 12, color: palette.textMuted }}>
                {bar ? `${fmtTime(bar.time)} UTC` : ""}  -  bar {idx + 1}/{candles.length}
              </div>
            </div>

            <BacktestChart
              candles={visible}
              sessionKey={sessionKey}
              lines={lines}
              markers={markers}
              colors={chartColors}
              precision={precision}
              height={isDesktop ? 480 : 340}
              pickMode={pickMode}
              onPickPrice={onPickPrice}
              onApplyPlan={(plan) => {
                if (pos) return;
                setSide(plan.side);
                setSlInput(plan.sl.toFixed(precision));
                setTpInput(plan.tp.toFixed(precision));
                setOrderError("");
              }}
            />
            {pickMode && (
              <p style={{ color: palette.gold, fontFamily: mono, fontSize: 12.5, margin: "8px 0 0" }}>
                Tap the chart at your {pickMode === "sl" ? "stop loss" : "take profit"} level.
              </p>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={idx >= last} className={TAP} style={{ ...ghostBtn(playing), ...(idx >= last ? disabledBtn : null) }} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => { setPlaying(false); step(); }} disabled={idx >= last} className={TAP} style={{ ...ghostBtn(false), ...(idx >= last ? disabledBtn : null) }} aria-label="Next candle">
                <StepForward size={15} /> Next candle
              </button>
              <div style={{ display: "flex", gap: 4 }} role="group" aria-label="Replay speed">
                {SPEEDS.map((s) => (
                  <button key={s} type="button" onClick={() => setSpeed(s)} className={TAP} style={{ ...ghostBtn(speed === s), padding: "9px 10px" }}>{s}x</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={jumpRandom} disabled={!!pos} className={TAP} style={{ ...ghostBtn(false), ...(pos ? disabledBtn : null) }} title={pos ? "Close your trade first" : "Jump to a random point"}>
                <Shuffle size={15} /> Random start
              </button>
              <input
                type="date"
                aria-label="Jump to date"
                disabled={!!pos}
                min={bar ? undefined : undefined}
                onChange={(e) => jumpToDate(e.target.value)}
                style={{ ...field, width: 150, ...(pos ? disabledBtn : null) }}
              />
            </div>
            {idx >= last && (
              <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>
                You've reached the end of this data. Jump somewhere else or load more candles.
              </p>
            )}
            <p style={{ color: palette.textFaint, fontFamily: mono, fontSize: 11.5, margin: "10px 0 0" }}>
              Shortcuts: right arrow = next candle, space = play or pause.
            </p>
          </div>

          {/* Order + stats column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={card}>
              <div style={{ fontFamily: display, fontWeight: 700, color: palette.text, fontSize: 15, marginBottom: 10 }}>
                {pos ? "Open trade" : "New trade"}
              </div>

              {!pos ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button type="button" onClick={() => !pos && setSide("buy")} className={TAP} style={sideBtn("buy")}>Buy</button>
                    <button type="button" onClick={() => !pos && setSide("sell")} className={TAP} style={sideBtn("sell")}>Sell</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={label} htmlFor="bt-sl">Stop loss</label>
                      <input id="bt-sl" inputMode="decimal" value={slInput} onChange={(e) => setSlInput(e.target.value)} placeholder="price" style={field} />
                    </div>
                    <div>
                      <label style={label} htmlFor="bt-tp">Take profit (optional)</label>
                      <input id="bt-tp" inputMode="decimal" value={tpInput} onChange={(e) => setTpInput(e.target.value)} placeholder="price" style={field} />
                    </div>
                    <button type="button" onClick={() => setPickMode(pickMode === "sl" ? null : "sl")} className={TAP} style={{ ...ghostBtn(pickMode === "sl"), justifyContent: "center" }}>
                      <Crosshair size={14} /> Pick SL
                    </button>
                    <button type="button" onClick={() => setPickMode(pickMode === "tp" ? null : "tp")} className={TAP} style={{ ...ghostBtn(pickMode === "tp"), justifyContent: "center" }}>
                      <Crosshair size={14} /> Pick TP
                    </button>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={label} htmlFor="bt-risk">Risk per trade ($)</label>
                    <input id="bt-risk" inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} style={field} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={label} htmlFor="bt-note">Note (why this trade?)</label>
                    <input id="bt-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="e.g. break and retest of the London high" style={field} />
                  </div>
                  {orderError && (
                    <p role="alert" style={{ color: palette.red, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{orderError}</p>
                  )}
                  <button type="button" onClick={enterTrade} className={TAP} style={{ ...ghostBtn(true), width: "100%", justifyContent: "center", marginTop: 12 }}>
                    {side === "buy" ? "Buy" : "Sell"} at {bar ? bar.close.toFixed(precision) : "-"}
                  </button>
                  <p style={{ color: palette.textFaint, fontFamily: mono, fontSize: 11.5, lineHeight: 1.5, margin: "8px 0 0" }}>
                    Fills at the close of the current candle. No spread or slippage is applied. If one candle touches both SL and TP, the stop counts as hit first.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {statTile("Side", pos.side === "buy" ? "Buy" : "Sell", pos.side === "buy" ? palette.green : palette.red)}
                    {statTile("Entry", pos.entry.toFixed(precision))}
                    {statTile("Stop loss", pos.sl.toFixed(precision), palette.red)}
                    {statTile("Take profit", pos.tp == null ? "none" : pos.tp.toFixed(precision), pos.tp == null ? palette.textFaint : palette.green)}
                    {statTile("Floating R", openR == null ? "-" : `${signed(openR)}R`, openR > 0 ? palette.green : openR < 0 ? palette.red : palette.text)}
                    {statTile("Floating P&L", openR == null ? "-" : money(openR * pos.risk), openR > 0 ? palette.green : openR < 0 ? palette.red : palette.text)}
                  </div>
                  {pos.note && <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{pos.note}</p>}
                  <button type="button" onClick={closeNow} className={TAP} style={{ ...ghostBtn(false), width: "100%", justifyContent: "center", marginTop: 12 }}>
                    Close at {bar ? bar.close.toFixed(precision) : "-"}
                  </button>
                </>
              )}
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                <div style={{ fontFamily: display, fontWeight: 700, color: palette.text, fontSize: 15 }}>Results</div>
                {symbolsInLog.length > 1 && (
                  <select aria-label="Filter results by instrument" value={filterSymbol} onChange={(e) => setFilterSymbol(e.target.value)} style={{ ...field, width: "auto", padding: "6px 8px" }}>
                    <option value="all">All instruments</option>
                    {symbolsInLog.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
              {stats.count === 0 ? (
                <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: 0 }}>No backtest trades yet. Your results will build up here.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {statTile("Trades", String(stats.count))}
                    {statTile("Win rate", `${stats.winRate.toFixed(0)}%`)}
                    {statTile("Total R", `${signed(stats.totalR)}R`, stats.totalR >= 0 ? palette.green : palette.red)}
                    {statTile("Total P&L", money(stats.totalPnl), stats.totalPnl >= 0 ? palette.green : palette.red)}
                    {statTile("Avg R", `${signed(stats.avgR)}R`)}
                    {statTile("Profit factor", stats.profitFactor == null ? "-" : Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "inf")}
                    {statTile("Max drawdown", `${stats.maxDrawdownR.toFixed(2)}R`, palette.red)}
                  </div>
                  <div style={{ height: 150, marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.equity} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="n" tick={{ fill: palette.textFaint, fontSize: 10 }} stroke={palette.border} />
                        <YAxis tick={{ fill: palette.textFaint, fontSize: 10 }} stroke={palette.border} width={38} />
                        <ReferenceLine y={0} stroke={palette.textFaint} />
                        <Tooltip
                          contentStyle={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 8, fontFamily: mono, fontSize: 12 }}
                          labelFormatter={(n) => `Trade ${n}`}
                          formatter={(v) => [`${signed(v)}R`, "Cumulative"]}
                        />
                        <Line type="monotone" dataKey="r" stroke={palette.gold} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trade log */}
      {trades.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ fontFamily: display, fontWeight: 700, color: palette.text, fontSize: 15 }}>Backtest trade log</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={exportCsv} className={TAP} style={ghostBtn(false)}>
                <Download size={14} /> Export CSV
              </button>
              {confirmClear ? (
                <>
                  <button type="button" onClick={clearAll} className={TAP} style={{ ...ghostBtn(false), color: palette.red, borderColor: palette.red }}>Delete all</button>
                  <button type="button" onClick={() => setConfirmClear(false)} className={TAP} style={ghostBtn(false)}>Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmClear(true)} className={TAP} style={ghostBtn(false)}>
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 12.5, color: palette.textMuted, minWidth: 560 }}>
              <thead>
                <tr style={{ color: palette.textFaint, textAlign: "left" }}>
                  {["Closed (UTC)", "Pair", "Side", "R", "P&L", "Exit", "Note", ""].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", fontWeight: 500, borderBottom: `1px solid ${palette.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...shownTrades].reverse().slice(0, 100).map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}` }}>{fmtTime(t.closeTime)}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}`, color: palette.text }}>{t.symbol} <span style={{ color: palette.textFaint }}>{t.tf}</span></td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}`, color: t.side === "buy" ? palette.green : palette.red }}>{t.side}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}`, color: t.r >= 0 ? palette.green : palette.red }}>{signed(t.r)}R</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}`, color: t.pnl >= 0 ? palette.green : palette.red }}>{money(t.pnl)}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}` }}>{t.reason}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${palette.border}`, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note}</td>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${palette.border}` }}>
                      <button type="button" onClick={() => deleteTrade(t.id)} aria-label="Delete trade" className={TAP} style={{ background: "transparent", border: "none", color: palette.textFaint, cursor: "pointer", padding: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
