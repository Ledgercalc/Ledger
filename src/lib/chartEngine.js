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
    this.count = 0; // how many candles are shown (the replay position); lets the chart use one big array without copying it
    this.profileMode = "off"; // off | range | session   (volume profile)
    this.profileCache = new Map();
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
    this.candles = list;
    const n = Number.isFinite(limit) ? Math.max(0, Math.min(limit, list.length)) : list.length;
    this.count = n;
    this.profileCache.clear();
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

  // ---- volume profile ----
  // Volume of each candle is spread evenly over the price rows it touched. If the data has no volume (CSV without a
  // volume column, Yahoo) every candle counts the same, which gives "time at price" instead.
  profileOf(from, to, rows, lo, hi) {
    const step = (hi - lo) / rows;
    if (!(step > 0)) return null;
    const up = new Float64Array(rows);
    const dn = new Float64Array(rows);
    const cs = this.candles;
    for (let i = from; i <= to; i++) {
      const c = cs[i];
      const w = this.hasVolume ? (c.volume > 0 ? c.volume : 0) : 1;
      if (!w) continue;
      let i0 = Math.floor((c.low - lo) / step);
      let i1 = Math.floor((c.high - lo) / step);
      if (i1 < 0 || i0 > rows - 1) continue;
      i0 = Math.max(0, i0);
      i1 = Math.min(rows - 1, i1);
      const per = w / (i1 - i0 + 1);
      const arr = c.close >= c.open ? up : dn;
      for (let k = i0; k <= i1; k++) arr[k] += per;
    }
    const tot = new Float64Array(rows);
    let sum = 0;
    let max = 0;
    let poc = 0;
    for (let k = 0; k < rows; k++) {
      tot[k] = up[k] + dn[k];
      sum += tot[k];
      if (tot[k] > max) {
        max = tot[k];
        poc = k;
      }
    }
    if (!(max > 0)) return null;
    // value area: grow from the point of control until 70% of the volume is inside
    let vl = poc;
    let vh = poc;
    let acc = tot[poc];
    while (acc < sum * 0.7 && (vl > 0 || vh < rows - 1)) {
      const below = vl > 0 ? tot[vl - 1] : -1;
      const above = vh < rows - 1 ? tot[vh + 1] : -1;
      if (above >= below) {
        vh++;
        acc += tot[vh];
      } else {
        vl--;
        acc += tot[vl];
      }
    }
    return { rows, lo, step, up, dn, tot, max, poc, val: vl, vah: vh };
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

  paintProfileBars(ctx, prof, x0, dir, maxW) {
    const { theme } = this;
    for (let r = 0; r < prof.rows; r++) {
      if (!(prof.tot[r] > 0)) continue;
      const yTop = this.yOf(prof.lo + (r + 1) * prof.step);
      const yBot = this.yOf(prof.lo + r * prof.step);
      const h = Math.max(1, yBot - yTop - 1);
      const w = (prof.tot[r] / prof.max) * maxW;
      const inVa = r >= prof.val && r <= prof.vah;
      const wd = (prof.dn[r] / prof.tot[r]) * w;
      const wu = w - wd;
      ctx.globalAlpha = inVa ? 0.5 : 0.26;
      ctx.fillStyle = theme.down;
      ctx.fillRect(dir > 0 ? x0 : x0 - wd, yTop, wd, h);
      ctx.fillStyle = theme.up;
      ctx.fillRect(dir > 0 ? x0 + wd : x0 - w, yTop, wu, h);
    }
    ctx.globalAlpha = 1;
  }

  paintProfileLines(ctx, prof, xFrom, xTo) {
    const mid = (r) => this.yOf(prof.lo + (r + 0.5) * prof.step);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#f5a623";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xFrom, Math.round(mid(prof.poc)) + 0.5);
    ctx.lineTo(xTo, Math.round(mid(prof.poc)) + 0.5);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (const r of [prof.vah, prof.val]) {
      const y = r === prof.vah ? this.yOf(prof.lo + (r + 1) * prof.step) : this.yOf(prof.lo + r * prof.step);
      ctx.moveTo(xFrom, Math.round(y) + 0.5);
      ctx.lineTo(xTo, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  drawProfiles(ctx) {
    const mode = this.profileMode;
    if (mode === "off" || !this.n) return;
    const { from, to } = this.visible();
    if (to < from) return;
    const plotW = this.plotW;
    if (mode === "range") {
      const rows = Math.max(16, Math.min(90, Math.round(this.plotH / 9)));
      const key = `r|${from}|${to}|${rows}|${this.pMin}|${this.pMax}|${this.n}`;
      if (!this._rangeProf || this._rangeProf.key !== key) this._rangeProf = { key, prof: this.profileOf(from, to, rows, this.pMin, this.pMax) };
      const prof = this._rangeProf.prof;
      if (prof) {
        const maxW = plotW * 0.3;
        this.paintProfileBars(ctx, prof, plotW, -1, maxW);
        this.paintProfileLines(ctx, prof, plotW - maxW, plotW);
      }
    } else {
      // session profiles: one per UTC day, anchored at the start of the day
      const cs = this.candles;
      let i = from;
      while (i <= to) {
        const day = Math.floor(cs[i].time / 86400);
        const s = this.lowerBound(day * 86400);
        const e = Math.min(this.n - 1, this.lowerBound((day + 1) * 86400) - 1);
        const nextI = e + 1;
        if (e - s >= 2) {
          const key = `${s}-${e}`;
          let item = this.profileCache.get(key);
          if (!item || item.n !== this.n) {
            let lo = Infinity;
            let hi = -Infinity;
            for (let k = s; k <= e; k++) {
              if (cs[k].low < lo) lo = cs[k].low;
              if (cs[k].high > hi) hi = cs[k].high;
            }
            item = { n: this.n, prof: hi > lo ? this.profileOf(s, e, 32, lo, hi) : null };
            if (this.profileCache.size > 400) this.profileCache.delete(this.profileCache.keys().next().value);
            this.profileCache.set(key, item);
          }
          if (item.prof) {
            const xs = this.xOf(s) - this.barSpacing / 2;
            const x1 = this.xOf(e) + this.barSpacing / 2;
            const x0 = Math.max(0, xs); // a session that began off-screen still shows from the left edge
            if (x1 > 0 && xs < plotW && x1 - x0 > 12) {
              const maxW = Math.min(240, Math.max(24, (x1 - xs) * 0.4));
              this.paintProfileBars(ctx, item.prof, x0, 1, maxW);
              this.paintProfileLines(ctx, item.prof, x0, x1);
            }
          }
        }
        i = nextI > i ? nextI : i + 1;
      }
    }
    const text = `${mode === "range" ? "Volume profile (visible range)" : "Session volume profile (daily)"}${this.hasVolume ? "" : " - no volume in this data, showing time at price"}`;
    ctx.font = `11px ${this.theme.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.theme.text;
    ctx.globalAlpha = 0.75;
    ctx.fillText(text, 8, this.plotH - 8);
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
