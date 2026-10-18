import { useCallback, useEffect, useRef, useState } from "react";
import { CrosshairMode, LineStyle, createChart } from "lightweight-charts";
import {
  AlignJustify, ArrowUpRight, Copy, Eraser, Magnet, Maximize2, Minimize2, Minus, MousePointer2, MoveRight,
  MoveUpRight, Pencil, Ruler, SeparatorVertical, Slash, Square, Trash2, TrendingUp, Type, Undo2, X, Equal,
} from "lucide-react";

// Thin wrapper around TradingView's open-source Lightweight Charts (free, Apache 2.0) plus a
// TradingView-style drawing layer:
//  - tools: long/short position, horizontal line/ray, vertical line, trend line, ray, extended line,
//    arrow, parallel channel, rectangle, fib retracement, measure, text, eraser
//  - tap a drawing to select it, drag it to move it, drag its round handles to reshape it
//  - style bar for the selected drawing (colour, thickness, dashed), duplicate, delete
//  - magnet mode (snaps to the candle's open/high/low/close)
//  - fullscreen chart; on phones the tools live in a bottom sheet
// Props:
//   candles      visible candles only (the tab slices to the replay position)
//   sessionKey   changes whenever a new dataset / start point is loaded (resets the zoom)
//   lines        { entry, sl, tp } prices to draw as horizontal lines (NaN/undefined = hidden)
//   markers      [{ time, position, color, shape, text }] sorted by time
//   colors       { text, grid, border, up, down, entry, font, bg }
//   pickMode     "sl" | "tp" | null - when set, the next chart click reports a price
//   onApplyPlan  ({ side: "buy" | "sell", sl, tp }) - called by the "Use plan" button
//   footer       optional node shown under the chart while it is fullscreen (replay + trade buttons)
//
// Drawings are stored as { logical bar index, price } points so they stay glued to the candles
// while you zoom, pan and step. They are cleared when a different dataset is loaded.

const DRAW_COLOR = "#5b9dff";
const SWATCHES = ["#5b9dff", "#f5c542", "#ff6b6b", "#2ecc71", "#c77dff", "#ffffff"];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// How many taps each tool needs.
const NEED = { hline: 1, hray: 1, vline: 1, text: 1, trend: 2, ray: 2, xline: 2, arrow: 2, rect: 2, fib: 2, measure: 2, channel: 3, long: 3, short: 3 };
const HINTS = {
  hline: ["Tap where the line should go"],
  hray: ["Tap where the ray should start"],
  vline: ["Tap where the line should go"],
  text: ["Tap where the label should go"],
  trend: ["Tap the start point", "Tap the end point"],
  ray: ["Tap the start point", "Tap a second point to set the direction"],
  xline: ["Tap the first point", "Tap a second point"],
  arrow: ["Tap the tail", "Tap the arrow head"],
  channel: ["Tap the start point", "Tap the end of the first line", "Tap to set the channel width"],
  rect: ["Tap the first corner", "Tap the opposite corner"],
  fib: ["Tap the swing start", "Tap the swing end"],
  measure: ["Tap the start point", "Tap the end point"],
  long: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
  short: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
};
const TOOL_GROUPS = [
  { title: "Lines", tools: [
    { id: "trend", label: "Trend line", Icon: TrendingUp },
    { id: "ray", label: "Ray", Icon: MoveUpRight },
    { id: "xline", label: "Extended line", Icon: Slash },
    { id: "arrow", label: "Arrow", Icon: ArrowUpRight },
    { id: "hline", label: "Horizontal line", Icon: Minus },
    { id: "hray", label: "Horizontal ray", Icon: MoveRight },
    { id: "vline", label: "Vertical line", Icon: SeparatorVertical },
    { id: "channel", label: "Parallel channel", Icon: Equal },
  ] },
  { title: "Fib and measure", tools: [
    { id: "fib", label: "Fib retracement", Icon: AlignJustify },
    { id: "measure", label: "Measure", Icon: Ruler },
  ] },
  { title: "Shapes and text", tools: [
    { id: "rect", label: "Rectangle", Icon: Square },
    { id: "text", label: "Text label", Icon: Type },
  ] },
];
const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

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

function extLine(xa, ya, xb, yb, plotW) {
  if (xa === xb) return { x1: xa, y1: -5000, x2: xa, y2: 5000 };
  const s = (yb - ya) / (xb - xa);
  const x1 = -60;
  const x2 = plotW + 60;
  return { x1, y1: ya + s * (x1 - xa), x2, y2: ya + s * (x2 - xa) };
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

// Channel geometry: line a-b plus a parallel line through c (vertical offset in pixels).
function channelGeom(d, env) {
  const { chart, series } = env;
  const ts = chart.timeScale();
  const [a, b, c] = d.pts;
  if (!a || !b) return null;
  const xa = ts.logicalToCoordinate(a.l);
  const ya = series.priceToCoordinate(a.p);
  const xb = ts.logicalToCoordinate(b.l);
  const yb = series.priceToCoordinate(b.p);
  if (xa == null || ya == null || xb == null || yb == null) return null;
  let off = null;
  let xc = null;
  let yc = null;
  if (c) {
    xc = ts.logicalToCoordinate(c.l);
    yc = series.priceToCoordinate(c.p);
    if (xc != null && yc != null) {
      const slope = xb === xa ? 0 : (yb - ya) / (xb - xa);
      off = yc - (ya + slope * (xc - xa));
    }
  }
  return { xa, ya, xb, yb, off, xc, yc };
}

function paintDrawing(ctx, d, env) {
  const { chart, series, plotW, plotH, prec, pal, timeAt } = env;
  const ts = chart.timeScale();
  const X = (pt) => ts.logicalToCoordinate(pt.l);
  const Y = (pt) => series.priceToCoordinate(pt.p);
  const [a, b, c] = d.pts;
  const st = d.style || {};
  const col = st.color || DRAW_COLOR;
  const lw = st.width || 1.5;
  const dash = st.dash ? [6, 5] : [];
  const xa = X(a);
  const ya = Y(a);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = lw;
  ctx.setLineDash(dash);

  if (d.type === "hline" || d.type === "hray") {
    if (ya == null) return;
    ctx.beginPath();
    ctx.moveTo(d.type === "hray" ? xa ?? 0 : 0, ya);
    ctx.lineTo(plotW, ya);
    ctx.stroke();
    ctx.setLineDash([]);
    tag(ctx, a.p.toFixed(prec), d.type === "hray" ? Math.max(6, (xa ?? 0) + 6) : 6, ya - 3, col);
    return;
  }

  if (d.type === "vline") {
    if (xa == null) return;
    ctx.beginPath();
    ctx.moveTo(xa, 0);
    ctx.lineTo(xa, plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    const t = timeAt(a.l);
    if (t) tag(ctx, new Date(t * 1000).toISOString().slice(5, 16).replace("T", " "), Math.min(xa + 4, plotW - 90), 16, col);
    return;
  }

  if (d.type === "text") {
    if (xa == null || ya == null) return;
    ctx.beginPath();
    ctx.arc(xa, ya, 3, 0, Math.PI * 2);
    ctx.fill();
    tag(ctx, d.text || "", xa + 6, ya - 4, col === DRAW_COLOR ? "#ffffff" : col);
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
    ctx.lineWidth = 1.5;
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
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xEnd, ya);
    ctx.stroke();
    const rr = c && risk > 0 ? `  R:R ${(Math.abs(c.p - a.p) / risk).toFixed(2)}` : "";
    tag(ctx, `${d.type === "long" ? "Long" : "Short"} ${a.p.toFixed(prec)}${rr}`, xa + 4, ya - 4, col);
    return;
  }

  if (d.type === "channel") {
    const g = channelGeom(d, env);
    if (!g) return;
    ctx.beginPath();
    ctx.moveTo(g.xa, g.ya);
    ctx.lineTo(g.xb, g.yb);
    ctx.stroke();
    if (g.off != null) {
      ctx.beginPath();
      ctx.moveTo(g.xa, g.ya + g.off);
      ctx.lineTo(g.xb, g.yb + g.off);
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(g.xa, g.ya);
      ctx.lineTo(g.xb, g.yb);
      ctx.lineTo(g.xb, g.yb + g.off);
      ctx.lineTo(g.xa, g.ya + g.off);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.xa, g.ya + g.off / 2);
      ctx.lineTo(g.xb, g.yb + g.off / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);
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
  } else if (d.type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(yb - ya, xb - xa);
    const hl = 10 + lw * 2;
    ctx.beginPath();
    ctx.moveTo(xb, yb);
    ctx.lineTo(xb - hl * Math.cos(ang - 0.4), yb - hl * Math.sin(ang - 0.4));
    ctx.lineTo(xb - hl * Math.cos(ang + 0.4), yb - hl * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  } else if (d.type === "ray") {
    const e = rayEnd(xa, ya, xb, yb, plotW);
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  } else if (d.type === "xline") {
    const e = extLine(xa, ya, xb, yb, plotW);
    ctx.beginPath();
    ctx.moveTo(e.x1, e.y1);
    ctx.lineTo(e.x2, e.y2);
    ctx.stroke();
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
    const mc = diff >= 0 ? pal.up : pal.down;
    ctx.fillStyle = mc;
    ctx.strokeStyle = mc;
    ctx.lineWidth = 1.5;
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
    tag(ctx, `${diff > 0 ? "+" : ""}${diff.toFixed(prec)} (${signedPct((diff / a.p) * 100)})  ${bars} bars${span}`, Math.max(2, Math.min(xa, xb)), Math.min(ya, yb) - 5, mc);
  }
  ctx.setLineDash([]);
}

function hitDrawing(d, x, y, env, near = 9) {
  const { chart, series, plotW } = env;
  const ts = chart.timeScale();
  const X = (pt) => ts.logicalToCoordinate(pt.l);
  const Y = (pt) => series.priceToCoordinate(pt.p);
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  if (d.type === "hline") return ya != null && Math.abs(y - ya) < near;
  if (d.type === "hray") return ya != null && xa != null && x >= xa - near && Math.abs(y - ya) < near;
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
  if (d.type === "channel") {
    const g = channelGeom(d, env);
    if (!g) return false;
    if (distToSegment(x, y, g.xa, g.ya, g.xb, g.yb) < near) return true;
    return g.off != null && distToSegment(x, y, g.xa, g.ya + g.off, g.xb, g.yb + g.off) < near;
  }
  const xb = b ? X(b) : null;
  const yb = b ? Y(b) : null;
  if (xa == null || ya == null || xb == null || yb == null) return false;
  if (d.type === "trend" || d.type === "measure" || d.type === "arrow") return distToSegment(x, y, xa, ya, xb, yb) < near;
  if (d.type === "ray") {
    const e = rayEnd(xa, ya, xb, yb, plotW);
    return distToSegment(x, y, xa, ya, e.x, e.y) < near;
  }
  if (d.type === "xline") {
    const e = extLine(xa, ya, xb, yb, plotW);
    return distToSegment(x, y, e.x1, e.y1, e.x2, e.y2) < near;
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

// Round drag handles for a selected drawing. mode: "pt" moves one anchor, "price" moves only the
// price of an anchor, "width" stretches a position box, "move" drags the whole drawing.
function handlesOf(d, env) {
  const { chart, series, plotW } = env;
  const ts = chart.timeScale();
  const X = (pt) => ts.logicalToCoordinate(pt.l);
  const Y = (pt) => series.priceToCoordinate(pt.p);
  const out = [];
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  if (xa == null && d.type !== "hline") return out;
  if (d.type === "hline") {
    if (ya != null) out.push({ x: plotW / 2, y: ya, mode: "move" });
    return out;
  }
  if (d.type === "vline") {
    out.push({ x: xa, y: env.plotH / 2, mode: "move" });
    return out;
  }
  if (d.type === "text" || d.type === "hray") {
    if (ya != null) out.push({ x: xa, y: ya, mode: "move" });
    return out;
  }
  if (d.type === "long" || d.type === "short") {
    const last = d.pts[d.pts.length - 1];
    const xEnd = ts.logicalToCoordinate(Math.max(last.l, a.l + 8));
    if (ya == null || xEnd == null) return out;
    const xm = xa + (xEnd - xa) / 2;
    out.push({ x: xa, y: ya, mode: "pt", i: 0 });
    out.push({ x: xEnd, y: ya, mode: "width" });
    if (b && Y(b) != null) out.push({ x: xm, y: Y(b), mode: "price", i: 1 });
    if (c && Y(c) != null) out.push({ x: xm, y: Y(c), mode: "price", i: 2 });
    return out;
  }
  if (d.type === "channel") {
    const g = channelGeom(d, env);
    if (!g) return out;
    out.push({ x: g.xa, y: g.ya, mode: "pt", i: 0 });
    out.push({ x: g.xb, y: g.yb, mode: "pt", i: 1 });
    if (g.xc != null && g.yc != null) out.push({ x: g.xc, y: g.yc, mode: "pt", i: 2 });
    return out;
  }
  d.pts.forEach((p, i) => {
    const x = X(p);
    const y = Y(p);
    if (x != null && y != null) out.push({ x, y, mode: "pt", i });
  });
  return out;
}

function dragPts(d, drag, pt) {
  const o = drag.orig;
  if (drag.mode === "move") {
    const dl = pt.l - drag.start.l;
    const dp = pt.p - drag.start.p;
    return o.map((q) => ({ l: q.l + dl, p: q.p + dp }));
  }
  if (drag.mode === "pt") return o.map((q, i) => (i === drag.i ? { l: pt.l, p: pt.p } : q));
  if (drag.mode === "price") return o.map((q, i) => (i === drag.i ? { ...q, p: pt.p } : q));
  if (drag.mode === "width") {
    const nl = Math.max(pt.l, o[0].l + 8);
    return o.map((q, i) => (i > 0 ? { ...q, l: nl } : q));
  }
  return o;
}

export default function BacktestChart({ candles, sessionKey, lines, markers, colors, precision, height, compact, pickMode, onPickPrice, onApplyPlan, footer }) {
  const hostRef = useRef(null);
  const areaRef = useRef(null);
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
  const [selectedId, setSelectedId] = useState(null);
  const [magnet, setMagnet] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [full, setFull] = useState(false);
  const toolRef = useRef(null);
  const drawingsRef = useRef([]);
  const selectedRef = useRef(null);
  const magnetRef = useRef(false);
  const dragRef = useRef(null);
  const lastHitRef = useRef(0);
  const draftRef = useRef(null);
  const hoverRef = useRef(null);
  const downRef = useRef(null);
  const precRef = useRef(precision);
  const colorsRef = useRef(colors);
  const candlesRef = useRef(candles);
  const paintedRef = useRef(false);
  toolRef.current = tool;
  drawingsRef.current = drawings;
  selectedRef.current = selectedId;
  magnetRef.current = magnet;
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
      if (mode) {
        if (!param.point || !cb) return;
        const price = series.coordinateToPrice(param.point.y);
        if (price != null) cb(price);
        return;
      }
      // A tap on empty chart deselects (taps that just grabbed a drawing are ignored).
      if (!toolRef.current && Date.now() - lastHitRef.current > 350) setSelectedId(null);
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

  // Fullscreen: lock page scroll, resize the chart automatically (autoSize).
  useEffect(() => {
    if (!full) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  // ---- drawing layer ----
  const cancelDraft = () => {
    draftRef.current = null;
    downRef.current = null;
    setStep(0);
  };

  const firstTime = candles.length ? candles[0].time : null;
  useEffect(() => {
    setDrawings([]);
    setSelectedId(null);
    setTool(null);
    draftRef.current = null;
    downRef.current = null;
    setStep(0);
  }, [firstTime]);

  useEffect(() => {
    if (pickMode) {
      setTool(null);
      setSelectedId(null);
      draftRef.current = null;
      downRef.current = null;
      setStep(0);
    }
  }, [pickMode]);

  useEffect(() => {
    const onKey = (e) => {
      const tg = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tg)) return;
      if (e.key === "Escape") {
        draftRef.current = null;
        downRef.current = null;
        setStep(0);
        setTool(null);
        setSelectedId(null);
        setSheet(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        const id = selectedRef.current;
        setDrawings((prev) => prev.filter((d) => d.id !== id));
        setSelectedId(null);
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

  // Screen position -> { bar index, price }, optionally snapped to the candle's O/H/L/C (magnet).
  const pointAt = useCallback((x, y) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;
    const logical = chart.timeScale().coordinateToLogical(x);
    let price = series.coordinateToPrice(y);
    if (logical == null || price == null) return null;
    const l = Math.round(logical);
    if (magnetRef.current) {
      const c = candlesRef.current[l];
      if (c) {
        let best = null;
        let bd = Infinity;
        [c.open, c.high, c.low, c.close].forEach((v) => {
          const yy = series.priceToCoordinate(v);
          if (yy == null) return;
          const dd = Math.abs(yy - y);
          if (dd < bd) {
            bd = dd;
            best = v;
          }
        });
        if (best != null && bd < 28) price = best;
      }
    }
    return { l, p: price, x, y };
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
    drawingsRef.current.forEach((d) => {
      ctx.save();
      paintDrawing(ctx, d, env);
      ctx.restore();
    });
    const draft = draftRef.current;
    if (draft && draft.cur) {
      ctx.save();
      paintDrawing(ctx, { type: draft.type, pts: [...draft.pts, { l: draft.cur.l, p: draft.cur.p }] }, env);
      ctx.restore();
    }
    // Handles on the selected drawing.
    const sel = drawingsRef.current.find((d) => d.id === selectedRef.current);
    if (sel && !draft) {
      const r = window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 7 : 5;
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      handlesOf(sel, env).forEach((hd) => {
        ctx.beginPath();
        ctx.arc(hd.x, hd.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = (sel.style && sel.style.color) || DRAW_COLOR;
        ctx.stroke();
      });
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

  // Select / move / reshape existing drawings. Uses capture-phase native listeners so that grabbing a
  // drawing does not also pan the chart, while touching empty chart still pans and zooms normally.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const xy = (e) => {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      return { x: t.clientX, y: t.clientY };
    };
    const start = (e) => {
      if (toolRef.current || pickRef.current.pickMode) return;
      if (e.touches && e.touches.length > 1) return;
      const list = drawingsRef.current;
      const canvas = canvasRef.current;
      if (!list.length || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const c = xy(e);
      const x = c.x - rect.left;
      const y = c.y - rect.top;
      const { plotW, plotH } = plotSize(rect.width, rect.height);
      if (x < 0 || y < 0 || x > plotW || y > plotH) return;
      const env = makeEnv(plotW, plotH);
      const touch = !!e.touches;
      let hit = null;
      const sel = list.find((d) => d.id === selectedRef.current);
      if (sel) {
        const hs = handlesOf(sel, env);
        for (let i = 0; i < hs.length; i++) {
          if (Math.hypot(hs[i].x - x, hs[i].y - y) <= (touch ? 20 : 11)) {
            hit = { d: sel, mode: hs[i].mode, i: hs[i].i };
            break;
          }
        }
      }
      if (!hit) {
        for (let i = list.length - 1; i >= 0; i--) {
          if (hitDrawing(list[i], x, y, env, touch ? 16 : 9)) {
            hit = { d: list[i], mode: "move" };
            break;
          }
        }
      }
      if (!hit) return;
      const pt = pointAt(x, y);
      if (!pt) return;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      setSelectedId(hit.d.id);
      dragRef.current = { id: hit.d.id, mode: hit.mode, i: hit.i, start: pt, orig: hit.d.pts.map((p) => ({ l: p.l, p: p.p })) };
      lastHitRef.current = Date.now();
    };
    const move = (e) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const c = xy(e);
      const pt = pointAt(c.x - rect.left, c.y - rect.top);
      if (!pt) return;
      if (e.cancelable) e.preventDefault();
      setDrawings((prev) => prev.map((q) => (q.id === drag.id ? { ...q, pts: dragPts(q, drag, pt) } : q)));
    };
    const end = () => {
      if (dragRef.current) {
        dragRef.current = null;
        lastHitRef.current = Date.now();
      }
    };
    el.addEventListener("mousedown", start, true);
    el.addEventListener("touchstart", start, { capture: true, passive: false });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("mousedown", start, true);
      el.removeEventListener("touchstart", start, true);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, [makeEnv, plotSize, pointAt]);

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return pointAt(e.clientX - rect.left, e.clientY - rect.top);
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
    setDrawings((prev) => [...prev, { id, type, pts, text, style: { color: DRAW_COLOR, width: 1.5, dash: false } }]);
    cancelDraft();
    setTool(null);
    setSelectedId(id);
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
        if (hitDrawing(list[i], pt.x, pt.y, env, e.pointerType === "touch" ? 16 : 9)) {
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

  const selected = drawings.find((d) => d.id === selectedId) || null;
  const patchSelected = (patch) =>
    setDrawings((prev) => prev.map((d) => (d.id === selectedId ? { ...d, style: { ...(d.style || {}), ...patch } } : d)));
  const deleteSelected = () => {
    setDrawings((prev) => prev.filter((d) => d.id !== selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDrawings((prev) => [...prev, { ...selected, id, pts: selected.pts.map((p) => ({ l: p.l + 3, p: p.p })) }]);
    setSelectedId(id);
  };

  const S = compact ? 38 : 32;
  const btn = (active) => ({
    width: S,
    height: S,
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
    height: S,
    padding: "0 12px",
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
    setSelectedId(null);
    setSheet(false);
  };
  const hint = tool && HINTS[tool] ? HINTS[tool][Math.min(step, HINTS[tool].length - 1)] : tool === "eraser" ? "Tap a drawing to delete it" : "";
  const bg = colors.bg || "#0e0e12";
  const activeDef = ALL_TOOLS.find((t) => t.id === tool) || (tool === "eraser" ? { Icon: Eraser, label: "Eraser" } : null);
  const ToolsIcon = activeDef ? activeDef.Icon : Pencil;

  const shell = full
    ? { position: "fixed", inset: 0, zIndex: 1000, background: bg, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }
    : undefined;

  return (
    <div style={shell}>
      <div style={{ display: "flex", gap: 6, flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : "visible", scrollbarWidth: "none", alignItems: "center", marginBottom: 8, padding: compact ? "0 12px" : full ? "8px 12px 0" : 0, flexShrink: 0 }} role="toolbar" aria-label="Drawing tools">
        <button type="button" onClick={() => pickTool(null)} aria-label="Cursor" title="Cursor (select and move drawings)" aria-pressed={!tool} style={btn(!tool)}>
          <MousePointer2 size={16} />
        </button>
        {compact ? (
          <button type="button" onClick={() => setSheet(true)} aria-label="Drawing tools" title="Drawing tools" aria-pressed={!!activeDef} style={btn(!!activeDef)}>
            <ToolsIcon size={16} />
          </button>
        ) : (
          ALL_TOOLS.map(({ id, label, Icon }) => (
            <button key={id} type="button" title={label} aria-label={label} aria-pressed={tool === id} onClick={() => pickTool(id)} style={btn(tool === id)}>
              <Icon size={16} />
            </button>
          ))
        )}
        <button type="button" title="Eraser (tap a drawing)" aria-label="Eraser" aria-pressed={tool === "eraser"} onClick={() => pickTool("eraser")} style={btn(tool === "eraser")}>
          <Eraser size={16} />
        </button>
        <button type="button" title="Magnet: snap to open, high, low, close" aria-label="Magnet" aria-pressed={magnet} onClick={() => setMagnet((v) => !v)} style={btn(magnet)}>
          <Magnet size={16} />
        </button>
        <span style={{ width: 1, alignSelf: "stretch", background: colors.border, flexShrink: 0, margin: "2px 2px" }} />
        <button type="button" onClick={() => pickTool("long")} aria-pressed={tool === "long"} title="Long position (entry, stop loss, take profit)" style={pill("long", colors.up)}>Long</button>
        <button type="button" onClick={() => pickTool("short")} aria-pressed={tool === "short"} title="Short position (entry, stop loss, take profit)" style={pill("short", colors.down)}>Short</button>
        <div style={{ flex: 1 }} />
        {plan && onApplyPlan && (
          <button
            type="button"
            title="Copy the stop loss, take profit and side of your latest Long/Short plan into the order form"
            onClick={() => onApplyPlan(plan)}
            style={{ flexShrink: 0, height: S, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.entry}`, background: "transparent", color: colors.entry, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Use plan
          </button>
        )}
        <button type="button" title="Undo last drawing" aria-label="Undo last drawing" disabled={!drawings.length} onClick={() => { setDrawings((prev) => prev.slice(0, -1)); setSelectedId(null); }} style={{ ...btn(false), ...iconOff(drawings.length > 0) }}>
          <Undo2 size={16} />
        </button>
        <button type="button" title="Clear all drawings" aria-label="Clear all drawings" disabled={!drawings.length} onClick={() => { setDrawings([]); setSelectedId(null); }} style={{ ...btn(false), ...iconOff(drawings.length > 0) }}>
          <Trash2 size={16} />
        </button>
        <button type="button" title={full ? "Exit fullscreen" : "Fullscreen chart"} aria-label={full ? "Exit fullscreen" : "Fullscreen chart"} onClick={() => setFull((v) => !v)} style={btn(full)}>
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div
        ref={areaRef}
        style={{
          position: "relative",
          isolation: "isolate",
          width: compact && !full ? "calc(100% - 6px)" : "100%",
          marginLeft: compact && !full ? 6 : 0,
          height: full ? undefined : height,
          flex: full ? "1 1 0" : undefined,
          minHeight: full ? 0 : undefined,
        }}
      >
        <div ref={hostRef} style={{ width: "100%", height: "100%", cursor: pickMode ? "crosshair" : "default" }} aria-label="Price chart" />
        {hint && (
          <div style={{ position: "absolute", left: 8, top: 6, zIndex: 6, pointerEvents: "none", background: "rgba(15,15,20,0.82)", color: DRAW_COLOR, fontFamily: colors.font, fontSize: 12, padding: "4px 8px", borderRadius: 6, maxWidth: "80%" }}>
            {hint}{compact ? "" : ". Esc cancels"}
          </div>
        )}
        {selected && !tool && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 6, zIndex: 7, display: "flex", alignItems: "center", gap: 6, background: "rgba(15,15,20,0.92)", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "5px 8px", maxWidth: "96%", overflowX: "auto", scrollbarWidth: "none" }}>
            {selected.type !== "long" && selected.type !== "short" && selected.type !== "measure" && (
              <>
                {SWATCHES.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchSelected({ color: c })} style={{ width: 20, height: 20, borderRadius: 10, background: c, border: ((selected.style && selected.style.color) || DRAW_COLOR) === c ? "2px solid #fff" : "2px solid transparent", boxShadow: "0 0 0 1px rgba(255,255,255,0.25)", padding: 0, cursor: "pointer", flexShrink: 0 }} />
                ))}
                <span style={{ width: 1, height: 18, background: colors.border, flexShrink: 0 }} />
                {[1, 2, 3].map((w) => (
                  <button key={w} type="button" aria-label={`Line thickness ${w}`} onClick={() => patchSelected({ width: w === 1 ? 1.5 : w + 0.5 })} style={{ width: 26, height: 24, borderRadius: 6, border: `1px solid ${(((selected.style && selected.style.width) || 1.5) === (w === 1 ? 1.5 : w + 0.5)) ? DRAW_COLOR : colors.border}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>
                    <span style={{ width: 14, height: w + 0.5, background: colors.text, borderRadius: 2 }} />
                  </button>
                ))}
                <button type="button" aria-label="Dashed line" aria-pressed={!!(selected.style && selected.style.dash)} onClick={() => patchSelected({ dash: !(selected.style && selected.style.dash) })} style={{ width: 26, height: 24, borderRadius: 6, border: `1px solid ${selected.style && selected.style.dash ? DRAW_COLOR : colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", padding: 0, fontSize: 11, flexShrink: 0 }}>
                  - -
                </button>
                <span style={{ width: 1, height: 18, background: colors.border, flexShrink: 0 }} />
              </>
            )}
            <button type="button" aria-label="Duplicate drawing" title="Duplicate" onClick={duplicateSelected} style={{ ...btn(false), width: 26, height: 24, border: "none" }}>
              <Copy size={14} />
            </button>
            <button type="button" aria-label="Delete drawing" title="Delete" onClick={deleteSelected} style={{ ...btn(false), width: 26, height: 24, border: "none", color: colors.down }}>
              <Trash2 size={14} />
            </button>
            <button type="button" aria-label="Deselect" title="Done" onClick={() => setSelectedId(null)} style={{ ...btn(false), width: 26, height: 24, border: "none" }}>
              <X size={14} />
            </button>
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

      {full && footer ? <div style={{ flexShrink: 0, padding: "10px 12px" }}>{footer}</div> : null}

      {sheet && (
        <>
          <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100 }} />
          <div role="dialog" aria-label="Drawing tools" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1101, background: bg, borderTop: `1px solid ${colors.border}`, borderRadius: "16px 16px 0 0", padding: "12px 14px calc(16px + env(safe-area-inset-bottom, 0px))", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <div style={{ flex: 1, color: colors.text, fontFamily: colors.font, fontSize: 13, fontWeight: 700 }}>Drawing tools</div>
              <button type="button" aria-label="Close" onClick={() => setSheet(false)} style={{ ...btn(false), border: "none" }}>
                <X size={18} />
              </button>
            </div>
            {TOOL_GROUPS.map((g) => (
              <div key={g.title} style={{ marginTop: 10 }}>
                <div style={{ color: colors.text, opacity: 0.6, fontFamily: colors.font, fontSize: 11.5, marginBottom: 6 }}>{g.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {g.tools.map(({ id, label, Icon }) => (
                    <button key={id} type="button" onClick={() => pickTool(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 66, padding: "8px 4px", borderRadius: 10, border: `1px solid ${tool === id ? DRAW_COLOR : colors.border}`, background: tool === id ? DRAW_COLOR : "transparent", color: tool === id ? "#fff" : colors.text, fontFamily: colors.font, fontSize: 10.5, lineHeight: 1.2, cursor: "pointer", textAlign: "center" }}>
                      <Icon size={20} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
