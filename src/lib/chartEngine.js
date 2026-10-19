// Tredzi's own chart engine. No chart library: just a 2D canvas.
// It owns the view (zoom, scroll, price range), converts between screen pixels and (bar index, price),
// and paints candles, grid, axes, last-price tag and crosshair. Drawings, trade markers and entry/SL/TP
// lines are painted by the caller through the `plot` hook, using the same coordinate functions.
//
// A candle is { time (unix seconds, UTC), open, high, low, close }.
// "Logical" index = position in the candle array (0 = first candle). Fractions are allowed.

const MIN_SPACING = 1.5;
const MAX_SPACING = 64;

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

export class ChartEngine {
  constructor() {
    this.candles = [];
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
  setData(list, reset) {
    const prevN = this.candles.length;
    this.candles = list;
    const n = list.length;
    if (n > 2) {
      const d = [];
      for (let i = 1; i < Math.min(n, 40); i++) if (list[i].time > list[i - 1].time) d.push(list[i].time - list[i - 1].time);
      d.sort((a, b) => a - b);
      this.barSec = d[Math.floor(d.length / 2)] || 60;
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
    const n = this.candles.length;
    if (!n) return null;
    const i = Math.round(l);
    if (i >= 0 && i < n) return this.candles[i].time;
    return i < 0 ? this.candles[0].time + i * this.barSec : this.candles[n - 1].time + (i - (n - 1)) * this.barSec;
  }
  // time -> fractional logical index (binary search, extrapolating past the ends)
  logicalAt(t) {
    const c = this.candles;
    const n = c.length;
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
    const n = this.candles.length;
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
    const n = this.candles.length;
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

    // candles
    const bw = Math.max(1, Math.floor(this.barSpacing * 0.72));
    const body = bw % 2 === 0 ? bw + 1 : bw;
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
      ctx.fillRect(x - (body - 1) / 2, top, body, Math.max(1, Math.round(Math.max(yO, yC)) - top));
    }

    // last price line
    const last = this.candles[this.candles.length - 1];
    if (last) {
      const y = Math.round(this.yOf(last.close)) + 0.5;
      ctx.strokeStyle = last.close >= last.open ? theme.up : theme.down;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.max(0, this.xOf(this.candles.length - 1)), y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

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
    const n = this.candles.length;
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
    return i >= 0 && i < this.candles.length ? { i, c: this.candles[i] } : null;
  }
}
