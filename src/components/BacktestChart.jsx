import { useCallback, useEffect, useRef, useState } from "react";
import { CrosshairMode, LineStyle, createChart } from "lightweight-charts";
import { AlignJustify, Eraser, Minus, MousePointer2, MoveUpRight, Ruler, SeparatorVertical, Square, Trash2, TrendingUp, Type, Undo2 } from "lucide-react";

// Thin wrapper around TradingView's open-source Lightweight Charts (free, Apache 2.0),
// plus a drawing layer: long/short position planner, horizontal/vertical line, trend line, ray,
// rectangle, fib retracement, measure, text label and an eraser.
// Props:
//   candles      visible candles only (the tab slices to the replay position)
//   sessionKey   changes whenever a new dataset / start point is loaded (resets the zoom)
//   lines        { entry, sl, tp } prices to draw as horizontal lines (NaN/undefined = hidden)
//   markers      [{ time, position, color, shape, text }] sorted by time
//   colors       { text, grid, border, up, down, entry, font }
//   pickMode     "sl" | "tp" | null - when set, the next chart click reports a price
//   onApplyPlan  ({ side: "buy" | "sell", sl, tp }) - called by the "Use plan" button
//
// Drawings are stored as { logical bar index, price } points so they stay glued to the candles
// while you zoom, pan and step. They are cleared when a different dataset is loaded.

const DRAW_COLOR = "#5b9dff";
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// How many taps each tool needs.
const NEED = { hline: 1, vline: 1, text: 1, trend: 2, ray: 2, rect: 2, fib: 2, measure: 2, long: 3, short: 3 };
const HINTS = {
  hline: ["Tap where the line should go"],
  vline: ["Tap where the line should go"],
  text: ["Tap where the label should go"],
  trend: ["Tap the start point", "Tap the end point"],
  ray: ["Tap the start point", "Tap a second point to set the direction"],
  rect: ["Tap the first corner", "Tap the opposite corner"],
  fib: ["Tap the swing start", "Tap the swing end"],
  measure: ["Tap the start point", "Tap the end point"],
  long: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
  short: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
};
const ICON_TOOLS = [
  { id: null, label: "Cursor", Icon: MousePointer2 },
  { id: "hline", label: "Horizontal line", Icon: Minus },
  { id: "vline", label: "Vertical line", Icon: SeparatorVertical },
  { id: "trend", label: "Trend line", Icon: TrendingUp },
  { id: "ray", label: "Ray", Icon: MoveUpRight },
  { id: "rect", label: "Rectangle", Icon: Square },
  { id: "fib", label: "Fib retracement", Icon: AlignJustify },
  { id: "measure", label: "Measure", Icon: Ruler },
  { id: "text", label: "Text label", Icon: Type },
  { id: "eraser", label: "Eraser (tap a drawing)", Icon: Eraser },
];

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function rayEnd(xa, ya, xb, yb, plotW) {
  if (xb === xa) return { x: xb, y: yb > ya ? ya + 5000 : ya - 5000 };
  const slope = (yb - ya) / (xb - xa);
  const x = xb > xa ? plotW + 60 : -60;
  return { x, y: ya + slope * (x - xa) };
}

function fibPrice(d, level) {
  return d.pts[1].p - (d.pts[1].p - d.pts[0].p) * level;
}

function fmtDur(sec) {
  const s = Math.abs(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(" ") : "0m";
}

const signedPct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

function tag(ctx, text, x, y, color) {
  const w = ctx.measureText(text).width + 10;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgb(15,15,20)";
  ctx.fillRect(x, y - 13, w, 17);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x + 5, y);
  ctx.restore();
}

function paintDrawing(ctx, d, env) {
  const { chart, series, plotW, plotH, prec, pal, timeAt } = env;
  const ts = chart.timeScale();
  const X = (pt) => ts.logicalToCoordinate(pt.l);
  const Y = (pt) => series.priceToCoordinate(pt.p);
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  ctx.strokeStyle = DRAW_COLOR;
  ctx.fillStyle = DRAW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  if (d.type === "hline") {
    if (ya == null) return;
    ctx.beginPath();
    ctx.moveTo(0, ya);
    ctx.lineTo(plotW, ya);
    ctx.stroke();
    tag(ctx, a.p.toFixed(prec), 6, ya - 3, DRAW_COLOR);
    return;
  }

  if (d.type === "vline") {
    if (xa == null) return;
    ctx.beginPath();
    ctx.moveTo(xa, 0);
    ctx.lineTo(xa, plotH);
    ctx.stroke();
    const t = timeAt(a.l);
    if (t) tag(ctx, new Date(t * 1000).toISOString().slice(5, 16).replace("T", " "), Math.min(xa + 4, plotW - 90), 16, DRAW_COLOR);
    return;
  }

  if (d.type === "text") {
    if (xa == null || ya == null) return;
    ctx.beginPath();
    ctx.arc(xa, ya, 3, 0, Math.PI * 2);
    ctx.fill();
    tag(ctx, d.text || "", xa + 6, ya - 4, "#ffffff");
    return;
  }

  if (d.type === "long" || d.type === "short") {
    if (!b || xa == null || ya == null) return;
    const ys = Y(b);
    const last = d.pts[d.pts.length - 1];
    const xEnd = ts.logicalToCoordinate(Math.max(last.l, a.l + 8));
    if (ys == null || xEnd == null) return;
    const w = xEnd - xa;
    const risk = Math.abs(a.p - b.p);
    ctx.setLineDash([]);
    ctx.fillStyle = pal.down;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(xa, Math.min(ya, ys), w, Math.abs(ys - ya));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = pal.down;
    ctx.strokeRect(xa, Math.min(ya, ys), w, Math.abs(ys - ya));
    tag(ctx, `SL ${b.p.toFixed(prec)}  ${signedPct(((b.p - a.p) / a.p) * 100)}`, xa + 4, ys + (ys > ya ? 15 : -4), pal.down);
    if (c) {
      const yt = Y(c);
      if (yt != null) {
        ctx.fillStyle = pal.up;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(xa, Math.min(ya, yt), w, Math.abs(yt - ya));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = pal.up;
        ctx.strokeRect(xa, Math.min(ya, yt), w, Math.abs(yt - ya));
        tag(ctx, `TP ${c.p.toFixed(prec)}  ${signedPct(((c.p - a.p) / a.p) * 100)}`, xa + 4, yt + (yt > ya ? 15 : -4), pal.up);
      }
    }
    ctx.strokeStyle = DRAW_COLOR;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xEnd, ya);
    ctx.stroke();
    const rr = c && risk > 0 ? `  R:R ${(Math.abs(c.p - a.p) / risk).toFixed(2)}` : "";
    tag(ctx, `${d.type === "long" ? "Long" : "Short"} ${a.p.toFixed(prec)}${rr}`, xa + 4, ya - 4, DRAW_COLOR);
    return;
  }

  // Two-point tools from here on.
  if (!b) return;
  const xb = X(b);
  const yb = Y(b);
  if (xa == null || ya == null || xb == null || yb == null) return;

  if (d.type === "trend") {
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(xa, ya, 3, 0, Math.PI * 2);
    ctx.arc(xb, yb, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.type === "ray") {
    const e = rayEnd(xa, ya, xb, yb, plotW);
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(xa, ya, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.type === "rect") {
    const x = Math.min(xa, xb);
    const y = Math.min(ya, yb);
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x, y, Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.globalAlpha = 1;
    ctx.strokeRect(x, y, Math.abs(xb - xa), Math.abs(yb - ya));
  } else if (d.type === "fib") {
    const x0 = Math.min(xa, xb);
    FIB_LEVELS.forEach((lv, i) => {
      const price = fibPrice(d, lv);
      const y = series.priceToCoordinate(price);
      if (y == null) return;
      ctx.globalAlpha = i === 0 || i === FIB_LEVELS.length - 1 ? 1 : 0.65;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(`${(lv * 100).toFixed(1)}%  ${price.toFixed(prec)}`, x0 + 6, y - 4);
    });
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  } else if (d.type === "measure") {
    const diff = b.p - a.p;
    const col = diff >= 0 ? pal.up : pal.down;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.globalAlpha = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    const bars = Math.abs(b.l - a.l);
    const ta = timeAt(a.l);
    const tb = timeAt(b.l);
    const span = ta && tb ? `  ${fmtDur(tb - ta)}` : "";
    tag(ctx, `${diff > 0 ? "+" : ""}${diff.toFixed(prec)} (${signedPct((diff / a.p) * 100)})  ${bars} bars${span}`, Math.max(2, Math.min(xa, xb)), Math.min(ya, yb) - 5, col);
  }
}

function hitDrawing(d, x, y, env) {
  const { chart, series, plotW } = env;
  const ts = chart.timeScale();
  const X = (pt) => ts.logicalToCoordinate(pt.l);
  const Y = (pt) => series.priceToCoordinate(pt.p);
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  const near = 9;
  if (d.type === "hline") return ya != null && Math.abs(y - ya) < near;
  if (d.type === "vline") return xa != null && Math.abs(x - xa) < near;
  if (d.type === "text") return xa != null && ya != null && x >= xa - near && x <= xa + 12 + (d.text || "").length * 7 && Math.abs(y - ya) < 14;
  if (d.type === "long" || d.type === "short") {
    const ys = b ? Y(b) : null;
    const yt = c ? Y(c) : null;
    const last = d.pts[d.pts.length - 1];
    const xEnd = ts.logicalToCoordinate(Math.max(last.l, a.l + 8));
    if (xa == null || ya == null || ys == null || xEnd == null) return false;
    const ys2 = [ya, ys];
    if (yt != null) ys2.push(yt);
    return x >= xa - near && x <= xEnd + near && y >= Math.min(...ys2) - near && y <= Math.max(...ys2) + near;
  }
  const xb = X(b);
  const yb = Y(b);
  if (xa == null || ya == null || xb == null || yb == null) return false;
  if (d.type === "trend" || d.type === "measure") return distToSegment(x, y, xa, ya, xb, yb) < near;
  if (d.type === "ray") {
    const e = rayEnd(xa, ya, xb, yb, plotW);
    return distToSegment(x, y, xa, ya, e.x, e.y) < near;
  }
  if (d.type === "rect") {
    return x >= Math.min(xa, xb) - near && x <= Math.max(xa, xb) + near && y >= Math.min(ya, yb) - near && y <= Math.max(ya, yb) + near;
  }
  if (d.type === "fib") {
    if (x < Math.min(xa, xb) - near) return false;
    return FIB_LEVELS.some((lv) => {
      const ly = series.priceToCoordinate(fibPrice(d, lv));
      return ly != null && Math.abs(y - ly) < near;
    });
  }
  return false;
}

export default function BacktestChart({ candles, sessionKey, lines, markers, colors, precision, height, compact, pickMode, onPickPrice, onApplyPlan }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const prevRef = useRef({ len: 0, first: null, key: null });
  const priceLinesRef = useRef([]);
  const pickRef = useRef({ pickMode, onPickPrice });
  pickRef.current = { pickMode, onPickPrice };

  const [tool, setTool] = useState(null);
  const [step, setStep] = useState(0);
  const [drawings, setDrawings] = useState([]);
  const toolRef = useRef(null);
  const drawingsRef = useRef([]);
  const draftRef = useRef(null);
  const hoverRef = useRef(null);
  const downRef = useRef(null);
  const precRef = useRef(precision);
  const colorsRef = useRef(colors);
  const candlesRef = useRef(candles);
  const paintedRef = useRef(false);
  toolRef.current = tool;
  drawingsRef.current = drawings;
  precRef.current = precision;
  colorsRef.current = colors;
  candlesRef.current = candles;

  // Create once.
  useEffect(() => {
    const chart = createChart(hostRef.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: colors.text, fontFamily: colors.font },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false, rightOffset: 8 },
    });
    const series = chart.addCandlestickSeries({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false,
      priceFormat: { type: "price", precision, minMove: 1 / Math.pow(10, precision) },
    });
    chart.subscribeClick((param) => {
      const { pickMode: mode, onPickPrice: cb } = pickRef.current;
      if (!mode || !param.point || !cb) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null) cb(price);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      prevRef.current = { len: 0, first: null, key: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme / precision changes.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    chart.applyOptions({
      layout: { textColor: colors.text, fontFamily: colors.font },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    });
    series.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      priceFormat: { type: "price", precision, minMove: 1 / Math.pow(10, precision) },
    });
  }, [colors.text, colors.grid, colors.border, colors.up, colors.down, colors.font, precision]);

  // Data: append one candle cheaply while stepping, otherwise reload.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const prev = prevRef.current;
    const n = candles.length;
    const first = n ? candles[0].time : null;
    const appended = prev.key === sessionKey && prev.first === first && n === prev.len + 1;
    if (appended) {
      series.update(candles[n - 1]);
    } else {
      series.setData(candles);
      if (prev.key !== sessionKey && n) {
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 140), to: n + 8 });
      }
    }
    prevRef.current = { len: n, first, key: sessionKey };
  }, [candles, sessionKey]);

  // Entry / SL / TP lines.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((l) => series.removePriceLine(l));
    priceLinesRef.current = [];
    const add = (price, color, title, lineStyle) => {
      if (!Number.isFinite(price)) return;
      priceLinesRef.current.push(
        series.createPriceLine({ price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title })
      );
    };
    add(lines.entry, colors.entry, "Entry", LineStyle.Solid);
    add(lines.sl, colors.down, "SL", LineStyle.Dashed);
    add(lines.tp, colors.up, "TP", LineStyle.Dashed);
  }, [lines.entry, lines.sl, lines.tp, colors.entry, colors.up, colors.down]);

  // Trade markers.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setMarkers(markers);
  }, [markers]);

  // ---- drawing layer ----
  const cancelDraft = () => {
    draftRef.current = null;
    downRef.current = null;
    setStep(0);
  };

  const firstTime = candles.length ? candles[0].time : null;
  useEffect(() => {
    setDrawings([]);
    setTool(null);
    draftRef.current = null;
    downRef.current = null;
    setStep(0);
  }, [firstTime]);

  useEffect(() => {
    if (pickMode) {
      setTool(null);
      draftRef.current = null;
      downRef.current = null;
      setStep(0);
    }
  }, [pickMode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        draftRef.current = null;
        downRef.current = null;
        setStep(0);
        setTool(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const makeEnv = useCallback((plotW, plotH) => ({
    chart: chartRef.current,
    series: seriesRef.current,
    plotW,
    plotH,
    prec: precRef.current,
    pal: { up: colorsRef.current.up, down: colorsRef.current.down },
    timeAt: (l) => {
      const c = candlesRef.current[l];
      return c ? c.time : null;
    },
  }), []);

  const plotSize = useCallback((w, h) => {
    let plotW = w - 60;
    let plotH = h - 28;
    try {
      plotW = w - chartRef.current.priceScale("right").width();
      plotH = h - chartRef.current.timeScale().height();
    } catch (err) {
      // fall back to the guesses above
    }
    return { plotW, plotH };
  }, []);

  const paintAll = useCallback(() => {
    const canvas = canvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    const host = hostRef.current;
    if (!canvas || !chart || !series || !host) return;
    const hasWork = drawingsRef.current.length > 0 || draftRef.current || (toolRef.current && hoverRef.current);
    if (!hasWork && !paintedRef.current) return;

    const w = host.clientWidth;
    const h = host.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paintedRef.current = !!hasWork;
    if (!hasWork) return;

    const { plotW, plotH } = plotSize(w, h);
    const env = makeEnv(plotW, plotH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, plotW, plotH);
    ctx.clip();
    ctx.font = `11px ${colorsRef.current.font || "sans-serif"}`;
    drawingsRef.current.forEach((d) => paintDrawing(ctx, d, env));
    const draft = draftRef.current;
    if (draft && draft.cur) {
      paintDrawing(ctx, { type: draft.type, pts: [...draft.pts, { l: draft.cur.l, p: draft.cur.p }] }, env);
    }
    const hv = hoverRef.current;
    if (toolRef.current && hv) {
      ctx.strokeStyle = DRAW_COLOR;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hv.x, 0);
      ctx.lineTo(hv.x, plotH);
      ctx.moveTo(0, hv.y);
      ctx.lineTo(plotW, hv.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, [makeEnv, plotSize]);

  // Redraw every frame while there is something to draw (keeps shapes glued during zoom/pan/scale).
  useEffect(() => {
    let raf = 0;
    let warned = false;
    const loop = () => {
      try {
        paintAll();
      } catch (err) {
        if (!warned) {
          warned = true;
          console.error("Drawing layer error:", err);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paintAll]);

  const pointFromEvent = (e) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const canvas = canvasRef.current;
    if (!chart || !series || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const logical = chart.timeScale().coordinateToLogical(x);
    const price = series.coordinateToPrice(y);
    if (logical == null || price == null) return null;
    return { l: Math.round(logical), p: price, x, y };
  };

  const strip = (pt) => ({ l: pt.l, p: pt.p });

  const commit = (type, pts) => {
    let text;
    if (type === "text") {
      text = window.prompt("Label text");
      if (!text || !text.trim()) {
        cancelDraft();
        setTool(null);
        return;
      }
      text = text.trim().slice(0, 60);
    }
    const id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDrawings((prev) => [...prev, { id, type, pts, text }]);
    cancelDraft();
    setTool(null);
  };

  const onDown = (e) => {
    const t = toolRef.current;
    if (!t) return;
    const pt = pointFromEvent(e);
    if (!pt) return;
    e.preventDefault();
    if (t === "eraser") {
      const list = drawingsRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const { plotW, plotH } = plotSize(rect.width, rect.height);
      const env = makeEnv(plotW, plotH);
      for (let i = list.length - 1; i >= 0; i--) {
        if (hitDrawing(list[i], pt.x, pt.y, env)) {
          const id = list[i].id;
          setDrawings((prev) => prev.filter((d) => d.id !== id));
          break;
        }
      }
      return;
    }
    const draft = draftRef.current;
    const pts = draft ? [...draft.pts, strip(pt)] : [strip(pt)];
    if (pts.length >= NEED[t]) {
      commit(t, pts);
      return;
    }
    draftRef.current = { type: t, pts, cur: pt };
    downRef.current = { x: pt.x, y: pt.y };
    setStep(pts.length);
  };

  const onMove = (e) => {
    const pt = pointFromEvent(e);
    hoverRef.current = pt ? { x: pt.x, y: pt.y } : null;
    if (pt && draftRef.current) draftRef.current = { ...draftRef.current, cur: pt };
  };

  // Press-and-drag also works for two-point tools: if the pointer travelled far, finish there.
  const onUp = (e) => {
    const draft = draftRef.current;
    const down = downRef.current;
    if (!draft || !down || NEED[draft.type] !== 2 || draft.pts.length !== 1) return;
    const pt = pointFromEvent(e);
    if (pt && Math.hypot(pt.x - down.x, pt.y - down.y) > 12) commit(draft.type, [draft.pts[0], strip(pt)]);
  };

  // Latest finished long/short drawing can be pushed into the order form.
  let plan = null;
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if ((d.type === "long" || d.type === "short") && d.pts.length === 3) {
      plan = { side: d.type === "long" ? "buy" : "sell", sl: d.pts[1].p, tp: d.pts[2].p };
      break;
    }
  }

  const btn = (active) => ({
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: `1px solid ${active ? DRAW_COLOR : colors.border}`,
    background: active ? DRAW_COLOR : "transparent",
    color: active ? "#fff" : colors.text,
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  });
  const pill = (id, color) => ({
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${color}`,
    background: tool === id ? color : "transparent",
    color: tool === id ? "#fff" : color,
    fontFamily: colors.font,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  });
  const iconOff = (on) => ({ opacity: on ? 1 : 0.4, cursor: on ? "pointer" : "not-allowed" });
  const pickTool = (id) => {
    cancelDraft();
    setTool(id);
  };
  const hint = tool && HINTS[tool] ? HINTS[tool][Math.min(step, HINTS[tool].length - 1)] : tool === "eraser" ? "Tap a drawing to delete it" : "";

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : "visible", scrollbarWidth: "none", alignItems: "center", marginBottom: 8, padding: compact ? "0 12px" : 0 }} role="toolbar" aria-label="Drawing tools">
        <button type="button" onClick={() => pickTool("long")} aria-pressed={tool === "long"} title="Long position (entry, stop loss, take profit)" style={pill("long", colors.up)}>Long</button>
        <button type="button" onClick={() => pickTool("short")} aria-pressed={tool === "short"} title="Short position (entry, stop loss, take profit)" style={pill("short", colors.down)}>Short</button>
        {ICON_TOOLS.map(({ id, label, Icon }) => (
          <button key={String(id)} type="button" title={label} aria-label={label} aria-pressed={tool === id} onClick={() => pickTool(id)} style={btn(tool === id)}>
            <Icon size={16} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {plan && onApplyPlan && (
          <button
            type="button"
            title="Copy the stop loss, take profit and side of your latest Long/Short plan into the order form"
            onClick={() => onApplyPlan(plan)}
            style={{ flexShrink: 0, height: 32, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.entry}`, background: "transparent", color: colors.entry, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Use plan
          </button>
        )}
        <button type="button" title="Undo last drawing" aria-label="Undo last drawing" disabled={!drawings.length} onClick={() => setDrawings((prev) => prev.slice(0, -1))} style={{ ...btn(false), ...iconOff(drawings.length > 0) }}>
          <Undo2 size={16} />
        </button>
        <button type="button" title="Clear all drawings" aria-label="Clear all drawings" disabled={!drawings.length} onClick={() => setDrawings([])} style={{ ...btn(false), ...iconOff(drawings.length > 0) }}>
          <Trash2 size={16} />
        </button>
      </div>
      <div style={{ position: "relative", isolation: "isolate", width: compact ? "calc(100% - 6px)" : "100%", marginLeft: compact ? 6 : 0, height }}>
        <div ref={hostRef} style={{ width: "100%", height: "100%", cursor: pickMode ? "crosshair" : "default" }} aria-label="Price chart" />
        {hint && (
          <div style={{ position: "absolute", left: 8, top: 6, zIndex: 6, pointerEvents: "none", background: "rgba(15,15,20,0.82)", color: DRAW_COLOR, fontFamily: colors.font, fontSize: 12, padding: "4px 8px", borderRadius: 6, maxWidth: "80%" }}>
            {hint}{compact ? "" : ". Esc cancels"}
          </div>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => {
            hoverRef.current = null;
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            zIndex: 5,
            pointerEvents: tool ? "auto" : "none",
            touchAction: "none",
            cursor: tool === "eraser" ? "pointer" : "crosshair",
          }}
        />
      </div>
    </div>
  );
}
