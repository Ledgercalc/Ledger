import { Component, useEffect, useRef, useState } from "react";
import { ChartEngine, OF_DEFAULTS, VP_DEFAULTS, VP_SESSIONS } from "../lib/chartEngine.js";
import { DrawIcon, iconFor } from "./DrawIcons.jsx";
import { Activity, BarChart3, Copy, Eraser, Eye, EyeOff, Magnet, Maximize2, Minimize2, MousePointer2, Pencil, Settings2, Trash2, Undo2, X } from "lucide-react";

// Tredzi's own chart: our own canvas engine (lib/chartEngine.js) plus our own drawing tools.
// No chart library. Same props as the earlier chart components:
//   candles, sessionKey, lines { entry, sl, tp }, markers, colors { text, grid, border, up, down, entry, font, bg },
//   precision, height, compact, pickMode, onPickPrice, onApplyPlan, footer, drawKey, hideTradeTools, flow
// flow = order flow data from Dukascopy ticks (optional, see lib/flowStore.js buildFlow): footprint, delta and cumulative delta.
// Drawings are stored as { bar index, price } points while you work, and saved by TIME (per symbol) so they
// survive timeframe changes and reloads; they sync to your other devices through the app's cloud sync.

const DRAW_COLOR = "#2962ff";
const OF_MODES = [["off", "Order flow: off"], ["footprint", "Footprint (bid x ask)"], ["delta", "Delta + cumulative delta"], ["both", "Footprint + delta strip"]];
const SWATCHES = ["#2962ff", "#f5c542", "#ef5350", "#26a69a", "#ab47bc", "#ffffff"];
const DEFAULT_UI = { color: DRAW_COLOR, opacity: 1, width: 2, dash: "solid" };
const BT = {
  trend: "segment", ray: "rayLine", xline: "straightLine", arrow: "btArrow", hline: "horizontalStraightLine", hray: "horizontalRayLine",
  vline: "verticalStraightLine", channel: "parallelStraightLine", fib: "btFib", measure: "btMeasure", rect: "btRect", text: "btText",
  long: "btLong", short: "btShort", cross: "btCross", infoline: "btInfo", ellipse: "btEllipse", triangle: "btTriangle",
  pitchfork: "btPitchfork", fibext: "btFibExt", prange: "btPriceRange", drange: "btDateRange", brush: "btBrush",
};
const NAME_LABEL = {
  segment: "Trend line", rayLine: "Ray", straightLine: "Extended line", btArrow: "Arrow", horizontalStraightLine: "Horizontal line",
  horizontalRayLine: "Horizontal ray", verticalStraightLine: "Vertical line", parallelStraightLine: "Parallel channel",
  btFib: "Fib retracement", btMeasure: "Measure", btRect: "Rectangle", btText: "Text", btLong: "Long position", btShort: "Short position",
  btCross: "Cross line", btInfo: "Info line", btEllipse: "Ellipse", btTriangle: "Triangle", btPitchfork: "Pitchfork",
  btFibExt: "Fib extension", btPriceRange: "Price range", btDateRange: "Date range", btBrush: "Brush",
};
const NO_STYLE_BAR = ["btLong", "btShort", "btMeasure", "btFib", "btFibExt", "btPriceRange", "btDateRange"];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ["#787b86", "#f23645", "#ff9800", "#4caf50", "#089981", "#00bcd4", "#787b86"];

const uid = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const hexA = (hex, a) => {
  let h = String(hex || "").trim();
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(h);
  if (m3) h = `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) {
    const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(h);
    return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${a})` : `rgba(41,98,255,${a})`;
  }
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const pct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
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

// All drawings live in ONE storage entry (symbol -> list), so the app's cloud sync (Pro) can carry them to
// your other devices just by listing DRAW_DOC_KEY as a synced key. Falls back to localStorage if the app's
// window.storage isn't there. Writes are queued so two charts saving at once can't overwrite each other.
export const DRAW_DOC_KEY = "tredzi-bt-drawings";
let docQueue = Promise.resolve();
async function readDoc() {
  try {
    let raw = null;
    if (window.storage && window.storage.get) {
      const r = await window.storage.get(DRAW_DOC_KEY, false);
      raw = r && r.value;
    } else {
      raw = window.localStorage.getItem(DRAW_DOC_KEY);
    }
    const v = raw ? JSON.parse(raw) : null;
    if (v && v.sets && typeof v.sets === "object") return v;
  } catch (err) {
    // nothing saved yet
  }
  return { v: 1, sets: {} };
}
async function writeDoc(doc) {
  try {
    const raw = JSON.stringify(doc);
    if (window.storage && window.storage.set) await window.storage.set(DRAW_DOC_KEY, raw, false);
    else window.localStorage.setItem(DRAW_DOC_KEY, raw);
  } catch (err) {
    // storage full or blocked: drawings just won't persist
  }
}
async function readSaved(k) {
  const doc = await readDoc();
  const list = doc.sets[k];
  return Array.isArray(list) ? list : [];
}
function writeSaved(k, list) {
  docQueue = docQueue
    .then(async () => {
      const doc = await readDoc();
      if (list.length) doc.sets[k] = list;
      else delete doc.sets[k];
      await writeDoc(doc);
    })
    .catch(() => {});
  return docQueue;
}


// How many taps each tool needs.
const NEED = { hline: 1, hray: 1, vline: 1, cross: 1, text: 1, trend: 2, infoline: 2, ray: 2, xline: 2, arrow: 2, rect: 2, ellipse: 2, fib: 2, measure: 2, prange: 2, drange: 2, channel: 3, triangle: 3, pitchfork: 3, fibext: 3, long: 3, short: 3, brush: 100000 };
const HINTS = {
  hline: ["Tap where the line should go"],
  hray: ["Tap where the ray should start"],
  vline: ["Tap where the line should go"],
  cross: ["Tap where the lines should cross"],
  text: ["Tap where the label should go"],
  trend: ["Tap the start point", "Tap the end point"],
  infoline: ["Tap the start point", "Tap the end point"],
  ray: ["Tap the start point", "Tap a second point to set the direction"],
  xline: ["Tap the first point", "Tap a second point"],
  arrow: ["Tap the tail", "Tap the arrow head"],
  channel: ["Tap the start point", "Tap the end of the first line", "Tap to set the channel width"],
  pitchfork: ["Tap point A (the handle)", "Tap point B", "Tap point C"],
  rect: ["Tap the first corner", "Tap the opposite corner"],
  ellipse: ["Tap one corner", "Tap the opposite corner"],
  triangle: ["Tap the first corner", "Tap the second corner", "Tap the third corner"],
  brush: ["Press and drag to draw freely"],
  fib: ["Tap the swing start", "Tap the swing end"],
  fibext: ["Tap the swing start", "Tap the swing end", "Tap the retracement point"],
  measure: ["Tap the start point", "Tap the end point"],
  prange: ["Tap the first price", "Tap the second price"],
  drange: ["Tap the start time", "Tap the end time"],
  long: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
  short: ["Tap your entry price", "Tap your stop loss", "Tap your take profit"],
};
const IC = Object.fromEntries(["trend", "infoline", "ray", "xline", "arrow", "hline", "hray", "vline", "cross", "channel", "pitchfork", "fib", "fibext", "measure", "prange", "drange", "rect", "ellipse", "triangle", "brush", "text", "long", "short"].map((id) => [id, iconFor(id)]));
// Same categories as TradingView's left toolbar: one button per group, the group's tools open in a menu.
const TOOL_GROUPS = [
  { id: "lines", title: "Trend line tools", tools: [
    { id: "trend", label: "Trend line", Icon: IC.trend },
    { id: "ray", label: "Ray", Icon: IC.ray },
    { id: "infoline", label: "Info line", Icon: IC.infoline },
    { id: "xline", label: "Extended line", Icon: IC.xline },
    { id: "arrow", label: "Arrow", Icon: IC.arrow },
    { id: "hline", label: "Horizontal line", Icon: IC.hline },
    { id: "hray", label: "Horizontal ray", Icon: IC.hray },
    { id: "vline", label: "Vertical line", Icon: IC.vline },
    { id: "cross", label: "Cross line", Icon: IC.cross },
  ] },
  { id: "pitch", title: "Channels and pitchforks", tools: [
    { id: "channel", label: "Parallel channel", Icon: IC.channel },
    { id: "pitchfork", label: "Pitchfork", Icon: IC.pitchfork },
  ] },
  { id: "fib", title: "Fibonacci", tools: [
    { id: "fib", label: "Fib retracement", Icon: IC.fib },
    { id: "fibext", label: "Fib extension", Icon: IC.fibext },
  ] },
  { id: "forecast", title: "Forecasting and measurement", tools: [
    { id: "long", label: "Long position", Icon: IC.long },
    { id: "short", label: "Short position", Icon: IC.short },
    { id: "prange", label: "Price range", Icon: IC.prange },
    { id: "drange", label: "Date range", Icon: IC.drange },
    { id: "measure", label: "Measure", Icon: IC.measure },
  ] },
  { id: "shapes", title: "Shapes", tools: [
    { id: "brush", label: "Brush", Icon: IC.brush },
    { id: "rect", label: "Rectangle", Icon: IC.rect },
    { id: "ellipse", label: "Ellipse", Icon: IC.ellipse },
    { id: "triangle", label: "Triangle", Icon: IC.triangle },
  ] },
  { id: "notes", title: "Annotation", tools: [{ id: "text", label: "Text label", Icon: IC.text }] },
];
const HOTKEYS = { trend: "Alt + T", hline: "Alt + H", vline: "Alt + V", cross: "Alt + C", fib: "Alt + F" };
const HOTKEY_TOOL = { KeyT: "trend", KeyH: "hline", KeyV: "vline", KeyC: "cross", KeyF: "fib" };
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


function hitDrawingBase(d, x, y, env, near = 9) {
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
    const xEnd = ts.logicalToCoordinate(Math.max(last.l, a.l + 24));
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
function handlesBase(d, env) {
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
    const xEnd = ts.logicalToCoordinate(Math.max(last.l, a.l + 24));
    if (ya == null || xEnd == null) return out;
    const xm = xEnd;
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


// ---- extra tools: cross line, info line, ellipse, triangle, pitchfork, fib extension, ranges, brush ----
const FIBEXT_LEVELS = [0, 0.382, 0.618, 1, 1.272, 1.618, 2.618];
const FIBEXT_COLORS = ["#787b86", "#ff9800", "#4caf50", "#2962ff", "#00bcd4", "#089981", "#ab47bc"];

function rayFrom(x0, y0, vx, vy, plotW) {
  if (Math.abs(vx) < 1e-6) return { x: x0, y: vy >= 0 ? y0 + 6000 : y0 - 6000 };
  const tx = vx > 0 ? plotW + 80 : -80;
  return { x: tx, y: y0 + vy * ((tx - x0) / vx) };
}

function arrowHead(ctx, x, y, ang, len) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - len * Math.cos(ang - 0.45), y - len * Math.sin(ang - 0.45));
  ctx.lineTo(x - len * Math.cos(ang + 0.45), y - len * Math.sin(ang + 0.45));
  ctx.closePath();
  ctx.fill();
}

function paintExtra(ctx, d, env, st, line, chip) {
  const { eng, plotW, plotH, prec, pal } = env;
  const X = (pt) => eng.xOf(pt.l);
  const Y = (pt) => eng.yOf(pt.p);
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  const fillA = d.fill == null ? 0.14 : d.fill;
  switch (d.type) {
    case "cross":
      line(0, ya, plotW, ya);
      line(xa, 0, xa, plotH);
      return true;
    case "brush":
      ctx.beginPath();
      d.pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(X(pt), Y(pt));
        else ctx.lineTo(X(pt), Y(pt));
      });
      ctx.stroke();
      return true;
    case "infoline": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      line(xa, ya, xb, yb);
      const diff = b.p - a.p;
      const ang = Math.round((Math.atan2(ya - yb, xb - xa) * 180) / Math.PI);
      chip(`${diff > 0 ? "+" : ""}${diff.toFixed(prec)} (${pct((diff / a.p) * 100)})  ${Math.abs(b.l - a.l)} bars  ${ang}\u00B0`, (xa + xb) / 2, (ya + yb) / 2 - 14, st.solid, "center");
      return true;
    }
    case "ellipse": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      ctx.beginPath();
      ctx.ellipse((xa + xb) / 2, (ya + yb) / 2, Math.max(1, Math.abs(xb - xa) / 2), Math.max(1, Math.abs(yb - ya) / 2), 0, 0, Math.PI * 2);
      ctx.fillStyle = hexA(st.solid, fillA);
      ctx.fill();
      ctx.stroke();
      return true;
    }
    case "triangle": {
      if (!b) return true;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.lineTo(X(b), Y(b));
      if (c) ctx.lineTo(X(c), Y(c));
      if (c) ctx.closePath();
      if (c) {
        ctx.fillStyle = hexA(st.solid, fillA);
        ctx.fill();
      }
      ctx.stroke();
      return true;
    }
    case "pitchfork": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      if (!c) {
        line(xa, ya, xb, yb);
        return true;
      }
      const xc = X(c);
      const yc = Y(c);
      const vx = (xb + xc) / 2 - xa;
      const vy = (yb + yc) / 2 - ya;
      const m = rayFrom(xa, ya, vx, vy, plotW);
      const u = rayFrom(xb, yb, vx, vy, plotW);
      const l = rayFrom(xc, yc, vx, vy, plotW);
      ctx.fillStyle = hexA(st.solid, 0.08);
      ctx.beginPath();
      ctx.moveTo(xb, yb);
      ctx.lineTo(u.x, u.y);
      ctx.lineTo(l.x, l.y);
      ctx.lineTo(xc, yc);
      ctx.closePath();
      ctx.fill();
      line(xa, ya, m.x, m.y);
      line(xb, yb, u.x, u.y);
      line(xc, yc, l.x, l.y);
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;
      line(xb, yb, xc, yc);
      ctx.globalAlpha = 1;
      return true;
    }
    case "fibext": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#787b86";
      ctx.lineWidth = 1;
      line(xa, ya, xb, yb);
      if (!c) return true;
      const xc = X(c);
      line(xb, yb, xc, Y(c));
      const delta = b.p - a.p;
      ctx.setLineDash([]);
      const ys = FIBEXT_LEVELS.map((lv) => eng.yOf(c.p + delta * lv));
      for (let i = 0; i < ys.length - 1; i++) {
        ctx.fillStyle = hexA(FIBEXT_COLORS[i + 1], 0.07);
        ctx.fillRect(xc, Math.min(ys[i], ys[i + 1]), plotW - xc, Math.abs(ys[i + 1] - ys[i]));
      }
      ctx.font = `600 10.5px ${eng.theme.font}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      FIBEXT_LEVELS.forEach((lv, i) => {
        ctx.strokeStyle = FIBEXT_COLORS[i];
        line(xc, ys[i], plotW, ys[i]);
        ctx.fillStyle = FIBEXT_COLORS[i];
        ctx.fillText(`${lv} (${(c.p + delta * lv).toFixed(prec)})`, xc + 5, ys[i] - 2);
      });
      return true;
    }
    case "prange": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      const diff = b.p - a.p;
      const col = diff >= 0 ? pal.up : pal.down;
      const x0 = Math.min(xa, xb);
      const x1 = Math.max(xa, xb, x0 + 30);
      const mx = (x0 + x1) / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = hexA(col, 0.12);
      ctx.fillRect(x0, Math.min(ya, yb), x1 - x0, Math.abs(yb - ya));
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      line(x0, ya, x1, ya);
      line(x0, yb, x1, yb);
      ctx.lineWidth = 1.5;
      line(mx, ya, mx, yb);
      ctx.fillStyle = col;
      const dir = yb > ya ? Math.PI / 2 : -Math.PI / 2;
      arrowHead(ctx, mx, yb, dir, 9);
      chip(`${diff > 0 ? "+" : ""}${diff.toFixed(prec)} (${pct((diff / a.p) * 100)})`, mx, (ya + yb) / 2, col, "center");
      return true;
    }
    case "drange": {
      if (!b) return true;
      const xb = X(b);
      const yb = Y(b);
      const x0 = Math.min(xa, xb);
      const x1 = Math.max(xa, xb);
      const my = (ya + yb) / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = hexA(st.solid, 0.08);
      ctx.fillRect(x0, 0, x1 - x0, plotH);
      ctx.strokeStyle = st.solid;
      ctx.lineWidth = 1;
      line(xa, 0, xa, plotH);
      line(xb, 0, xb, plotH);
      ctx.lineWidth = 1.5;
      line(x0, my, x1, my);
      ctx.fillStyle = st.solid;
      arrowHead(ctx, x1, my, 0, 9);
      arrowHead(ctx, x0, my, Math.PI, 9);
      const ta = eng.timeAt(a.l);
      const tb = eng.timeAt(b.l);
      chip(`${Math.abs(b.l - a.l)} bars${ta != null && tb != null ? `  ${fmtDur(tb - ta)}` : ""}`, (x0 + x1) / 2, my - 14, st.solid, "center");
      return true;
    }
    default:
      return false;
  }
}

function hitMore(d, x, y, env, near) {
  const { eng, plotW } = env;
  const X = (pt) => eng.xOf(pt.l);
  const Y = (pt) => eng.yOf(pt.p);
  const [a, b, c] = d.pts;
  const xa = X(a);
  const ya = Y(a);
  const seg = (x1, y1, x2, y2) => distToSegment(x, y, x1, y1, x2, y2) < near;
  switch (d.type) {
    case "cross":
      return Math.abs(x - xa) < near || Math.abs(y - ya) < near;
    case "brush":
      for (let i = 0; i < d.pts.length - 1; i++) if (seg(X(d.pts[i]), Y(d.pts[i]), X(d.pts[i + 1]), Y(d.pts[i + 1]))) return true;
      return false;
    case "infoline":
      return !!b && seg(xa, ya, X(b), Y(b));
    case "ellipse": {
      if (!b) return false;
      const xb = X(b);
      const yb = Y(b);
      const rx = Math.max(near, Math.abs(xb - xa) / 2);
      const ry = Math.max(near, Math.abs(yb - ya) / 2);
      const v = ((x - (xa + xb) / 2) / rx) ** 2 + ((y - (ya + yb) / 2) / ry) ** 2;
      return v <= 1.1;
    }
    case "triangle": {
      if (!b) return false;
      const xb = X(b);
      const yb = Y(b);
      if (!c) return seg(xa, ya, xb, yb);
      const xc = X(c);
      const yc = Y(c);
      if (seg(xa, ya, xb, yb) || seg(xb, yb, xc, yc) || seg(xc, yc, xa, ya)) return true;
      const sign = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
      const d1 = sign(x, y, xa, ya, xb, yb);
      const d2 = sign(x, y, xb, yb, xc, yc);
      const d3 = sign(x, y, xc, yc, xa, ya);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }
    case "pitchfork": {
      if (!b) return false;
      const xb = X(b);
      const yb = Y(b);
      if (!c) return seg(xa, ya, xb, yb);
      const xc = X(c);
      const yc = Y(c);
      const vx = (xb + xc) / 2 - xa;
      const vy = (yb + yc) / 2 - ya;
      const m = rayFrom(xa, ya, vx, vy, plotW);
      const u = rayFrom(xb, yb, vx, vy, plotW);
      const l = rayFrom(xc, yc, vx, vy, plotW);
      return seg(xa, ya, m.x, m.y) || seg(xb, yb, u.x, u.y) || seg(xc, yc, l.x, l.y) || seg(xb, yb, xc, yc);
    }
    case "fibext": {
      if (!b) return false;
      const xb = X(b);
      const yb = Y(b);
      if (seg(xa, ya, xb, yb)) return true;
      if (!c) return false;
      const xc = X(c);
      if (seg(xb, yb, xc, Y(c))) return true;
      const delta = b.p - a.p;
      return x >= xc - near && FIBEXT_LEVELS.some((lv) => Math.abs(y - eng.yOf(c.p + delta * lv)) < near);
    }
    case "prange": {
      if (!b) return false;
      const xb = X(b);
      const yb = Y(b);
      const x0 = Math.min(xa, xb);
      const x1 = Math.max(xa, xb, x0 + 30);
      return x >= x0 - near && x <= x1 + near && y >= Math.min(ya, yb) - near && y <= Math.max(ya, yb) + near;
    }
    case "drange": {
      if (!b) return false;
      const xb = X(b);
      return x >= Math.min(xa, xb) - near && x <= Math.max(xa, xb) + near;
    }
    default:
      return undefined;
  }
}

function hitDrawing(d, x, y, env, near = 9) {
  const r = hitMore(d, x, y, env, near);
  return r === undefined ? hitDrawingBase(d, x, y, env, near) : r;
}
function handlesOf(d, env) {
  if (d.type === "brush") return [];
  return handlesBase(d, env);
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
    const nl = Math.max(pt.l, o[0].l + 24);
    return o.map((q, i) => (i > 0 ? { ...q, l: nl } : q));
  }
  return o;
}


// ---- painting ----
function strokeOf(d) {
  const st = d.style || {};
  const color = st.color || DRAW_COLOR;
  return { solid: color, color: hexA(color, st.opacity == null ? 1 : st.opacity), width: st.width || 2, dash: st.dash === "dashed" ? [7, 5] : st.dash === "dotted" ? [2, 4] : [] };
}

function paintDrawing(ctx, d, env) {
  const { plotW, plotH, prec, pal, eng } = env;
  const X = (pt) => eng.xOf(pt.l);
  const Y = (pt) => eng.yOf(pt.p);
  const [a, b, c] = d.pts;
  const st = strokeOf(d);
  const chip = (text, x, y, color, align) => eng.chip(ctx, text, x, y, color, "#ffffff", align);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = st.color;
  ctx.fillStyle = st.color;
  ctx.lineWidth = st.width;
  ctx.setLineDash(st.dash);
  const xa = X(a);
  const ya = Y(a);
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (paintExtra(ctx, d, env, st, line, chip)) {
    ctx.setLineDash([]);
    return;
  }
  if (d.type === "hline" || d.type === "hray") {
    line(d.type === "hray" ? xa : 0, ya, plotW, ya);
    return;
  }
  if (d.type === "vline") {
    line(xa, 0, xa, plotH);
    const t = eng.timeAt(a.l);
    if (t != null) chip(eng.fmtFull(t), Math.min(Math.max(xa, 70), plotW - 70), 14, st.solid, "center");
    return;
  }
  if (d.type === "text") {
    const size = d.size || 13;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(xa, ya, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 ${size}px ${eng.theme.font}`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillText(d.text || "", xa + 6, ya - 4);
    return;
  }

  if (d.type === "long" || d.type === "short") {
    if (!b) return;
    const ys = Y(b);
    const last = d.pts[d.pts.length - 1];
    const x1 = eng.xOf(Math.max(last.l, a.l + 24));
    const w = x1 - xa;
    const cx = xa + w / 2;
    const entry = a.p;
    const isLong = d.type === "long";
    const signed = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(prec)}`;
    ctx.setLineDash([]);
    const zone = (y, color) => {
      ctx.fillStyle = hexA(color, 0.17);
      ctx.fillRect(xa, Math.min(ya, y), w, Math.abs(y - ya));
    };
    zone(ys, pal.down);
    const yt = c ? Y(c) : null;
    if (c) zone(yt, pal.up);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.down;
    line(xa, ys, x1, ys);
    if (c) {
      ctx.strokeStyle = pal.up;
      line(xa, yt, x1, yt);
    }
    ctx.strokeStyle = "#787b86";
    line(xa, ya, x1, ya);
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexA("#787b86", 0.5);
    const top = Math.min(ya, ys, c ? yt : ya);
    const bot = Math.max(ya, ys, c ? yt : ya);
    line(xa, top, xa, bot);
    line(x1, top, x1, bot);
    chip(`Stop: ${b.p.toFixed(prec)} (${pct(((b.p - entry) / entry) * 100)})  ${signed(b.p - entry)}`, cx, ys + (ys > ya ? -13 : 13), pal.down, "center");
    let rr = "";
    if (c) {
      chip(`Target: ${c.p.toFixed(prec)} (${pct(((c.p - entry) / entry) * 100)})  ${signed(c.p - entry)}`, cx, yt + (yt > ya ? -13 : 13), pal.up, "center");
      const risk = Math.abs(entry - b.p);
      if (risk > 0) rr = (Math.abs(c.p - entry) / risk).toFixed(2);
    }
    chip(`${isLong ? "Long" : "Short"} ${entry.toFixed(prec)}${rr ? `   R:R ${rr}` : ""}`, cx, ya, "#434651", "center");
    return;
  }

  if (d.type === "channel") {
    const g = channelGeom(d, env);
    if (!g) return;
    line(g.xa, g.ya, g.xb, g.yb);
    if (g.off != null) {
      line(g.xa, g.ya + g.off, g.xb, g.yb + g.off);
      ctx.fillStyle = hexA(st.solid, 0.1);
      ctx.beginPath();
      ctx.moveTo(g.xa, g.ya);
      ctx.lineTo(g.xb, g.yb);
      ctx.lineTo(g.xb, g.yb + g.off);
      ctx.lineTo(g.xa, g.ya + g.off);
      ctx.closePath();
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.5;
      line(g.xa, g.ya + g.off / 2, g.xb, g.yb + g.off / 2);
      ctx.globalAlpha = 1;
    }
    return;
  }

  if (!b) return;
  const xb = X(b);
  const yb = Y(b);
  if (d.type === "trend") line(xa, ya, xb, yb);
  else if (d.type === "arrow") {
    line(xa, ya, xb, yb);
    ctx.setLineDash([]);
    const ang = Math.atan2(yb - ya, xb - xa);
    const hl = 10 + st.width * 2;
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.moveTo(xb, yb);
    ctx.lineTo(xb - hl * Math.cos(ang - 0.42), yb - hl * Math.sin(ang - 0.42));
    ctx.lineTo(xb - hl * Math.cos(ang + 0.42), yb - hl * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  } else if (d.type === "ray") {
    const e = rayEnd(xa, ya, xb, yb, plotW);
    line(xa, ya, e.x, e.y);
  } else if (d.type === "xline") {
    const e = extLine(xa, ya, xb, yb, plotW);
    line(e.x1, e.y1, e.x2, e.y2);
  } else if (d.type === "rect") {
    const x = Math.min(xa, xb);
    const y = Math.min(ya, yb);
    ctx.fillStyle = hexA(st.solid, d.fill == null ? 0.14 : d.fill);
    ctx.fillRect(x, y, Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.strokeRect(x, y, Math.abs(xb - xa), Math.abs(yb - ya));
  } else if (d.type === "fib") {
    const x0 = Math.min(xa, xb);
    const yAt = (lv) => yb + (ya - yb) * lv;
    ctx.setLineDash([]);
    for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
      const y1 = yAt(FIB_LEVELS[i]);
      const y2 = yAt(FIB_LEVELS[i + 1]);
      ctx.fillStyle = hexA(FIB_COLORS[i + 1], 0.09);
      ctx.fillRect(x0, Math.min(y1, y2), plotW - x0, Math.abs(y2 - y1));
    }
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${eng.theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    FIB_LEVELS.forEach((lv, i) => {
      const y = yAt(lv);
      ctx.strokeStyle = FIB_COLORS[i];
      line(x0, y, plotW, y);
      ctx.fillStyle = FIB_COLORS[i];
      ctx.fillText(`${lv} (${(b.p + (a.p - b.p) * lv).toFixed(prec)})`, x0 + 5, y - 2);
    });
    ctx.strokeStyle = "#787b86";
    ctx.setLineDash([4, 4]);
    line(xa, ya, xb, yb);
  } else if (d.type === "measure") {
    const diff = b.p - a.p;
    const col = diff >= 0 ? pal.up : pal.down;
    ctx.setLineDash([]);
    ctx.fillStyle = hexA(col, 0.14);
    ctx.fillRect(Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(Math.min(xa, xb), Math.min(ya, yb), Math.abs(xb - xa), Math.abs(yb - ya));
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    line(xa, ya, xb, yb);
    const ta = eng.timeAt(a.l);
    const tb = eng.timeAt(b.l);
    const span = ta != null && tb != null ? `  ${fmtDur(tb - ta)}` : "";
    chip(`${diff > 0 ? "+" : ""}${diff.toFixed(prec)} (${pct((diff / a.p) * 100)})  ${Math.abs(b.l - a.l)} bars${span}`, Math.max(2, Math.min(xa, xb)), Math.min(ya, yb) - 12, col);
  }
  ctx.setLineDash([]);
}

// Price tags on the right axis for horizontal drawings and the entry / SL / TP lines.
function paintAxisTags(ctx, list, levels, env) {
  const { eng, plotW, plotH, prec } = env;
  for (const d of list) {
    if (d.type !== "hline" && d.type !== "hray" && d.type !== "cross") continue;
    const y = eng.yOf(d.pts[0].p);
    if (y < 0 || y > plotH) continue;
    eng.chip(ctx, d.pts[0].p.toFixed(prec), plotW + 2, y, strokeOf(d).solid, "#ffffff");
  }
  for (const lv of levels) {
    const y = eng.yOf(lv.price);
    if (y < 0 || y > plotH) continue;
    eng.chip(ctx, `${lv.title} ${lv.price.toFixed(prec)}`, plotW + 2, y, lv.color, "#ffffff");
  }
}

function paintMarkers(ctx, markers, env) {
  const { eng } = env;
  const cs = eng.candles;
  if (!markers.length || !eng.n) return;
  ctx.setLineDash([]);
  for (const m of markers) {
    const i = Math.round(eng.logicalAt(m.time));
    const cd = i >= 0 && i < eng.n ? cs[i] : null;
    if (!cd || cd.time !== m.time) continue;
    const x = eng.xOf(i);
    const above = m.position === "aboveBar";
    const y = above ? eng.yOf(cd.high) - 9 : eng.yOf(cd.low) + 9;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    if (m.shape === "arrowUp") {
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x - 5, y + 4);
      ctx.lineTo(x + 5, y + 4);
    } else if (m.shape === "arrowDown") {
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x - 5, y - 4);
      ctx.lineTo(x + 5, y - 4);
    } else ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    if (m.text) {
      ctx.font = `600 11px ${eng.theme.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = above ? "bottom" : "top";
      ctx.fillText(m.text, x, above ? y - 9 : y + 9);
    }
  }
}

function TredziChartInner({ candles, sessionKey, lines, markers, colors, precision, height, compact, pickMode, onPickPrice, onApplyPlan, footer, drawKey, hideTradeTools, limit, flow }) {
  const canvasRef = useRef(null);
  const areaRef = useRef(null);
  const engRef = useRef(null);
  if (!engRef.current) engRef.current = new ChartEngine();
  const eng = engRef.current;
  const dirtyRef = useRef(true);
  const markDirty = () => {
    dirtyRef.current = true;
  };

  const [tool, setTool] = useState(null);
  const [step, setStep] = useState(0);
  const [drawings, setDrawingsState] = useState([]);
  const [selected, setSelectedState] = useState(null); // { id, name }
  const [magnet, setMagnet] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [full, setFull] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [settings, setSettings] = useState(false);
  const [manualScale, setManualScale] = useState(false);
  const [vp, setVp] = useState(() => {
    try {
      const raw = window.localStorage.getItem("tredzi-bt-vp2");
      if (raw) return { ...VP_DEFAULTS, ...JSON.parse(raw) };
      const old = window.localStorage.getItem("tredzi-bt-vp");
      if (old === "range" || old === "session") return { ...VP_DEFAULTS, mode: old };
    } catch (err) {
      // fall through to defaults
    }
    return { ...VP_DEFAULTS };
  });
  const profile = vp.mode;
  const setProfile = (mode) => setVp((v) => ({ ...v, mode }));
  const patchVp = (patch) => setVp((v) => ({ ...v, ...patch }));
  const [vpDialog, setVpDialog] = useState(false);
  const [vpMenu, setVpMenu] = useState(false);
  const [of, setOf] = useState(() => {
    try {
      const raw = window.localStorage.getItem("tredzi-bt-of");
      if (raw) return { ...OF_DEFAULTS, ...JSON.parse(raw) };
    } catch (err) {
      // fall through to defaults
    }
    return { ...OF_DEFAULTS };
  });
  const patchOf = (patch) => setOf((v) => ({ ...v, ...patch }));
  const [ofDialog, setOfDialog] = useState(false);
  const [ofMenu, setOfMenu] = useState(false);
  const [lastTool, setLastTool] = useState({});
  const [flyout, setFlyout] = useState(null);
  const flyTimer = useRef(null);

  const drawingsRef = useRef([]);
  const selectedRef = useRef(null);
  const toolRef = useRef(null);
  const draftRef = useRef(null);
  const textRef = useRef("");
  const magnetRef = useRef(false);
  const hiddenRef = useRef(false);
  const colorsRef = useRef(colors);
  const linesRef = useRef(lines);
  const markersRef = useRef(markers);
  const precRef = useRef(precision);
  const pickRef = useRef({ pickMode, onPickPrice });
  const drawKeyRef = useRef(drawKey);
  const loadedKeyRef = useRef(null);
  const loadTokenRef = useRef(0);
  const loadingRef = useRef(false);
  const saveTimer = useRef(null);
  const prevDataRef = useRef({ key: null, first: null });
  const ptrs = useRef(new Map());
  const gesture = useRef(null);
  toolRef.current = tool;
  magnetRef.current = magnet;
  hiddenRef.current = hidden;
  colorsRef.current = colors;
  linesRef.current = lines;
  markersRef.current = markers;
  precRef.current = precision;
  pickRef.current = { pickMode, onPickPrice };
  drawKeyRef.current = drawKey;

  const setDrawings = (updater) => {
    const next = typeof updater === "function" ? updater(drawingsRef.current) : updater;
    drawingsRef.current = next;
    setDrawingsState(next);
    markDirty();
  };
  const setSelected = (v) => {
    selectedRef.current = v;
    setSelectedState(v);
    markDirty();
  };

  // ---- saving (by time, per symbol) ----
  const persistNow = () => {
    const key = drawKeyRef.current;
    if (!key || loadingRef.current) return;
    const list = drawingsRef.current.map((d) => ({
      type: d.type,
      pts: d.pts.map((p) => ({ t: eng.timeAt(p.l), p: p.p })),
      text: d.text,
      size: d.size,
      fill: d.fill,
      style: d.style,
    }));
    writeSaved(key, list);
  };
  const schedulePersist = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persistNow, 250);
  };
  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    persistNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- engine <-> props ----
  useEffect(() => {
    eng.setTheme({ bg: colors.bg || "#ffffff", text: colors.text, grid: colors.grid, border: colors.border, up: colors.up, down: colors.down, font: colors.font || "sans-serif" });
    eng.setPrecision(precision);
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.bg, colors.text, colors.grid, colors.border, colors.up, colors.down, colors.font, precision]);

  useEffect(() => {
    const first = candles.length ? candles[0].time : null;
    const prev = prevDataRef.current;
    const reset = prev.key !== sessionKey || prev.first !== first;
    eng.setData(candles, reset, limit);
    prevDataRef.current = { key: sessionKey, first };
    if (reset) setManualScale(false);
    if (reset && !drawKeyRef.current) {
      setDrawings([]);
      setSelected(null);
    }
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, limit, sessionKey]);

  useEffect(() => {
    markDirty();
  }, [lines, markers]);

  useEffect(() => {
    eng.setProfile(vp);
    markDirty();
    try {
      window.localStorage.setItem("tredzi-bt-vp2", JSON.stringify(vp));
    } catch (err) {
      // not remembered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp]);

  useEffect(() => {
    eng.setOrderFlow(of);
    markDirty();
    try {
      window.localStorage.setItem("tredzi-bt-of", JSON.stringify(of));
    } catch (err) {
      // not remembered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [of]);

  useEffect(() => {
    eng.setFlow(flow || null);
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  // Load saved drawings once the candles are there (needed to turn saved times back into bar positions).
  const hasData = (Number.isFinite(limit) ? limit : candles.length) > 0;
  useEffect(() => {
    if (!hasData) return;
    const tag = drawKey || "__none";
    if (loadedKeyRef.current === tag) return;
    loadedKeyRef.current = tag;
    loadingRef.current = true;
    setDrawings([]);
    setSelected(null);
    setSettings(false);
    setTool(null);
    draftRef.current = null;
    loadTokenRef.current += 1;
    const token = loadTokenRef.current;
    if (!drawKey) {
      loadingRef.current = false;
      return;
    }
    readSaved(drawKey).then((list) => {
      if (token !== loadTokenRef.current) return;
      const out = list
        .filter((r) => r && BT[r.type] && Array.isArray(r.pts) && r.pts.length >= 1 && r.pts.every((p) => Number.isFinite(p.t) && Number.isFinite(p.p)))
        .map((r) => ({ id: uid(), type: r.type, pts: r.pts.map((p) => ({ l: Math.round(eng.logicalAt(p.t)), p: p.p })), text: r.text, size: r.size, fill: r.fill, style: r.style || { ...DEFAULT_UI } }));
      setDrawings(out);
      loadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey, hasData]);

  // size
  useEffect(() => {
    const el = areaRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return undefined;
    const apply = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      eng.resize(w, h, dpr);
      markDirty();
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (ro) ro.observe(el);
    return () => {
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // wheel: zoom (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) eng.panBars(-e.deltaX);
      else eng.zoomAt(Math.min(e.clientX - rect.left, eng.plotW), e.deltaY < 0 ? 1.1 : 1 / 1.1);
      markDirty();
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!full) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  // ---- geometry helpers ----
  const envFor = () => ({
    eng,
    chart: { timeScale: () => ({ logicalToCoordinate: (l) => eng.xOf(l) }) },
    series: { priceToCoordinate: (p) => eng.yOf(p) },
    plotW: eng.plotW,
    plotH: eng.plotH,
    prec: precRef.current,
    pal: { up: colorsRef.current.up, down: colorsRef.current.down },
  });

  // pixel -> { bar index, price }, optionally snapped to the candle's O/H/L/C (magnet)
  const pointAt = (x, y) => {
    const l = Math.round(eng.lOf(x));
    let p = eng.pOf(y);
    if (magnetRef.current) {
      const c = l >= 0 && l < eng.n ? eng.candles[l] : null;
      if (c) {
        let best = null;
        let bd = Infinity;
        [c.open, c.high, c.low, c.close].forEach((v) => {
          const dd = Math.abs(eng.yOf(v) - y);
          if (dd < bd) {
            bd = dd;
            best = v;
          }
        });
        if (best != null && bd < 28) p = best;
      }
    }
    return { l, p, x, y };
  };

  const hitTest = (x, y, touch) => {
    if (hiddenRef.current) return null;
    const list = drawingsRef.current;
    const env = envFor();
    const sel = selectedRef.current ? list.find((d) => d.id === selectedRef.current.id) : null;
    if (sel) {
      const hs = handlesOf(sel, env);
      for (let i = 0; i < hs.length; i++) {
        if (Math.hypot(hs[i].x - x, hs[i].y - y) <= (touch ? 20 : 11)) return { d: sel, mode: hs[i].mode, i: hs[i].i };
      }
    }
    for (let i = list.length - 1; i >= 0; i--) {
      if (hitDrawing(list[i], x, y, env, touch ? 16 : 9)) return { d: list[i], mode: "move" };
    }
    return null;
  };

  // ---- painting ----
  const paintPlot = (ctx) => {
    const env = envFor();
    const lv = linesRef.current || {};
    const lvl = [["Entry", lv.entry, colorsRef.current.entry, false], ["SL", lv.sl, colorsRef.current.down, true], ["TP", lv.tp, colorsRef.current.up, true]];
    lvl.forEach(([, price, color, dashed]) => {
      if (!Number.isFinite(price)) return;
      const y = Math.round(eng.yOf(price)) + 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash(dashed ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(env.plotW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    if (!hiddenRef.current) {
      drawingsRef.current.forEach((d) => {
        ctx.save();
        paintDrawing(ctx, d, env);
        ctx.restore();
      });
    }
    paintMarkers(ctx, markersRef.current || [], env);
    const draft = draftRef.current;
    if (draft && draft.cur) {
      ctx.save();
      paintDrawing(ctx, { type: draft.type, pts: [...draft.pts, { l: draft.cur.l, p: draft.cur.p }], style: DEFAULT_UI }, env);
      ctx.restore();
    }
    const sel = selectedRef.current && !hiddenRef.current ? drawingsRef.current.find((d) => d.id === selectedRef.current.id) : null;
    if (sel && !draft) {
      const r = window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 7 : 5;
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      handlesOf(sel, env).forEach((h) => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = (sel.style && sel.style.color) || DRAW_COLOR;
        ctx.stroke();
      });
    }
  };
  const paintAxis = (ctx) => {
    const lv = linesRef.current || {};
    const env = envFor();
    const levels = [];
    if (Number.isFinite(lv.entry)) levels.push({ title: "Entry", price: lv.entry, color: colorsRef.current.entry });
    if (Number.isFinite(lv.sl)) levels.push({ title: "SL", price: lv.sl, color: colorsRef.current.down });
    if (Number.isFinite(lv.tp)) levels.push({ title: "TP", price: lv.tp, color: colorsRef.current.up });
    paintAxisTags(ctx, hiddenRef.current ? [] : drawingsRef.current, levels, env);
  };
  const paintTop = (ctx) => {
    if (compact) return;
    const hover = eng.crosshair ? eng.candleAtX(eng.crosshair.x) : null;
    const c = hover ? hover.c : eng.candles[eng.n - 1];
    if (!c) return;
    const col = c.close >= c.open ? eng.theme.up : eng.theme.down;
    ctx.font = `11px ${eng.theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let x = 10;
    [["O", c.open], ["H", c.high], ["L", c.low], ["C", c.close]].forEach(([k, v]) => {
      ctx.fillStyle = eng.theme.text;
      ctx.fillText(k, x, 8);
      x += ctx.measureText(k).width + 3;
      ctx.fillStyle = col;
      const t = v.toFixed(precRef.current);
      ctx.fillText(t, x, 8);
      x += ctx.measureText(t).width + 10;
    });
  };
  useEffect(() => {
    let raf = 0;
    let warned = false;
    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        const cv = canvasRef.current;
        if (cv) {
          try {
            eng.draw(cv.getContext("2d"), { plot: paintPlot, axis: paintAxis, top: paintTop });
          } catch (err) {
            if (!warned) {
              warned = true;
              console.error("Chart paint error:", err);
            }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- drawing actions ----
  const removeDrawing = (id) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedRef.current && selectedRef.current.id === id) setSelected(null);
    schedulePersist();
  };
  const commit = (type, pts) => {
    const id = uid();
    const d = { id, type, pts, text: type === "text" ? textRef.current : undefined, size: 13, style: { ...DEFAULT_UI } };
    setDrawings((prev) => [...prev, d]);
    draftRef.current = null;
    setStep(0);
    setTool(null);
    setSelected({ id, name: BT[type] });
    schedulePersist();
  };
  const startTool = (id) => {
    draftRef.current = null;
    setStep(0);
    setSelected(null);
    setSheet(false);
    setSettings(false);
    if (id === null) {
      setTool(null);
      markDirty();
      return;
    }
    if (hiddenRef.current) setHidden(false);
    const grp = TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === id));
    if (grp) setLastTool((m) => ({ ...m, [grp.id]: id }));
    if (id === "text") {
      const t = window.prompt("Label text");
      if (!t || !t.trim()) {
        setTool(null);
        return;
      }
      textRef.current = t.trim().slice(0, 60);
    }
    setTool(id);
    markDirty();
  };
  const deleteSelected = () => {
    if (selected) removeDrawing(selected.id);
  };
  const undo = () => {
    const list = drawingsRef.current;
    if (list.length) removeDrawing(list[list.length - 1].id);
  };
  const clearAll = () => {
    setDrawings([]);
    setSelected(null);
    schedulePersist();
  };

  useEffect(() => {
    const onKey = (e) => {
      const tg = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tg)) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && HOTKEY_TOOL[e.code]) {
        e.preventDefault();
        startTool(HOTKEY_TOOL[e.code]);
        return;
      }
      if (e.key === "Escape") {
        draftRef.current = null;
        setStep(0);
        setTool(null);
        setSelected(null);
        setSheet(false);
        setSettings(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        removeDrawing(selectedRef.current.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pointer input: pan, zoom, axis scaling, drawing and editing ----
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerDown = (e) => {
    const cv = canvasRef.current;
    if (!cv) return;
    if (cv.setPointerCapture) {
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {
        // pointer already gone
      }
    }
    const { x, y } = getPos(e);
    ptrs.current.set(e.pointerId, { x, y });
    const touch = e.pointerType !== "mouse";
    if (ptrs.current.size === 2) {
      const [p1, p2] = [...ptrs.current.values()];
      gesture.current = { mode: "pinch", dist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1 };
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const region = eng.region(x, y);
    const t = toolRef.current;
    if (pickRef.current.pickMode && region === "plot") {
      gesture.current = { mode: "pick", x, y };
      return;
    }
    if (t && region === "plot") {
      if (t === "eraser") {
        const hit = hitTest(x, y, touch);
        if (hit) removeDrawing(hit.d.id);
        return;
      }
      const pt = pointAt(x, y);
      if (t === "brush") {
        draftRef.current = { type: "brush", pts: [{ l: pt.l, p: pt.p }], cur: pt };
        gesture.current = { mode: "brush", last: { x, y } };
        markDirty();
        return;
      }
      const draft = draftRef.current;
      const pts = draft ? [...draft.pts, { l: pt.l, p: pt.p }] : [{ l: pt.l, p: pt.p }];
      if (pts.length >= NEED[t]) {
        commit(t, pts);
        return;
      }
      draftRef.current = { type: t, pts, cur: pt };
      setStep(pts.length);
      gesture.current = { mode: "create", x, y };
      markDirty();
      return;
    }
    if (region === "price") {
      gesture.current = { mode: "axisP", lastY: y };
      return;
    }
    if (region === "time") {
      gesture.current = { mode: "axisT", lastX: x };
      return;
    }
    if (region !== "plot") return;
    const hit = hitTest(x, y, touch);
    if (hit) {
      const pt = pointAt(x, y);
      setSelected({ id: hit.d.id, name: BT[hit.d.type] });
      gesture.current = { mode: "drag", id: hit.d.id, dmode: hit.mode, i: hit.i, start: pt, orig: hit.d.pts.map((p) => ({ l: p.l, p: p.p })) };
      return;
    }
    gesture.current = { mode: "pan", lastX: x, lastY: y, totX: 0, totY: 0, moved: false };
  };
  const onPointerMove = (e) => {
    const { x, y } = getPos(e);
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x, y });
    const g = gesture.current;
    if (e.pointerType === "mouse" || toolRef.current || (g && g.mode === "drag")) eng.crosshair = { x, y };
    if (g && g.mode === "pinch" && ptrs.current.size >= 2) {
      const [p1, p2] = [...ptrs.current.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      eng.zoomAt(Math.min((p1.x + p2.x) / 2, eng.plotW), dist / g.dist);
      g.dist = dist;
    } else if (g && g.mode === "pan") {
      const dx = x - g.lastX;
      const dy = y - g.lastY;
      g.totX += dx;
      g.totY += dy;
      if (Math.abs(g.totX) + Math.abs(g.totY) > 3) g.moved = true;
      eng.panBars(dx);
      if (eng.manual || (Math.abs(g.totY) > 24 && Math.abs(g.totY) > Math.abs(g.totX) * 1.2)) {
        eng.panPrice(dy);
        setManualScale(true);
      }
      g.lastX = x;
      g.lastY = y;
    } else if (g && g.mode === "axisP") {
      eng.scalePrice(y - g.lastY);
      g.lastY = y;
      setManualScale(true);
    } else if (g && g.mode === "axisT") {
      eng.zoomAt(eng.plotW, Math.exp((x - g.lastX) * 0.01));
      g.lastX = x;
    } else if (g && g.mode === "drag") {
      const pt = pointAt(x, y);
      const drag = { mode: g.dmode, i: g.i, orig: g.orig, start: g.start };
      setDrawings((prev) => prev.map((q) => (q.id === g.id ? { ...q, pts: dragPts(q, drag, pt) } : q)));
      g.moved = true;
    } else if (g && g.mode === "brush" && draftRef.current) {
      const pt = pointAt(x, y);
      const draft = draftRef.current;
      if (Math.hypot(x - g.last.x, y - g.last.y) > 2.5 && draft.pts.length < 600) {
        draft.pts.push({ l: pt.l, p: pt.p });
        g.last = { x, y };
      }
      draftRef.current = { ...draft, cur: pt };
    } else if (draftRef.current) {
      draftRef.current = { ...draftRef.current, cur: pointAt(x, y) };
    }
    markDirty();
  };
  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch") {
      if (ptrs.current.size < 2) gesture.current = null;
      return;
    }
    const { x, y } = getPos(e);
    gesture.current = null;
    if (g.mode === "pick") {
      if (Math.hypot(x - g.x, y - g.y) < 10 && pickRef.current.onPickPrice) pickRef.current.onPickPrice(eng.pOf(y));
    } else if (g.mode === "pan") {
      if (!g.moved) {
        setSelected(null);
        setSettings(false);
      }
    } else if (g.mode === "drag") {
      if (g.moved) schedulePersist();
    } else if (g.mode === "brush") {
      const draft = draftRef.current;
      if (draft && draft.pts.length >= 2) commit("brush", draft.pts);
      else {
        draftRef.current = null;
        setStep(0);
      }
    } else if (g.mode === "create") {
      const draft = draftRef.current;
      if (draft && NEED[draft.type] === 2 && draft.pts.length === 1 && Math.hypot(x - g.x, y - g.y) > 12) {
        const pt = pointAt(x, y);
        commit(draft.type, [draft.pts[0], { l: pt.l, p: pt.p }]);
      }
    }
    markDirty();
  };
  const onPointerLeave = (e) => {
    if (e.pointerType === "mouse") {
      eng.crosshair = null;
      markDirty();
    }
  };
  const onPointerCancel = (e) => {
    ptrs.current.delete(e.pointerId);
    gesture.current = null;
  };
  const onDoubleClick = (e) => {
    const { x, y } = getPos(e);
    const r = eng.region(x, y);
    if (r === "price" || r === "corner") {
      eng.resetAuto();
      setManualScale(false);
      markDirty();
    } else if (r === "plot") {
      const hit = hitTest(x, y, false);
      if (hit) {
        setSelected({ id: hit.d.id, name: BT[hit.d.type] });
        setSettings(true);
      }
    }
  };

  // ---- derived values for the toolbar and settings panel ----
  const count = drawings.length;
  let plan = null;
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if ((d.type === "long" || d.type === "short") && d.pts.length === 3) {
      plan = { side: d.type === "long" ? "buy" : "sell", sl: d.pts[1].p, tp: d.pts[2].p };
      break;
    }
  }
  const uiOf = (id) => {
    const d = drawings.find((q) => q.id === id);
    return { ...DEFAULT_UI, ...((d && d.style) || {}) };
  };
  const patchSelected = (patch) => {
    if (!selected) return;
    setDrawings((prev) => prev.map((d) => (d.id === selected.id ? { ...d, style: { ...DEFAULT_UI, ...(d.style || {}), ...patch } } : d)));
    schedulePersist();
  };
  const curStyle = selected ? uiOf(selected.id) : null;
  const settingsOpen = settings && !!selected;
  const selD = settingsOpen ? drawings.find((d) => d.id === selected.id) : null;
  const ov = selD
    ? { id: selD.id, name: BT[selD.type], points: selD.pts.map((p) => ({ value: p.p, timestamp: eng.timeAt(p.l) })), extendData: { fill: selD.fill, text: selD.text, size: selD.size } }
    : null;
  const setPointValue = (i, raw) => {
    const n = parseFloat(raw);
    if (!selD || !Number.isFinite(n)) return;
    setDrawings((prev) => prev.map((d) => (d.id === selD.id ? { ...d, pts: d.pts.map((p, j) => (j === i ? { ...p, p: n } : p)) } : d)));
    schedulePersist();
  };
  const patchExtend = (patch) => {
    if (!selD) return;
    setDrawings((prev) => prev.map((d) => (d.id === selD.id ? { ...d, ...patch } : d)));
    schedulePersist();
  };
  const cloneSelected = () => {
    if (!selD) return;
    const id = uid();
    setDrawings((prev) => [...prev, { ...JSON.parse(JSON.stringify(selD)), id, pts: selD.pts.map((p) => ({ l: p.l + 3, p: p.p })) }]);
    setSelected({ id, name: BT[selD.type] });
    schedulePersist();
  };

  const S = compact ? 38 : 32;
  const bg = colors.bg || "#0e0e12";
  const soft = hexA(DRAW_COLOR, 0.2);
  const btn = (active) => ({
    width: S, height: S, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
    border: `1px solid ${active ? DRAW_COLOR : colors.border}`, background: active ? soft : "transparent",
    color: active ? DRAW_COLOR : colors.text, cursor: "pointer", padding: 0, flexShrink: 0,
  });
  const railBtn = (active) => ({
    width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
    border: "none", background: active ? soft : "transparent", color: active ? DRAW_COLOR : colors.text,
    cursor: "pointer", padding: 0, flexShrink: 0,
  });
  const pill = (id, color) => ({
    height: S, padding: "0 14px", borderRadius: 8, border: `1px solid ${color}`, background: tool === id ? color : hexA(color, 0.1),
    color: tool === id ? "#fff" : color, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
  });
  const iconOff = (on) => ({ opacity: on ? 1 : 0.4, cursor: on ? "pointer" : "not-allowed" });
  const activeDef = ALL_TOOLS.find((t) => t.id === tool) || (tool === "eraser" ? { Icon: Eraser } : null);
  const ToolsIcon = activeDef ? activeDef.Icon : Pencil;
  const hint = tool === "eraser" ? "Tap a drawing to delete it" : tool && HINTS[tool] ? HINTS[tool][Math.min(step, HINTS[tool].length - 1)] : "";
  const showStyleBar = selected && !tool && !NO_STYLE_BAR.includes(selected.name);
  const rail = !compact;
  const divider = <span style={{ width: 1, alignSelf: "stretch", background: colors.border, flexShrink: 0, margin: "2px 2px" }} />;
  const shell = full
    ? { position: "fixed", inset: 0, zIndex: 1000, background: bg, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }
    : undefined;

  return (
    <div style={shell}>
      <div style={{ display: "flex", gap: 6, flexWrap: compact ? "nowrap" : "wrap", overflowX: compact ? "auto" : "visible", scrollbarWidth: "none", alignItems: "center", marginBottom: 8, padding: compact ? "0 12px" : full ? "8px 12px 0" : 0, flexShrink: 0 }} role="toolbar" aria-label="Chart tools">
        {!compact && (
          <>
            <button type="button" title="Magnet: snap to open, high, low, close" aria-label="Magnet" aria-pressed={magnet} onClick={() => setMagnet((v) => !v)} style={btn(magnet)}>
              <Magnet size={17} />
            </button>
            {!hideTradeTools && divider}
          </>
        )}
        {!hideTradeTools && (
          <>
            <button type="button" onClick={() => startTool("long")} aria-pressed={tool === "long"} title="Long position (entry, stop loss, take profit)" style={pill("long", colors.up)}><DrawIcon id="long" size={18} />Long</button>
            <button type="button" onClick={() => startTool("short")} aria-pressed={tool === "short"} title="Short position (entry, stop loss, take profit)" style={pill("short", colors.down)}><DrawIcon id="short" size={18} />Short</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        {plan && onApplyPlan && !hideTradeTools && (
          <button type="button" title="Copy the stop loss, take profit and side of your latest Long/Short plan into the order form" onClick={() => onApplyPlan(plan)} style={{ flexShrink: 0, height: S, padding: "0 12px", borderRadius: 8, border: `1px solid ${colors.entry}`, background: hexA(colors.entry, 0.12), color: colors.entry, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Use plan
          </button>
        )}
        {!compact && (
          <>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button type="button" title="Order flow (footprint, delta)" aria-label="Order flow" aria-haspopup="menu" aria-expanded={ofMenu} aria-pressed={of.mode !== "off"} onClick={() => { setVpMenu(false); setOfMenu((v) => !v); }} style={btn(of.mode !== "off")}>
                <Activity size={17} />
              </button>
              {ofMenu && (
                <div role="menu" style={{ position: "absolute", right: 0, top: S + 6, zIndex: 30, background: bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 6, minWidth: 250, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                  {OF_MODES.map(([id, label]) => (
                    <button key={id} type="button" role="menuitemradio" aria-checked={of.mode === id} onClick={() => { patchOf({ mode: id }); setOfMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: of.mode === id ? soft : "transparent", color: of.mode === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12.5, fontWeight: of.mode === id ? 700 : 500, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                  <button type="button" role="menuitem" onClick={() => { setOfDialog(true); setOfMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginTop: 4, borderTop: `1px solid ${colors.border}`, borderRadius: 0, border: "none", borderTopWidth: 1, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, cursor: "pointer" }}>
                    Settings...
                  </button>
                </div>
              )}
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button type="button" title="Volume profile" aria-label="Volume profile" aria-haspopup="menu" aria-expanded={vpMenu} aria-pressed={profile !== "off"} onClick={() => { setOfMenu(false); setVpMenu((v) => !v); }} style={btn(profile !== "off")}>
                <BarChart3 size={17} />
              </button>
              {vpMenu && (
                <div role="menu" style={{ position: "absolute", right: 0, top: S + 6, zIndex: 30, background: bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 6, minWidth: 250, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                  {[["off", "Volume profile: off"], ["range", "Visible range volume profile"], ["session", "Session volume profile (daily)"]].map(([id, label]) => (
                    <button key={id} type="button" role="menuitemradio" aria-checked={profile === id} onClick={() => { setProfile(id); setVpMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: profile === id ? soft : "transparent", color: profile === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12.5, fontWeight: profile === id ? 700 : 500, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                  <button type="button" role="menuitem" onClick={() => { setVpDialog(true); setVpMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginTop: 4, borderTop: `1px solid ${colors.border}`, borderRadius: 0, border: "none", borderTopWidth: 1, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, cursor: "pointer" }}>
                    Settings...
                  </button>
                </div>
              )}
            </div>
            <button type="button" title={hidden ? "Show drawings" : "Hide drawings"} aria-label={hidden ? "Show drawings" : "Hide drawings"} aria-pressed={hidden} onClick={() => setHidden((v) => !v)} style={btn(hidden)}>
              {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <button type="button" title="Undo last drawing" aria-label="Undo last drawing" disabled={!count} onClick={undo} style={{ ...btn(false), ...iconOff(count > 0) }}>
              <Undo2 size={17} />
            </button>
            <button type="button" title="Clear all drawings" aria-label="Clear all drawings" disabled={!count} onClick={clearAll} style={{ ...btn(false), ...iconOff(count > 0) }}>
              <Trash2 size={17} />
            </button>
          </>
        )}
        <button type="button" title={full ? "Exit fullscreen" : "Fullscreen chart"} aria-label={full ? "Exit fullscreen" : "Fullscreen chart"} onClick={() => setFull((v) => !v)} style={btn(full)}>
          {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>

      <div
        style={{
          display: "flex", gap: 8, alignItems: "stretch", boxSizing: "border-box",
          width: compact && !full ? "calc(100% - 6px)" : "100%", marginLeft: compact && !full ? 6 : 0,
          padding: full ? "0 12px" : 0,
          height: full ? undefined : height, flex: full ? "1 1 0" : undefined, minHeight: full ? 0 : undefined,
        }}
      >
        {rail && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4, border: `1px solid ${colors.border}`, borderRadius: 10, background: bg, flexShrink: 0, position: "relative", zIndex: 5 }} role="toolbar" aria-label="Drawing tools" aria-orientation="vertical">
            <button type="button" onClick={() => startTool(null)} aria-label="Cursor" title="Cursor (select and move drawings)" aria-pressed={!tool} style={railBtn(!tool)}>
              <MousePointer2 size={18} />
            </button>
            {TOOL_GROUPS.map((g) => {
              const active = g.tools.some((t) => t.id === tool);
              const current = g.tools.find((t) => t.id === (active ? tool : lastTool[g.id])) || g.tools[0];
              const CurIcon = current.Icon;
              const open = flyout === g.id;
              const enter = () => {
                clearTimeout(flyTimer.current);
                flyTimer.current = setTimeout(() => setFlyout(g.id), 120);
              };
              const leave = () => {
                clearTimeout(flyTimer.current);
                flyTimer.current = setTimeout(() => setFlyout(null), 220);
              };
              return (
                <div key={g.id} onMouseEnter={enter} onMouseLeave={leave} style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", borderTop: `1px solid ${colors.border}`, marginTop: 3, paddingTop: 3 }}>
                  <button type="button" title={`${current.label} (${g.title})`} aria-label={current.label} aria-pressed={active} aria-haspopup="menu" aria-expanded={open} onClick={() => { startTool(current.id); setFlyout(null); }} onContextMenu={(e) => { e.preventDefault(); setFlyout(g.id); }} style={{ ...railBtn(active), position: "relative" }}>
                    <CurIcon size={20} />
                    {g.tools.length > 1 && <span aria-hidden="true" style={{ position: "absolute", right: 2, bottom: 2, width: 0, height: 0, borderLeft: "5px solid transparent", borderBottom: `5px solid ${active ? DRAW_COLOR : colors.text}`, opacity: 0.6 }} />}
                  </button>
                  {open && (
                    <div style={{ position: "absolute", left: "100%", top: 0, paddingLeft: 8, zIndex: 40 }}>
                      <div role="menu" aria-label={g.title} style={{ background: bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 6, minWidth: 250, boxShadow: "0 10px 28px rgba(0,0,0,0.3)" }}>
                        <div style={{ padding: "4px 10px 6px", fontSize: 11, opacity: 0.6, fontFamily: colors.font }}>{g.title}</div>
                        {g.tools.map(({ id, label, Icon }) => (
                          <button key={id} type="button" role="menuitem" onClick={() => { startTool(id); setFlyout(null); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8, border: "none", background: tool === id ? soft : "transparent", color: tool === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 13, cursor: "pointer" }}>
                            <Icon size={22} />
                            <span style={{ flex: 1 }}>{label}</span>
                            {HOTKEYS[id] && <span style={{ fontSize: 11, opacity: 0.55 }}>{HOTKEYS[id]}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", borderTop: `1px solid ${colors.border}`, marginTop: 3, paddingTop: 3 }}>
              <button type="button" title="Eraser (tap a drawing)" aria-label="Eraser" aria-pressed={tool === "eraser"} onClick={() => startTool("eraser")} style={railBtn(tool === "eraser")}>
                <Eraser size={18} />
              </button>
            </div>
          </div>
        )}

        <div ref={areaRef} style={{ position: "relative", isolation: "isolate", flex: 1, minWidth: 0 }}>
          <canvas
            ref={canvasRef}
            aria-label="Price chart"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerLeave={onPointerLeave}
            onDoubleClick={onDoubleClick}
            style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", touchAction: "none", cursor: pickMode || tool ? "crosshair" : "default", userSelect: "none" }}
          />
          {manualScale && (
            <button type="button" title="Back to automatic price scale" aria-label="Automatic price scale" onClick={() => { eng.resetAuto(); setManualScale(false); markDirty(); }} style={{ position: "absolute", right: 4, bottom: 30, zIndex: 6, height: 24, padding: "0 8px", borderRadius: 6, border: `1px solid ${colors.border}`, background: bg, color: colors.text, fontFamily: colors.font, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Auto
            </button>
          )}
          {compact && (
            <div style={{ position: "absolute", left: 6, top: 8, zIndex: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { key: "cursor", label: "Cursor", Icon: MousePointer2, active: !tool, onClick: () => startTool(null) },
                { key: "tools", label: "Drawing tools", Icon: ToolsIcon, active: !!activeDef, onClick: () => setSheet(true) },
                { key: "eraser", label: "Eraser", Icon: Eraser, active: tool === "eraser", onClick: () => startTool("eraser") },
                { key: "magnet", label: "Magnet", Icon: Magnet, active: magnet, onClick: () => setMagnet((v) => !v) },
                { key: "undo", label: "Undo last drawing", Icon: Undo2, active: false, disabled: !count, onClick: undo },
              ].map(({ key, label, Icon, active, disabled, onClick }) => (
                <button key={key} type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={onClick} style={{ width: 40, height: 40, borderRadius: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, background: active ? DRAW_COLOR : bg, color: active ? "#fff" : colors.text, border: `1px solid ${active ? DRAW_COLOR : colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
          )}
          {hint && (
            <div style={{ position: "absolute", left: compact ? 54 : 10, top: 8, zIndex: 6, pointerEvents: "none", background: hexA(DRAW_COLOR, 0.92), color: "#fff", fontFamily: colors.font, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, maxWidth: "80%", boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }}>
              {hint}{compact ? "" : ". Esc cancels"}
            </div>
          )}
          {selected && !tool && (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", ...(compact ? { bottom: 38 } : { top: 8 }), zIndex: 7, display: "flex", alignItems: "center", gap: 8, background: bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "6px 10px", maxWidth: "94%", overflowX: "auto", scrollbarWidth: "none", boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}>
              {showStyleBar && (
                <>
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchSelected({ color: c })} style={{ width: 20, height: 20, borderRadius: 10, background: c, border: curStyle.color === c ? "2px solid #fff" : "2px solid transparent", outline: curStyle.color === c ? `2px solid ${hexA(c, 0.5)}` : "none", padding: 0, cursor: "pointer", flexShrink: 0 }} />
                  ))}
                  <span style={{ width: 1, height: 20, background: colors.border, flexShrink: 0 }} />
                  {[2, 3, 4].map((w, i) => (
                    <button key={w} type="button" aria-label={`Line thickness ${i + 1}`} onClick={() => patchSelected({ width: w })} style={{ width: 28, height: 26, borderRadius: 6, border: "none", background: curStyle.width === w ? soft : "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>
                      <span style={{ width: 14, height: w, background: curStyle.width === w ? DRAW_COLOR : colors.text, borderRadius: 2 }} />
                    </button>
                  ))}
                  <button type="button" aria-label="Dashed line" aria-pressed={curStyle.dash !== "solid"} onClick={() => patchSelected({ dash: curStyle.dash === "solid" ? "dashed" : "solid" })} style={{ width: 28, height: 26, borderRadius: 6, border: "none", background: curStyle.dash !== "solid" ? soft : "transparent", color: curStyle.dash !== "solid" ? DRAW_COLOR : colors.text, cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    - -
                  </button>
                  <span style={{ width: 1, height: 20, background: colors.border, flexShrink: 0 }} />
                </>
              )}
              <button type="button" aria-label="Drawing settings" title="Settings" onClick={() => setSettings(true)} style={{ ...btn(false), width: 28, height: 26, border: "none" }}>
                <Settings2 size={15} />
              </button>
              <button type="button" aria-label="Delete drawing" title="Delete" onClick={deleteSelected} style={{ ...btn(false), width: 28, height: 26, border: "none", color: colors.down }}>
                <Trash2 size={15} />
              </button>
              <button type="button" aria-label="Deselect" title="Done" onClick={() => setSelected(null)} style={{ ...btn(false), width: 28, height: 26, border: "none" }}>
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {full && footer ? <div style={{ flexShrink: 0, padding: "10px 12px" }}>{footer}</div> : null}

      {settingsOpen && ov && (
        <>
          <div onClick={() => setSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200 }} />
          <div role="dialog" aria-label="Drawing settings" style={{ position: "fixed", zIndex: 1201, background: bg, color: colors.text, fontFamily: colors.font, border: `1px solid ${colors.border}`, boxSizing: "border-box", overflowY: "auto", ...(compact ? { left: 0, right: 0, bottom: 0, borderRadius: "18px 18px 0 0", maxHeight: "78vh", padding: "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))" } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 360, maxWidth: "94vw", maxHeight: "86vh", borderRadius: 14, padding: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }) }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{NAME_LABEL[ov.name] || "Drawing"} settings</div>
              <button type="button" aria-label="Close" onClick={() => setSettings(false)} style={{ ...btn(false), border: "none" }}>
                <X size={18} />
              </button>
            </div>
            {!NO_STYLE_BAR.includes(ov.name) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, opacity: 0.65, marginBottom: 6 }}>Line</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchSelected({ color: c })} style={{ width: 24, height: 24, borderRadius: 12, background: c, border: curStyle.color === c ? "2px solid #fff" : `1px solid ${colors.border}`, outline: curStyle.color === c ? `2px solid ${hexA(c, 0.55)}` : "none", padding: 0, cursor: "pointer" }} />
                  ))}
                  <input type="color" aria-label="Custom colour" value={/^#[0-9a-f]{6}$/i.test(curStyle.color) ? curStyle.color : DRAW_COLOR} onChange={(e) => patchSelected({ color: e.target.value })} style={{ width: 28, height: 28, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 6, background: "transparent", cursor: "pointer" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 12.5 }}>
                  <span style={{ width: 70 }}>Opacity</span>
                  <input type="range" min="10" max="100" value={Math.round(curStyle.opacity * 100)} onChange={(e) => patchSelected({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1 }} />
                  <span style={{ width: 36, textAlign: "right" }}>{Math.round(curStyle.opacity * 100)}%</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5 }}>
                  <span style={{ width: 70 }}>Thickness</span>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <button key={w} type="button" aria-label={`Thickness ${w}`} onClick={() => patchSelected({ width: w })} style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${curStyle.width === w ? DRAW_COLOR : colors.border}`, background: curStyle.width === w ? soft : "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <span style={{ width: 16, height: w, background: curStyle.width === w ? DRAW_COLOR : colors.text, borderRadius: 2 }} />
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5 }}>
                  <span style={{ width: 70 }}>Style</span>
                  {[["solid", "Solid"], ["dashed", "Dashed"], ["dotted", "Dotted"]].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => patchSelected({ dash: v })} style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${curStyle.dash === v ? DRAW_COLOR : colors.border}`, background: curStyle.dash === v ? soft : "transparent", color: curStyle.dash === v ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(ov.name === "btRect" || ov.name === "btEllipse" || ov.name === "btTriangle") && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 12.5 }}>
                <span style={{ width: 70 }}>Fill</span>
                <input type="range" min="0" max="60" value={Math.round(((ov.extendData && Number.isFinite(ov.extendData.fill) ? ov.extendData.fill : 0.14)) * 100)} onChange={(e) => patchExtend({ fill: Number(e.target.value) / 100 })} style={{ flex: 1 }} />
                <span style={{ width: 36, textAlign: "right" }}>{Math.round(((ov.extendData && Number.isFinite(ov.extendData.fill) ? ov.extendData.fill : 0.14)) * 100)}%</span>
              </label>
            )}
            {ov.name === "btText" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, opacity: 0.65, marginBottom: 6 }}>Text</div>
                <input type="text" maxLength={60} defaultValue={typeof ov.extendData === "string" ? ov.extendData : (ov.extendData && ov.extendData.text) || ""} onChange={(e) => patchExtend({ text: e.target.value })} style={{ width: "100%", boxSizing: "border-box", height: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, padding: "0 10px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                  {[11, 13, 16, 20, 26].map((z) => (
                    <button key={z} type="button" onClick={() => patchExtend({ size: z })} style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${((ov.extendData && ov.extendData.size) || 13) === z ? DRAW_COLOR : colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                      {z}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {ov.points.length > 0 && ov.points.length <= 4 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, opacity: 0.65, marginBottom: 6 }}>Price levels</div>
                {ov.points.map((pt, i) => {
                  const label = ov.name === "btLong" || ov.name === "btShort" ? ["Entry", "Stop loss", "Take profit"][i] : `Point ${i + 1}`;
                  return (
                    <label key={`${ov.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12.5 }}>
                      <span style={{ width: 70 }}>{label}</span>
                      <input type="number" step="any" defaultValue={Number.isFinite(pt.value) ? Number(pt.value.toFixed(precision)) : ""} key={`${ov.id}-${i}-${Number.isFinite(pt.value) ? pt.value.toFixed(precision) : ""}`} onBlur={(e) => setPointValue(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, padding: "0 10px" }} />
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={cloneSelected} style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Copy size={14} /> Clone
              </button>
              <button type="button" onClick={() => { setSettings(false); deleteSelected(); }} style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${colors.border}`, background: "transparent", color: colors.down, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
              <button type="button" onClick={() => setSettings(false)} style={{ flex: 1, height: 36, borderRadius: 9, border: "none", background: DRAW_COLOR, color: "#fff", fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {ofDialog && (
        <>
          <div onClick={() => setOfDialog(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200 }} />
          <div role="dialog" aria-label="Order flow settings" style={{ position: "fixed", zIndex: 1201, background: bg, color: colors.text, fontFamily: colors.font, border: `1px solid ${colors.border}`, boxSizing: "border-box", overflowY: "auto", ...(compact ? { left: 0, right: 0, bottom: 0, borderRadius: "18px 18px 0 0", maxHeight: "86vh", padding: "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))" } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 400, maxWidth: "94vw", maxHeight: "88vh", borderRadius: 14, padding: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }) }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>Order flow settings</div>
              <button type="button" aria-label="Close" onClick={() => setOfDialog(false)} style={{ ...btn(false), border: "none" }}>
                <X size={18} />
              </button>
            </div>
            {(() => {
              const row = { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 12.5 };
              const lab = { width: 112, flexShrink: 0 };
              const check = (key, text) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!of[key]} onChange={(e) => patchOf({ [key]: e.target.checked })} />
                  {text}
                </label>
              );
              const color = (key, text) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, flex: "1 1 45%", cursor: "pointer" }}>
                  <input type="color" value={of[key]} onChange={(e) => patchOf({ [key]: e.target.value })} style={{ width: 28, height: 24, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 6, background: "transparent" }} />
                  {text}
                </label>
              );
              return (
                <>
                  <div style={row}>
                    <span style={lab}>Show</span>
                    <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
                      {OF_MODES.map(([id, label]) => (
                        <button key={id} type="button" onClick={() => patchOf({ mode: id })} style={{ flex: "1 1 45%", minHeight: 30, borderRadius: 8, border: `1px solid ${of.mode === id ? DRAW_COLOR : colors.border}`, background: of.mode === id ? soft : "transparent", color: of.mode === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                          {label.replace("Order flow: ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                  {check("numbers", "Show bid x ask numbers in the footprint")}
                  {check("imbalance", "Highlight imbalances")}
                  <div style={row}>
                    <span style={lab}>Imbalance ratio</span>
                    <input type="range" min="2" max="10" step="0.5" value={of.ratio} onChange={(e) => patchOf({ ratio: Number(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ width: 40, textAlign: "right" }}>{of.ratio}x</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {color("buyColor", "Buy (ask)")}
                    {color("sellColor", "Sell (bid)")}
                    {color("pocColor", "Point of control")}
                    {color("cvdColor", "Cumulative delta")}
                  </div>
                  <p style={{ opacity: 0.65, fontSize: 11.5, lineHeight: 1.5, margin: "0 0 12px" }}>
                    Built from Dukascopy tick data: each tick's volume goes to the buy side when the price ticked up and to the sell side when it ticked down. Forex has no central tape, so treat it as an estimate. Zoom in to read the numbers.
                  </p>
                  <button type="button" onClick={() => setOf({ ...OF_DEFAULTS, mode: of.mode === "off" ? "footprint" : of.mode })} style={{ width: "100%", height: 36, borderRadius: 9, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    Reset to defaults
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {vpDialog && (
        <>
          <div onClick={() => setVpDialog(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200 }} />
          <div role="dialog" aria-label="Volume profile settings" style={{ position: "fixed", zIndex: 1201, background: bg, color: colors.text, fontFamily: colors.font, border: `1px solid ${colors.border}`, boxSizing: "border-box", overflowY: "auto", ...(compact ? { left: 0, right: 0, bottom: 0, borderRadius: "18px 18px 0 0", maxHeight: "86vh", padding: "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))" } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 400, maxWidth: "94vw", maxHeight: "88vh", borderRadius: 14, padding: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }) }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>Volume profile settings</div>
              <button type="button" aria-label="Close" onClick={() => setVpDialog(false)} style={{ ...btn(false), border: "none" }}>
                <X size={18} />
              </button>
            </div>
            {(() => {
              const row = { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 12.5 };
              const lab = { width: 112, flexShrink: 0 };
              const seg = (opts, value, onPick) => (
                <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
                  {opts.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => onPick(v)} style={{ flex: 1, minWidth: 64, height: 30, borderRadius: 8, border: `1px solid ${value === v ? DRAW_COLOR : colors.border}`, background: value === v ? soft : "transparent", color: value === v ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
              );
              const num = { width: 80, height: 30, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, padding: "0 8px" };
              const check = (key, text) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!vp[key]} onChange={(e) => patchVp({ [key]: e.target.checked })} />
                  {text}
                </label>
              );
              const color = (key, text) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, flex: "1 1 45%", cursor: "pointer" }}>
                  <input type="color" value={vp[key]} onChange={(e) => patchVp({ [key]: e.target.value })} style={{ width: 28, height: 24, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 6, background: "transparent" }} />
                  {text}
                </label>
              );
              return (
                <>
                  <div style={row}>
                    <span style={lab}>Profile</span>
                    {seg([["off", "Off"], ["range", "Visible range"], ["session", "Session"]], vp.mode, (v) => patchVp({ mode: v }))}
                  </div>
                  {vp.mode === "session" && (
                    <div style={row}>
                      <span style={lab}>Session</span>
                      <select value={vp.session} onChange={(e) => patchVp({ session: e.target.value })} style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, padding: "0 8px" }}>
                        {Object.entries(VP_SESSIONS).map(([id, def]) => (
                          <option key={id} value={id}>{def.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={row}>
                    <span style={lab}>Rows layout</span>
                    {seg([["rows", "Number of rows"], ["size", "Price per row"]], vp.layout, (v) => patchVp({ layout: v }))}
                  </div>
                  <div style={row}>
                    <span style={lab}>{vp.layout === "rows" ? "Number of rows" : "Row size (price)"}</span>
                    {vp.layout === "rows" ? (
                      <input type="number" min="5" max="400" step="1" value={vp.rows} onChange={(e) => patchVp({ rows: Math.max(5, Math.min(400, Number(e.target.value) || 24)) })} style={num} />
                    ) : (
                      <input type="number" min="0" step="any" value={vp.rowSize} onChange={(e) => patchVp({ rowSize: Math.max(0, Number(e.target.value) || 0) })} style={num} />
                    )}
                  </div>
                  <div style={row}>
                    <span style={lab}>Volume</span>
                    {seg([["updown", "Up/Down"], ["total", "Total"], ["delta", "Delta"]], vp.volume, (v) => patchVp({ volume: v }))}
                  </div>
                  <div style={row}>
                    <span style={lab}>Value area volume</span>
                    <input type="range" min="10" max="100" value={vp.vaPct} onChange={(e) => patchVp({ vaPct: Number(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ width: 40, textAlign: "right" }}>{vp.vaPct}%</span>
                  </div>
                  <div style={row}>
                    <span style={lab}>Placement</span>
                    {seg([["left", "Left"], ["right", "Right"]], vp.placement, (v) => patchVp({ placement: v }))}
                  </div>
                  <div style={row}>
                    <span style={lab}>Width</span>
                    <input type="range" min="5" max="100" value={vp.width} onChange={(e) => patchVp({ width: Number(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ width: 40, textAlign: "right" }}>{vp.width}%</span>
                  </div>
                  <div style={{ marginTop: 4, marginBottom: 6 }}>
                    {check("showPoc", "Point of control (POC) line")}
                    {check("extendPoc", "Extend POC line to the right edge")}
                    {check("showVa", "Value area high / low lines")}
                    {check("showLabels", "Show price labels")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    {color("upColor", "Up volume")}
                    {color("downColor", "Down volume")}
                    {color("pocColor", "POC line")}
                    {color("vaColor", "Value area lines")}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setVp({ ...VP_DEFAULTS, mode: vp.mode === "off" ? "range" : vp.mode })} style={{ flex: 1, height: 36, borderRadius: 9, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      Reset to defaults
                    </button>
                    <button type="button" onClick={() => setVpDialog(false)} style={{ flex: 1, height: 36, borderRadius: 9, border: "none", background: DRAW_COLOR, color: "#fff", fontFamily: colors.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {sheet && (
        <>
          <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100 }} />
          <div role="dialog" aria-label="Drawing tools" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1101, background: bg, borderTop: `1px solid ${colors.border}`, borderRadius: "18px 18px 0 0", padding: "12px 14px calc(16px + env(safe-area-inset-bottom, 0px))", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: colors.border, margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <div style={{ flex: 1, color: colors.text, fontFamily: colors.font, fontSize: 13, fontWeight: 700 }}>Drawing tools</div>
              <button type="button" aria-label="Close" onClick={() => setSheet(false)} style={{ ...btn(false), border: "none" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ color: colors.text, opacity: 0.6, fontFamily: colors.font, fontSize: 11.5, marginBottom: 6 }}>Order flow</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {OF_MODES.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => { patchOf({ mode: id }); setSheet(false); }} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${of.mode === id ? DRAW_COLOR : colors.border}`, background: of.mode === id ? soft : "transparent", color: of.mode === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                    {label.replace("Order flow: ", "")}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setOfDialog(true); setSheet(false); }} style={{ marginTop: 8, width: "100%", height: 40, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Order flow settings...
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ color: colors.text, opacity: 0.6, fontFamily: colors.font, fontSize: 11.5, marginBottom: 6 }}>Volume profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[["off", "Off"], ["range", "Visible range"], ["session", "Session"]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => { setProfile(id); setSheet(false); }} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${profile === id ? DRAW_COLOR : colors.border}`, background: profile === id ? soft : "transparent", color: profile === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 12, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { setVpDialog(true); setSheet(false); }} style={{ marginTop: 8, width: "100%", height: 40, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Volume profile settings...
            </button>
            <button type="button" onClick={() => { setHidden((v) => !v); setSheet(false); }} style={{ marginTop: 6, width: "100%", height: 40, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontFamily: colors.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {hidden ? "Show drawings" : "Hide drawings"}
            </button>
            <button type="button" onClick={() => { clearAll(); setSheet(false); }} disabled={!count} style={{ marginTop: 6, width: "100%", height: 40, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.down, fontFamily: colors.font, fontSize: 13, fontWeight: 700, cursor: count ? "pointer" : "not-allowed", opacity: count ? 1 : 0.45 }}>
              Clear all drawings
            </button>
            {TOOL_GROUPS.map((g) => (
              <div key={g.title} style={{ marginTop: 10 }}>
                <div style={{ color: colors.text, opacity: 0.6, fontFamily: colors.font, fontSize: 11.5, marginBottom: 6 }}>{g.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {g.tools.map(({ id, label, Icon }) => (
                    <button key={id} type="button" onClick={() => startTool(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 66, padding: "8px 4px", borderRadius: 12, border: `1px solid ${tool === id ? DRAW_COLOR : colors.border}`, background: tool === id ? soft : "transparent", color: tool === id ? DRAW_COLOR : colors.text, fontFamily: colors.font, fontSize: 10.5, lineHeight: 1.2, cursor: "pointer", textAlign: "center" }}>
                      <Icon size={21} />
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

// If anything inside the chart ever throws, show what happened (so it can be reported) instead of a blank screen.
class ChartBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Chart error:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const colors = this.props.colors || {};
    return (
      <div role="alert" style={{ padding: 16, border: `1px solid ${colors.border || "#ccc"}`, borderRadius: 12, color: colors.text || "inherit", fontFamily: colors.font }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>The chart ran into a problem.</div>
        <div style={{ fontSize: 12.5, opacity: 0.8, marginBottom: 10, wordBreak: "break-word" }}>{String((error && error.message) || error)}</div>
        <button type="button" onClick={() => this.setState({ error: null })} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${colors.border || "#ccc"}`, background: "transparent", color: "inherit", cursor: "pointer", fontFamily: colors.font }}>
          Try again
        </button>
      </div>
    );
  }
}

export default function TredziChart(props) {
  return (
    <ChartBoundary key={props.sessionKey} colors={props.colors}>
      <TredziChartInner {...props} />
    </ChartBoundary>
  );
}
