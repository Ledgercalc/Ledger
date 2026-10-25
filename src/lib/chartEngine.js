// Tredzi's own chart engine. No chart library: just a 2D canvas.
// It owns the view (zoom, scroll, price range), converts between screen pixels and (bar index, price),
// and paints candles, grid, axes, last-price tag and crosshair. Drawings, trade markers and entry/SL/TP
// lines are painted by the caller through the `plot` hook, using the same coordinate functions.
//
// A candle is { time (unix seconds, UTC), open, high, low, close }.
// "Logical" index = position in the candle array (0 = first candle). Fractions are allowed.

const MIN_SPACING = 1.5;
const MAX_SPACING = 140;

const NICE = [1, 2, 2.5, 5, 10];
function niceStep(raw) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  for (const n of NICE) if (f <= n + 1e-9) return n * pow;
  return 10 * pow;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n) => String(n).padStart(2, "0");


export const VP_DEFAULTS = {
  mode: "off", // off | range | session
  layout: "rows", // rows (number of rows) | size (price per row)
  rows: 24,
  rowSize: 1,
  volume: "updown", // updown | total | delta
  vaPct: 70,
  placement: "right", // left | right
  width: 30, // % of the chart (range) or of the session width (session)
  session: "daily",
  showPoc: true,
  showVa: true,
  showLabels: true,
  extendPoc: false,
  upColor: "#2962ff",
  downColor: "#fbc02d",
  pocColor: "#f23645",
  vaColor: "#2962ff",
};

// Volume footprint settings. mode: off | footprint | both (footprint + a volume bar strip under the candles)
export const OF_DEFAULTS = {
  mode: "off",
  view: "volume", // what the cells show: volume (tick count) | delta (buy - sell) | both (sell x buy per price)
  numbers: true, // numbers inside the cells (when there is room)
  color: "#2962ff",
  pocColor: "#f5c542",
};

// compact volume text for footprint cells
function fmtV(v) {
  const a = Math.abs(v);
  if (a >= 1000) return `${(a / 1000).toFixed(1)}k`;
  if (a >= 100) return String(Math.round(a));
  if (a >= 1) return String(+a.toFixed(1)); // 12, 3.5 (tick counts)
  if (a >= 0.005) return String(+a.toFixed(2)); // 0.12 (Dukascopy volume units in the candle estimate)
  return "0";
}
const fmtS = (v) => (Math.abs(v) < 0.005 ? "0" : (v > 0 ? "+" : "-") + fmtV(v)); // signed, for delta

// Sessions in UTC: off = start offset from 00:00 UTC (seconds), len = length.
export const VP_SESSIONS = {
  daily: { label: "Daily (00:00 UTC)", short: "daily", off: 0, len: 86400 },
  forex: { label: "Forex day (22:00 UTC)", short: "forex day", off: -7200, len: 86400 },
  asia: { label: "Asia (00:00-09:00 UTC)", short: "Asia", off: 0, len: 32400 },
  london: { label: "London (07:00-16:00 UTC)", short: "London", off: 25200, len: 32400 },
  newyork: { label: "New York (12:00-21:00 UTC)", short: "New York", off: 43200, len: 32400 },
};

export class ChartEngine {
  constructor() {
    this.candles = [];
    this.count = 0; // how many candles are shown (the replay position); lets the chart use one big array without copying it
    this.vp = { ...VP_DEFAULTS };
    this.src = null; // 1-minute arrays under the chart, used by the volume profile
    this.profileCache = new Map();
    this.flow = null; // order flow records (see lib/flowStore.js buildFlow)
    this.of = { ...OF_DEFAULTS };
    this._ofCache = new Map();
    this._estCache = new Map();
    this._ofTot = null;
    this.hasVolume = false;
    this.w = 300;
    this.h = 200;
    this.dpr = 1;
    this.axisW = 64;
    this.axisH = 26;
    this.barSpacing = 9;
    this.rightEdge = 8; // logical index at the right edge of the plot
    this.manual = false; // price range was moved by hand
    this.pMin = 0;
    this.pMax = 1;
    this.barSec = 60;
    this.precision = 2;
    this.crosshair = null; // { x, y } in css pixels, or null
    this.theme = { bg: "#ffffff", text: "#444", grid: "#e8e8e8", border: "#cfcfcf", up: "#089981", down: "#f23645", font: "sans-serif" };
  }

  get plotW() {
    return Math.max(20, this.w - this.axisW);
  }
  get plotH() {
    return Math.max(20, this.h - this.axisH);
  }

  setTheme(t) {
    this.theme = { ...this.theme, ...t };
  }
  setPrecision(p) {
    this.precision = Number.isFinite(p) ? p : 2;
    this.axisW = this.precision >= 5 ? 72 : this.precision >= 3 ? 66 : 62;
  }
  resize(w, h, dpr) {
    this.w = Math.max(60, w);
    this.h = Math.max(60, h);
    this.dpr = dpr || 1;
  }

  // ---- data ----
  // reset = new dataset: jump to the latest candles. Otherwise keep the view; if you were looking at the
  // newest candle, new candles scroll into view (that is what replay stepping does).
  get n() {
    return this.count;
  }

  setData(list, reset, limit) {
    const prevN = this.count;
    const sameList = list === this.candles;
    this.candles = list;
    const n = Number.isFinite(limit) ? Math.max(0, Math.min(limit, list.length)) : list.length;
    this.count = n;
    this.profileCache.clear();
    if (!sameList) {
      this._ofCache.clear();
      this._estCache.clear();
      this._ofTot = null;
    }
    this._rangeProf = null;
    this.src = list.m1 || null;
    this.hasVolume = false;
    for (let i = 0, step = Math.max(1, Math.floor(n / 200)); i < n; i += step) {
      if (list[i].volume > 0) {
        this.hasVolume = true;
        break;
      }
    }
    if (n > 2) {
      const d = [];
      for (let i = 1; i < Math.min(n, 40); i++) if (list[i].time > list[i - 1].time) d.push(list[i].time - list[i - 1].time);
      d.sort((a, b) => a - b);
      this.barSec = d[Math.floor(d.length / 2)] || 60;
    }
    // price size of one level when order flow is estimated from candles (1 pip on forex, 0.1 on gold ...)
    if (n > 0) {
      const px = list[Math.floor(n / 2)].close;
      this._estStep = px > 0 ? Math.pow(10, Math.floor(Math.log10(px * 1e-4))) : 0.0001;
      // Dukascopy's volume units can be tiny. Rescale so a typical 1-minute candle is about 100, which keeps the
      // footprint numbers readable at any size (relative units, not tick counts).
      const mv = [];
      const sr = this.src && this.barSec > 60 ? this.src : null;
      if (sr) {
        for (let i = 0, k = Math.max(1, Math.floor(sr.n / 300)); i < sr.n; i += k) if (sr.vol[i] > 0) mv.push(sr.vol[i]);
      } else {
        for (let i = 0, k = Math.max(1, Math.floor(n / 300)); i < n; i += k) if (list[i].volume > 0) mv.push(list[i].volume / Math.max(1, this.barSec / 60));
      }
      mv.sort((a, b) => a - b);
      const med = mv[mv.length >> 1];
      this._estScale = med > 0 ? 100 / med : 100;
    }
    if (reset || prevN === 0) {
      this.rightEdge = n - 1 + 8;
      this.manual = false;
      return;
    }
    if (n > prevN && this.rightEdge >= prevN - 1.5) this.rightEdge += n - prevN;
    this.clampView();
  }

  timeAt(l) {
    const n = this.n;
    if (!n) return null;
    const i = Math.round(l);
    if (i >= 0 && i < n) return this.candles[i].time;
    return i < 0 ? this.candles[0].time + i * this.barSec : this.candles[n - 1].time + (i - (n - 1)) * this.barSec;
  }
  // time -> fractional logical index (binary search, extrapolating past the ends)
  logicalAt(t) {
    const c = this.candles;
    const n = this.n;
    if (!n) return 0;
    if (t <= c[0].time) return (t - c[0].time) / this.barSec;
    if (t >= c[n - 1].time) return n - 1 + (t - c[n - 1].time) / this.barSec;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid].time <= t) lo = mid;
      else hi = mid;
    }
    return lo + (t - c[lo].time) / Math.max(1, c[hi].time - c[lo].time);
  }

  // ---- coordinates ----
  xOf(l) {
    return this.plotW - (this.rightEdge - l) * this.barSpacing;
  }
  lOf(x) {
    return this.rightEdge - (this.plotW - x) / this.barSpacing;
  }
  yOf(p) {
    return (this.plotH * (this.pMax - p)) / (this.pMax - this.pMin);
  }
  pOf(y) {
    return this.pMax - (y / this.plotH) * (this.pMax - this.pMin);
  }
  region(x, y) {
    if (x > this.plotW && y <= this.plotH) return "price";
    if (y > this.plotH && x <= this.plotW) return "time";
    if (x > this.plotW && y > this.plotH) return "corner";
    return "plot";
  }

  // ---- view changes ----
  clampView() {
    const n = this.n;
    const perScreen = this.plotW / this.barSpacing;
    const maxEdge = n - 1 + perScreen * 0.7;
    const minEdge = Math.min(n - 1, perScreen * 0.3);
    if (this.rightEdge > maxEdge) this.rightEdge = maxEdge;
    if (this.rightEdge < minEdge) this.rightEdge = minEdge;
  }
  panBars(dxPx) {
    this.rightEdge -= dxPx / this.barSpacing;
    this.clampView();
  }
  panPrice(dyPx) {
    this.fitIfAuto();
    const per = (this.pMax - this.pMin) / this.plotH;
    this.pMin += dyPx * per;
    this.pMax += dyPx * per;
    this.manual = true;
  }
  zoomAt(x, factor) {
    const l = this.lOf(x);
    this.barSpacing = Math.min(MAX_SPACING, Math.max(MIN_SPACING, this.barSpacing * factor));
    this.rightEdge = l + (this.plotW - x) / this.barSpacing;
    this.clampView();
  }
  scalePrice(dyPx) {
    this.fitIfAuto();
    const mid = (this.pMax + this.pMin) / 2;
    const half = ((this.pMax - this.pMin) / 2) * Math.exp(dyPx * 0.006);
    this.pMin = mid - half;
    this.pMax = mid + half;
    this.manual = true;
  }
  resetAuto() {
    this.manual = false;
  }

  visible() {
    const n = this.n;
    const from = Math.max(0, Math.floor(this.lOf(0)) - 1);
    const to = Math.min(n - 1, Math.ceil(this.lOf(this.plotW)) + 1);
    return { from, to };
  }

  fitIfAuto() {
    if (this.manual) return;
    const { from, to } = this.visible();
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i <= to; i++) {
      const c = this.candles[i];
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = this.pMin;
      hi = this.pMax;
    }
    if (hi - lo < 1e-9) {
      hi += 0.5;
      lo -= 0.5;
    }
    const pad = (hi - lo) * 0.09;
    this.pMin = lo - pad;
    this.pMax = hi + pad;
    const sh = this.stripH();
    if (sh) {
      // keep the candles above the volume strip
      const f = Math.min(0.5, sh / this.plotH);
      this.pMin -= ((this.pMax - this.pMin) * f) / (1 - f);
    }
  }

  // ---- painting ----
  fmtPrice(p) {
    return p.toFixed(this.precision);
  }
  fmtTick(ts, prevTs) {
    const d = new Date(ts * 1000);
    if (this.barSec >= 86400) {
      if (!prevTs || new Date(prevTs * 1000).getUTCMonth() !== d.getUTCMonth()) return d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MONTHS[d.getUTCMonth()];
      return String(d.getUTCDate());
    }
    if (!prevTs || new Date(prevTs * 1000).getUTCDate() !== d.getUTCDate()) return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
    return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
  }
  fmtFull(ts) {
    const d = new Date(ts * 1000);
    const date = `${two(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
    return this.barSec >= 86400 ? date : `${date}  ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
  }

  chip(ctx, text, x, y, bg, fg, align = "left") {
    ctx.font = `600 11px ${this.theme.font}`;
    const w = ctx.measureText(text).width + 10;
    const h = 18;
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, y - h / 2, w, h, 4);
    else ctx.rect(left, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, left + 5, y + 0.5);
  }

  // ---- volume profile (modelled on TradingView's) ----
  // Volume of each small candle is spread evenly over the price rows it touched. When 1-minute data sits under the
  // chart (loaded from Dukascopy), the profile is built from those minutes, whatever timeframe you are looking at,
  // which is much more accurate than spreading a whole 1h or 4h candle over its range. Without volume in the data,
  // every candle counts the same ("time at price").
  setProfile(s) {
    this.vp = { ...VP_DEFAULTS, ...s };
    this.profileCache.clear();
    this._rangeProf = null;
  }

  get profileMode() {
    return this.vp.mode;
  }

  lowerBound(t) {
    let lo = 0;
    let hi = this.n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.candles[mid].time < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // Build the histogram for [tStart, tEnd) between prices lo and hi.
  computeProfile(tStart, tEnd, lo, hi) {
    const vp = this.vp;
    let rows;
    let step;
    if (vp.layout === "size") {
      step = Math.max(Number(vp.rowSize) || 0, (hi - lo) / 400);
      lo = Math.floor(lo / step) * step;
      rows = Math.max(1, Math.ceil((hi - lo) / step));
    } else {
      rows = Math.max(2, Math.min(400, Math.round(vp.rows)));
      step = (hi - lo) / rows;
    }
    if (!(step > 0)) return null;
    const up = new Float64Array(rows);
    const dn = new Float64Array(rows);
    const src = this.src && this.barSec > 60 ? this.src : null;
    const hasVol = src ? src.hasVol : this.hasVolume;
    const spread = (low, high, w, isUp) => {
      let i0 = Math.floor((low - lo) / step);
      let i1 = Math.floor((high - lo) / step);
      if (i1 < 0 || i0 > rows - 1) return;
      i0 = Math.max(0, i0);
      i1 = Math.min(rows - 1, i1);
      const per = w / (i1 - i0 + 1);
      const arr = isUp ? up : dn;
      for (let k = i0; k <= i1; k++) arr[k] += per;
    };
    if (src) {
      const lb = (t) => {
        let a = 0;
        let b = src.n;
        while (a < b) {
          const m = (a + b) >> 1;
          if (src.time[m] < t) a = m + 1;
          else b = m;
        }
        return a;
      };
      const i0 = lb(tStart);
      const i1 = lb(tEnd);
      for (let i = i0; i < i1; i++) {
        const w = hasVol ? src.vol[i] : 1;
        if (w > 0) spread(src.low[i], src.high[i], w, src.up[i] === 1);
      }
    } else {
      const cs = this.candles;
      const i0 = this.lowerBound(tStart);
      const i1 = this.lowerBound(tEnd);
      for (let i = i0; i < i1; i++) {
        const c = cs[i];
        const w = hasVol ? (c.volume > 0 ? c.volume : 0) : 1;
        if (w > 0) spread(c.low, c.high, w, c.close >= c.open);
      }
    }
    const tot = new Float64Array(rows);
    let sum = 0;
    let max = 0;
    let maxDelta = 0;
    let poc = 0;
    for (let k = 0; k < rows; k++) {
      tot[k] = up[k] + dn[k];
      sum += tot[k];
      maxDelta = Math.max(maxDelta, Math.abs(up[k] - dn[k]));
      if (tot[k] > max) {
        max = tot[k];
        poc = k;
      }
    }
    if (!(max > 0)) return null;
    // value area (standard method): from the point of control, compare the next two rows above with the next two
    // rows below, add the heavier pair, repeat until the chosen share of the volume is inside
    let vl = poc;
    let vh = poc;
    let acc = tot[poc];
    const target = sum * (Math.min(100, Math.max(1, vp.vaPct)) / 100);
    while (acc < target && (vl > 0 || vh < rows - 1)) {
      const canUp = vh < rows - 1;
      const canDn = vl > 0;
      const upSum = (canUp ? tot[vh + 1] : 0) + (vh + 2 < rows ? tot[vh + 2] : 0);
      const dnSum = (canDn ? tot[vl - 1] : 0) + (vl - 2 >= 0 ? tot[vl - 2] : 0);
      if (canUp && (!canDn || upSum >= dnSum)) {
        vh = Math.min(rows - 1, vh + 2);
        acc += upSum;
      } else {
        vl = Math.max(0, vl - 2);
        acc += dnSum;
      }
    }
    return { rows, lo, step, up, dn, tot, max, maxDelta, poc, val: vl, vah: vh };
  }

  paintProfileBars(ctx, prof, x0, dir, maxW) {
    const vp = this.vp;
    for (let r = 0; r < prof.rows; r++) {
      if (!(prof.tot[r] > 0)) continue;
      const yTop = this.yOf(prof.lo + (r + 1) * prof.step);
      const yBot = this.yOf(prof.lo + r * prof.step);
      const h = Math.max(1, yBot - yTop - 1);
      const inVa = r >= prof.val && r <= prof.vah;
      const alpha = inVa ? 0.62 : 0.3;
      ctx.globalAlpha = alpha;
      if (vp.volume === "delta") {
        const d = prof.up[r] - prof.dn[r];
        const w = prof.maxDelta > 0 ? (Math.abs(d) / prof.maxDelta) * maxW : 0;
        ctx.fillStyle = d >= 0 ? vp.upColor : vp.downColor;
        ctx.fillRect(dir > 0 ? x0 : x0 - w, yTop, w, h);
      } else if (vp.volume === "total") {
        const w = (prof.tot[r] / prof.max) * maxW;
        ctx.fillStyle = vp.upColor;
        ctx.fillRect(dir > 0 ? x0 : x0 - w, yTop, w, h);
      } else {
        const w = (prof.tot[r] / prof.max) * maxW;
        const wd = (prof.dn[r] / prof.tot[r]) * w;
        ctx.fillStyle = vp.downColor;
        ctx.fillRect(dir > 0 ? x0 : x0 - wd, yTop, wd, h);
        ctx.fillStyle = vp.upColor;
        ctx.fillRect(dir > 0 ? x0 + wd : x0 - w, yTop, w - wd, h);
      }
    }
    ctx.globalAlpha = 1;
  }

  paintProfileLines(ctx, prof, xFrom, xTo, labelRight) {
    const vp = this.vp;
    const price = {
      poc: prof.lo + (prof.poc + 0.5) * prof.step,
      vah: prof.lo + (prof.vah + 1) * prof.step,
      val: prof.lo + prof.val * prof.step,
    };
    const lines = [];
    if (vp.showPoc) lines.push(["POC", price.poc, vp.pocColor, false, vp.extendPoc ? this.plotW : xTo]);
    if (vp.showVa) {
      lines.push(["VAH", price.vah, vp.vaColor, true, xTo]);
      lines.push(["VAL", price.val, vp.vaColor, true, xTo]);
    }
    ctx.font = `600 10.5px ${this.theme.font}`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = labelRight ? "right" : "left";
    for (const [name, p, color, dashed, to] of lines) {
      const y = Math.round(this.yOf(p)) + 0.5;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = name === "POC" ? 1.5 : 1;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(xFrom, y);
      ctx.lineTo(to, y);
      ctx.stroke();
      if (vp.showLabels) ctx.fillText(`${name} ${this.fmtPrice(p)}`, labelRight ? xTo - 4 : xFrom + 4, y - 2);
    }
    ctx.setLineDash([]);
  }

  drawProfiles(ctx) {
    const vp = this.vp;
    if (vp.mode === "off" || !this.n) return;
    const { from, to } = this.visible();
    if (to < from) return;
    const plotW = this.plotW;
    const cs = this.candles;
    const sig = `${vp.layout}|${vp.rows}|${vp.rowSize}|${vp.vaPct}|${vp.session}|${this.src ? 1 : 0}`;
    if (vp.mode === "range") {
      const key = `r|${from}|${to}|${this.n}|${sig}`;
      if (!this._rangeProf || this._rangeProf.key !== key) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = from; i <= to; i++) {
          if (cs[i].low < lo) lo = cs[i].low;
          if (cs[i].high > hi) hi = cs[i].high;
        }
        this._rangeProf = { key, prof: hi > lo ? this.computeProfile(cs[from].time, cs[to].time + this.barSec, lo, hi) : null };
      }
      const prof = this._rangeProf.prof;
      if (prof) {
        const maxW = Math.max(20, (plotW * vp.width) / 100);
        const left = vp.placement === "left";
        this.paintProfileBars(ctx, prof, left ? 0 : plotW, left ? 1 : -1, maxW);
        this.paintProfileLines(ctx, prof, left ? 0 : plotW - maxW, left ? maxW : plotW, !left);
      }
    } else {
      // one profile per session; the session decides which minutes belong together
      const def = VP_SESSIONS[vp.session] || VP_SESSIONS.daily;
      const tv0 = cs[from].time;
      const tv1 = cs[to].time;
      for (let k = Math.floor((tv0 - def.off - def.len) / 86400); k * 86400 + def.off <= tv1; k++) {
        const tS = k * 86400 + def.off;
        const tE = tS + def.len;
        if (tE <= tv0) continue;
        const s = this.lowerBound(tS);
        const e = Math.min(this.n - 1, this.lowerBound(tE) - 1);
        if (e - s < 2) continue;
        // The minutes under the chart run on past the replay position, so cap the session at the last candle shown.
        const tEnd = Math.min(tE, cs[e].time + this.barSec);
        const key = `${tS}|${tEnd}|${this.n}|${sig}`;
        let item = this.profileCache.get(key);
        if (!item) {
          let lo = Infinity;
          let hi = -Infinity;
          for (let i = s; i <= e; i++) {
            if (cs[i].low < lo) lo = cs[i].low;
            if (cs[i].high > hi) hi = cs[i].high;
          }
          item = { prof: hi > lo ? this.computeProfile(tS, tEnd, lo, hi) : null };
          if (this.profileCache.size > 400) this.profileCache.delete(this.profileCache.keys().next().value);
          this.profileCache.set(key, item);
        }
        if (!item.prof) continue;
        const xs = this.xOf(s) - this.barSpacing / 2;
        const x1 = this.xOf(e) + this.barSpacing / 2;
        const x0 = Math.max(0, xs); // a session that began off-screen still shows from the left edge
        if (x1 <= 0 || xs >= plotW || x1 - x0 < 12) continue;
        const maxW = Math.min(plotW, Math.max(24, ((x1 - xs) * vp.width) / 100));
        const left = vp.placement === "left";
        this.paintProfileBars(ctx, item.prof, left ? x0 : Math.min(x1, plotW), left ? 1 : -1, maxW);
        this.paintProfileLines(ctx, item.prof, x0, Math.min(x1, plotW), !left);
      }
    }
    const srcNote = this.src && this.barSec > 60 ? "from 1-minute data" : "";
    const parts = [vp.mode === "range" ? "Volume profile (visible range)" : `Session volume profile (${(VP_SESSIONS[vp.session] || VP_SESSIONS.daily).short})`, srcNote, (this.src && this.barSec > 60 ? this.src.hasVol : this.hasVolume) ? "" : "no volume in this data: showing time at price"].filter(Boolean);
    ctx.font = `11px ${this.theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.theme.text;
    ctx.globalAlpha = 0.75;
    ctx.fillText(parts.join(" - "), 8, this.plotH - 8 - this.stripH());
    ctx.globalAlpha = 1;
  }

  // ---- volume footprint ----
  // Dukascopy's tick volume, added up per minute and per price level and kept in the browser. Any timeframe is
  // built from it by time bucket, so it lines up with whatever candles are on the chart. It is volume at price,
  // with no claim about who was buying or selling.
  setOrderFlow(s) {
    this.of = { ...OF_DEFAULTS, ...s };
    if (!["off", "footprint", "both"].includes(this.of.mode)) this.of.mode = "footprint"; // an older saved choice
    if (!["volume", "delta", "both"].includes(this.of.view)) this.of.view = "volume";
    this._ofCache.clear();
  }
  setFlow(f) {
    this.flow = f || null;
    this._ofCache.clear();
    this._ofTot = null;
  }
  flowStep() {
    return this.flow ? this.flow.step : this._estStep || 0.0001;
  }
  stripH() {
    if (!this.n || this.of.mode !== "both") return 0;
    return Math.round(Math.min(110, Math.max(60, this.plotH * 0.2)));
  }
  footprintOn() {
    const m = this.of.mode;
    return this.n > 0 && (m === "footprint" || m === "both") && this.barSpacing >= 8;
  }
  flowLB(t) {
    const f = this.flow;
    let lo = 0;
    let hi = f.n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (f.time[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  // total volume per candle
  ofTotals() {
    if (this._ofTot) return this._ofTot;
    const f = this.flow;
    const cs = this.candles;
    const len = cs.length;
    if (!len) return null;
    if (!f) {
      // no ticks loaded: volume per candle straight from the candles (delta is worked out per candle on demand)
      const v = new Float64Array(len);
      const sc = this._estScale || 1;
      for (let i = 0; i < len; i++) v[i] = (this.hasVolume ? Math.max(0, cs[i].volume || 0) : 1) * sc;
      this._ofTot = { vol: v, dlt: null };
      return this._ofTot;
    }
    const vol = new Float64Array(len);
    const dlt = new Float64Array(len);
    let ci = 0;
    for (let k = 0; k < f.n; k++) {
      const t = f.time[k];
      if (t < cs[0].time) continue;
      while (ci + 1 < len && cs[ci + 1].time <= t) ci++;
      if (t >= cs[ci].time + this.barSec) continue; // weekend or a missing candle
      vol[ci] += f.vol[k];
      dlt[ci] += 2 * f.buy[k] - f.vol[k];
    }
    this._ofTot = { vol, dlt };
    return this._ofTot;
  }
  // The footprint of one candle, with the price levels merged into rows of "mult" levels.
  ofCandle(i, mult) {
    const key = i * 4096 + Math.min(4095, mult);
    let r = this._ofCache.get(key);
    if (r) return r;
    const f = this.flow;
    const c = this.candles[i];
    let m;
    if (f) {
      m = new Map();
      const s = this.flowLB(c.time);
      const e = this.flowLB(c.time + this.barSec);
      for (let k = s; k < e; k++) {
        const bin = Math.floor(f.lvl[k] / mult);
        const cur = m.get(bin) || [0, 0];
        cur[0] += f.vol[k];
        cur[1] += f.buy[k];
        m.set(bin, cur);
      }
    } else m = this.estCandle(i, mult);
    // v = volume, b = buy ticks, s = sell ticks, d = delta
    const rows = [...m].map(([bin, [v, b]]) => ({ bin, v, b, s: v - b, d: 2 * b - v })).sort((p, q) => p.bin - q.bin);
    let poc = -1;
    let max = 0;
    let dmax = 0;
    rows.forEach((row, idx) => {
      if (row.v > max) {
        max = row.v;
        poc = idx;
      }
      if (Math.abs(row.d) > dmax) dmax = Math.abs(row.d);
    });
    r = { rows, poc, max, dmax };
    if (this._ofCache.size > 4000) this._ofCache.clear();
    this._ofCache.set(key, r);
    return r;
  }

  // No ticks needed: spread each 1-minute candle's volume over the prices it traded and split it buy/sell from how
  // it closed (an estimate, the same idea as the volume profile).
  // Fast: each minute adds to a difference array (one step per minute, not per price), the result is kept per
  // candle at the finest level, and zooming only re-groups those rows instead of recalculating anything.
  estBase(i) {
    let r = this._estCache.get(i);
    if (r) return r;
    const c = this.candles[i];
    const step = this._estStep || 0.0001;
    const sc = this._estScale || 1;
    const l0 = Math.round(c.low / step) - 1;
    const span = Math.round(c.high / step) + 2 - l0;
    if (!(span > 0) || span > 6000) {
      r = { l0, v: new Float64Array(0), b: new Float64Array(0), d: 0 };
    } else {
      const dv = new Float64Array(span + 1);
      const db = new Float64Array(span + 1);
      const add = (low, high, w, share) => {
        const a = Math.max(0, Math.round(low / step) - l0);
        const z = Math.min(span - 1, Math.max(a, Math.round(high / step) - l0));
        const per = w / (z - a + 1);
        dv[a] += per;
        dv[z + 1] -= per;
        db[a] += per * share;
        db[z + 1] -= per * share;
      };
      const src = this.src && this.barSec > 60 ? this.src : null;
      if (src) {
        let lo = 0;
        let hi = src.n;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (src.time[mid] < c.time) lo = mid + 1;
          else hi = mid;
        }
        const end = c.time + this.barSec;
        for (let j = lo; j < src.n && src.time[j] < end; j++) {
          const w = (src.hasVol ? src.vol[j] : 1) * sc;
          if (w > 0) add(src.low[j], src.high[j], w, src.up[j] === 1 ? 0.7 : 0.3);
        }
      } else {
        const w = (this.hasVolume ? Math.max(0, c.volume || 0) : 1) * sc;
        const rng = c.high - c.low;
        if (w > 0) add(c.low, c.high, w, rng > 0 ? 0.2 + 0.6 * ((c.close - c.low) / rng) : 0.5);
      }
      const v = new Float64Array(span);
      const bb = new Float64Array(span);
      let sv = 0;
      let sb = 0;
      let d = 0;
      for (let k = 0; k < span; k++) {
        sv += dv[k];
        sb += db[k];
        v[k] = sv > 1e-9 ? sv : 0;
        bb[k] = sb > 1e-9 ? sb : 0;
        d += 2 * bb[k] - v[k];
      }
      r = { l0, v, b: bb, d };
    }
    if (this._estCache.size > 3000) this._estCache.clear();
    this._estCache.set(i, r);
    return r;
  }
  // Map(bin -> [volume, buy]) with the finest rows grouped into rows of "mult" levels
  estCandle(i, mult) {
    const base = this.estBase(i);
    const m = new Map();
    for (let k = 0; k < base.v.length; k++) {
      const v = base.v[k];
      if (!(v > 0)) continue;
      const bin = Math.floor((base.l0 + k) / mult);
      const cur = m.get(bin);
      if (cur) {
        cur[0] += v;
        cur[1] += base.b[k];
      } else m.set(bin, [v, base.b[k]]);
    }
    return m;
  }
  ofDelta(i) {
    const tot = this._ofTot;
    if (tot && tot.dlt) return tot.dlt[i];
    return this.estBase(i).d;
  }

  drawFootprint(ctx) {
    if (!this.footprintOn()) return;
    const tot = this.ofTotals();
    if (!tot) return;
    const o = this.of;
    const th = this.theme;
    const step = this.flowStep();
    const { from, to } = this.visible();
    const stepPx = (this.plotH * step) / (this.pMax - this.pMin);
    if (!(stepPx > 0)) return;
    const mult = Math.max(1, Math.ceil(12 / stepPx));
    const rowPx = stepPx * mult;
    const cellW = this.barSpacing * 0.9 - 2;
    const showNum = o.numbers && cellW >= 22 && rowPx >= 10;
    ctx.font = `10px ${th.font}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (let i = from; i <= to; i++) {
      if (!(tot.vol[i] > 0)) continue;
      const fp = this.ofCandle(i, mult);
      if (!fp.rows.length || !(fp.max > 0)) continue;
      const x0 = this.xOf(i) + 2; // cells sit to the right of the candle's wick
      for (let r = 0; r < fp.rows.length; r++) {
        const row = fp.rows[r];
        const yT = this.yOf(((row.bin + 1) * mult - 0.5) * step);
        const yB = this.yOf((row.bin * mult - 0.5) * step);
        if (yB < 0 || yT > this.plotH) continue;
        const h = Math.max(1, yB - yT - 1);
        const view = o.view;
        const wide = cellW >= 34;
        if (view === "delta") {
          const k = fp.dmax > 0 ? Math.abs(row.d) / fp.dmax : 0;
          ctx.globalAlpha = 0.1 + 0.7 * k;
          ctx.fillStyle = row.d >= 0 ? th.up : th.down;
          ctx.fillRect(x0, yT, cellW, h);
          ctx.globalAlpha = 1;
          if (showNum) {
            ctx.fillStyle = k > 0.7 ? "#fff" : th.text;
            ctx.fillText(fmtS(row.d), x0 + cellW / 2, yT + h / 2 + 0.5);
          }
        } else if (view === "both") {
          const k = row.v / fp.max;
          ctx.globalAlpha = 0.06 + 0.3 * k;
          ctx.fillStyle = o.color;
          ctx.fillRect(x0, yT, cellW, h);
          // diagonal imbalance: buys vs the sells one price lower, sells vs the buys one price higher
          const below = fp.rows[r - 1];
          const above = fp.rows[r + 1];
          const buyImb = below && below.bin === row.bin - 1 && row.b >= 4 && row.b >= 3 * below.s;
          const sellImb = above && above.bin === row.bin + 1 && row.s >= 4 && row.s >= 3 * above.b;
          ctx.globalAlpha = 0.55;
          if (sellImb) {
            ctx.fillStyle = th.down;
            ctx.fillRect(x0, yT, cellW / 2, h);
          }
          if (buyImb) {
            ctx.fillStyle = th.up;
            ctx.fillRect(x0 + cellW / 2, yT, cellW / 2, h);
          }
          ctx.globalAlpha = 1;
          if (showNum && wide) {
            ctx.fillStyle = th.text;
            ctx.textAlign = "right";
            ctx.fillText(fmtV(row.s), x0 + cellW / 2 - 3, yT + h / 2 + 0.5);
            ctx.textAlign = "left";
            ctx.fillText(fmtV(row.b), x0 + cellW / 2 + 3, yT + h / 2 + 0.5);
            ctx.textAlign = "center";
          } else if (showNum) {
            ctx.fillStyle = th.text;
            ctx.fillText(fmtV(row.v), x0 + cellW / 2, yT + h / 2 + 0.5);
          }
        } else {
          const k = row.v / fp.max;
          ctx.globalAlpha = 0.08 + 0.62 * k;
          ctx.fillStyle = o.color;
          ctx.fillRect(x0, yT, cellW, h);
          ctx.globalAlpha = 1;
          if (showNum) {
            ctx.fillStyle = k > 0.7 ? "#fff" : th.text;
            ctx.fillText(fmtV(row.v), x0 + cellW / 2, yT + h / 2 + 0.5);
          }
        }
        if (r === fp.poc) {
          ctx.strokeStyle = o.pocColor;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x0 + 0.5, yT + 0.5, cellW - 1, Math.max(1, h - 1));
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // volume bars of each candle in a strip along the bottom
  drawFlowStrip(ctx) {
    const sh = this.stripH();
    if (!sh) return;
    const tot = this.ofTotals();
    if (!tot) return;
    const th = this.theme;
    const plotW = this.plotW;
    const y0 = this.plotH - sh;
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, y0, plotW, sh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = th.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y0 + 0.5);
    ctx.lineTo(plotW, y0 + 0.5);
    ctx.stroke();
    const { from, to } = this.visible();
    const last = Math.min(to, this.n - 1);
    let maxV = 0;
    for (let i = from; i <= last; i++) maxV = Math.max(maxV, tot.vol[i]);
    ctx.font = `10.5px ${th.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = th.text;
    if (!(maxV > 0)) {
      ctx.globalAlpha = 0.8;
      ctx.fillText("No volume data loaded for these candles", 8, y0 + 6);
      ctx.globalAlpha = 1;
      return;
    }
    // the number shown is for the candle under the crosshair, otherwise the latest one
    const ch = this.crosshair;
    let k = last;
    if (ch && ch.x >= 0 && ch.x <= plotW) k = Math.min(last, Math.max(0, Math.round(this.lOf(ch.x))));
    const dView = this.of.view === "delta";
    ctx.globalAlpha = 0.9;
    ctx.fillText(dView ? `Delta  ${tot.vol[k] > 0 ? fmtS(this.ofDelta(k)) : "-"}` : `Tick volume  ${tot.vol[k] > 0 ? fmtV(tot.vol[k]) : "-"}`, 8, y0 + 5);
    ctx.globalAlpha = 1;
    if (dView) {
      let maxD = 0;
      for (let i = from; i <= last; i++) maxD = Math.max(maxD, Math.abs(this.ofDelta(i)));
      const mid = y0 + 16 + (sh - 22) / 2;
      const half = (sh - 22) / 2;
      const bwd = Math.max(1, this.barSpacing * 0.7);
      ctx.globalAlpha = 0.85;
      for (let i = from; i <= last; i++) {
        if (!(tot.vol[i] > 0) || !(maxD > 0)) continue;
        const dv = this.ofDelta(i);
        const hh = Math.max(1, (Math.abs(dv) / maxD) * half);
        ctx.fillStyle = dv >= 0 ? th.up : th.down;
        ctx.fillRect(this.xOf(i) - bwd / 2, dv >= 0 ? mid - hh : mid, bwd, hh);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const base = this.plotH - 3;
    const amp = sh - 22;
    const bw = Math.max(1, this.barSpacing * 0.7);
    ctx.globalAlpha = 0.85;
    for (let i = from; i <= last; i++) {
      if (!(tot.vol[i] > 0)) continue;
      const c = this.candles[i];
      const h = Math.max(1, (tot.vol[i] / maxV) * amp);
      ctx.fillStyle = c.close >= c.open ? th.up : th.down;
      ctx.fillRect(this.xOf(i) - bw / 2, base - h, bw, h);
    }
    ctx.globalAlpha = 1;
  }

  drawFlowHint(ctx) {
    if (this.of.mode === "off" || !this.n) return;
    let msg = "";
    const tot = this.flow ? this.ofTotals() : null;
    if (!this.flow) msg = this.barSpacing < 8 ? "Zoom in to see the order flow" : "Order flow estimated from candles (relative units)";
    else if (tot && !(tot.vol[this.n - 1] > 0)) msg = "No footprint data loaded up to this candle - load more days";
    else if (this.barSpacing < 8) msg = "Zoom in to see the footprint";
    if (!msg) return;
    ctx.font = `11px ${this.theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = this.theme.text;
    ctx.globalAlpha = 0.85;
    ctx.fillText(msg, 8, 8);
    ctx.globalAlpha = 1;
  }

  draw(ctx, hooks = {}) {
    const { w, h, dpr, theme } = this;
    const plotW = this.plotW;
    const plotH = this.plotH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.fitIfAuto();

    // --- plot area ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, plotW, plotH);
    ctx.clip();

    // grid
    const step = niceStep(((this.pMax - this.pMin) / plotH) * 64);
    const firstTick = Math.ceil(this.pMin / step) * step;
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.grid;
    ctx.beginPath();
    for (let p = firstTick; p < this.pMax; p += step) {
      const y = Math.round(this.yOf(p)) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
    }
    const ticks = this.timeTicks();
    const { from, to } = this.visible();
    for (const tk of ticks) {
      const x = Math.round(tk.x) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotH);
    }
    ctx.stroke();

    this.drawProfiles(ctx);
    this.drawFootprint(ctx);

    // candles (slim where a footprint is drawn behind them)
    const bw = Math.max(1, Math.floor(this.barSpacing * 0.72));
    const body = bw % 2 === 0 ? bw + 1 : bw;
    const slimTot = this.footprintOn() ? this.ofTotals() : null;
    for (let i = from; i <= to; i++) {
      const c = this.candles[i];
      const x = Math.round(this.xOf(i));
      const up = c.close >= c.open;
      const col = up ? theme.up : theme.down;
      const yH = this.yOf(c.high);
      const yL = this.yOf(c.low);
      const yO = this.yOf(c.open);
      const yC = this.yOf(c.close);
      ctx.fillStyle = col;
      ctx.fillRect(x - 0.5, Math.round(yH), 1, Math.max(1, Math.round(yL) - Math.round(yH)));
      const top = Math.round(Math.min(yO, yC));
      const bodyW = slimTot && slimTot.vol[i] > 0 ? 3 : body;
      ctx.fillRect(x - (bodyW - 1) / 2, top, bodyW, Math.max(1, Math.round(Math.max(yO, yC)) - top));
    }

    // last price line
    const last = this.candles[this.n - 1];
    if (last) {
      const y = Math.round(this.yOf(last.close)) + 0.5;
      ctx.strokeStyle = last.close >= last.open ? theme.up : theme.down;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.max(0, this.xOf(this.n - 1)), y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this.drawFlowStrip(ctx);
    this.drawFlowHint(ctx);

    if (hooks.plot) {
      ctx.save();
      hooks.plot(ctx);
      ctx.restore();
    }
    ctx.restore();

    // --- axes (cover anything that spilled over) ---
    ctx.fillStyle = theme.bg;
    ctx.fillRect(plotW, 0, this.axisW, h);
    ctx.fillRect(0, plotH, w, this.axisH);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotW + 0.5, 0);
    ctx.lineTo(plotW + 0.5, plotH + 0.5);
    ctx.lineTo(0, plotH + 0.5);
    ctx.stroke();

    ctx.font = `11px ${theme.font}`;
    ctx.fillStyle = theme.text;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let p = firstTick; p < this.pMax; p += step) {
      const y = this.yOf(p);
      if (y < 8 || y > plotH - 8) continue;
      ctx.fillText(this.fmtPrice(p), plotW + 7, y);
    }
    ctx.textAlign = "center";
    for (const tk of ticks) {
      if (tk.x < 18 || tk.x > plotW - 18) continue;
      ctx.font = `${tk.major ? "600 " : ""}11px ${theme.font}`;
      ctx.fillText(tk.label, tk.x, plotH + this.axisH / 2 + 1);
    }

    // last price tag
    if (last) {
      const y = this.yOf(last.close);
      if (y >= 0 && y <= plotH) this.chip(ctx, this.fmtPrice(last.close), plotW + 2, y, last.close >= last.open ? theme.up : theme.down, "#fff");
    }
    if (hooks.axis) hooks.axis(ctx);

    // crosshair
    const ch = this.crosshair;
    if (ch && ch.x >= 0 && ch.x <= plotW && ch.y >= 0 && ch.y <= plotH) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, plotW, plotH);
      ctx.clip();
      ctx.strokeStyle = theme.text;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.round(ch.x) + 0.5, 0);
      ctx.lineTo(Math.round(ch.x) + 0.5, plotH);
      ctx.moveTo(0, Math.round(ch.y) + 0.5);
      ctx.lineTo(plotW, Math.round(ch.y) + 0.5);
      ctx.stroke();
      ctx.restore();
      this.chip(ctx, this.fmtPrice(this.pOf(ch.y)), plotW + 2, ch.y, theme.text, theme.bg);
      const ts = this.timeAt(this.lOf(ch.x));
      if (ts != null) this.chip(ctx, this.fmtFull(ts), Math.min(Math.max(ch.x, 60), plotW - 60), plotH + this.axisH / 2, theme.text, theme.bg, "center");
    }
    if (hooks.top) hooks.top(ctx);
  }

  // Time-axis ticks at clock-aligned moments (whole hours, days...), placed through the candle index so
  // weekend gaps don't leave holes.
  timeTicks() {
    const n = this.n;
    if (!n) return [];
    const secPerPx = this.barSec / this.barSpacing;
    const need = 100 * secPerPx;
    const steps = [60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400, 172800, 604800, 2629800, 7889400, 31557600];
    const iv = steps.find((x) => x >= need) || 31557600;
    const lo = this.timeAt(Math.floor(this.lOf(0)));
    const hi = this.timeAt(Math.ceil(this.lOf(this.plotW)));
    if (lo == null || hi == null) return [];
    const out = [];
    let lastX = -1e9;
    for (let t = Math.ceil(lo / iv) * iv; t <= hi + iv; t += iv) {
      const x = this.xOf(this.logicalAt(t));
      if (x - lastX < 60) continue;
      lastX = x;
      const d = new Date(t * 1000);
      let label;
      let major = false;
      if (iv < 86400) {
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
          label = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
          major = true;
        } else label = `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
      } else if (iv < 2629800) {
        label = d.getUTCDate() === 1 ? MONTHS[d.getUTCMonth()] : String(d.getUTCDate());
        major = d.getUTCDate() === 1;
      } else {
        label = d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MONTHS[d.getUTCMonth()];
        major = d.getUTCMonth() === 0;
      }
      out.push({ x, ts: t, label, major });
    }
    return out;
  }

  // Candle under a pixel (for the OHLC read-out).
  candleAtX(x) {
    const i = Math.round(this.lOf(x));
    return i >= 0 && i < this.n ? { i, c: this.candles[i] } : null;
  }
}
