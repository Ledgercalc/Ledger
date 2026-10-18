import { useCallback, useEffect, useRef, useState } from "react";
import { dispose, init, registerOverlay } from "klinecharts";
import {
  ArrowUpRight, Eraser, Magnet, Maximize2, Minimize2, Minus, MousePointer2, MoveRight, MoveUpRight, Pencil,
  PenTool, Ruler, SeparatorVertical, Slash, Square, Trash2, TrendingUp, Type, Undo2, X, Equal, AlignJustify,
} from "lucide-react";

// Drop-in replacement for BacktestChart.jsx, built on KLineChart (open source, Apache 2.0).
// KLineChart already ships the TradingView-style drawing engine (select, drag handles, magnet, many tools),
// so this file only adds: replay data feed, the Long/Short planner, measure, arrow, rectangle, text, trade
// markers, entry/SL/TP lines, a style bar and the mobile tool sheet.
// Props are the same as BacktestChart:
//   candles, sessionKey, lines { entry, sl, tp }, markers, colors { text, grid, border, up, down, entry, font, bg },
//   precision, height, compact, pickMode, onPickPrice, onApplyPlan, footer

const DRAW_COLOR = "#5b9dff";
const SWATCHES = ["#5b9dff", "#f5c542", "#ff6b6b", "#2ecc71", "#c77dff", "#ffffff"];
const PANE = "candle_pane";
const DRAW_GROUP = "bt-draw";
const MARK_GROUP = "bt-markers";
const LEVEL_GROUP = "bt-levels";

const lineOf = (overlay) => {
  const l = (overlay.styles && overlay.styles.line) || {};
  return { color: l.color || DRAW_COLOR, size: l.size || 1.5, dashed: l.style === "dashed" };
};
const hexA = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return `rgba(91,157,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const prec = (chart) => {
  const s = chart.getSymbol();
  return s && Number.isFinite(s.pricePrecision) ? s.pricePrecision : 5;
};
const pct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtDur = (sec) => {
  const s = Math.abs(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(" ") : "0m";
};
const labelStyle = (color) => ({ style: "fill", color, size: 11, backgroundColor: "rgba(15,15,20,0.85)", borderSize: 0, paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2 });

// ---- custom overlays (TradingView tools that KLineChart does not ship) ----
function positionTemplate(name) {
  return {
    name,
    totalStep: 4,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ chart, overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const ed = overlay.extendData || {};
      const up = ed.up || "#26a69a";
      const down = ed.down || "#ef5350";
      const p = prec(chart);
      const pts = overlay.points;
      const entry = pts[0] && pts[0].value;
      const [a, b, c] = coordinates;
      const x0 = a.x;
      const x1 = Math.max(...coordinates.map((q) => q.x), x0 + 40);
      const w = x1 - x0;
      const out = [];
      const box = (y, color) => ({
        type: "rect",
        attrs: { x: x0, y: Math.min(a.y, y), width: w, height: Math.abs(y - a.y) },
        styles: { style: "stroke_fill", color: hexA(color, 0.2), borderColor: color, borderSize: 1 },
      });
      out.push(box(b.y, down));
      out.push({ type: "text", ignoreEvent: true, attrs: { x: x0 + 4, y: b.y > a.y ? b.y - 3 : b.y + 3, text: `SL ${pts[1].value.toFixed(p)}  ${pct(((pts[1].value - entry) / entry) * 100)}`, baseline: b.y > a.y ? "bottom" : "top" }, styles: labelStyle(down) });
      let rr = "";
      if (c && pts[2] && Number.isFinite(pts[2].value)) {
        out.push(box(c.y, up));
        out.push({ type: "text", ignoreEvent: true, attrs: { x: x0 + 4, y: c.y > a.y ? c.y - 3 : c.y + 3, text: `TP ${pts[2].value.toFixed(p)}  ${pct(((pts[2].value - entry) / entry) * 100)}`, baseline: c.y > a.y ? "bottom" : "top" }, styles: labelStyle(up) });
        const risk = Math.abs(entry - pts[1].value);
        if (risk > 0) rr = `  R:R ${(Math.abs(pts[2].value - entry) / risk).toFixed(2)}`;
      }
      out.push({ type: "line", attrs: { coordinates: [{ x: x0, y: a.y }, { x: x1, y: a.y }] }, styles: { color: DRAW_COLOR, size: 1.5, style: "solid" } });
      out.push({ type: "text", ignoreEvent: true, attrs: { x: x0 + 4, y: a.y, text: `${name === "btLong" ? "Long" : "Short"} ${entry.toFixed(p)}${rr}`, baseline: "middle" }, styles: labelStyle(DRAW_COLOR) });
      return out;
    },
  };
}

export const OVERLAY_TEMPLATES = [
  positionTemplate("btLong"),
  positionTemplate("btShort"),
  {
    name: "btRect",
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const [a, b] = coordinates;
      const l = lineOf(overlay);
      return [{
        type: "rect",
        attrs: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) },
        styles: { style: "stroke_fill", color: hexA(l.color, 0.14), borderColor: l.color, borderSize: l.size, borderStyle: l.dashed ? "dashed" : "solid", borderDashedValue: [6, 5] },
      }];
    },
  },
  {
    name: "btArrow",
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const [a, b] = coordinates;
      const l = lineOf(overlay);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const hl = 10 + l.size * 2;
      return [
        { type: "line", attrs: { coordinates: [a, b] }, styles: { color: l.color, size: l.size, style: l.dashed ? "dashed" : "solid", dashedValue: [6, 5] } },
        {
          type: "polygon",
          ignoreEvent: true,
          attrs: { coordinates: [b, { x: b.x - hl * Math.cos(ang - 0.4), y: b.y - hl * Math.sin(ang - 0.4) }, { x: b.x - hl * Math.cos(ang + 0.4), y: b.y - hl * Math.sin(ang + 0.4) }] },
          styles: { style: "fill", color: l.color },
        },
      ];
    },
  },
  {
    name: "btMeasure",
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ chart, overlay, coordinates }) => {
      if (coordinates.length < 2 || overlay.points.length < 2) return [];
      const [a, b] = coordinates;
      const [pa, pb] = overlay.points;
      if (!Number.isFinite(pa.value) || !Number.isFinite(pb.value)) return [];
      const diff = pb.value - pa.value;
      const col = diff >= 0 ? "#26a69a" : "#ef5350";
      const p = prec(chart);
      const bars = Number.isFinite(pa.dataIndex) && Number.isFinite(pb.dataIndex) ? `  ${Math.abs(pb.dataIndex - pa.dataIndex)} bars` : "";
      const span = pa.timestamp && pb.timestamp ? `  ${fmtDur((pb.timestamp - pa.timestamp) / 1000)}` : "";
      return [
        { type: "rect", attrs: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }, styles: { style: "stroke_fill", color: hexA(col, 0.14), borderColor: col, borderSize: 1, borderStyle: "dashed", borderDashedValue: [5, 4] } },
        { type: "line", attrs: { coordinates: [a, b] }, styles: { color: col, size: 1.5, style: "solid" } },
        { type: "text", ignoreEvent: true, attrs: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) - 4, text: `${diff > 0 ? "+" : ""}${diff.toFixed(p)} (${pct((diff / pa.value) * 100)})${bars}${span}`, baseline: "bottom" }, styles: labelStyle(col) },
      ];
    },
  },
  {
    name: "btText",
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (!coordinates.length) return [];
      const l = lineOf(overlay);
      const col = l.color === DRAW_COLOR ? "#ffffff" : l.color;
      return [{ type: "text", attrs: { x: coordinates[0].x, y: coordinates[0].y, text: String(overlay.extendData || ""), baseline: "bottom" }, styles: labelStyle(col) }];
    },
  },
  // Entry / SL / TP guide lines (one point, only its price matters).
  {
    name: "btLevel",
    totalStep: 2,
    lock: true,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates, bounding }) => {
      if (!coordinates.length) return [];
      const ed = overlay.extendData || {};
      const y = coordinates[0].y;
      const p = overlay.points[0] && overlay.points[0].value;
      return [
        { type: "line", ignoreEvent: true, attrs: { coordinates: [{ x: 0, y }, { x: bounding.width, y }] }, styles: { color: ed.color, size: 1, style: ed.dashed ? "dashed" : "solid", dashedValue: [6, 4] } },
        { type: "text", ignoreEvent: true, attrs: { x: bounding.width - 4, y, text: `${ed.title} ${Number.isFinite(p) ? p.toFixed(ed.precision ?? 5) : ""}`, align: "right", baseline: "bottom" }, styles: labelStyle(ed.color) },
      ];
    },
  },
  // Trade markers (arrow in/out + result text) anchored to a candle's high or low.
  {
    name: "btMarker",
    totalStep: 2,
    lock: true,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates }) => {
      if (!coordinates.length) return [];
      const ed = overlay.extendData || {};
      const above = ed.position === "aboveBar";
      const glyph = ed.shape === "arrowUp" ? "\u25B2" : ed.shape === "arrowDown" ? "\u25BC" : "\u25CF";
      return [{
        type: "text",
        ignoreEvent: true,
        attrs: { x: coordinates[0].x, y: coordinates[0].y + (above ? -6 : 6), text: ed.text ? `${glyph} ${ed.text}` : glyph, align: "center", baseline: above ? "bottom" : "top" },
        styles: { style: "fill", color: ed.color, size: 11, backgroundColor: "transparent", borderSize: 0 },
      }];
    },
  },
];

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registered = true;
  OVERLAY_TEMPLATES.forEach((t) => registerOverlay(t));
}

// Tool id -> overlay name. Built-in KLineChart overlays are the TradingView-style ones.
const TOOL_OVERLAY = {
  trend: "segment",
  ray: "rayLine",
  xline: "straightLine",
  arrow: "btArrow",
  hline: "horizontalStraightLine",
  hray: "horizontalRayLine",
  vline: "verticalStraightLine",
  channel: "parallelStraightLine",
  brush: "brush",
  fib: "fibonacciLine",
  measure: "btMeasure",
  rect: "btRect",
  text: "btText",
  long: "btLong",
  short: "btShort",
};
const HINTS = {
  hline: "Tap where the line should go",
  hray: "Tap where the ray should start",
  vline: "Tap where the line should go",
  text: "Tap where the label should go",
  trend: "Tap the start, then the end",
  ray: "Tap the start, then a second point",
  xline: "Tap two points",
  arrow: "Tap the tail, then the arrow head",
  channel: "Tap start, end, then the channel width",
  brush: "Press and drag to draw",
  rect: "Tap one corner, then the opposite corner",
  fib: "Tap the swing start, then the swing end",
  measure: "Tap the start, then the end",
  long: "Tap entry, then stop loss, then take profit",
  short: "Tap entry, then stop loss, then take profit",
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
    { id: "brush", label: "Brush", Icon: PenTool },
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
const NO_STYLE_BAR = ["btLong", "btShort", "btMeasure", "fibonacciLine"];

const toK = (c) => ({ timestamp: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close });

function periodFor(candles) {
  const n = candles.length;
  let sec = 3600;
  if (n > 2) {
    const diffs = [];
    for (let i = 1; i < Math.min(n, 12); i++) diffs.push(candles[i].time - candles[i - 1].time);
    diffs.sort((a, b) => a - b);
    sec = diffs[Math.floor(diffs.length / 2)] || 3600;
  }
  if (sec >= 86400) return { type: "day", span: Math.round(sec / 86400) };
  if (sec >= 3600) return { type: "hour", span: Math.round(sec / 3600) };
  return { type: "minute", span: Math.max(1, Math.round(sec / 60)) };
}

function buildStyles(colors, compact) {
  const up = colors.up;
  const down = colors.down;
  const axisText = { color: colors.text, family: colors.font, size: 11 };
  return {
    grid: { horizontal: { color: colors.grid }, vertical: { color: colors.grid } },
    candle: {
      bar: {
        compareRule: "current_open",
        upColor: up, downColor: down, noChangeColor: up,
        upBorderColor: up, downBorderColor: down, noChangeBorderColor: up,
        upWickColor: up, downWickColor: down, noChangeWickColor: up,
      },
      priceMark: {
        high: { show: false },
        low: { show: false },
        last: { compareRule: "current_open", upColor: up, downColor: down, noChangeColor: up },
      },
      tooltip: {
        showRule: compact ? "none" : "follow_cross",
        title: { color: colors.text },
        legend: { color: colors.text },
      },
    },
    xAxis: { axisLine: { color: colors.border }, tickLine: { color: colors.border }, tickText: axisText },
    yAxis: { axisLine: { color: colors.border }, tickLine: { color: colors.border }, tickText: axisText },
    separator: { color: colors.border },
    crosshair: { horizontal: { line: { color: colors.text } }, vertical: { line: { color: colors.text } } },
    overlay: {
      point: { color: "#ffffff", borderColor: DRAW_COLOR, borderSize: 2, radius: compact ? 6 : 4, activeColor: "#ffffff", activeBorderColor: DRAW_COLOR, activeBorderSize: 3, activeRadius: compact ? 8 : 6 },
      line: { color: DRAW_COLOR, size: 1.5 },
      text: { color: "#ffffff", family: colors.font, size: 11 },
    },
  };
}

export default function KLineBacktestChart({ candles, sessionKey, lines, markers, colors, precision, height, compact, pickMode, onPickPrice, onApplyPlan, footer }) {
  const hostRef = useRef(null);
  const areaRef = useRef(null);
  const chartRef = useRef(null);
  const dataRef = useRef([]);
  const subRef = useRef(null);
  const prevRef = useRef({ len: 0, first: null, key: null });
  const seqRef = useRef(0);
  const idsRef = useRef([]);
  const drawingRef = useRef(null);
  const colorsRef = useRef(colors);
  const candlesRef = useRef(candles);
  const pickRef = useRef({ pickMode, onPickPrice });
  const magnetRef = useRef(false);
  const toolRef = useRef(null);
  const stylesRef = useRef({});
  colorsRef.current = colors;
  candlesRef.current = candles;
  pickRef.current = { pickMode, onPickPrice };

  const [tool, setTool] = useState(null);
  const [selected, setSelected] = useState(null); // { id, name }
  const [, bump] = useState(0);
  const [plan, setPlan] = useState(null);
  const [magnet, setMagnet] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [full, setFull] = useState(false);
  const [count, setCount] = useState(0);
  magnetRef.current = magnet;
  toolRef.current = tool;

  const refreshPlan = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const all = [...chart.getOverlays({ name: "btLong" }), ...chart.getOverlays({ name: "btShort" })].filter(
      (o) => o.points.length === 3 && o.points.every((p) => Number.isFinite(p.value))
    );
    const rank = (o) => idsRef.current.indexOf(o.id);
    all.sort((a, b) => rank(a) - rank(b));
    const o = all[all.length - 1];
    setPlan(o ? { side: o.name === "btLong" ? "buy" : "sell", sl: o.points[1].value, tp: o.points[2].value } : null);
    setCount(chart.getOverlays({ groupId: DRAW_GROUP }).length);
  }, []);

  // Create once.
  useEffect(() => {
    ensureRegistered();
    const chart = init(hostRef.current, { styles: "dark", timezone: "UTC" });
    if (!chart) return undefined;
    chart.setStyles(buildStyles(colorsRef.current, compact));
    chart.setDataLoader({
      getBars: ({ callback }) => callback(dataRef.current, false),
      subscribeBar: ({ callback }) => {
        subRef.current = callback;
      },
      unsubscribeBar: () => {
        subRef.current = null;
      },
    });
    chart.setPeriod({ type: "minute", span: 15 });
    chart.setOffsetRightDistance(48);
    chartRef.current = chart;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => chart.resize()) : null;
    if (ro) ro.observe(hostRef.current);
    const host = hostRef.current;
    return () => {
      if (ro) ro.disconnect();
      dispose(host);
      chartRef.current = null;
      prevRef.current = { len: 0, first: null, key: null };
      subRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme / precision changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) chart.setStyles(buildStyles(colors, compact));
  }, [colors.text, colors.grid, colors.border, colors.up, colors.down, colors.font, compact]);

  // Data: push new candles through the live feed while stepping, otherwise reload.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const prev = prevRef.current;
    const n = candles.length;
    const first = n ? candles[0].time : null;
    dataRef.current = candles.map(toK);
    const sameRun = prev.key === sessionKey && prev.first === first && n >= prev.len && prev.len > 0;
    if (sameRun && subRef.current) {
      for (let i = prev.len - 1; i < n; i++) subRef.current(dataRef.current[i]);
    } else if (n) {
      seqRef.current += 1;
      chart.setPeriod(periodFor(candles));
      chart.setSymbol({ ticker: `bt-${seqRef.current}`, pricePrecision: precision, volumePrecision: 0 });
    }
    prevRef.current = { len: n, first, key: sessionKey };
  }, [candles, sessionKey]);

  // Entry / SL / TP guide lines.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: LEVEL_GROUP });
    const ts = candles.length ? candles[candles.length - 1].time * 1000 : Date.now();
    const add = (price, color, title, dashed) => {
      if (!Number.isFinite(price)) return;
      chart.createOverlay({ name: "btLevel", groupId: LEVEL_GROUP, lock: true, zLevel: -1, points: [{ timestamp: ts, value: price }], extendData: { title, color, dashed, precision } });
    };
    add(lines.entry, colors.entry, "Entry", false);
    add(lines.sl, colors.down, "SL", true);
    add(lines.tp, colors.up, "TP", true);
  }, [lines.entry, lines.sl, lines.tp, colors.entry, colors.up, colors.down, precision, sessionKey, candles.length]);

  // Trade markers.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: MARK_GROUP });
    if (!markers.length) return;
    const byTime = new Map();
    candles.forEach((c) => byTime.set(c.time, c));
    const list = [];
    markers.forEach((m) => {
      const c = byTime.get(m.time);
      if (!c) return;
      list.push({
        name: "btMarker",
        groupId: MARK_GROUP,
        lock: true,
        points: [{ timestamp: m.time * 1000, value: m.position === "aboveBar" ? c.high : c.low }],
        extendData: { position: m.position, color: m.color, shape: m.shape, text: m.text },
      });
    });
    if (list.length) chart.createOverlay(list);
  }, [markers, candles]);

  // Pick-price mode: the next tap reports a price (used for SL / TP inputs).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const onClick = (e) => {
      const { pickMode: mode, onPickPrice: cb } = pickRef.current;
      const chart = chartRef.current;
      if (!mode || !cb || !chart) return;
      const rect = hostRef.current.getBoundingClientRect();
      const res = chart.convertFromPixel([{ x: e.clientX - rect.left, y: e.clientY - rect.top }], { paneId: PANE });
      const pt = Array.isArray(res) ? res[0] : res;
      if (pt && Number.isFinite(pt.value)) {
        e.stopPropagation();
        cb(pt.value);
      }
    };
    el.addEventListener("click", onClick, true);
    return () => el.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (pickMode) cancelTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickMode]);

  // New dataset: drop drawings.
  const firstTime = candles.length ? candles[0].time : null;
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) chart.removeOverlay({ groupId: DRAW_GROUP });
    idsRef.current = [];
    drawingRef.current = null;
    setSelected(null);
    setTool(null);
    setPlan(null);
    setCount(0);
  }, [firstTime]);

  // Fullscreen: lock page scroll.
  useEffect(() => {
    if (!full) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  const cancelTool = () => {
    const chart = chartRef.current;
    if (chart && drawingRef.current) chart.removeOverlay({ id: drawingRef.current });
    drawingRef.current = null;
    setTool(null);
  };

  const deleteSelected = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || !selected) return;
    chart.removeOverlay({ id: selected.id });
    setSelected(null);
    refreshPlan();
  }, [selected, refreshPlan]);

  useEffect(() => {
    const onKey = (e) => {
      const tg = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tg)) return;
      if (e.key === "Escape") {
        cancelTool();
        setSelected(null);
        setSheet(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, deleteSelected]);

  const startTool = (id) => {
    const chart = chartRef.current;
    if (!chart) return;
    if (drawingRef.current) chart.removeOverlay({ id: drawingRef.current });
    drawingRef.current = null;
    setSelected(null);
    setSheet(false);
    if (id === null) {
      setTool(null);
      return;
    }
    if (id === "eraser") {
      setTool("eraser");
      return;
    }
    let extendData;
    if (id === "text") {
      const t = window.prompt("Label text");
      if (!t || !t.trim()) {
        setTool(null);
        return;
      }
      extendData = t.trim().slice(0, 60);
    }
    if (id === "long" || id === "short") extendData = { up: colorsRef.current.up, down: colorsRef.current.down };
    const done = () => {
      drawingRef.current = null;
      setTool(null);
      refreshPlan();
    };
    const oid = chart.createOverlay({
      name: TOOL_OVERLAY[id],
      groupId: DRAW_GROUP,
      mode: magnetRef.current ? "strong_magnet" : "normal",
      extendData,
      onDrawEnd: done,
      onPressedMoveEnd: () => refreshPlan(),
      onRemoved: () => refreshPlan(),
      onSelected: ({ overlay }) => setSelected({ id: overlay.id, name: overlay.name }),
      onDeselected: () => setSelected(null),
      onClick: ({ overlay }) => {
        if (toolRef.current === "eraser") chartRef.current.removeOverlay({ id: overlay.id });
      },
    });
    if (typeof oid === "string") {
      drawingRef.current = oid;
      idsRef.current.push(oid);
      setTool(id);
    }
  };

  // Eraser: any drawing clicked while the eraser is on gets removed (handled in onClick above for new drawings);
  // drawings created before the eraser was picked are covered here.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || tool !== "eraser") return;
    chart.getOverlays({ groupId: DRAW_GROUP }).forEach((o) => {
      chart.overrideOverlay({ id: o.id, onClick: ({ overlay }) => { chart.removeOverlay({ id: overlay.id }); } });
    });
    return () => {
      chart.getOverlays({ groupId: DRAW_GROUP }).forEach((o) => {
        chart.overrideOverlay({ id: o.id, onClick: () => {} });
      });
    };
  }, [tool]);

  const undo = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const alive = new Set(chart.getOverlays({ groupId: DRAW_GROUP }).map((o) => o.id));
    for (let i = idsRef.current.length - 1; i >= 0; i--) {
      const id = idsRef.current[i];
      if (alive.has(id)) {
        chart.removeOverlay({ id });
        break;
      }
    }
    idsRef.current = idsRef.current.filter((id) => alive.has(id));
    setSelected(null);
    refreshPlan();
  };

  const clearAll = () => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: DRAW_GROUP });
    idsRef.current = [];
    setSelected(null);
    refreshPlan();
  };

  const patchSelected = (patch) => {
    const chart = chartRef.current;
    if (!chart || !selected) return;
    const cur = { color: DRAW_COLOR, width: 1.5, dash: false, ...(stylesRef.current[selected.id] || {}), ...patch };
    stylesRef.current[selected.id] = cur;
    chart.overrideOverlay({
      id: selected.id,
      styles: {
        line: { color: cur.color, size: cur.width, style: cur.dash ? "dashed" : "solid", dashedValue: [6, 5] },
        point: { borderColor: cur.color, activeBorderColor: cur.color },
        text: { color: cur.color },
      },
    });
    bump((v) => v + 1);
  };
  const curStyle = selected ? { color: DRAW_COLOR, width: 1.5, dash: false, ...(stylesRef.current[selected.id] || {}) } : null;

  const S = compact ? 38 : 32;
  const bg = colors.bg || "#0e0e12";
  const btn = (active) => ({
    width: S, height: S, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
    border: `1px solid ${active ? DRAW_COLOR : colors.border}`, background: active ? DRAW_COLOR : "transparent",
    color: active ? "#fff" : colors.text, cursor: "pointer", padding: 0, flexShrink: 0,
  });
  const pill = (id, color) => ({
    height: S, padding: "0 12px", borderRadius: 8, border: `1px solid ${color}`, background: tool === id ? color : "transparent",
    color: tool === id ? "#fff" : color, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  });
  const iconOff = (on) => ({ opacity: on ? 1 : 0.4, cursor: on ? "pointer" : "not-allowed" });
  const activeDef = ALL_TOOLS.find((t) => t.id === tool) || (tool === "eraser" ? { Icon: Eraser } : null);
  const ToolsIcon = activeDef ? activeDef.Icon : Pencil;
  const hint = tool === "eraser" ? "Tap a drawing to delete it" : tool ? HINTS[tool] : "";
  const showStyleBar = selected && !tool && !NO_STYLE_BAR.includes(selected.name);
  const shell = full
    ? { position: "fixed", inset: 0, zIndex: 1000, background: bg, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }
    : undefined;

  return (
    <div style={shell}>
      <div style={{ display: "flex", gap: 6, flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : "visible", scrollbarWidth: "none", alignItems: "center", marginBottom: 8, padding: compact ? "0 12px" : full ? "8px 12px 0" : 0, flexShrink: 0 }} role="toolbar" aria-label="Drawing tools">
        <button type="button" onClick={() => startTool(null)} aria-label="Cursor" title="Cursor (select and move drawings)" aria-pressed={!tool} style={btn(!tool)}>
          <MousePointer2 size={16} />
        </button>
        {compact ? (
          <button type="button" onClick={() => setSheet(true)} aria-label="Drawing tools" title="Drawing tools" aria-pressed={!!activeDef} style={btn(!!activeDef)}>
            <ToolsIcon size={16} />
          </button>
        ) : (
          ALL_TOOLS.map(({ id, label, Icon }) => (
            <button key={id} type="button" title={label} aria-label={label} aria-pressed={tool === id} onClick={() => startTool(id)} style={btn(tool === id)}>
              <Icon size={16} />
            </button>
          ))
        )}
        <button type="button" title="Eraser (tap a drawing)" aria-label="Eraser" aria-pressed={tool === "eraser"} onClick={() => startTool("eraser")} style={btn(tool === "eraser")}>
          <Eraser size={16} />
        </button>
        <button type="button" title="Magnet: snap to open, high, low, close" aria-label="Magnet" aria-pressed={magnet} onClick={() => setMagnet((v) => !v)} style={btn(magnet)}>
          <Magnet size={16} />
        </button>
        <span style={{ width: 1, alignSelf: "stretch", background: colors.border, flexShrink: 0, margin: "2px 2px" }} />
        <button type="button" onClick={() => startTool("long")} aria-pressed={tool === "long"} title="Long position (entry, stop loss, take profit)" style={pill("long", colors.up)}>Long</button>
        <button type="button" onClick={() => startTool("short")} aria-pressed={tool === "short"} title="Short position (entry, stop loss, take profit)" style={pill("short", colors.down)}>Short</button>
        <div style={{ flex: 1 }} />
        {plan && onApplyPlan && (
          <button type="button" title="Copy the stop loss, take profit and side of your latest Long/Short plan into the order form" onClick={() => onApplyPlan(plan)} style={{ flexShrink: 0, height: S, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.entry}`, background: "transparent", color: colors.entry, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Use plan
          </button>
        )}
        <button type="button" title="Undo last drawing" aria-label="Undo last drawing" disabled={!count} onClick={undo} style={{ ...btn(false), ...iconOff(count > 0) }}>
          <Undo2 size={16} />
        </button>
        <button type="button" title="Clear all drawings" aria-label="Clear all drawings" disabled={!count} onClick={clearAll} style={{ ...btn(false), ...iconOff(count > 0) }}>
          <Trash2 size={16} />
        </button>
        <button type="button" title={full ? "Exit fullscreen" : "Fullscreen chart"} aria-label={full ? "Exit fullscreen" : "Fullscreen chart"} onClick={() => setFull((v) => !v)} style={btn(full)}>
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div
        ref={areaRef}
        style={{
          position: "relative", isolation: "isolate",
          width: compact && !full ? "calc(100% - 6px)" : "100%", marginLeft: compact && !full ? 6 : 0,
          height: full ? undefined : height, flex: full ? "1 1 0" : undefined, minHeight: full ? 0 : undefined,
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
            {showStyleBar && (
              <>
                {SWATCHES.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchSelected({ color: c })} style={{ width: 20, height: 20, borderRadius: 10, background: c, border: curStyle.color === c ? "2px solid #fff" : "2px solid transparent", boxShadow: "0 0 0 1px rgba(255,255,255,0.25)", padding: 0, cursor: "pointer", flexShrink: 0 }} />
                ))}
                <span style={{ width: 1, height: 18, background: colors.border, flexShrink: 0 }} />
                {[1.5, 2.5, 3.5].map((w, i) => (
                  <button key={w} type="button" aria-label={`Line thickness ${i + 1}`} onClick={() => patchSelected({ width: w })} style={{ width: 26, height: 24, borderRadius: 6, border: `1px solid ${curStyle.width === w ? DRAW_COLOR : colors.border}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>
                    <span style={{ width: 14, height: w, background: colors.text, borderRadius: 2 }} />
                  </button>
                ))}
                <button type="button" aria-label="Dashed line" aria-pressed={curStyle.dash} onClick={() => patchSelected({ dash: !curStyle.dash })} style={{ width: 26, height: 24, borderRadius: 6, border: `1px solid ${curStyle.dash ? DRAW_COLOR : colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", padding: 0, fontSize: 11, flexShrink: 0 }}>
                  - -
                </button>
                <span style={{ width: 1, height: 18, background: colors.border, flexShrink: 0 }} />
              </>
            )}
            <button type="button" aria-label="Delete drawing" title="Delete" onClick={deleteSelected} style={{ ...btn(false), width: 26, height: 24, border: "none", color: colors.down }}>
              <Trash2 size={14} />
            </button>
            <button type="button" aria-label="Deselect" title="Done" onClick={() => setSelected(null)} style={{ ...btn(false), width: 26, height: 24, border: "none" }}>
              <X size={14} />
            </button>
          </div>
        )}
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
                    <button key={id} type="button" onClick={() => startTool(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 66, padding: "8px 4px", borderRadius: 10, border: `1px solid ${tool === id ? DRAW_COLOR : colors.border}`, background: tool === id ? DRAW_COLOR : "transparent", color: tool === id ? "#fff" : colors.text, fontFamily: colors.font, fontSize: 10.5, lineHeight: 1.2, cursor: "pointer", textAlign: "center" }}>
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
